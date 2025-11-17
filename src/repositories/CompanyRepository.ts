import { Repository, FindOptionsWhere } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Company } from '../entities/Company.entity';

export interface QueryCompaniesDto {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedCompanyResponse {
  items: Company[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class CompanyRepository extends Repository<Company> {
  constructor() {
    super(Company, AppDataSource.manager);
  }

  /**
   * Find companies with pagination and filters
   * Used by super-admin to list all companies
   */
  async findWithPagination(query: QueryCompaniesDto): Promise<PaginatedCompanyResponse> {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    // Build where conditions
    const where: FindOptionsWhere<Company> = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Build query
    let queryBuilder = this.createQueryBuilder('company').where(where);

    // Add search condition
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(company.name LIKE :search OR company.legalName LIKE :search OR company.email LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add sorting
    const validSortFields = ['name', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder = queryBuilder.orderBy(`company.${sortField}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder = queryBuilder.skip(skip).take(limit);

    // Execute query
    const items = await queryBuilder.getMany();

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find company by tax ID
   */
  async findByTaxId(taxId: string): Promise<Company | null> {
    return this.findOne({
      where: { taxId },
    });
  }

  /**
   * Check if tax ID already exists (for another company)
   */
  async isTaxIdTaken(taxId: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('company').where('company.taxId = :taxId', { taxId });

    if (excludeId) {
      query.andWhere('company.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Check if email already exists (for another company)
   */
  async isEmailTaken(email: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('company')
      .where('company.email = :email', { email });

    if (excludeId) {
      query.andWhere('company.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Count total companies
   */
  async countAll(isActive?: boolean): Promise<number> {
    const where: FindOptionsWhere<Company> = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    return this.count({ where });
  }

  /**
   * Get company with users relation
   */
  async findWithUsers(companyId: number): Promise<Company | null> {
    return this.findOne({
      where: { id: companyId },
      relations: ['users'],
    });
  }
}
