import { CompanyRepository, QueryCompaniesDto } from '../repositories/CompanyRepository';
import { Company } from '../entities/Company.entity';
import { ApiError } from '../middleware/errorHandler.middleware';
import { loggers } from '../config/logger';
import { EntityManager } from 'typeorm';

export interface CreateCompanyDto {
  name: string;
  legalName?: string;
  taxId: string;
  email?: string;
  phone?: string;
  address?: string;
  settings?: any;
}

export interface UpdateCompanyDto {
  name?: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
  settings?: any;
}

export class CompanyService {
  private companyRepository = new CompanyRepository();

  /**
   * Get all companies with pagination (super-admin only)
   */
  async getCompanies(query: QueryCompaniesDto) {
    return this.companyRepository.findWithPagination(query);
  }

  /**
   * Get company by ID
   */
  async getCompanyById(companyId: number): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new ApiError(404, 'COMPANY_NOT_FOUND', 'Company not found');
    }

    return company;
  }

  /**
   * Get company by tax ID
   */
  async getCompanyByTaxId(taxId: string): Promise<Company> {
    const company = await this.companyRepository.findByTaxId(taxId);

    if (!company) {
      throw new ApiError(404, 'COMPANY_NOT_FOUND', 'Company not found');
    }

    return company;
  }

  /**
   * Create a new company
   */
  async createCompany(dto: CreateCompanyDto, createdBy?: number, manager?: EntityManager): Promise<Company> {
    // Check if tax ID already exists
    const existingByTaxId = await this.companyRepository.findByTaxId(dto.taxId);
    if (existingByTaxId) {
      throw new ApiError(409, 'TAX_ID_ALREADY_EXISTS', `Company with tax ID "${dto.taxId}" already exists`);
    }

    // Check if email already exists
    if (dto.email) {
      const existingByEmail = await this.companyRepository.isEmailTaken(dto.email);
      if (existingByEmail) {
        throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', `Company with email "${dto.email}" already exists`);
      }
    }

    // Create company - use manager if provided, otherwise use repository
    const company = new Company();
    company.name = dto.name;
    company.legalName = dto.legalName as any;
    company.taxId = dto.taxId;
    company.email = dto.email as any;
    company.phone = dto.phone as any;
    company.address = dto.address as any;
    company.isActive = true;
    company.settings = dto.settings ? JSON.stringify(dto.settings) : (undefined as any);

    if (manager) {
      await manager.save(company);
    } else {
      await this.companyRepository.save(company);
    }

    if (createdBy) {
      loggers.logOperation('company_created', createdBy, company.id, {
        companyId: company.id,
        name: company.name,
        taxId: dto.taxId,
      });
    }

    return company;
  }

  /**
   * Update company
   */
  async updateCompany(
    companyId: number,
    userId: number,
    dto: UpdateCompanyDto
  ): Promise<Company> {
    const company = await this.getCompanyById(companyId);

    // Check if tax ID is being changed and if it already exists
    if (dto.taxId && dto.taxId !== company.taxId) {
      const isTaken = await this.companyRepository.isTaxIdTaken(dto.taxId, companyId);
      if (isTaken) {
        throw new ApiError(409, 'TAX_ID_ALREADY_EXISTS', `Company with tax ID "${dto.taxId}" already exists`);
      }
    }

    // Check if email is being changed and if it already exists
    if (dto.email && dto.email !== company.email) {
      const isTaken = await this.companyRepository.isEmailTaken(dto.email, companyId);
      if (isTaken) {
        throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', `Company with email "${dto.email}" already exists`);
      }
    }

    // Update fields
    if (dto.name !== undefined) company.name = dto.name;
    if (dto.legalName !== undefined) company.legalName = dto.legalName as any;
    if (dto.taxId !== undefined) company.taxId = dto.taxId;
    if (dto.email !== undefined) company.email = dto.email as any;
    if (dto.phone !== undefined) company.phone = dto.phone as any;
    if (dto.address !== undefined) company.address = dto.address as any;
    if (dto.isActive !== undefined) company.isActive = dto.isActive;
    if (dto.settings !== undefined) {
      company.settings = dto.settings ? JSON.stringify(dto.settings) : (undefined as any);
    }

    await this.companyRepository.save(company);

    loggers.logOperation('company_updated', userId, companyId, {
      companyId: company.id,
      changes: dto,
    });

    return company;
  }

  /**
   * Delete company (soft delete - set isActive to false)
   */
  async deleteCompany(companyId: number, userId: number): Promise<void> {
    const company = await this.getCompanyById(companyId);

    // Check if company has active users
    const companyWithUsers = await this.companyRepository.findWithUsers(companyId);
    const activeUsers = companyWithUsers?.users.filter(u => u.isActive) || [];

    if (activeUsers.length > 0) {
      throw new ApiError(
        400,
        'COMPANY_HAS_ACTIVE_USERS',
        `Cannot delete company with ${activeUsers.length} active user(s). Deactivate users first.`
      );
    }

    // Soft delete
    company.isActive = false;
    await this.companyRepository.save(company);

    loggers.logOperation('company_deleted', userId, companyId, {
      companyId: company.id,
      name: company.name,
    });
  }

  /**
   * Get company statistics
   */
  async getCompanyStats(companyId: number) {
    const company = await this.companyRepository.findWithUsers(companyId);

    if (!company) {
      throw new ApiError(404, 'COMPANY_NOT_FOUND', 'Company not found');
    }

    const activeUsers = company.users.filter(u => u.isActive).length;
    const totalUsers = company.users.length;

    return {
      companyId: company.id,
      name: company.name,
      activeUsers,
      totalUsers,
      isActive: company.isActive,
      createdAt: company.createdAt,
    };
  }
}
