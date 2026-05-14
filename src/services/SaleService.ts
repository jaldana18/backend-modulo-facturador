import { AppDataSource } from '../config/database';
import { Sale, SaleStatus, SaleType, DiscountType } from '../entities/Sale.entity';
import { SaleDetail } from '../entities/SaleDetail.entity';
import { Product } from '../entities/Product.entity';
import { CreateSaleDto } from '../dto/sale/create-sale.dto';
import { UpdateSaleDto } from '../dto/sale/update-sale.dto';
import { QuerySalesDto } from '../dto/sale/query-sales.dto';
import { ApiError } from '../middleware/errorHandler.middleware';
import { loggers } from '../config/logger';
import { PaginatedResponse } from '../common.types';
import { CustomerService } from './CustomerService';
import { InventoryService } from './InventoryService';
import { TransactionReason } from '../entities/InventoryTransaction.entity';
import { ActivityType } from '../entities/ActivityLog.entity';

export class SaleService {
  private saleRepository = AppDataSource.getRepository(Sale);
  private saleDetailRepository = AppDataSource.getRepository(SaleDetail);
  private productRepository = AppDataSource.getRepository(Product);
  private customerService = new CustomerService();
  private inventoryService = new InventoryService();

  /**
   * Validate discount configuration
   */
  private validateDiscount(dto: CreateSaleDto | UpdateSaleDto): void {
    if (!dto.discountType || dto.discountType === DiscountType.NONE) {
      return; // No discount, no validation needed
    }

    if (dto.discountType === DiscountType.PERCENTAGE) {
      if (dto.discountPercentage === undefined || dto.discountPercentage === null) {
        throw new ApiError(
          400,
          'MISSING_DISCOUNT_PERCENTAGE',
          'Discount percentage is required when discount type is percentage'
        );
      }
      if (dto.discountPercentage < 0 || dto.discountPercentage > 100) {
        throw new ApiError(
          400,
          'INVALID_DISCOUNT_PERCENTAGE',
          'Discount percentage must be between 0 and 100'
        );
      }
    }

    if (dto.discountType === DiscountType.FIXED) {
      if (dto.discountAmount === undefined || dto.discountAmount === null) {
        throw new ApiError(
          400,
          'MISSING_DISCOUNT_AMOUNT',
          'Discount amount is required when discount type is fixed'
        );
      }
      if (dto.discountAmount < 0) {
        throw new ApiError(400, 'INVALID_DISCOUNT_AMOUNT', 'Discount amount must be at least 0');
      }
    }
  }

  /**
   * Generate unique sale number
   */
  private async generateSaleNumber(companyId: number, saleType: SaleType): Promise<string> {
    const prefix = this.getSaleNumberPrefix(saleType);

    const lastSale = await this.saleRepository
      .createQueryBuilder('sale')
      .where('sale.companyId = :companyId', { companyId })
      .andWhere('sale.saleType = :saleType', { saleType })
      .orderBy('sale.id', 'DESC')
      .getOne();

    if (!lastSale || !lastSale.saleNumber) {
      return `${prefix}-0001`;
    }

    const match = lastSale.saleNumber.match(/(\d+)$/);
    if (match) {
      const nextNumber = parseInt(match[1], 10) + 1;
      return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
    }

    return `${prefix}-0001`;
  }

  /**
   * Get sale number prefix based on type
   */
  private getSaleNumberPrefix(saleType: SaleType): string {
    const prefixes: Record<SaleType, string> = {
      quote: 'COT',
      proforma: 'PRO',
      invoice: 'FAC',
      remission: 'REM',
      credit_note: 'NC',
    };
    return prefixes[saleType] || 'VEN';
  }

  /**
   * Get all sales with pagination and filters
   */
  async getSales(companyId: number, query: QuerySalesDto): Promise<PaginatedResponse<Sale>> {
    const { page = 1, limit = 10, status, type, customerId, startDate, endDate, search, paymentStatus } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.customer', 'customer')
      .leftJoinAndSelect('sale.user', 'user')
      .leftJoinAndSelect('sale.details', 'details')
      .where('sale.companyId = :companyId', { companyId });

    if (status) {
      queryBuilder.andWhere('sale.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('sale.saleType = :type', { type });
    }

    if (customerId) {
      queryBuilder.andWhere('sale.customerId = :customerId', { customerId });
    }

    if (startDate) {
      queryBuilder.andWhere('sale.saleDate >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('sale.saleDate <= :endDate', { endDate });
    }

    if (search) {
      queryBuilder.andWhere(
        '(sale.saleNumber LIKE :search OR customer.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (paymentStatus) {
      queryBuilder.andWhere('sale.paymentStatus = :paymentStatus', { paymentStatus });
    }

    const total = await queryBuilder.getCount();

    const sales = await queryBuilder
      .orderBy('sale.saleDate', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      items: sales,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get sale by ID
   */
  async getSaleById(companyId: number, saleId: number): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, companyId },
      relations: ['customer', 'user', 'warehouse', 'details', 'details.product'],
    });

    if (!sale) {
      throw new ApiError(404, 'SALE_NOT_FOUND', 'Sale not found');
    }

    return sale;
  }

  /**
   * Create sale in draft status
   */
  async createSale(companyId: number, userId: number, dto: CreateSaleDto): Promise<Sale> {
    // Validate discount configuration
    this.validateDiscount(dto);

    // Verify customer exists
    await this.customerService.getCustomerById(companyId, dto.customerId);

    // Verify all products exist
    const productIds = dto.details.map((d) => d.productId);
    const products = await this.productRepository.find({
      where: productIds.map((id) => ({ id, companyId })),
    });

    if (products.length !== productIds.length) {
      throw new ApiError(400, 'INVALID_PRODUCTS', 'One or more products not found');
    }

    // Generate sale number
    const saleNumber = await this.generateSaleNumber(companyId, dto.saleType);

    return AppDataSource.transaction(async (manager) => {
      // Create sale
      const sale = manager.create(Sale, {
        companyId,
        saleNumber,
        saleType: dto.saleType,
        status: SaleStatus.DRAFT,
        customerId: dto.customerId,
        userId,
        warehouseId: dto.warehouseId || null,
        saleDate: dto.saleDate ? new Date(dto.saleDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        taxPercentage: dto.taxPercentage !== undefined ? dto.taxPercentage : 19,
        discountType: dto.discountType || DiscountType.NONE,
        discountPercentage: dto.discountPercentage || 0,
        discountAmount: dto.discountAmount || 0,
        discountReason: dto.discountReason || null,
        referenceSaleId: dto.referenceSaleId || null,
        notes: dto.notes || null,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
        paidAmount: 0, // must be initialized so calculateTotals() can compute balance correctly
      });

      // Create details
      const details = dto.details.map((detail) => {
        const product = products.find((p) => p.id === detail.productId)!;

        const saleDetail = manager.create(SaleDetail, {
          sale,
          productId: detail.productId,
          description: product.name,
          quantity: detail.quantity,
          unitPrice: detail.unitPrice,
          taxPercentage: detail.taxPercentage !== undefined ? detail.taxPercentage : 19,
          discountPercentage: detail.discountPercentage || 0,
          discountAmount: 0,
          lineTotal: 0,
          isKit: false,
        });

        // Calculate line total
        saleDetail.calculateLineTotal();

        return saleDetail;
      });

      // Calculate sale totals before saving
      sale.subtotal = details.reduce((sum, d) => sum + d.getSubtotal(), 0);
      sale.calculateTotals();

      // Save sale first to get the IDENTITY id via SQL Server OUTPUT INSERTED
      const savedSale = await manager.save(Sale, sale);
      const saleId = savedSale.id ?? sale.id;

      if (!saleId) {
        throw new ApiError(500, 'SALE_ID_NOT_GENERATED', 'Sale ID was not generated after insert');
      }

      // Insert sale_details via raw SQL — TypeORM's ORM layer cannot resolve the FK
      // when both @Column saleId and @ManyToOne sale reference the same column (SQL Server quirk)
      for (const d of details) {
        await manager.query(
          `INSERT INTO sale_details (sale_id, product_id, description, quantity, unit_price, tax_percentage, discount_percentage, discount_amount, line_total, is_kit, metadata) VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10)`,
          [saleId, d.productId, d.description, d.quantity, d.unitPrice, d.taxPercentage, d.discountPercentage, d.discountAmount, d.lineTotal, d.isKit, d.metadata]
        );
      }

      sale.id = saleId;
      sale.details = details;

      loggers.logOperation('sale_created', userId, companyId, {
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        total: sale.total,
      });

      // Log user activity
      await loggers.logActivity({
        companyId,
        userId,
        activityType: ActivityType.SALE_CREATE,
        description: `Creó ${sale.saleType === 'invoice' ? 'factura' : 'cotización'} ${sale.saleNumber} por $${sale.total.toFixed(2)}`,
        entityType: 'sale',
        entityId: sale.id,
        entityName: sale.saleNumber,
        metadata: {
          saleType: sale.saleType,
          customerId: sale.customerId,
          totalAmount: sale.total,
          itemCount: details.length,
        },
      });

      return sale;
    });
  }

  /**
   * Update sale (only if in draft status)
   */
  async updateSale(
    companyId: number,
    userId: number,
    saleId: number,
    dto: UpdateSaleDto
  ): Promise<Sale> {
    // Validate discount configuration if provided
    if (dto.discountType !== undefined) {
      this.validateDiscount(dto);
    }

    const sale = await this.getSaleById(companyId, saleId);

    if (!sale.isDraft()) {
      throw new ApiError(400, 'CANNOT_EDIT_SALE', 'Can only edit sales in draft status');
    }

    if (dto.warehouseId !== undefined) sale.warehouseId = dto.warehouseId || null;
    if (dto.saleDate !== undefined) sale.saleDate = new Date(dto.saleDate);
    if (dto.dueDate !== undefined) sale.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.taxPercentage !== undefined) sale.taxPercentage = dto.taxPercentage;
    if (dto.discountType !== undefined) sale.discountType = dto.discountType;
    if (dto.discountPercentage !== undefined) sale.discountPercentage = dto.discountPercentage;
    if (dto.discountAmount !== undefined) sale.discountAmount = dto.discountAmount;
    if (dto.discountReason !== undefined) sale.discountReason = dto.discountReason || null;
    if (dto.notes !== undefined) sale.notes = dto.notes || null;
    if (dto.metadata !== undefined) {
      sale.metadata = dto.metadata ? JSON.stringify(dto.metadata) : null;
    }

    sale.calculateTotals();
    await this.saleRepository.save(sale);

    loggers.logOperation('sale_updated', userId, companyId, {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
    });

    return sale;
  }

  /**
   * Delete sale (only if in draft status)
   */
  async deleteSale(companyId: number, userId: number, saleId: number): Promise<void> {
    const sale = await this.getSaleById(companyId, saleId);

    if (!sale.isDraft()) {
      throw new ApiError(400, 'CANNOT_DELETE_SALE', 'Can only delete sales in draft status');
    }

    await this.saleRepository.remove(sale);

    loggers.logOperation('sale_deleted', userId, companyId, {
      saleId,
      saleNumber: sale.saleNumber,
    });
  }

  /**
   * Confirm sale and affect inventory
   * Changes status from DRAFT to CONFIRMED and creates inventory outbound transactions
   */
  async confirmSale(companyId: number, userId: number, saleId: number): Promise<Sale> {
    const sale = await this.getSaleById(companyId, saleId);

    // Validate sale can be confirmed
    if (!sale.isDraft()) {
      throw new ApiError(400, 'SALE_NOT_DRAFT', 'Can only confirm sales in draft status');
    }

    if (!sale.warehouseId) {
      throw new ApiError(400, 'WAREHOUSE_REQUIRED', 'Warehouse is required to confirm sale');
    }

    if (!sale.details || sale.details.length === 0) {
      throw new ApiError(400, 'NO_DETAILS', 'Sale must have at least one detail');
    }

    // Validate stock availability for all products
    for (const detail of sale.details) {
      const currentStock = await this.inventoryService.getCurrentStockByWarehouse(
        companyId,
        detail.productId,
        sale.warehouseId
      );

      if (currentStock < detail.quantity) {
        const product = await this.productRepository.findOne({
          where: { id: detail.productId, companyId },
        });
        throw new ApiError(
          400,
          'INSUFFICIENT_STOCK',
          `Insufficient stock for product "${product?.name || detail.productId}". Available: ${currentStock}, Required: ${detail.quantity}`
        );
      }
    }

    // Use database transaction to ensure atomicity
    return AppDataSource.transaction(async (manager) => {
      // Create inventory outbound transactions for each detail
      for (const detail of sale.details) {
        await this.inventoryService.recordOutbound(
          companyId,
          userId,
          detail.productId,
          detail.quantity,
          TransactionReason.SALE,
          {
            reference: sale.saleNumber,
            notes: `Sale to customer ${sale.customer?.name || sale.customerId}`,
            metadata: {
              saleId: sale.id,
              saleDetailId: detail.id,
            },
          }
        );
      }

      // Update sale status
      sale.status = SaleStatus.CONFIRMED;
      await manager.save(Sale, sale);

      loggers.logOperation('sale_confirmed', userId, companyId, {
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        itemCount: sale.details.length,
        warehouseId: sale.warehouseId,
      });

      return sale;
    });
  }

  /**
   * Convert quote to invoice
   * Creates a new sale with DRAFT status based on quote
   */
  async convertQuoteToInvoice(
    companyId: number,
    userId: number,
    quoteId: number
  ): Promise<Sale> {
    const quote = await this.getSaleById(companyId, quoteId);

    // Validate it's a quote
    if (quote.saleType !== SaleType.QUOTE) {
      throw new ApiError(400, 'NOT_A_QUOTE', 'Sale is not a quote');
    }

    // Generate new invoice number
    const invoiceNumber = await this.generateSaleNumber(companyId, SaleType.INVOICE);

    return AppDataSource.transaction(async (manager) => {
      // Create new invoice based on quote
      const invoice = manager.create(Sale, {
        companyId,
        saleNumber: invoiceNumber,
        saleType: SaleType.INVOICE,
        status: SaleStatus.DRAFT,
        customerId: quote.customerId,
        userId,
        warehouseId: quote.warehouseId,
        saleDate: new Date(),
        dueDate: quote.dueDate,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        taxPercentage: quote.taxPercentage,
        discountAmount: quote.discountAmount,
        total: quote.total,
        referenceSaleId: quote.id,
        notes: `Converted from quote ${quote.saleNumber}`,
        metadata: JSON.stringify({
          convertedFrom: {
            id: quote.id,
            saleNumber: quote.saleNumber,
            saleType: quote.saleType,
          },
        }),
      });

      // Copy details from quote
      const details = quote.details.map((quoteDetail) =>
        manager.create(SaleDetail, {
          sale: invoice,
          productId: quoteDetail.productId,
          description: quoteDetail.description,
          quantity: quoteDetail.quantity,
          unitPrice: quoteDetail.unitPrice,
          taxPercentage: quoteDetail.taxPercentage,
          discountPercentage: quoteDetail.discountPercentage,
          discountAmount: quoteDetail.discountAmount,
          lineTotal: quoteDetail.lineTotal,
          isKit: quoteDetail.isKit,
        })
      );

      invoice.details = details;

      await manager.save(Sale, invoice);
      await manager.save(SaleDetail, details);

      // Update quote status
      quote.status = SaleStatus.INVOICED;
      await manager.save(Sale, quote);

      loggers.logOperation('quote_converted_to_invoice', userId, companyId, {
        quoteId: quote.id,
        quoteNumber: quote.saleNumber,
        invoiceId: invoice.id,
        invoiceNumber: invoice.saleNumber,
      });

      return invoice;
    });
  }

  /**
   * Convert quote to proforma invoice
   * Creates a new sale with DRAFT status based on quote
   */
  async convertQuoteToProforma(
    companyId: number,
    userId: number,
    quoteId: number
  ): Promise<Sale> {
    const quote = await this.getSaleById(companyId, quoteId);

    // Validate it's a quote
    if (quote.saleType !== SaleType.QUOTE) {
      throw new ApiError(400, 'NOT_A_QUOTE', 'Sale is not a quote');
    }

    // Generate new proforma number
    const proformaNumber = await this.generateSaleNumber(companyId, SaleType.PROFORMA);

    return AppDataSource.transaction(async (manager) => {
      // Create new proforma based on quote
      const proforma = manager.create(Sale, {
        companyId,
        saleNumber: proformaNumber,
        saleType: SaleType.PROFORMA,
        status: SaleStatus.DRAFT,
        customerId: quote.customerId,
        userId,
        warehouseId: quote.warehouseId,
        saleDate: new Date(),
        dueDate: quote.dueDate,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        taxPercentage: quote.taxPercentage,
        discountAmount: quote.discountAmount,
        total: quote.total,
        referenceSaleId: quote.id,
        notes: `Converted from quote ${quote.saleNumber}`,
        metadata: JSON.stringify({
          convertedFrom: {
            id: quote.id,
            saleNumber: quote.saleNumber,
            saleType: quote.saleType,
          },
        }),
      });

      // Copy details from quote
      const details = quote.details.map((quoteDetail) =>
        manager.create(SaleDetail, {
          sale: proforma,
          productId: quoteDetail.productId,
          description: quoteDetail.description,
          quantity: quoteDetail.quantity,
          unitPrice: quoteDetail.unitPrice,
          taxPercentage: quoteDetail.taxPercentage,
          discountPercentage: quoteDetail.discountPercentage,
          discountAmount: quoteDetail.discountAmount,
          lineTotal: quoteDetail.lineTotal,
          isKit: quoteDetail.isKit,
        })
      );

      proforma.details = details;

      await manager.save(Sale, proforma);
      await manager.save(SaleDetail, details);

      // Update quote status
      quote.status = SaleStatus.PROFORMA;
      await manager.save(Sale, quote);

      loggers.logOperation('quote_converted_to_proforma', userId, companyId, {
        quoteId: quote.id,
        quoteNumber: quote.saleNumber,
        proformaId: proforma.id,
        proformaNumber: proforma.saleNumber,
      });

      return proforma;
    });
  }

  /**
   * Cancel sale and reverse inventory if it was confirmed
   */
  async cancelSale(companyId: number, userId: number, saleId: number): Promise<Sale> {
    const sale = await this.getSaleById(companyId, saleId);

    // Validate sale can be cancelled
    if (!sale.canCancel()) {
      throw new ApiError(400, 'CANNOT_CANCEL', 'Sale cannot be cancelled in current status');
    }

    // Check if there are payments
    if (sale.paidAmount > 0) {
      throw new ApiError(
        400,
        'HAS_PAYMENTS',
        'Cannot cancel sale with payments. Create a credit note instead'
      );
    }

    return AppDataSource.transaction(async (manager) => {
      // If sale affected inventory, reverse it
      if (sale.affectsInventory() && sale.warehouseId) {
        for (const detail of sale.details) {
          await this.inventoryService.recordInbound(
            companyId,
            userId,
            detail.productId,
            detail.quantity,
            TransactionReason.RETURN,
            {
              reference: `CANCEL-${sale.saleNumber}`,
              notes: `Sale cancellation - ${sale.saleNumber}`,
              metadata: {
                saleId: sale.id,
                saleDetailId: detail.id,
                action: 'cancellation',
              },
            }
          );
        }
      }

      // Update sale status
      sale.status = SaleStatus.CANCELLED;
      await manager.save(Sale, sale);

      loggers.logOperation('sale_cancelled', userId, companyId, {
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        inventoryReversed: sale.affectsInventory(),
      });

      // Log user activity
      await loggers.logActivity({
        companyId,
        userId,
        activityType: ActivityType.SALE_CANCEL,
        description: `Canceló ${sale.saleType === 'invoice' ? 'factura' : 'cotización'} ${sale.saleNumber} por $${sale.total.toFixed(2)}`,
        entityType: 'sale',
        entityId: sale.id,
        entityName: sale.saleNumber,
        metadata: {
          saleType: sale.saleType,
          totalAmount: sale.total,
          inventoryReversed: sale.affectsInventory(),
        },
      });

      return sale;
    });
  }

  /**
   * Create credit note for a sale
   * Creates a new credit note sale that reverses the original sale
   */
  async createCreditNote(
    companyId: number,
    userId: number,
    originalSaleId: number,
    reason: string
  ): Promise<Sale> {
    const originalSale = await this.getSaleById(companyId, originalSaleId);

    // Validate original sale can have a credit note
    if (originalSale.saleType === SaleType.CREDIT_NOTE) {
      throw new ApiError(400, 'INVALID_SALE_TYPE', 'Cannot create credit note from credit note');
    }

    if (!originalSale.affectsInventory()) {
      throw new ApiError(
        400,
        'SALE_NOT_CONFIRMED',
        'Can only create credit notes for confirmed/invoiced sales'
      );
    }

    if (originalSale.status === SaleStatus.CANCELLED) {
      throw new ApiError(400, 'SALE_CANCELLED', 'Cannot create credit note for cancelled sale');
    }

    if (originalSale.status === SaleStatus.CREDITED) {
      throw new ApiError(400, 'ALREADY_CREDITED', 'Sale already has a credit note');
    }

    // Generate credit note number
    const creditNoteNumber = await this.generateSaleNumber(companyId, SaleType.CREDIT_NOTE);

    return AppDataSource.transaction(async (manager) => {
      // Create credit note (negative amounts)
      const creditNote = manager.create(Sale, {
        companyId,
        saleNumber: creditNoteNumber,
        saleType: SaleType.CREDIT_NOTE,
        status: SaleStatus.CONFIRMED,
        customerId: originalSale.customerId,
        userId,
        warehouseId: originalSale.warehouseId,
        saleDate: new Date(),
        dueDate: null,
        subtotal: -originalSale.subtotal,
        taxAmount: -originalSale.taxAmount,
        taxPercentage: originalSale.taxPercentage,
        discountAmount: 0,
        total: -originalSale.total,
        paidAmount: 0,
        balance: -originalSale.total,
        referenceSaleId: originalSale.id,
        notes: `Credit note for ${originalSale.saleNumber}. Reason: ${reason}`,
        metadata: JSON.stringify({
          creditNoteFor: {
            id: originalSale.id,
            saleNumber: originalSale.saleNumber,
            saleType: originalSale.saleType,
          },
          reason,
        }),
      });

      // Copy details from original sale (negative quantities)
      const details = originalSale.details.map((originalDetail) =>
        manager.create(SaleDetail, {
          sale: creditNote,
          productId: originalDetail.productId,
          description: originalDetail.description,
          quantity: -originalDetail.quantity,
          unitPrice: originalDetail.unitPrice,
          taxPercentage: originalDetail.taxPercentage,
          discountPercentage: 0,
          discountAmount: 0,
          lineTotal: -originalDetail.lineTotal,
          isKit: originalDetail.isKit,
        })
      );

      creditNote.details = details;

      await manager.save(Sale, creditNote);
      await manager.save(SaleDetail, details);

      // Reverse inventory transactions
      if (originalSale.warehouseId) {
        for (const detail of originalSale.details) {
          await this.inventoryService.recordInbound(
            companyId,
            userId,
            detail.productId,
            detail.quantity,
            TransactionReason.RETURN,
            {
              reference: creditNoteNumber,
              notes: `Credit note - ${originalSale.saleNumber}. ${reason}`,
              metadata: {
                creditNoteId: creditNote.id,
                creditNoteNumber,
                originalSaleId: originalSale.id,
                originalSaleNumber: originalSale.saleNumber,
              },
            }
          );
        }
      }

      // Update original sale status
      originalSale.status = SaleStatus.CREDITED;
      await manager.save(Sale, originalSale);

      // Update customer balance
      const customer = await this.customerService.getCustomerById(companyId, originalSale.customerId);
      if (customer) {
        await this.customerService.updateCustomerBalance(
          companyId,
          customer.id,
          -originalSale.total
        );
      }

      loggers.logOperation('credit_note_created', userId, companyId, {
        creditNoteId: creditNote.id,
        creditNoteNumber,
        originalSaleId: originalSale.id,
        originalSaleNumber: originalSale.saleNumber,
        total: originalSale.total,
        reason,
      });

      return creditNote;
    });
  }

  /**
   * Create remission (no inventory impact)
   * Remissions are for showing products without affecting stock
   */
  async createRemission(
    companyId: number,
    userId: number,
    dto: CreateSaleDto
  ): Promise<Sale> {
    // Force sale type to remission
    const remissionDto = { ...dto, saleType: SaleType.REMISSION };

    // Create sale (draft status)
    const sale = await this.createSale(companyId, userId, remissionDto);

    // Remissions are automatically confirmed but don't affect inventory
    sale.status = SaleStatus.CONFIRMED;
    await this.saleRepository.save(sale);

    loggers.logOperation('remission_created', userId, companyId, {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      customerId: sale.customerId,
      total: sale.total,
    });

    return sale;
  }

  /**
   * Mark sale as dispatched
   * Updates status to DISPATCHED
   */
  async dispatchSale(companyId: number, userId: number, saleId: number): Promise<Sale> {
    const sale = await this.getSaleById(companyId, saleId);

    // Validate sale can be dispatched
    if (sale.status !== SaleStatus.CONFIRMED && sale.status !== SaleStatus.INVOICED) {
      throw new ApiError(
        400,
        'INVALID_STATUS',
        'Can only dispatch confirmed or invoiced sales'
      );
    }

    if (!sale.warehouseId) {
      throw new ApiError(400, 'NO_WAREHOUSE', 'Sale must have a warehouse to be dispatched');
    }

    sale.status = SaleStatus.DISPATCHED;
    await this.saleRepository.save(sale);

    loggers.logOperation('sale_dispatched', userId, companyId, {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      warehouseId: sale.warehouseId,
    });

    return sale;
  }

  /**
   * Mark sale as delivered
   * Updates status to DELIVERED
   */
  async deliverSale(companyId: number, userId: number, saleId: number): Promise<Sale> {
    const sale = await this.getSaleById(companyId, saleId);

    // Validate sale can be delivered
    if (sale.status !== SaleStatus.DISPATCHED) {
      throw new ApiError(400, 'NOT_DISPATCHED', 'Sale must be dispatched before delivery');
    }

    sale.status = SaleStatus.DELIVERED;
    await this.saleRepository.save(sale);

    loggers.logOperation('sale_delivered', userId, companyId, {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
    });

    return sale;
  }
}
