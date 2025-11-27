import { Request, Response } from 'express';
import { PaymentService, CreatePaymentDto } from '../services/PaymentService';
import { validateDto } from '../utils/validators.util';
import { ApiResponse } from '../common.types';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

class CreatePaymentRequestDto {
  @IsInt()
  saleId: number;

  @IsInt()
  paymentMethodId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  metadata?: any;
}

export class PaymentController {
  private paymentService = new PaymentService();

  /**
   * GET /api/v1/payments
   */
  getPayments = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const options = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      saleId: req.query.saleId ? parseInt(req.query.saleId as string) : undefined,
      status: req.query.status as any,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const result = await this.paymentService.getPayments(companyId, options);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/payments/:id
   */
  getPaymentById = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const paymentId = parseInt(req.params.id);

    const payment = await this.paymentService.getPaymentById(companyId, paymentId);

    const response: ApiResponse = {
      success: true,
      data: payment,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/payments/sale/:saleId
   */
  getPaymentsBySale = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const saleId = parseInt(req.params.saleId);

    const payments = await this.paymentService.getPaymentsBySale(companyId, saleId);

    const response: ApiResponse = {
      success: true,
      data: payments,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/payments
   */
  createPayment = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const createDto = await validateDto(CreatePaymentRequestDto, req.body);

    const paymentDto: CreatePaymentDto = {
      saleId: createDto.saleId,
      paymentMethodId: createDto.paymentMethodId,
      amount: createDto.amount,
      paymentDate: createDto.paymentDate ? new Date(createDto.paymentDate) : undefined,
      referenceNumber: createDto.referenceNumber,
      notes: createDto.notes,
      metadata: createDto.metadata,
    };

    const payment = await this.paymentService.createPayment(companyId, userId, paymentDto);

    const response: ApiResponse = {
      success: true,
      data: payment,
      message: 'Payment created successfully',
    };

    res.status(201).json(response);
  };

  /**
   * POST /api/v1/payments/:id/refund
   */
  refundPayment = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const paymentId = parseInt(req.params.id);
    const { reason } = req.body;

    const payment = await this.paymentService.refundPayment(companyId, userId, paymentId, reason);

    const response: ApiResponse = {
      success: true,
      data: payment,
      message: 'Payment refunded successfully',
    };

    res.json(response);
  };

  /**
   * POST /api/v1/payments/:id/cancel
   */
  cancelPayment = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const paymentId = parseInt(req.params.id);
    const { reason } = req.body;

    const payment = await this.paymentService.cancelPayment(companyId, userId, paymentId, reason);

    const response: ApiResponse = {
      success: true,
      data: payment,
      message: 'Payment cancelled successfully',
    };

    res.json(response);
  };

  /**
   * GET /api/v1/payments/summary
   */
  getPaymentSummary = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(new Date().setDate(1)); // First day of current month

    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date(); // Today

    const summary = await this.paymentService.getPaymentSummary(companyId, startDate, endDate);

    const response: ApiResponse = {
      success: true,
      data: summary,
    };

    res.json(response);
  };
}
