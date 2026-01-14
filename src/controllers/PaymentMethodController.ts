import { Request, Response } from 'express';
import { PaymentMethodService } from '../services/PaymentMethodService';
import { CreatePaymentMethodDto } from '../dto/payment-method/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../dto/payment-method/update-payment-method.dto';
import { validateDto } from '../utils/validators.util';
import { ApiResponse } from '../common.types';

export class PaymentMethodController {
  private paymentMethodService = new PaymentMethodService();

  /**
   * GET /api/v1/payment-methods
   */
  getPaymentMethods = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const activeOnly = req.query.activeOnly === 'true';

    const paymentMethods = await this.paymentMethodService.getPaymentMethods(companyId, activeOnly);

    const response: ApiResponse = {
      success: true,
      data: paymentMethods,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/payment-methods/:id
   */
  getPaymentMethodById = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const id = parseInt(req.params.id);

    const paymentMethod = await this.paymentMethodService.getPaymentMethodById(companyId, id);

    const response: ApiResponse = {
      success: true,
      data: paymentMethod,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/payment-methods
   */
  createPaymentMethod = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const createDto = await validateDto(CreatePaymentMethodDto, req.body);

    const paymentMethod = await this.paymentMethodService.createPaymentMethod(companyId, userId, createDto);

    const response: ApiResponse = {
      success: true,
      data: paymentMethod,
    };

    res.status(201).json(response);
  };

  /**
   * PUT /api/v1/payment-methods/:id
   */
  updatePaymentMethod = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);

    const updateDto = await validateDto(UpdatePaymentMethodDto, req.body);

    const paymentMethod = await this.paymentMethodService.updatePaymentMethod(companyId, userId, id, updateDto);

    const response: ApiResponse = {
      success: true,
      data: paymentMethod,
    };

    res.json(response);
  };

  /**
   * PATCH /api/v1/payment-methods/:id/deactivate
   */
  deactivatePaymentMethod = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);

    const paymentMethod = await this.paymentMethodService.deactivatePaymentMethod(companyId, userId, id);

    const response: ApiResponse = {
      success: true,
      data: paymentMethod,
    };

    res.json(response);
  };
}
