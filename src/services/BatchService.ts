import { AppDataSource } from '../config/database';
import { InventoryBatch, BatchStatus } from '../entities/InventoryBatch.entity';
import { BatchAllocation } from '../entities/BatchAllocation.entity';
import { BatchReservation, ReservationStatus } from '../entities/BatchReservation.entity';
import { InventoryTransaction, TransactionType } from '../entities/InventoryTransaction.entity';
import { ApiError } from '../middleware/errorHandler.middleware';
import { Repository } from 'typeorm';

/**
 * Interface for batch grouped by unit cost
 */
export interface BatchGroup {
  unitCost: number;
  totalQuantity: number;
  batches: Array<{
    batchId: number;
    batchNumber: string;
    quantity: number;
    expiryDate: Date | null;
    daysUntilExpiry: number | null;
    purchaseDate: Date;
    warehouseId: number | null;
    lotNumber: string | null;
  }>;
  nextToExpire: {
    batchId: number;
    batchNumber: string;
    days: number | null;
  } | null;
}

/**
 * Interface for batch selection by user
 */
export interface BatchSelection {
  batchId: number;
  quantity: number;
}

/**
 * Service for managing inventory batches with price grouping
 */
export class BatchService {
  private batchRepository: Repository<InventoryBatch>;
  private allocationRepository: Repository<BatchAllocation>;
  private reservationRepository: Repository<BatchReservation>;

  constructor() {
    this.batchRepository = AppDataSource.getRepository(InventoryBatch);
    this.allocationRepository = AppDataSource.getRepository(BatchAllocation);
    this.reservationRepository = AppDataSource.getRepository(BatchReservation);
  }

  /**
   * Create a new batch from a purchase transaction
   */
  async createBatch(
    companyId: number,
    productId: number,
    purchaseTransactionId: number,
    data: {
      quantity: number;
      unitCost: number;
      warehouseId?: number;
      expiryDate?: Date;
      lotNumber?: string;
      supplierId?: number;
      notes?: string;
    }
  ): Promise<InventoryBatch> {
    // Generate batch number
    const batchNumber = await this.generateBatchNumber(companyId);

    const batch = this.batchRepository.create({
      companyId,
      productId,
      purchaseTransactionId,
      batchNumber,
      quantityReceived: data.quantity,
      quantityAvailable: data.quantity,
      quantityReserved: 0,
      quantityAllocated: 0,
      unitCost: data.unitCost,
      totalCost: data.quantity * data.unitCost,
      warehouseId: data.warehouseId || null,
      expiryDate: data.expiryDate || null,
      lotNumber: data.lotNumber || null,
      supplierId: data.supplierId || null,
      purchaseDate: new Date(),
      status: BatchStatus.ACTIVE,
      notes: data.notes || null,
    });

    return await this.batchRepository.save(batch);
  }

  /**
   * Get batches for a product grouped by unit cost (HYBRID APPROACH)
   * This provides a simplified view for the frontend
   */
  async getBatchesGroupedByPrice(
    companyId: number,
    productId: number,
    onlyAvailable: boolean = true
  ): Promise<BatchGroup[]> {
    let query = this.batchRepository
      .createQueryBuilder('batch')
      .where('batch.companyId = :companyId', { companyId })
      .andWhere('batch.productId = :productId', { productId });

    if (onlyAvailable) {
      query = query
        .andWhere('batch.status = :status', { status: BatchStatus.ACTIVE })
        .andWhere('batch.quantityAvailable > 0');
    }

    query = query.orderBy('batch.unitCost', 'ASC').addOrderBy('batch.expiryDate', 'ASC', 'NULLS LAST');

    const batches = await query.getMany();

    // Group batches by unit cost
    const groupedByPrice = new Map<number, InventoryBatch[]>();

    for (const batch of batches) {
      const cost = batch.unitCost;
      if (!groupedByPrice.has(cost)) {
        groupedByPrice.set(cost, []);
      }
      groupedByPrice.get(cost)!.push(batch);
    }

    // Convert to BatchGroup array
    const groups: BatchGroup[] = [];

    for (const [unitCost, batchesInGroup] of groupedByPrice.entries()) {
      const totalQuantity = batchesInGroup.reduce(
        (sum, batch) => sum + batch.quantityAvailable,
        0
      );

      const batchDetails = batchesInGroup.map((batch) => ({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: batch.quantityAvailable,
        expiryDate: batch.expiryDate,
        daysUntilExpiry: batch.getDaysUntilExpiry(),
        purchaseDate: batch.purchaseDate,
        warehouseId: batch.warehouseId,
        lotNumber: batch.lotNumber,
      }));

      // Find batch with nearest expiry date
      const nextToExpire = batchesInGroup
        .filter((b) => b.expiryDate !== null)
        .sort((a, b) => {
          if (!a.expiryDate || !b.expiryDate) return 0;
          return a.expiryDate.getTime() - b.expiryDate.getTime();
        })[0];

      groups.push({
        unitCost,
        totalQuantity,
        batches: batchDetails,
        nextToExpire: nextToExpire
          ? {
              batchId: nextToExpire.id,
              batchNumber: nextToExpire.batchNumber,
              days: nextToExpire.getDaysUntilExpiry(),
            }
          : null,
      });
    }

    return groups;
  }

  /**
   * Auto-select batches using FEFO (First Expired, First Out) within same cost
   * This is used when user doesn't manually select batches
   */
  async autoSelectBatches(
    companyId: number,
    productId: number,
    quantityNeeded: number
  ): Promise<BatchSelection[]> {
    // Get all available batches ordered by cost (cheapest first), then expiry date
    const batches = await this.batchRepository
      .createQueryBuilder('batch')
      .where('batch.companyId = :companyId', { companyId })
      .andWhere('batch.productId = :productId', { productId })
      .andWhere('batch.status = :status', { status: BatchStatus.ACTIVE })
      .andWhere('batch.quantityAvailable > 0')
      .orderBy('batch.unitCost', 'ASC')
      .addOrderBy('batch.expiryDate', 'ASC', 'NULLS LAST')
      .addOrderBy('batch.createdAt', 'ASC')
      .getMany();

    const selections: BatchSelection[] = [];
    let remaining = quantityNeeded;

    for (const batch of batches) {
      if (remaining <= 0) break;

      const qtyFromBatch = Math.min(remaining, batch.quantityAvailable);

      selections.push({
        batchId: batch.id,
        quantity: qtyFromBatch,
      });

      remaining -= qtyFromBatch;
    }

    if (remaining > 0) {
      throw new ApiError(
        400,
        'INSUFFICIENT_STOCK',
        `Not enough stock available. Needed: ${quantityNeeded}, Available: ${quantityNeeded - remaining}`
      );
    }

    return selections;
  }

  /**
   * Allocate batches to a sale transaction
   * This is the core function that maintains traceability
   */
  async allocateBatchesToSale(
    companyId: number,
    productId: number,
    transactionId: number,
    selections: BatchSelection[],
    userId: number
  ): Promise<{ allocations: BatchAllocation[]; totalCost: number }> {
    const allocations: BatchAllocation[] = [];
    let totalCost = 0;

    // Validate and process each selection
    for (const selection of selections) {
      const batch = await this.batchRepository.findOne({
        where: { id: selection.batchId, companyId, productId },
      });

      if (!batch) {
        throw new ApiError(404, 'BATCH_NOT_FOUND', `Batch ${selection.batchId} not found`);
      }

      if (!batch.canAllocate(selection.quantity)) {
        throw new ApiError(
          400,
          'INSUFFICIENT_BATCH_STOCK',
          `Batch ${batch.batchNumber} only has ${batch.quantityAvailable} available, requested ${selection.quantity}`
        );
      }

      // Create allocation
      const allocation = this.allocationRepository.create({
        batchId: batch.id,
        transactionId,
        quantity: selection.quantity,
        unitCost: batch.unitCost,
        totalCost: batch.unitCost * selection.quantity,
        userId,
      });

      await this.allocationRepository.save(allocation);

      // Update batch quantities
      batch.quantityAvailable -= selection.quantity;
      batch.quantityAllocated += selection.quantity;

      if (batch.quantityAvailable === 0) {
        batch.status = BatchStatus.DEPLETED;
      }

      await this.batchRepository.save(batch);

      allocations.push(allocation);
      totalCost += allocation.totalCost;
    }

    return { allocations, totalCost };
  }

  /**
   * Create a reservation for future sale
   */
  async createReservation(
    batchId: number,
    quantity: number,
    userId: number,
    expiryHours: number = 24,
    salesOrderId?: number
  ): Promise<BatchReservation> {
    const batch = await this.batchRepository.findOne({ where: { id: batchId } });

    if (!batch) {
      throw new ApiError(404, 'BATCH_NOT_FOUND', 'Batch not found');
    }

    if (batch.quantityAvailable < quantity) {
      throw new ApiError(
        400,
        'INSUFFICIENT_STOCK',
        `Batch has ${batch.quantityAvailable} available, requested ${quantity}`
      );
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    const reservation = this.reservationRepository.create({
      batchId,
      quantity,
      userId,
      salesOrderId: salesOrderId || null,
      expiresAt,
      status: ReservationStatus.ACTIVE,
    });

    await this.reservationRepository.save(reservation);

    // Update batch reserved quantity
    batch.quantityAvailable -= quantity;
    batch.quantityReserved += quantity;
    await this.batchRepository.save(batch);

    return reservation;
  }

  /**
   * Cancel a reservation and release the quantity
   */
  async cancelReservation(reservationId: number): Promise<void> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: ['batch'],
    });

    if (!reservation) {
      throw new ApiError(404, 'RESERVATION_NOT_FOUND', 'Reservation not found');
    }

    if (!reservation.canFulfill()) {
      throw new ApiError(400, 'RESERVATION_NOT_ACTIVE', 'Reservation is not active');
    }

    const batch = reservation.batch;

    // Release reserved quantity
    batch.quantityReserved -= reservation.quantity;
    batch.quantityAvailable += reservation.quantity;
    await this.batchRepository.save(batch);

    reservation.cancel();
    await this.reservationRepository.save(reservation);
  }

  /**
   * Get cost of goods sold for given selections
   */
  async calculateCostOfGoodsSold(selections: BatchSelection[]): Promise<number> {
    let totalCost = 0;

    for (const selection of selections) {
      const batch = await this.batchRepository.findOne({ where: { id: selection.batchId } });

      if (!batch) {
        throw new ApiError(404, 'BATCH_NOT_FOUND', `Batch ${selection.batchId} not found`);
      }

      totalCost += batch.unitCost * selection.quantity;
    }

    return totalCost;
  }

  /**
   * Get allocation history for a product
   */
  async getAllocationHistory(
    companyId: number,
    productId: number,
    limit: number = 50
  ): Promise<BatchAllocation[]> {
    return await this.allocationRepository
      .createQueryBuilder('allocation')
      .innerJoin('allocation.batch', 'batch')
      .where('batch.companyId = :companyId', { companyId })
      .andWhere('batch.productId = :productId', { productId })
      .orderBy('allocation.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Generate unique batch number
   */
  private async generateBatchNumber(companyId: number): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    // Count batches created today
    const count = await this.batchRepository
      .createQueryBuilder('batch')
      .where('batch.companyId = :companyId', { companyId })
      .andWhere('CONVERT(date, batch.createdAt) = CONVERT(date, GETDATE())')
      .getCount();

    const sequence = String(count + 1).padStart(4, '0');

    return `LOTE-${year}${month}${day}-${sequence}`;
  }

  /**
   * Auto-expire old reservations (should be run by cron job)
   */
  async expireOldReservations(): Promise<number> {
    const expiredReservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.status = :status', { status: ReservationStatus.ACTIVE })
      .andWhere('reservation.expiresAt < GETDATE()')
      .getMany();

    for (const reservation of expiredReservations) {
      await this.cancelReservation(reservation.id);
    }

    return expiredReservations.length;
  }
}
