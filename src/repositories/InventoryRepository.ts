import { Repository, Between, FindOptionsWhere, In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { InventoryTransaction, TransactionType, TransactionReason } from '../entities/InventoryTransaction.entity';

export interface InventoryQueryFilters {
  page?: number;
  limit?: number;
  productId?: number;
  warehouseId?: number;
  type?: TransactionType;
  reason?: TransactionReason;
  startDate?: Date;
  endDate?: Date;
  minQuantity?: number;
  maxQuantity?: number;
  reference?: string;
  search?: string;
  sortBy?: 'createdAt' | 'quantity' | 'productId';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedInventoryResponse {
  items: InventoryTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StockSummary {
  productId: number;
  currentStock: number;
  totalInbound: number;
  totalOutbound: number;
  totalAdjustments: number;
  lastTransaction: Date | null;
}

export class InventoryRepository extends Repository<InventoryTransaction> {
  constructor() {
    super(InventoryTransaction, AppDataSource.manager);
  }

  /**
   * Find inventory transactions with pagination and filters
   */
  async findWithPagination(
    companyId: number,
    filters: InventoryQueryFilters
  ): Promise<PaginatedInventoryResponse> {
    const {
      page = 1,
      limit = 20,
      productId,
      warehouseId,
      type,
      reason,
      startDate,
      endDate,
      minQuantity,
      maxQuantity,
      reference,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    // Build where conditions
    const where: FindOptionsWhere<InventoryTransaction> = {
      companyId,
    };

    if (productId) {
      where.productId = productId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (type) {
      where.type = type;
    }

    if (reason) {
      where.reason = reason;
    }

    if (reference) {
      where.reference = reference;
    }

    // Build query
    let queryBuilder = this.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.product', 'product')
      .leftJoinAndSelect('transaction.user', 'user')
      .leftJoinAndSelect('transaction.warehouse', 'warehouse')
      .where(where);

    // Add date range filter
    if (startDate && endDate) {
      queryBuilder = queryBuilder.andWhere(
        'transaction.createdAt BETWEEN :startDate AND :endDate',
        { startDate, endDate }
      );
    } else if (startDate) {
      queryBuilder = queryBuilder.andWhere('transaction.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder = queryBuilder.andWhere('transaction.createdAt <= :endDate', { endDate });
    }

    // Add quantity range filter
    if (minQuantity !== undefined) {
      queryBuilder = queryBuilder.andWhere('ABS(transaction.quantity) >= :minQuantity', { minQuantity });
    }

    if (maxQuantity !== undefined) {
      queryBuilder = queryBuilder.andWhere('ABS(transaction.quantity) <= :maxQuantity', { maxQuantity });
    }

    // Add search filter (product name, SKU, or reference)
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(product.name LIKE :search OR product.sku LIKE :search OR transaction.reference LIKE :search OR transaction.notes LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add sorting
    queryBuilder = queryBuilder.orderBy(`transaction.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder = queryBuilder.skip(skip).take(limit);

    // Execute query
    const items = await queryBuilder.getMany();

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get current stock for a product
   */
  async getCurrentStock(companyId: number, productId: number): Promise<number> {
    const lastTransaction = await this.findOne({
      where: { companyId, productId },
      order: { createdAt: 'DESC' },
    });

    return lastTransaction?.newStock || 0;
  }

  /**
   * Get stock summary for a product
   */
  async getStockSummary(companyId: number, productId: number): Promise<StockSummary> {
    const transactions = await this.find({
      where: { companyId, productId },
      order: { createdAt: 'ASC' },
    });

    const summary: StockSummary = {
      productId,
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
      } else if (transaction.type === TransactionType.OUTBOUND) {
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
   * Get stock summaries for multiple products
   */
  async getMultipleStockSummaries(companyId: number, productIds: number[]): Promise<StockSummary[]> {
    const summaries: StockSummary[] = [];

    for (const productId of productIds) {
      const summary = await this.getStockSummary(companyId, productId);
      summaries.push(summary);
    }

    return summaries;
  }

  /**
   * Get transactions by type
   */
  async findByType(
    companyId: number,
    type: TransactionType,
    limit: number = 100
  ): Promise<InventoryTransaction[]> {
    return this.find({
      where: { companyId, type },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['product', 'user'],
    });
  }

  /**
   * Get transactions by date range
   */
  async findByDateRange(
    companyId: number,
    startDate: Date,
    endDate: Date
  ): Promise<InventoryTransaction[]> {
    return this.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.product', 'product')
      .leftJoinAndSelect('transaction.user', 'user')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('transaction.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get total quantity by transaction type for a date range
   */
  async getTotalsByType(
    companyId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{ type: TransactionType; total: number }[]> {
    const result = await this.createQueryBuilder('transaction')
      .select('transaction.type', 'type')
      .addSelect('SUM(ABS(transaction.quantity))', 'total')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('transaction.type')
      .getRawMany();

    return result.map((r) => ({
      type: r.type as TransactionType,
      total: parseFloat(r.total) || 0,
    }));
  }

  /**
   * Get transactions for a specific product in a date range
   */
  async getProductHistory(
    companyId: number,
    productId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<InventoryTransaction[]> {
    let queryBuilder = this.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.productId = :productId', { productId });

    if (startDate && endDate) {
      queryBuilder = queryBuilder.andWhere(
        'transaction.createdAt BETWEEN :startDate AND :endDate',
        { startDate, endDate }
      );
    }

    return queryBuilder.orderBy('transaction.createdAt', 'DESC').getMany();
  }

  /**
   * Get low stock products based on minimum stock levels
   */
  async getLowStockProducts(companyId: number): Promise<StockSummary[]> {
    // Get all products for the company with their minimum stock
    const products = await AppDataSource.manager
      .createQueryBuilder()
      .select('p.id', 'productId')
      .addSelect('p.minimum_stock', 'minimumStock')
      .from('products', 'p')
      .where('p.company_id = :companyId', { companyId })
      .andWhere('p.is_active = 1')
      .getRawMany();

    const lowStockProducts: StockSummary[] = [];

    for (const product of products) {
      const summary = await this.getStockSummary(companyId, product.productId);

      if (summary.currentStock <= product.minimumStock) {
        lowStockProducts.push(summary);
      }
    }

    return lowStockProducts;
  }

  /**
   * Count transactions by company
   */
  async countByCompany(companyId: number): Promise<number> {
    return this.count({ where: { companyId } });
  }

  /**
   * Get last N transactions for a company
   */
  async getRecentTransactions(companyId: number, limit: number = 10): Promise<InventoryTransaction[]> {
    return this.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['product', 'user'],
    });
  }
}
