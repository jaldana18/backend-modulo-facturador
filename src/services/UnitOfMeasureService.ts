import { UnitOfMeasureRepository } from '../repositories/UnitOfMeasureRepository';
import { UnitOfMeasure } from '../entities/UnitOfMeasure.entity';
import { CreateUnitOfMeasureDto } from '../dto/unit-of-measure/create-unit-of-measure.dto';
import { UpdateUnitOfMeasureDto } from '../dto/unit-of-measure/update-unit-of-measure.dto';
import { QueryUnitsOfMeasureDto } from '../dto/unit-of-measure/query-units-of-measure.dto';
import { ApiError } from '../middleware/errorHandler.middleware';
import { loggers } from '../config/logger';
import { PaginatedResponse } from '../common.types';

export class UnitOfMeasureService {
  private unitRepository = new UnitOfMeasureRepository();

  /**
   * Get all units with pagination and filters
   */
  async getUnits(
    companyId: number,
    query: QueryUnitsOfMeasureDto
  ): Promise<PaginatedResponse<UnitOfMeasure>> {
    return this.unitRepository.findWithPagination(companyId, query);
  }

  /**
   * Get all active units (for dropdowns)
   */
  async getActiveUnits(companyId: number): Promise<UnitOfMeasure[]> {
    return this.unitRepository.findActive(companyId);
  }

  /**
   * Get base units only
   */
  async getBaseUnits(companyId: number): Promise<UnitOfMeasure[]> {
    return this.unitRepository.findBaseUnits(companyId);
  }

  /**
   * Get unit statistics
   */
  async getUnitStats(companyId: number): Promise<{
    total: number;
    active: number;
    inactive: number;
    baseUnits: number;
    derivedUnits: number;
  }> {
    return this.unitRepository.getStats(companyId);
  }

  /**
   * Get unit by ID
   */
  async getUnitById(companyId: number, unitId: number): Promise<UnitOfMeasure> {
    const unit = await this.unitRepository.findById(unitId, companyId);

    if (!unit) {
      throw new ApiError(404, 'UNIT_NOT_FOUND', 'Unit of measure not found');
    }

    return unit;
  }

  /**
   * Create new unit
   */
  async createUnit(
    companyId: number,
    userId: number,
    dto: CreateUnitOfMeasureDto
  ): Promise<UnitOfMeasure> {
    // Check if code already exists
    const existingUnit = await this.unitRepository.findByCode(companyId, dto.code);

    if (existingUnit) {
      throw new ApiError(
        409,
        'CODE_ALREADY_EXISTS',
        `Unit with code "${dto.code}" already exists`
      );
    }

    // Validate base unit if provided
    if (dto.baseUnitId) {
      const baseUnit = await this.getUnitById(companyId, dto.baseUnitId);
      if (!baseUnit.isBaseUnit) {
        throw new ApiError(
          400,
          'INVALID_BASE_UNIT',
          'Base unit must be a base unit (isBaseUnit = true)'
        );
      }

      if (!dto.conversionFactor) {
        throw new ApiError(
          400,
          'CONVERSION_FACTOR_REQUIRED',
          'Conversion factor is required when base unit is specified'
        );
      }
    }

    // Create unit
    const unit = this.unitRepository.create({
      companyId,
      code: dto.code.toUpperCase(), // Normalize to uppercase
      name: dto.name,
      description: dto.description,
      symbol: dto.symbol,
      isBaseUnit: dto.isBaseUnit || false,
      baseUnitId: dto.baseUnitId,
      conversionFactor: dto.conversionFactor,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    await this.unitRepository.save(unit);

    loggers.logOperation('unit_of_measure_created', userId, companyId, {
      unitId: unit.id,
      code: unit.code,
      name: unit.name,
    });

    return unit;
  }

  /**
   * Update unit
   */
  async updateUnit(
    companyId: number,
    userId: number,
    unitId: number,
    dto: UpdateUnitOfMeasureDto
  ): Promise<UnitOfMeasure> {
    // Get existing unit
    const unit = await this.getUnitById(companyId, unitId);

    // If code is being changed, check if new code exists
    if (dto.code && dto.code !== unit.code) {
      const existingUnit = await this.unitRepository.findByCode(companyId, dto.code);
      if (existingUnit) {
        throw new ApiError(
          409,
          'CODE_ALREADY_EXISTS',
          `Unit with code "${dto.code}" already exists`
        );
      }
    }

    // Validate base unit if being changed
    if (dto.baseUnitId !== undefined) {
      if (dto.baseUnitId === null) {
        // Removing base unit, should set isBaseUnit = true
        unit.baseUnitId = null;
        unit.conversionFactor = null;
        unit.isBaseUnit = true;
      } else {
        const baseUnit = await this.getUnitById(companyId, dto.baseUnitId);
        if (!baseUnit.isBaseUnit) {
          throw new ApiError(
            400,
            'INVALID_BASE_UNIT',
            'Base unit must be a base unit (isBaseUnit = true)'
          );
        }
        unit.baseUnitId = dto.baseUnitId;
      }
    }

    // Update fields
    if (dto.code !== undefined) unit.code = dto.code.toUpperCase();
    if (dto.name !== undefined) unit.name = dto.name;
    if (dto.description !== undefined) unit.description = dto.description;
    if (dto.symbol !== undefined) unit.symbol = dto.symbol;
    if (dto.isBaseUnit !== undefined) unit.isBaseUnit = dto.isBaseUnit;
    if (dto.conversionFactor !== undefined) unit.conversionFactor = dto.conversionFactor;
    if (dto.isActive !== undefined) unit.isActive = dto.isActive;

    await this.unitRepository.save(unit);

    loggers.logOperation('unit_of_measure_updated', userId, companyId, {
      unitId: unit.id,
      code: unit.code,
      changes: dto,
    });

    return unit;
  }

  /**
   * Delete unit (soft delete by setting isActive = false)
   */
  async deleteUnit(
    companyId: number,
    userId: number,
    unitId: number,
    permanent: boolean = false
  ): Promise<void> {
    const unit = await this.getUnitById(companyId, unitId);

    // Check if unit has products
    const hasProducts = await this.unitRepository.hasProducts(unitId);

    if (hasProducts && permanent) {
      throw new ApiError(
        400,
        'UNIT_HAS_PRODUCTS',
        'Cannot permanently delete unit that has products assigned'
      );
    }

    if (permanent) {
      await this.unitRepository.remove(unit);
      loggers.logOperation('unit_of_measure_permanently_deleted', userId, companyId, {
        unitId,
        code: unit.code,
        name: unit.name,
      });
    } else {
      unit.isActive = false;
      await this.unitRepository.save(unit);
      loggers.logOperation('unit_of_measure_deleted', userId, companyId, {
        unitId: unit.id,
        code: unit.code,
        name: unit.name,
      });
    }
  }

  /**
   * Convert quantity between units
   */
  async convertQuantity(
    companyId: number,
    fromUnitId: number,
    toUnitId: number,
    quantity: number
  ): Promise<{ convertedQuantity: number; fromUnit: UnitOfMeasure; toUnit: UnitOfMeasure }> {
    const fromUnit = await this.getUnitById(companyId, fromUnitId);
    const toUnit = await this.getUnitById(companyId, toUnitId);

    // Same unit, no conversion needed
    if (fromUnitId === toUnitId) {
      return { convertedQuantity: quantity, fromUnit, toUnit };
    }

    // Check if units are compatible (have same base unit)
    if (
      fromUnit.baseUnitId !== toUnit.baseUnitId &&
      !(fromUnit.isBaseUnit && toUnit.baseUnitId === fromUnit.id) &&
      !(toUnit.isBaseUnit && fromUnit.baseUnitId === toUnit.id)
    ) {
      throw new ApiError(
        400,
        'INCOMPATIBLE_UNITS',
        `Cannot convert between ${fromUnit.code} and ${toUnit.code}: incompatible unit types`
      );
    }

    // Convert to base unit first
    const baseQuantity = fromUnit.convertToBaseUnit(quantity);
    if (baseQuantity === null) {
      throw new ApiError(
        400,
        'CONVERSION_FAILED',
        `Cannot convert from ${fromUnit.code}: missing conversion factor`
      );
    }

    // Convert from base unit to target unit
    const convertedQuantity = toUnit.convertFromBaseUnit(baseQuantity);
    if (convertedQuantity === null) {
      throw new ApiError(
        400,
        'CONVERSION_FAILED',
        `Cannot convert to ${toUnit.code}: missing conversion factor`
      );
    }

    return { convertedQuantity, fromUnit, toUnit };
  }
}
