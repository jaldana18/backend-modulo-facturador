import { Repository, FindOptionsWhere } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Warehouse } from '../entities/Warehouse.entity';
import { QueryWarehousesDto } from '../dto/warehouse/query-warehouses.dto';

export interface PaginatedWarehouseResponse {
  items: Warehouse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class WarehouseRepository extends Repository<Warehouse> {
  constructor() {
    super(Warehouse, AppDataSource.manager);
  }

  /**
   * Find warehouses with pagination and filters
   */
  async findWithPagination(
    companyId: number,
    query: QueryWarehousesDto
  ): Promise<PaginatedWarehouseResponse> {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      isMain,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    // Build where conditions
    const where: FindOptionsWhere<Warehouse> = {
      companyId,
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isMain !== undefined) {
      where.isMain = isMain;
    }

    // Build query
    let queryBuilder = this.createQueryBuilder('warehouse').where(where);

    // Add search condition
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(warehouse.name LIKE :search OR warehouse.code LIKE :search OR warehouse.city LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add sorting
    const validSortFields = ['name', 'code', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder = queryBuilder.orderBy(`warehouse.${sortField}`, sortOrder);

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
   * Find warehouse by code within company
   */
  async findByCode(companyId: number, code: string): Promise<Warehouse | null> {
    return this.findOne({
      where: { companyId, code },
    });
  }

  /**
   * Get main warehouse for a company
   */
  async findMainWarehouse(companyId: number): Promise<Warehouse | null> {
    return this.findOne({
      where: { companyId, isMain: true, isActive: true },
    });
  }

  /**
   * Get all active warehouses for a company
   */
  async findActiveWarehouses(companyId: number): Promise<Warehouse[]> {
    return this.find({
      where: { companyId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Count warehouses by company
   */
  async countByCompany(companyId: number, isActive?: boolean): Promise<number> {
    const where: FindOptionsWhere<Warehouse> = { companyId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    return this.count({ where });
  }

  /**
   * Check if code exists for another warehouse
   */
  async isCodeTaken(companyId: number, code: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('warehouse')
      .where('warehouse.companyId = :companyId', { companyId })
      .andWhere('warehouse.code = :code', { code });

    if (excludeId) {
      query.andWhere('warehouse.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Set main warehouse (ensures only one main warehouse per company)
   */
  async setMainWarehouse(companyId: number, warehouseId: number): Promise<void> {
    // First, unset all main warehouses for the company
    await this.createQueryBuilder()
      .update(Warehouse)
      .set({ isMain: false })
      .where('companyId = :companyId', { companyId })
      .execute();

    // Then set the specified warehouse as main
    await this.createQueryBuilder()
      .update(Warehouse)
      .set({ isMain: true })
      .where('id = :warehouseId', { warehouseId })
      .andWhere('companyId = :companyId', { companyId })
      .execute();
  }
}
