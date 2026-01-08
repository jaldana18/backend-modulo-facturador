import { AppDataSource } from '../config/database';
import { UnitOfMeasure } from '../entities/UnitOfMeasure.entity';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import { QueryUnitsOfMeasureDto } from '../dto/unit-of-measure/query-units-of-measure.dto';
import { PaginatedResponse } from '../common.types';

export class UnitOfMeasureRepository {
  private repository: Repository<UnitOfMeasure>;

  constructor() {
    this.repository = AppDataSource.getRepository(UnitOfMeasure);
  }

  /**
   * Find all units with pagination and filters
   */
  async findWithPagination(
    companyId: number,
    query: QueryUnitsOfMeasureDto
  ): Promise<PaginatedResponse<UnitOfMeasure>> {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      isBaseUnit,
      includeInactive,
      includeProductCount,
      sortBy = 'code',
      sortOrder = 'ASC',
    } = query;

    const where: FindOptionsWhere<UnitOfMeasure> = {
      companyId,
    };

    // Apply filters
    if (!includeInactive && isActive === undefined) {
      where.isActive = true;
    } else if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isBaseUnit !== undefined) {
      where.isBaseUnit = isBaseUnit;
    }

    // Build query
    const queryBuilder = this.repository
      .createQueryBuilder('unit')
      .where(where)
      .leftJoinAndSelect('unit.baseUnit', 'baseUnit');

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(unit.code LIKE :search OR unit.name LIKE :search OR unit.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Include product count if requested
    if (includeProductCount) {
      queryBuilder.loadRelationCountAndMap('unit.productCount', 'unit.products');
    }

    // Sorting
    queryBuilder.orderBy(`unit.${sortBy}`, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

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
   * Find unit by ID
   */
  async findById(id: number, companyId: number): Promise<UnitOfMeasure | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: ['baseUnit'],
    });
  }

  /**
   * Find unit by code
   */
  async findByCode(companyId: number, code: string): Promise<UnitOfMeasure | null> {
    return this.repository.findOne({
      where: { companyId, code },
      relations: ['baseUnit'],
    });
  }

  /**
   * Find all active units (for dropdowns)
   * Includes global units (companyId = NULL) and company-specific units
   */
  async findActive(companyId: number): Promise<UnitOfMeasure[]> {
    return this.repository
      .createQueryBuilder('unit')
      .leftJoinAndSelect('unit.baseUnit', 'baseUnit')
      .where('unit.isActive = :isActive', { isActive: true })
      .andWhere('(unit.company_id IS NULL OR unit.company_id = :companyId)', { companyId })
      .orderBy('unit.code', 'ASC')
      .getMany();
  }

  /**
   * Find base units only
   * Includes global units (companyId = NULL) and company-specific units
   */
  async findBaseUnits(companyId: number): Promise<UnitOfMeasure[]> {
    return this.repository
      .createQueryBuilder('unit')
      .where('unit.isActive = :isActive', { isActive: true })
      .andWhere('unit.isBaseUnit = :isBaseUnit', { isBaseUnit: true })
      .andWhere('(unit.company_id IS NULL OR unit.company_id = :companyId)', { companyId })
      .orderBy('unit.code', 'ASC')
      .getMany();
  }

  /**
   * Get statistics
   */
  async getStats(companyId: number): Promise<{
    total: number;
    active: number;
    inactive: number;
    baseUnits: number;
    derivedUnits: number;
  }> {
    const [total, active, baseUnits] = await Promise.all([
      this.repository.count({ where: { companyId } }),
      this.repository.count({ where: { companyId, isActive: true } }),
      this.repository.count({ where: { companyId, isBaseUnit: true } }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      baseUnits,
      derivedUnits: total - baseUnits,
    };
  }

  /**
   * Create unit
   */
  create(data: Partial<UnitOfMeasure>): UnitOfMeasure {
    return this.repository.create(data);
  }

  /**
   * Save unit
   */
  async save(unit: UnitOfMeasure): Promise<UnitOfMeasure> {
    return this.repository.save(unit);
  }

  /**
   * Remove unit (hard delete)
   */
  async remove(unit: UnitOfMeasure): Promise<void> {
    await this.repository.remove(unit);
  }

  /**
   * Check if unit has products
   */
  async hasProducts(unitId: number): Promise<boolean> {
    const unit = await this.repository.findOne({
      where: { id: unitId },
      relations: ['products'],
    });
    return unit ? unit.hasProducts() : false;
  }
}
