import { AppDataSource } from '../config/database';
import { Payment, PaymentStatusEnum } from '../entities/Payment.entity';
import { Sale, PaymentStatus } from '../entities/Sale.entity';
import { PaymentMethod } from '../entities/PaymentMethod.entity';
import { Customer } from '../entities/Customer.entity';
import { ApiError } from '../middleware/errorHandler.middleware';
import { loggers } from '../config/logger';
import { CustomerService } from './CustomerService';
import { ActivityType } from '../entities/ActivityLog.entity';

export interface CreatePaymentDto {
  saleId: number;
  paymentMethodId: number;
  amount: number;
  paymentDate?: Date;
  referenceNumber?: string;
  notes?: string;
  metadata?: any;
}

export class PaymentService {
  private paymentRepository = AppDataSource.getRepository(Payment);
  private saleRepository = AppDataSource.getRepository(Sale);
  private paymentMethodRepository = AppDataSource.getRepository(PaymentMethod);
  private customerRepository = AppDataSource.getRepository(Customer);
  private customerService = new CustomerService();

  /**
   * Generate unique payment number
   */
  private async generatePaymentNumber(companyId: number): Promise<string> {
    const lastPayment = await this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.companyId = :companyId', { companyId })
      .orderBy('payment.id', 'DESC')
      .getOne();

    if (!lastPayment || !lastPayment.paymentNumber) {
      return 'PAG-0001';
    }

    const match = lastPayment.paymentNumber.match(/(\d+)$/);
    if (match) {
      const nextNumber = parseInt(match[1], 10) + 1;
      return `PAG-${nextNumber.toString().padStart(4, '0')}`;
    }

    return 'PAG-0001';
  }

  /**
   * Create a payment for a sale
   */
  async createPayment(
    companyId: number,
    userId: number,
    dto: CreatePaymentDto
  ): Promise<Payment> {
    // Validate sale exists and belongs to company
    const sale = await this.saleRepository.findOne({
      where: { id: dto.saleId, companyId },
      relations: ['customer'],
    });

    if (!sale) {
      throw new ApiError(404, 'SALE_NOT_FOUND', 'Sale not found');
    }

    // Cannot add payments to cancelled sales
    if (sale.status === 'cancelled') {
      throw new ApiError(400, 'SALE_CANCELLED', 'Cannot add payments to cancelled sales');
    }

    // Validate payment method exists and is active (accepts both global and company-specific methods)
    const paymentMethod = await this.paymentMethodRepository
      .createQueryBuilder('pm')
      .where('pm.id = :id', { id: dto.paymentMethodId })
      .andWhere('(pm.companyId IS NULL OR pm.companyId = :companyId)', { companyId })
      .andWhere('pm.isActive = :isActive', { isActive: true })
      .getOne();

    if (!paymentMethod) {
      throw new ApiError(404, 'PAYMENT_METHOD_NOT_FOUND', 'Payment method not found or inactive');
    }

    // Validate payment method requires reference if needed
    if (paymentMethod.requiresReference && !dto.referenceNumber) {
      throw new ApiError(
        400,
        'REFERENCE_REQUIRED',
        `Payment method "${paymentMethod.name}" requires a reference number`
      );
    }

    // Validate amount
    if (dto.amount <= 0) {
      throw new ApiError(400, 'INVALID_AMOUNT', 'Payment amount must be greater than zero');
    }

    // Validate amount doesn't exceed pending balance
    if (dto.amount > sale.balance) {
      throw new ApiError(
        400,
        'AMOUNT_EXCEEDS_BALANCE',
        `Payment amount (${dto.amount}) exceeds sale balance (${sale.balance})`
      );
    }

    // Generate payment number
    const paymentNumber = await this.generatePaymentNumber(companyId);

    return AppDataSource.transaction(async (manager) => {
      // Create payment
      const payment = manager.create(Payment, {
        companyId,
        saleId: dto.saleId,
        paymentMethodId: dto.paymentMethodId,
        paymentNumber,
        amount: dto.amount,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        status: PaymentStatusEnum.COMPLETED,
        referenceNumber: dto.referenceNumber || null,
        notes: dto.notes || null,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      });

      await manager.save(Payment, payment);

      // Update sale paid amount and balance
      sale.paidAmount += dto.amount;
      sale.balance = sale.total - sale.paidAmount;

      // Update payment status
      sale.updatePaymentStatus();

      await manager.save(Sale, sale);

      // Update customer balance if credit sale
      if (sale.customer && sale.balance < sale.total) {
        const customer = await this.customerRepository.findOne({
          where: { id: sale.customerId, companyId },
        });

        if (customer) {
          customer.currentBalance -= dto.amount;
          await manager.save(Customer, customer);
        }
      }

      loggers.logOperation('payment_created', userId, companyId, {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        amount: dto.amount,
        paymentMethodId: dto.paymentMethodId,
      });

      // Log user activity
      await loggers.logActivity({
        companyId,
        userId,
        activityType: ActivityType.SALE_PAYMENT_RECEIVED,
        description: `Registró pago de $${dto.amount.toFixed(2)} para ${sale.saleNumber}`,
        entityType: 'payment',
        entityId: payment.id,
        entityName: payment.paymentNumber,
        metadata: {
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          amount: dto.amount,
          paymentMethodId: dto.paymentMethodId,
          customerId: sale.customerId,
        },
      });

      return payment;
    });
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(companyId: number, paymentId: number): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, companyId },
      relations: ['sale', 'paymentMethod'],
    });

    if (!payment) {
      throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
    }

    return payment;
  }

  /**
   * Get all payments for a sale
   */
  async getPaymentsBySale(companyId: number, saleId: number): Promise<Payment[]> {
    // Validate sale exists
    const sale = await this.saleRepository.findOne({
      where: { id: saleId, companyId },
    });

    if (!sale) {
      throw new ApiError(404, 'SALE_NOT_FOUND', 'Sale not found');
    }

    return this.paymentRepository.find({
      where: { saleId, companyId },
      relations: ['paymentMethod'],
      order: { paymentDate: 'DESC' },
    });
  }

  /**
   * Get all payments with pagination
   */
  async getPayments(
    companyId: number,
    options: {
      page?: number;
      limit?: number;
      saleId?: number;
      status?: PaymentStatusEnum;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const { page = 1, limit = 10, saleId, status, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.sale', 'sale')
      .leftJoinAndSelect('payment.paymentMethod', 'paymentMethod')
      .where('payment.companyId = :companyId', { companyId });

    if (saleId) {
      queryBuilder.andWhere('payment.saleId = :saleId', { saleId });
    }

    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (startDate) {
      queryBuilder.andWhere('payment.paymentDate >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('payment.paymentDate <= :endDate', { endDate });
    }

    const total = await queryBuilder.getCount();

    const payments = await queryBuilder
      .orderBy('payment.paymentDate', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data: payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    companyId: number,
    userId: number,
    paymentId: number,
    reason?: string
  ): Promise<Payment> {
    const payment = await this.getPaymentById(companyId, paymentId);

    // Validate payment can be refunded
    if (!payment.canRefund()) {
      throw new ApiError(400, 'CANNOT_REFUND', 'Payment cannot be refunded in current status');
    }

    return AppDataSource.transaction(async (manager) => {
      // Update payment status
      payment.status = PaymentStatusEnum.REFUNDED;
      payment.notes = reason
        ? `${payment.notes || ''}\nRefund: ${reason}`.trim()
        : payment.notes;
      await manager.save(Payment, payment);

      // Update sale paid amount and balance
      const sale = await this.saleRepository.findOne({
        where: { id: payment.saleId, companyId },
        relations: ['customer'],
      });

      if (sale) {
        sale.paidAmount -= payment.amount;
        sale.balance = sale.total - sale.paidAmount;
        sale.updatePaymentStatus();
        await manager.save(Sale, sale);

        // Update customer balance
        if (sale.customer) {
          const customer = await this.customerRepository.findOne({
            where: { id: sale.customerId, companyId },
          });

          if (customer) {
            customer.currentBalance += payment.amount;
            await manager.save(Customer, customer);
          }
        }
      }

      loggers.logOperation('payment_refunded', userId, companyId, {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        saleId: payment.saleId,
        amount: payment.amount,
        reason,
      });

      return payment;
    });
  }

  /**
   * Cancel a payment (before it's processed)
   */
  async cancelPayment(
    companyId: number,
    userId: number,
    paymentId: number,
    reason?: string
  ): Promise<Payment> {
    const payment = await this.getPaymentById(companyId, paymentId);

    // Can only cancel pending payments
    if (payment.status !== PaymentStatusEnum.PENDING) {
      throw new ApiError(
        400,
        'CANNOT_CANCEL',
        'Can only cancel pending payments. Use refund for completed payments'
      );
    }

    return AppDataSource.transaction(async (manager) => {
      // Update payment status
      payment.status = PaymentStatusEnum.CANCELLED;
      payment.notes = reason
        ? `${payment.notes || ''}\nCancelled: ${reason}`.trim()
        : payment.notes;
      await manager.save(Payment, payment);

      loggers.logOperation('payment_cancelled', userId, companyId, {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        reason,
      });

      return payment;
    });
  }

  /**
   * Get payment summary for a date range
   */
  async getPaymentSummary(companyId: number, startDate: Date, endDate: Date) {
    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.paymentMethod', 'paymentMethod')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.paymentDate >= :startDate', { startDate })
      .andWhere('payment.paymentDate <= :endDate', { endDate })
      .andWhere('payment.status = :status', { status: PaymentStatusEnum.COMPLETED })
      .select([
        'paymentMethod.id as paymentMethodId',
        'paymentMethod.name as paymentMethodName',
        'COUNT(payment.id) as paymentCount',
        'SUM(payment.amount) as totalAmount',
      ])
      .groupBy('paymentMethod.id, paymentMethod.name')
      .getRawMany();

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    const totalCount = payments.reduce((sum, p) => sum + Number(p.paymentCount), 0);

    return {
      summary: {
        totalAmount,
        totalCount,
        startDate,
        endDate,
      },
      byPaymentMethod: payments.map((p) => ({
        paymentMethodId: p.paymentMethodId,
        paymentMethodName: p.paymentMethodName,
        count: Number(p.paymentCount),
        amount: Number(p.totalAmount),
        percentage: totalAmount > 0 ? (Number(p.totalAmount) / totalAmount) * 100 : 0,
      })),
    };
  }
}
