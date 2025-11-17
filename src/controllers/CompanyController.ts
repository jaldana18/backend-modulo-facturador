import { Request, Response } from 'express';
import { CompanyService } from '../services/CompanyService';
import { CreateCompanyDto } from '../dto/company/create-company.dto';
import { UpdateCompanyDto } from '../dto/company/update-company.dto';
import { QueryCompaniesDto } from '../dto/company/query-companies.dto';
import { validateDto } from '../utils/validators.util';
import { ApiResponse } from '../common.types';

export class CompanyController {
  private companyService = new CompanyService();

  /**
   * GET /api/v1/companies
   * Get all companies with filters (super-admin only)
   */
  getCompanies = async (req: Request, res: Response): Promise<void> => {
    // Validate query params
    const queryDto = await validateDto(QueryCompaniesDto, req.query);

    const result = await this.companyService.getCompanies(queryDto);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/companies/me
   * Get current user's company
   */
  getMyCompany = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const company = await this.companyService.getCompanyById(companyId);

    const response: ApiResponse = {
      success: true,
      data: company,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/companies/:id
   * Get company by ID
   */
  getCompanyById = async (req: Request, res: Response): Promise<void> => {
    const companyId = parseInt(req.params.id);

    // Users can only see their own company
    // TODO: Super-admin can see any company
    if (req.user!.companyId !== companyId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only access your own company',
        },
      };
      res.status(403).json(response);
      return;
    }

    const company = await this.companyService.getCompanyById(companyId);

    const response: ApiResponse = {
      success: true,
      data: company,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/companies
   * Create a new company (super-admin only)
   */
  createCompany = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    // Validate DTO
    const createDto = await validateDto(CreateCompanyDto, req.body);

    // Create company
    const company = await this.companyService.createCompany(createDto, userId);

    const response: ApiResponse = {
      success: true,
      data: company,
    };

    res.status(201).json(response);
  };

  /**
   * PUT /api/v1/companies/:id
   * Update company
   */
  updateCompany = async (req: Request, res: Response): Promise<void> => {
    const companyId = parseInt(req.params.id);
    const userId = req.user!.userId;

    // Users can only update their own company
    // TODO: Super-admin can update any company
    if (req.user!.companyId !== companyId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own company',
        },
      };
      res.status(403).json(response);
      return;
    }

    // Validate DTO
    const updateDto = await validateDto(UpdateCompanyDto, req.body);

    // Update company
    const company = await this.companyService.updateCompany(companyId, userId, updateDto);

    const response: ApiResponse = {
      success: true,
      data: company,
    };

    res.json(response);
  };

  /**
   * DELETE /api/v1/companies/:id
   * Delete company (soft delete)
   */
  deleteCompany = async (req: Request, res: Response): Promise<void> => {
    const companyId = parseInt(req.params.id);
    const userId = req.user!.userId;

    // Only super-admin can delete companies
    // For now, prevent deletion from regular users
    if (req.user!.companyId === companyId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You cannot delete your own company',
        },
      };
      res.status(403).json(response);
      return;
    }

    await this.companyService.deleteCompany(companyId, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Company deleted successfully',
    };

    res.json(response);
  };

  /**
   * GET /api/v1/companies/:id/stats
   * Get company statistics
   */
  getCompanyStats = async (req: Request, res: Response): Promise<void> => {
    const companyId = parseInt(req.params.id);

    // Users can only see their own company stats
    if (req.user!.companyId !== companyId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only access your own company statistics',
        },
      };
      res.status(403).json(response);
      return;
    }

    const stats = await this.companyService.getCompanyStats(companyId);

    const response: ApiResponse = {
      success: true,
      data: stats,
    };

    res.json(response);
  };
}
