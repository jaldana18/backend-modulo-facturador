import { AppDataSource } from '../config/database';
import { PaymentMethod } from '../entities/PaymentMethod.entity';
import { CreatePaymentMethodDto } from '../dto/payment-method/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../dto/payment-method/update-payment-method.dto';
import { ApiError } from '../middleware/errorHandler.middleware';
import { loggers } from '../config/logger';

export class PaymentMethodService {
  private paymentMethodRepository = AppDataSource.getRepository(PaymentMethod);

  /**
   * Get all payment methods for a company
   */
  async getPaymentMethods(companyId: number, activeOnly: boolean = false): Promise<PaymentMethod[]> {
    const where: any = { companyId };
    if (activeOnly) {
      where.isActive = true;
    }

    return this.paymentMethodRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  /**
   * Get payment method by ID
   */
  async getPaymentMethodById(companyId: number, id: number): Promise<PaymentMethod> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, companyId },
    });

    if (!paymentMethod) {
      throw new ApiError(404, 'PAYMENT_METHOD_NOT_FOUND', 'Payment method not found');
    }

    return paymentMethod;
  }

  /**
   * Create payment method
   */
  async createPaymentMethod(
    companyId: number,
    userId: number,
    dto: CreatePaymentMethodDto
  ): Promise<PaymentMethod> {
    // Check if code already exists
    const existing = await this.paymentMethodRepository.findOne({
      where: { companyId, code: dto.code },
    });

    if (existing) {
      throw new ApiError(409, 'CODE_ALREADY_EXISTS', `Payment method with code "${dto.code}" already exists`);
    }

    const paymentMethod = this.paymentMethodRepository.create({
      companyId,
      name: dto.name,
      code: dto.code,
      requiresReference: dto.requiresReference || false,
      isActive: true,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
    });

    await this.paymentMethodRepository.save(paymentMethod);

    loggers.logOperation('payment_method_created', userId, companyId, {
      paymentMethodId: paymentMethod.id,
      code: paymentMethod.code,
    });

    return paymentMethod;
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(
    companyId: number,
    userId: number,
    id: number,
    dto: UpdatePaymentMethodDto
  ): Promise<PaymentMethod> {
    const paymentMethod = await this.getPaymentMethodById(companyId, id);

    if (dto.name !== undefined) paymentMethod.name = dto.name;
    if (dto.requiresReference !== undefined) paymentMethod.requiresReference = dto.requiresReference;
    if (dto.metadata !== undefined) {
      paymentMethod.metadata = dto.metadata ? JSON.stringify(dto.metadata) : null;
    }

    await this.paymentMethodRepository.save(paymentMethod);

    loggers.logOperation('payment_method_updated', userId, companyId, {
      paymentMethodId: paymentMethod.id,
    });

    return paymentMethod;
  }

  /**
   * Deactivate payment method
   */
  async deactivatePaymentMethod(companyId: number, userId: number, id: number): Promise<PaymentMethod> {
    const paymentMethod = await this.getPaymentMethodById(companyId, id);

    paymentMethod.isActive = false;
    await this.paymentMethodRepository.save(paymentMethod);

    loggers.logOperation('payment_method_deactivated', userId, companyId, {
      paymentMethodId: paymentMethod.id,
    });

    return paymentMethod;
  }
}
