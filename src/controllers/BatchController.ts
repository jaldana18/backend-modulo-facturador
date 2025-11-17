import { Request, Response } from 'express';
import { BatchService } from '../services/BatchService';
import { ApiError } from '../middleware/errorHandler.middleware';

/**
 * Controller for batch management endpoints
 */
export class BatchController {
  private batchService: BatchService;

  constructor() {
    this.batchService = new BatchService();
  }

  /**
   * GET /api/v1/batches/products/:productId/grouped
   * Get batches for a product grouped by unit cost (HYBRID VIEW)
   */
  getBatchesGroupedByPrice = async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    const { onlyAvailable } = req.query;
    const companyId = req.user!.companyId;

    const groups = await this.batchService.getBatchesGroupedByPrice(
      companyId,
      parseInt(productId),
      onlyAvailable === 'true'
    );

    res.json({
      success: true,
      data: groups,
    });
  };

  /**
   * POST /api/v1/batches/auto-select
   * Auto-select batches for a sale using FEFO logic
   */
  autoSelectBatches = async (req: Request, res: Response): Promise<void> => {
    const { productId, quantity } = req.body;
    const companyId = req.user!.companyId;

    if (!productId || !quantity) {
      throw new ApiError(400, 'MISSING_FIELDS', 'Product ID and quantity are required');
    }

    const selections = await this.batchService.autoSelectBatches(
      companyId,
      productId,
      quantity
    );

    const totalCost = await this.batchService.calculateCostOfGoodsSold(selections);

    res.json({
      success: true,
      data: {
        selections,
        totalCost,
        message: 'Batches auto-selected using FEFO (First Expired, First Out) logic',
      },
    });
  };

  /**
   * POST /api/v1/batches/calculate-cost
   * Calculate total cost for selected batches
   */
  calculateCost = async (req: Request, res: Response): Promise<void> => {
    const { selections } = req.body;

    if (!selections || !Array.isArray(selections)) {
      throw new ApiError(400, 'INVALID_SELECTIONS', 'Selections must be an array');
    }

    const totalCost = await this.batchService.calculateCostOfGoodsSold(selections);

    res.json({
      success: true,
      data: {
        totalCost,
        itemCount: selections.length,
        totalQuantity: selections.reduce((sum: number, s: any) => sum + s.quantity, 0),
      },
    });
  };

  /**
   * POST /api/v1/batches/reservations
   * Create a batch reservation
   */
  createReservation = async (req: Request, res: Response): Promise<void> => {
    const { batchId, quantity, expiryHours, salesOrderId } = req.body;
    const userId = req.user!.userId;

    if (!batchId || !quantity) {
      throw new ApiError(400, 'MISSING_FIELDS', 'Batch ID and quantity are required');
    }

    const reservation = await this.batchService.createReservation(
      batchId,
      quantity,
      userId,
      expiryHours || 24,
      salesOrderId
    );

    res.status(201).json({
      success: true,
      data: reservation,
      message: 'Batch reserved successfully',
    });
  };

  /**
   * DELETE /api/v1/batches/reservations/:reservationId
   * Cancel a batch reservation
   */
  cancelReservation = async (req: Request, res: Response): Promise<void> => {
    const { reservationId } = req.params;

    await this.batchService.cancelReservation(parseInt(reservationId));

    res.json({
      success: true,
      message: 'Reservation cancelled successfully',
    });
  };

  /**
   * GET /api/v1/batches/products/:productId/allocations
   * Get allocation history for a product
   */
  getAllocationHistory = async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    const { limit } = req.query;
    const companyId = req.user!.companyId;

    const allocations = await this.batchService.getAllocationHistory(
      companyId,
      parseInt(productId),
      limit ? parseInt(limit as string) : 50
    );

    res.json({
      success: true,
      data: allocations,
    });
  };
}