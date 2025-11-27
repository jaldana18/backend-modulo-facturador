import { Request, Response } from 'express';
import { CustomerService } from '../services/CustomerService';
import { CreateCustomerDto } from '../dto/customer/create-customer.dto';
import { UpdateCustomerDto } from '../dto/customer/update-customer.dto';
import { QueryCustomersDto } from '../dto/customer/query-customers.dto';
import { validateDto } from '../utils/validators.util';
import { ApiResponse } from '../common.types';

export class CustomerController {
  private customerService = new CustomerService();

  /**
   * GET /api/v1/customers
   */
  getCustomers = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const queryDto = await validateDto(QueryCustomersDto, req.query);

    const result = await this.customerService.getCustomers(companyId, queryDto);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/customers/:id
   */
  getCustomerById = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const customerId = parseInt(req.params.id);

    const customer = await this.customerService.getCustomerById(companyId, customerId);

    const response: ApiResponse = {
      success: true,
      data: customer,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/customers
   */
  createCustomer = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const createDto = await validateDto(CreateCustomerDto, req.body);

    const customer = await this.customerService.createCustomer(companyId, userId, createDto);

    const response: ApiResponse = {
      success: true,
      data: customer,
    };

    res.status(201).json(response);
  };

  /**
   * PUT /api/v1/customers/:id
   */
  updateCustomer = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const customerId = parseInt(req.params.id);

    const updateDto = await validateDto(UpdateCustomerDto, req.body);

    const customer = await this.customerService.updateCustomer(companyId, userId, customerId, updateDto);

    const response: ApiResponse = {
      success: true,
      data: customer,
    };

    res.json(response);
  };

  /**
   * PATCH /api/v1/customers/:id/deactivate
   */
  deactivateCustomer = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const customerId = parseInt(req.params.id);

    const customer = await this.customerService.deactivateCustomer(companyId, userId, customerId);

    const response: ApiResponse = {
      success: true,
      data: customer,
    };

    res.json(response);
  };

  /**
   * PATCH /api/v1/customers/:id/activate
   */
  activateCustomer = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const customerId = parseInt(req.params.id);

    const customer = await this.customerService.activateCustomer(companyId, userId, customerId);

    const response: ApiResponse = {
      success: true,
      data: customer,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/customers/:id/sales-history
   */
  getSalesHistory = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const customerId = parseInt(req.params.id);

    const history = await this.customerService.getCustomerSalesHistory(companyId, customerId);

    const response: ApiResponse = {
      success: true,
      data: history,
    };

    res.json(response);
  };
}
