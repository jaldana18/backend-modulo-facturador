import { Request, Response } from 'express';
import { InventoryService } from '../services/InventoryService';
import { CreateTransactionDto } from '../dto/inventory/create-transaction.dto';
import { AdjustStockDto } from '../dto/inventory/adjust-stock.dto';
import { QueryTransactionsDto } from '../dto/inventory/query-transactions.dto';
import { QueryInventoryDto } from '../dto/inventory/query-inventory.dto';
import { BulkTransactionDto } from '../dto/inventory/bulk-transaction.dto';
import { TransferWarehouseDto } from '../dto/inventory/transfer-warehouse.dto';
import { validateDto } from '../utils/validators.util';
import { ApiResponse } from '../common.types';

export class InventoryController {
  private inventoryService = new InventoryService();

  /**
   * GET /api/v1/inventory/transactions
   * Get all inventory transactions with filters
   */
  getTransactions = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    // Validate query params
    const queryDto = await validateDto(QueryTransactionsDto, req.query);

    // Convert date strings to Date objects if provided
    const filters = {
      ...queryDto,
      startDate: queryDto.startDate ? new Date(queryDto.startDate) : undefined,
      endDate: queryDto.endDate ? new Date(queryDto.endDate) : undefined,
    };

    const result = await this.inventoryService.getTransactions(companyId, filters);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/inventory/transactions/:id
   * Get transaction by ID
   */
  getTransactionById = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const transactionId = parseInt(req.params.id);

    const transaction = await this.inventoryService.getTransactionById(companyId, transactionId);

    const response: ApiResponse = {
      success: true,
      data: transaction,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/inventory/transactions
   * Create a new inventory transaction
   */
  createTransaction = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    // Validate DTO
    const createDto = await validateDto(CreateTransactionDto, req.body);

    // Create transaction
    const transaction = await this.inventoryService.createTransaction(companyId, userId, createDto);

    const response: ApiResponse = {
      success: true,
      data: transaction,
    };

    res.status(201).json(response);
  };

  /**
   * POST /api/v1/inventory/adjust
   * Adjust stock to a specific value
   */
  adjustStock = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    // Validate DTO
    const adjustDto = await validateDto(AdjustStockDto, req.body);

    // Adjust stock
    const transaction = await this.inventoryService.adjustStock(companyId, userId, adjustDto);

    const response: ApiResponse = {
      success: true,
      data: transaction,
    };

    res.status(201).json(response);
  };

  /**
   * GET /api/v1/inventory/stock/:productId
   * Get current stock for a product
   */
  getCurrentStock = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const productId = parseInt(req.params.productId);

    const currentStock = await this.inventoryService.getCurrentStock(companyId, productId);

    const response: ApiResponse = {
      success: true,
      data: { productId, currentStock },
    };

    res.json(response);
  };

  /**
   * GET /api/v1/inventory/summary/:productId
   * Get stock summary for a product
   */
  getStockSummary = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const productId = parseInt(req.params.productId);

    const summary = await this.inventoryService.getStockSummary(companyId, productId);

    const response: ApiResponse = {
      success: true,
      data: summary,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/inventory/history/:productId
   * Get transaction history for a product
   */
  getProductHistory = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const productId = parseInt(req.params.productId);

    // Optional date range
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const history = await this.inventoryService.getProductHistory(
      companyId,
      productId,
      startDate,
      endDate
    );

    const response: ApiResponse = {
      success: true,
      data: history,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/inventory/low-stock
   * Get products with low stock
   */
  getLowStockProducts = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const lowStockProducts = await this.inventoryService.getLowStockProducts(companyId);

    const response: ApiResponse = {
      success: true,
      data: lowStockProducts,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/inventory/recent
   * Get recent transactions
   */
  getRecentTransactions = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const transactions = await this.inventoryService.getRecentTransactions(companyId, limit);

    const response: ApiResponse = {
      success: true,
      data: transactions,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/inventory/bulk/inbound
   * Create multiple inbound transactions
   */
  bulkInbound = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    // Validate DTO
    const bulkDto = await validateDto(BulkTransactionDto, req.body);

    // Create bulk inbound transactions
    const transactions = await this.inventoryService.bulkInbound(
      companyId,
      userId,
      bulkDto.items,
      bulkDto.warehouseId,
      bulkDto.reason,
      bulkDto.notes
    );

    const response: ApiResponse = {
      success: true,
      data: transactions,
    };

    res.status(201).json(response);
  };

  /**
   * POST /api/v1/inventory/bulk/outbound
   * Create multiple outbound transactions
   */
  bulkOutbound = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    // Validate DTO
    const bulkDto = await validateDto(BulkTransactionDto, req.body);

    // Create bulk outbound transactions
    const transactions = await this.inventoryService.bulkOutbound(
      companyId,
      userId,
      bulkDto.items,
      bulkDto.warehouseId,
      bulkDto.reason,
      bulkDto.notes
    );

    const response: ApiResponse = {
      success: true,
      data: transactions,
    };

    res.status(201).json(response);
  };

  /**
   * GET /api/v1/inventory/reports/totals
   * Get totals by transaction type for a date range
   */
  getTotalsByType = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    // Get date range from query params
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1); // First day of current month

    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date(); // Today

    const totals = await this.inventoryService.getTotalsByType(companyId, startDate, endDate);

    const response: ApiResponse = {
      success: true,
      data: {
        startDate,
        endDate,
        totals,
      },
    };

    res.json(response);
  };

  /**
   * GET /api/v1/inventory/stock/:productId/warehouses
   * Get stock across all warehouses for a product
   */
  getStockByAllWarehouses = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const productId = parseInt(req.params.productId);

    const stockByWarehouse = await this.inventoryService.getStockByAllWarehouses(companyId, productId);

    const response: ApiResponse = {
      success: true,
      data: stockByWarehouse,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/inventory/stock/:productId/warehouse/:warehouseId
   * Get current stock for a product in a specific warehouse
   */
  getStockByWarehouse = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const productId = parseInt(req.params.productId);
    const warehouseId = parseInt(req.params.warehouseId);

    const currentStock = await this.inventoryService.getCurrentStockByWarehouse(
      companyId,
      productId,
      warehouseId
    );

    const response: ApiResponse = {
      success: true,
      data: { productId, warehouseId, currentStock },
    };

    res.json(response);
  };

  /**
   * GET /api/v1/inventory/summary/:productId/warehouse/:warehouseId
   * Get stock summary for a product in a specific warehouse
   */
  getStockSummaryByWarehouse = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const productId = parseInt(req.params.productId);
    const warehouseId = parseInt(req.params.warehouseId);

    const summary = await this.inventoryService.getStockSummaryByWarehouse(
      companyId,
      productId,
      warehouseId
    );

    const response: ApiResponse = {
      success: true,
      data: summary,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/inventory/transfer
   * Transfer stock between warehouses
   */
  transferBetweenWarehouses = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    // Validate DTO
    const transferDto = await validateDto(TransferWarehouseDto, req.body);

    // Execute transfer
    const result = await this.inventoryService.transferBetweenWarehouses(
      companyId,
      userId,
      transferDto.productId,
      transferDto.fromWarehouseId,
      transferDto.toWarehouseId,
      transferDto.quantity,
      transferDto.reference,
      transferDto.notes
    );

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.status(201).json(response);
  };

  /**
   * GET /api/v1/inventory/query
   * Query inventory with dynamic filters
   */
  queryInventory = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    // Validate query params
    const queryDto = await validateDto(QueryInventoryDto, req.query);

    const result = await this.inventoryService.queryInventory(companyId, queryDto);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/inventory/warehouses/summary
   * Get inventory summary for all warehouses
   */
  getWarehousesSummary = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const summaries = await this.inventoryService.getWarehousesSummary(companyId);

    const response: ApiResponse = {
      success: true,
      data: summaries,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/inventory/warehouses/:warehouseId/summary
   * Get inventory summary for a specific warehouse
   */
  getWarehouseSummary = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const warehouseId = parseInt(req.params.warehouseId);

    const summary = await this.inventoryService.getWarehouseSummary(companyId, warehouseId);

    const response: ApiResponse = {
      success: true,
      data: summary,
    };

    res.json(response);
  };
}
