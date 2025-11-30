import { InventoryRepository, InventoryQueryFilters, StockSummary } from '../repositories/InventoryRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { WarehouseRepository } from '../repositories/WarehouseRepository';
import { InventoryTransaction, TransactionType, TransactionReason } from '../entities/InventoryTransaction.entity';
import { ApiError } from '../middleware/errorHandler.middleware';
import { loggers } from '../config/logger';
import { AppDataSource } from '../config/database';
import { ActivityType } from '../entities/ActivityLog.entity';

export interface CreateTransactionDto {
  productId: number;
  warehouseId?: number; // Optional: if not provided, use main warehouse
  type: TransactionType;
  reason: TransactionReason;
  quantity: number;
  unitCost?: number;
  reference?: string;
  location?: string;
  notes?: string;
  metadata?: any;
}

export interface AdjustStockDto {
  productId: number;
  warehouseId?: number; // Optional: if not provided, use main warehouse
  newStock: number;
  reason: TransactionReason;
  notes?: string;
}

export class InventoryService {
  private inventoryRepository = new InventoryRepository();
  private productRepository = new ProductRepository();
  private warehouseRepository = new WarehouseRepository();

  /**
   * Get warehouse ID: validates provided warehouse or returns main warehouse
   */
  private async getWarehouseId(companyId: number, warehouseId?: number): Promise<number> {
    if (warehouseId) {
      // Validate that warehouse exists and belongs to company
      const warehouse = await this.warehouseRepository.findOne({
        where: { id: warehouseId, companyId, isActive: true },
      });

      if (!warehouse) {
        throw new ApiError(404, 'WAREHOUSE_NOT_FOUND', 'Warehouse not found or inactive');
      }

      return warehouseId;
    }

    // Get main warehouse if not specified
    const mainWarehouse = await this.warehouseRepository.findMainWarehouse(companyId);

    if (!mainWarehouse) {
      throw new ApiError(400, 'NO_MAIN_WAREHOUSE', 'No main warehouse configured for this company');
    }

    return mainWarehouse.id;
  }

  /**
   * Create a new inventory transaction
   * This is the core method that handles all stock movements
   */
  async createTransaction(
    companyId: number,
    userId: number,
    dto: CreateTransactionDto
  ): Promise<InventoryTransaction> {
    // Validate product exists and belongs to company
    const product = await this.productRepository.findOne({
      where: { id: dto.productId, companyId },
    });

    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }

    // Get and validate warehouse
    const warehouseId = await this.getWarehouseId(companyId, dto.warehouseId);

    // Get current stock for this warehouse
    const currentStock = await this.getCurrentStockByWarehouse(companyId, dto.productId, warehouseId);

    // Validate quantity
    if (dto.quantity === 0) {
      throw new ApiError(400, 'INVALID_QUANTITY', 'Quantity cannot be zero');
    }

    // Calculate new stock based on transaction type
    let newStock = currentStock;
    let adjustedQuantity = dto.quantity;

    switch (dto.type) {
      case TransactionType.INBOUND:
        newStock = currentStock + Math.abs(dto.quantity);
        adjustedQuantity = Math.abs(dto.quantity);
        break;

      case TransactionType.OUTBOUND:
        adjustedQuantity = -Math.abs(dto.quantity);
        newStock = currentStock + adjustedQuantity;

        // Check if there's enough stock
        if (newStock < 0) {
          throw new ApiError(
            400,
            'INSUFFICIENT_STOCK',
            `Insufficient stock. Available: ${currentStock}, Requested: ${Math.abs(dto.quantity)}`
          );
        }
        break;

      case TransactionType.ADJUSTMENT:
        // For adjustments, quantity can be positive or negative
        newStock = currentStock + dto.quantity;

        if (newStock < 0) {
          throw new ApiError(
            400,
            'INVALID_ADJUSTMENT',
            `Adjustment would result in negative stock. Current: ${currentStock}, Adjustment: ${dto.quantity}`
          );
        }
        break;

      case TransactionType.TRANSFER:
        // For transfers, quantity is always outbound from current location
        adjustedQuantity = -Math.abs(dto.quantity);
        newStock = currentStock + adjustedQuantity;

        if (newStock < 0) {
          throw new ApiError(
            400,
            'INSUFFICIENT_STOCK',
            `Insufficient stock for transfer. Available: ${currentStock}, Requested: ${Math.abs(dto.quantity)}`
          );
        }
        break;
    }

    // Calculate total cost if unit cost provided
    const totalCost = dto.unitCost ? dto.unitCost * Math.abs(adjustedQuantity) : null;

    // Create transaction
    const transaction = this.inventoryRepository.create({
      companyId,
      productId: dto.productId,
      userId,
      warehouseId,
      type: dto.type,
      reason: dto.reason,
      quantity: adjustedQuantity,
      previousStock: currentStock,
      newStock,
      unitCost: dto.unitCost || null,
      totalCost,
      reference: dto.reference || null,
      location: dto.location || null,
      notes: dto.notes || null,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
    });

    await this.inventoryRepository.save(transaction);

    loggers.logOperation('inventory_transaction_created', userId, companyId, {
      transactionId: transaction.id,
      productId: dto.productId,
      warehouseId,
      type: dto.type,
      reason: dto.reason,
      quantity: adjustedQuantity,
      previousStock: currentStock,
      newStock,
    });

    // Log user activity for inbound/outbound/adjustment
    // Product already fetched at line 73, reuse it
    const warehouse = await this.warehouseRepository.findOne({ where: { id: warehouseId } });
    
    let activityType: ActivityType;
    let actionText: string;
    
    if (dto.type === TransactionType.INBOUND) {
      activityType = ActivityType.INVENTORY_RECEIVE;
      actionText = 'Recibió';
    } else if (dto.type === TransactionType.OUTBOUND) {
      activityType = ActivityType.INVENTORY_RECEIVE;
      actionText = 'Retiró';
    } else {
      activityType = ActivityType.INVENTORY_ADJUSTMENT;
      actionText = 'Ajustó';
    }

    await loggers.logActivity({
      companyId,
      userId,
      activityType,
      description: `${actionText} ${Math.abs(adjustedQuantity)} unidades de ${product?.name || 'producto'} en ${warehouse?.name || 'bodega'}`,
      entityType: 'product',
      entityId: dto.productId,
      entityName: product?.name || '',
      metadata: {
        warehouseId,
        warehouseName: warehouse?.name,
        type: dto.type,
        reason: dto.reason,
        quantity: adjustedQuantity,
        previousStock: currentStock,
        newStock,
      },
    });

    return transaction;
  }

  /**
   * Adjust stock to a specific value
   * This creates an ADJUSTMENT transaction to set stock to exact value
   */
  async adjustStock(
    companyId: number,
    userId: number,
    dto: AdjustStockDto
  ): Promise<InventoryTransaction> {
    // Get and validate warehouse
    const warehouseId = await this.getWarehouseId(companyId, dto.warehouseId);

    const currentStock = await this.getCurrentStockByWarehouse(companyId, dto.productId, warehouseId);
    const difference = dto.newStock - currentStock;

    if (difference === 0) {
      throw new ApiError(400, 'NO_ADJUSTMENT_NEEDED', 'New stock is same as current stock');
    }

    return this.createTransaction(companyId, userId, {
      productId: dto.productId,
      warehouseId,
      type: TransactionType.ADJUSTMENT,
      reason: dto.reason,
      quantity: difference,
      notes: dto.notes,
    });
  }

  /**
   * Record an inbound transaction (purchase, return, etc.)
   */
  async recordInbound(
    companyId: number,
    userId: number,
    productId: number,
    quantity: number,
    reason: TransactionReason,
    options?: {
      unitCost?: number;
      reference?: string;
      location?: string;
      notes?: string;
      metadata?: any;
    }
  ): Promise<InventoryTransaction> {
    return this.createTransaction(companyId, userId, {
      productId,
      type: TransactionType.INBOUND,
      reason,
      quantity,
      ...options,
    });
  }

  /**
   * Record an outbound transaction (sale, damage, loss, etc.)
   */
  async recordOutbound(
    companyId: number,
    userId: number,
    productId: number,
    quantity: number,
    reason: TransactionReason,
    options?: {
      unitCost?: number;
      reference?: string;
      location?: string;
      notes?: string;
      metadata?: any;
    }
  ): Promise<InventoryTransaction> {
    return this.createTransaction(companyId, userId, {
      productId,
      type: TransactionType.OUTBOUND,
      reason,
      quantity,
      ...options,
    });
  }

  /**
   * Get inventory transactions with filters
   */
  async getTransactions(companyId: number, filters: InventoryQueryFilters) {
    return this.inventoryRepository.findWithPagination(companyId, filters);
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(companyId: number, transactionId: number): Promise<InventoryTransaction> {
    const transaction = await this.inventoryRepository.findOne({
      where: { id: transactionId, companyId },
      relations: ['product', 'user'],
    });

    if (!transaction) {
      throw new ApiError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }

    return transaction;
  }

  /**
   * Get current stock for a product (across all warehouses)
   */
  async getCurrentStock(companyId: number, productId: number): Promise<number> {
    return this.inventoryRepository.getCurrentStock(companyId, productId);
  }

  /**
   * Get current stock for a product in a specific warehouse
   */
  async getCurrentStockByWarehouse(
    companyId: number,
    productId: number,
    warehouseId: number
  ): Promise<number> {
    const lastTransaction = await this.inventoryRepository.findOne({
      where: { companyId, productId, warehouseId },
      order: { createdAt: 'DESC' },
    });

    return lastTransaction?.newStock || 0;
  }

  /**
   * Get stock across all warehouses for a product
   */
  async getStockByAllWarehouses(
    companyId: number,
    productId: number
  ): Promise<Array<{ warehouseId: number; warehouseName: string; stock: number }>> {
    const warehouses = await this.warehouseRepository.findActiveWarehouses(companyId);
    const stockByWarehouse: Array<{ warehouseId: number; warehouseName: string; stock: number }> = [];

    for (const warehouse of warehouses) {
      const stock = await this.getCurrentStockByWarehouse(companyId, productId, warehouse.id);
      stockByWarehouse.push({
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        stock,
      });
    }

    return stockByWarehouse;
  }

  /**
   * Get stock summary for a product
   */
  async getStockSummary(companyId: number, productId: number): Promise<StockSummary> {
    return this.inventoryRepository.getStockSummary(companyId, productId);
  }

  /**
   * Get stock summaries for multiple products
   */
  async getMultipleStockSummaries(companyId: number, productIds: number[]): Promise<StockSummary[]> {
    return this.inventoryRepository.getMultipleStockSummaries(companyId, productIds);
  }

  /**
   * Get product transaction history
   */
  async getProductHistory(
    companyId: number,
    productId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<InventoryTransaction[]> {
    // Validate product exists
    const product = await this.productRepository.findOne({
      where: { id: productId, companyId },
    });

    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }

    return this.inventoryRepository.getProductHistory(companyId, productId, startDate, endDate);
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(companyId: number): Promise<StockSummary[]> {
    return this.inventoryRepository.getLowStockProducts(companyId);
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(companyId: number, limit: number = 10): Promise<InventoryTransaction[]> {
    return this.inventoryRepository.getRecentTransactions(companyId, limit);
  }

  /**
   * Get totals by transaction type for a date range
   */
  async getTotalsByType(companyId: number, startDate: Date, endDate: Date) {
    return this.inventoryRepository.getTotalsByType(companyId, startDate, endDate);
  }

  /**
   * Bulk inbound operation
   * Create multiple inbound transactions in a single operation
   */
  async bulkInbound(
    companyId: number,
    userId: number,
    items: Array<{
      productId: number;
      quantity: number;
      unitCost?: number;
      reference?: string;
    }>,
    warehouseId: number,
    reason: TransactionReason,
    notes?: string
  ): Promise<InventoryTransaction[]> {
    const transactions: InventoryTransaction[] = [];

    // Use transaction to ensure atomicity
    await AppDataSource.transaction(async (manager) => {
      for (const item of items) {
        const transaction = await this.createTransaction(companyId, userId, {
          productId: item.productId,
          warehouseId,
          type: TransactionType.INBOUND,
          reason,
          quantity: item.quantity,
          unitCost: item.unitCost,
          reference: item.reference,
          notes,
        });
        transactions.push(transaction);
      }
    });

    loggers.logOperation('bulk_inbound_created', userId, companyId, {
      itemCount: items.length,
      warehouseId,
      reason,
    });

    return transactions;
  }

  /**
   * Bulk outbound operation
   */
  async bulkOutbound(
    companyId: number,
    userId: number,
    items: Array<{
      productId: number;
      quantity: number;
      reference?: string;
    }>,
    warehouseId: number,
    reason: TransactionReason,
    notes?: string
  ): Promise<InventoryTransaction[]> {
    const transactions: InventoryTransaction[] = [];

    // Use transaction to ensure atomicity
    await AppDataSource.transaction(async (manager) => {
      for (const item of items) {
        const transaction = await this.createTransaction(companyId, userId, {
          productId: item.productId,
          warehouseId,
          type: TransactionType.OUTBOUND,
          reason,
          quantity: item.quantity,
          reference: item.reference,
          notes,
        });
        transactions.push(transaction);
      }
    });

    loggers.logOperation('bulk_outbound_created', userId, companyId, {
      itemCount: items.length,
      warehouseId,
      reason,
    });

    return transactions;
  }

  /**
   * Transfer stock between warehouses
   * Creates two transactions: outbound from source, inbound to destination
   */
  async transferBetweenWarehouses(
    companyId: number,
    userId: number,
    productId: number,
    fromWarehouseId: number,
    toWarehouseId: number,
    quantity: number,
    reference?: string,
    notes?: string
  ): Promise<{ outbound: InventoryTransaction; inbound: InventoryTransaction }> {
    // Validate both warehouses exist
    await this.getWarehouseId(companyId, fromWarehouseId);
    await this.getWarehouseId(companyId, toWarehouseId);

    if (fromWarehouseId === toWarehouseId) {
      throw new ApiError(400, 'SAME_WAREHOUSE', 'Cannot transfer to the same warehouse');
    }

    // Use database transaction to ensure atomicity
    const result = await AppDataSource.transaction(async (manager) => {
      // Create outbound transaction from source warehouse
      const outbound = await this.createTransaction(companyId, userId, {
        productId,
        warehouseId: fromWarehouseId,
        type: TransactionType.TRANSFER,
        reason: TransactionReason.TRANSFER_OUT,
        quantity,
        reference,
        notes: notes || `Transfer to warehouse ${toWarehouseId}`,
      });

      // Create inbound transaction to destination warehouse
      const inbound = await this.createTransaction(companyId, userId, {
        productId,
        warehouseId: toWarehouseId,
        type: TransactionType.INBOUND,
        reason: TransactionReason.TRANSFER_IN,
        quantity,
        reference,
        notes: notes || `Transfer from warehouse ${fromWarehouseId}`,
      });

      return { outbound, inbound };
    });

    loggers.logOperation('warehouse_transfer', userId, companyId, {
      productId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      outboundTransactionId: result.outbound.id,
      inboundTransactionId: result.inbound.id,
    });

    return result;
  }

  /**
   * Get stock summary by warehouse for a product
   */
  async getStockSummaryByWarehouse(
    companyId: number,
    productId: number,
    warehouseId: number
  ): Promise<StockSummary & { warehouseId: number }> {
    const transactions = await this.inventoryRepository.find({
      where: { companyId, productId, warehouseId },
      order: { createdAt: 'ASC' },
    });

    const summary: StockSummary & { warehouseId: number } = {
      productId,
      warehouseId,
      currentStock: 0,
      totalInbound: 0,
      totalOutbound: 0,
      totalAdjustments: 0,
      lastTransaction: null,
    };

    if (transactions.length === 0) {
      return summary;
    }

    // Calculate totals
    for (const transaction of transactions) {
      if (transaction.type === TransactionType.INBOUND) {
        summary.totalInbound += Math.abs(transaction.quantity);
      } else if (transaction.type === TransactionType.OUTBOUND || transaction.type === TransactionType.TRANSFER) {
        summary.totalOutbound += Math.abs(transaction.quantity);
      } else if (transaction.type === TransactionType.ADJUSTMENT) {
        summary.totalAdjustments += transaction.quantity;
      }
    }

    // Get current stock from last transaction
    const lastTransaction = transactions[transactions.length - 1];
    summary.currentStock = lastTransaction.newStock;
    summary.lastTransaction = lastTransaction.createdAt;

    return summary;
  }

  /**
   * Get inventory summary for all warehouses
   * Returns stock status for each warehouse with totals
   */
  async getWarehousesSummary(companyId: number): Promise<any[]> {
    // Get all active warehouses for the company
    const warehouses = await this.warehouseRepository.find({
      where: { companyId, isActive: true },
      order: { isMain: 'DESC', name: 'ASC' },
    });

    const summaries = [];

    for (const warehouse of warehouses) {
      // Get all transactions for this warehouse
      const transactions = await this.inventoryRepository.find({
        where: { companyId, warehouseId: warehouse.id },
      });

      // Calculate totals
      let totalInbound = 0;
      let totalOutbound = 0;
      let totalAdjustments = 0;
      let currentStock = 0;

      transactions.forEach((transaction) => {
        if (transaction.type === TransactionType.INBOUND) {
          totalInbound += Math.abs(transaction.quantity);
        } else if (transaction.type === TransactionType.OUTBOUND || transaction.type === TransactionType.TRANSFER) {
          totalOutbound += Math.abs(transaction.quantity);
        } else if (transaction.type === TransactionType.ADJUSTMENT) {
          totalAdjustments += transaction.quantity;
        }
        currentStock = transaction.newStock;
      });

      // Count unique products in this warehouse
      const uniqueProducts = new Set(transactions.map(t => t.productId)).size;

      // Get last transaction
      const lastTransaction = transactions.length > 0 
        ? transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
        : null;

      summaries.push({
        warehouse: {
          id: warehouse.id,
          code: warehouse.code,
          name: warehouse.name,
          isMain: warehouse.isMain,
          address: warehouse.getFullAddress(),
          managerName: warehouse.managerName,
        },
        stats: {
          currentStock,
          totalInbound,
          totalOutbound,
          totalAdjustments,
          uniqueProducts,
          transactionCount: transactions.length,
        },
        lastActivity: lastTransaction ? {
          date: lastTransaction.createdAt,
          type: lastTransaction.type,
          reason: lastTransaction.reason,
        } : null,
      });
    }

    return summaries;
  }

  /**
   * Get inventory summary for a specific warehouse
   */
  async getWarehouseSummary(companyId: number, warehouseId: number): Promise<any> {
    // Validate warehouse exists
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: warehouseId, companyId, isActive: true },
    });

    if (!warehouse) {
      throw new ApiError(404, 'WAREHOUSE_NOT_FOUND', 'Warehouse not found');
    }

    // Get all transactions for this warehouse
    const transactions = await this.inventoryRepository.find({
      where: { companyId, warehouseId },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });

    // Calculate totals
    let totalInbound = 0;
    let totalOutbound = 0;
    let totalAdjustments = 0;
    const productStocks = new Map<number, any>();

    transactions.forEach((transaction) => {
      if (transaction.type === TransactionType.INBOUND) {
        totalInbound += Math.abs(transaction.quantity);
      } else if (transaction.type === TransactionType.OUTBOUND || transaction.type === TransactionType.TRANSFER) {
        totalOutbound += Math.abs(transaction.quantity);
      } else if (transaction.type === TransactionType.ADJUSTMENT) {
        totalAdjustments += transaction.quantity;
      }

      // Track per-product stock
      if (!productStocks.has(transaction.productId)) {
        productStocks.set(transaction.productId, {
          productId: transaction.productId,
          productName: transaction.product?.name || 'Unknown',
          productSku: transaction.product?.sku || null,
          currentStock: transaction.newStock,
          lastUpdated: transaction.createdAt,
        });
      }
    });

    const productsList = Array.from(productStocks.values());
    const currentStock = productsList.reduce((sum, p) => sum + p.currentStock, 0);

    return {
      warehouse: {
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
        isMain: warehouse.isMain,
        address: warehouse.getFullAddress(),
        managerName: warehouse.managerName,
        phone: warehouse.phone,
        email: warehouse.email,
      },
      stats: {
        currentStock,
        totalInbound,
        totalOutbound,
        totalAdjustments,
        uniqueProducts: productStocks.size,
        transactionCount: transactions.length,
      },
      products: productsList,
      recentTransactions: transactions.slice(0, 10).map(t => ({
        id: t.id,
        type: t.type,
        reason: t.reason,
        quantity: t.quantity,
        productName: t.product?.name || 'Unknown',
        reference: t.reference,
        createdAt: t.createdAt,
      })),
    };
  }

  /**
   * Query inventory transactions with dynamic filters
   */
  async queryInventory(companyId: number, filters: any) {
    // Convert string dates to Date objects
    const processedFilters = { ...filters };

    if (filters.startDate) {
      processedFilters.startDate = new Date(filters.startDate);
    }

    if (filters.endDate) {
      processedFilters.endDate = new Date(filters.endDate);
    }

    return this.inventoryRepository.findWithPagination(companyId, processedFilters);
  }
}
