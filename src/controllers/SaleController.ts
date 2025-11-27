import { Request, Response } from 'express';
import { SaleService } from '../services/SaleService';
import { CreateSaleDto } from '../dto/sale/create-sale.dto';
import { UpdateSaleDto } from '../dto/sale/update-sale.dto';
import { QuerySalesDto } from '../dto/sale/query-sales.dto';
import { validateDto } from '../utils/validators.util';
import { ApiResponse } from '../common.types';

export class SaleController {
  private saleService = new SaleService();

  /**
   * GET /api/v1/sales
   */
  getSales = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const queryDto = await validateDto(QuerySalesDto, req.query);

    const result = await this.saleService.getSales(companyId, queryDto);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/sales/:id
   */
  getSaleById = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const saleId = parseInt(req.params.id);

    const sale = await this.saleService.getSaleById(companyId, saleId);

    const response: ApiResponse = {
      success: true,
      data: sale,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/sales
   */
  createSale = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const createDto = await validateDto(CreateSaleDto, req.body);

    const sale = await this.saleService.createSale(companyId, userId, createDto);

    const response: ApiResponse = {
      success: true,
      data: sale,
    };

    res.status(201).json(response);
  };

  /**
   * PUT /api/v1/sales/:id
   */
  updateSale = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const saleId = parseInt(req.params.id);

    const updateDto = await validateDto(UpdateSaleDto, req.body);

    const sale = await this.saleService.updateSale(companyId, userId, saleId, updateDto);

    const response: ApiResponse = {
      success: true,
      data: sale,
    };

    res.json(response);
  };

  /**
   * DELETE /api/v1/sales/:id
   */
  deleteSale = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const saleId = parseInt(req.params.id);

    await this.saleService.deleteSale(companyId, userId, saleId);

    const response: ApiResponse = {
      success: true,
      message: 'Sale deleted successfully',
    };

    res.json(response);
  };

  /**
   * POST /api/v1/sales/:id/confirm
   */
  confirmSale = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const saleId = parseInt(req.params.id);

    const sale = await this.saleService.confirmSale(companyId, userId, saleId);

    const response: ApiResponse = {
      success: true,
      data: sale,
      message: 'Sale confirmed successfully',
    };

    res.json(response);
  };

  /**
   * POST /api/v1/sales/:id/cancel
   */
  cancelSale = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const saleId = parseInt(req.params.id);

    const sale = await this.saleService.cancelSale(companyId, userId, saleId);

    const response: ApiResponse = {
      success: true,
      data: sale,
      message: 'Sale cancelled successfully',
    };

    res.json(response);
  };

  /**
   * POST /api/v1/sales/:id/convert-to-invoice
   */
  convertToInvoice = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const quoteId = parseInt(req.params.id);

    const invoice = await this.saleService.convertQuoteToInvoice(companyId, userId, quoteId);

    const response: ApiResponse = {
      success: true,
      data: invoice,
      message: 'Quote converted to invoice successfully',
    };

    res.status(201).json(response);
  };

  /**
   * POST /api/v1/sales/:id/convert-to-proforma
   */
  convertToProforma = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const quoteId = parseInt(req.params.id);

    const proforma = await this.saleService.convertQuoteToProforma(companyId, userId, quoteId);

    const response: ApiResponse = {
      success: true,
      data: proforma,
      message: 'Quote converted to proforma successfully',
    };

    res.status(201).json(response);
  };

  /**
   * POST /api/v1/sales/:id/credit-note
   */
  createCreditNote = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const saleId = parseInt(req.params.id);
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string') {
      const response: ApiResponse = {
        success: false,
        message: 'Reason is required for credit note',
      };
      res.status(400).json(response);
      return;
    }

    const creditNote = await this.saleService.createCreditNote(companyId, userId, saleId, reason);

    const response: ApiResponse = {
      success: true,
      data: creditNote,
      message: 'Credit note created successfully',
    };

    res.status(201).json(response);
  };

  /**
   * POST /api/v1/sales/remission
   */
  createRemission = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const createDto = await validateDto(CreateSaleDto, req.body);

    const remission = await this.saleService.createRemission(companyId, userId, createDto);

    const response: ApiResponse = {
      success: true,
      data: remission,
      message: 'Remission created successfully',
    };

    res.status(201).json(response);
  };

  /**
   * POST /api/v1/sales/:id/dispatch
   */
  dispatchSale = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const saleId = parseInt(req.params.id);

    const sale = await this.saleService.dispatchSale(companyId, userId, saleId);

    const response: ApiResponse = {
      success: true,
      data: sale,
      message: 'Sale dispatched successfully',
    };

    res.json(response);
  };

  /**
   * POST /api/v1/sales/:id/deliver
   */
  deliverSale = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const saleId = parseInt(req.params.id);

    const sale = await this.saleService.deliverSale(companyId, userId, saleId);

    const response: ApiResponse = {
      success: true,
      data: sale,
      message: 'Sale delivered successfully',
    };

    res.json(response);
  };
}
