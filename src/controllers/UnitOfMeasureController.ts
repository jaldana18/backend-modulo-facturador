import { Request, Response } from 'express';
import { UnitOfMeasureService } from '../services/UnitOfMeasureService';
import { CreateUnitOfMeasureDto } from '../dto/unit-of-measure/create-unit-of-measure.dto';
import { UpdateUnitOfMeasureDto } from '../dto/unit-of-measure/update-unit-of-measure.dto';
import { QueryUnitsOfMeasureDto } from '../dto/unit-of-measure/query-units-of-measure.dto';
import { validateDto } from '../utils/validators.util';
import { ApiResponse } from '../common.types';

export class UnitOfMeasureController {
  private unitService = new UnitOfMeasureService();

  /**
   * GET /api/v1/units-of-measure
   * Get all units with pagination and filters
   */
  getUnits = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    // Validate query params
    const queryDto = await validateDto(QueryUnitsOfMeasureDto, req.query);

    const result = await this.unitService.getUnits(companyId, queryDto);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/units-of-measure/active
   * Get all active units (for dropdowns)
   */
  getActiveUnits = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const units = await this.unitService.getActiveUnits(companyId);

    const response: ApiResponse = {
      success: true,
      data: units,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/units-of-measure/base
   * Get base units only
   */
  getBaseUnits = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const units = await this.unitService.getBaseUnits(companyId);

    const response: ApiResponse = {
      success: true,
      data: units,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/units-of-measure/stats
   * Get unit statistics
   */
  getUnitStats = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const stats = await this.unitService.getUnitStats(companyId);

    const response: ApiResponse = {
      success: true,
      data: stats,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/units-of-measure/:id
   * Get unit by ID
   */
  getUnitById = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const unitId = parseInt(req.params.id);

    const unit = await this.unitService.getUnitById(companyId, unitId);

    const response: ApiResponse = {
      success: true,
      data: unit,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/units-of-measure
   * Create new unit
   */
  createUnit = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    // Validate DTO
    const createDto = await validateDto(CreateUnitOfMeasureDto, req.body);

    const unit = await this.unitService.createUnit(companyId, userId, createDto);

    const response: ApiResponse = {
      success: true,
      data: unit,
    };

    res.status(201).json(response);
  };

  /**
   * PUT /api/v1/units-of-measure/:id
   * Update unit
   */
  updateUnit = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const unitId = parseInt(req.params.id);

    // Validate DTO
    const updateDto = await validateDto(UpdateUnitOfMeasureDto, req.body);

    const unit = await this.unitService.updateUnit(companyId, userId, unitId, updateDto);

    const response: ApiResponse = {
      success: true,
      data: unit,
    };

    res.json(response);
  };

  /**
   * DELETE /api/v1/units-of-measure/:id
   * Delete unit (soft delete by default, permanent with ?permanent=true)
   */
  deleteUnit = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const unitId = parseInt(req.params.id);
    const permanent = req.query.permanent === 'true';

    await this.unitService.deleteUnit(companyId, userId, unitId, permanent);

    const response: ApiResponse = {
      success: true,
      message: permanent ? 'Unit permanently deleted' : 'Unit deactivated',
    };

    res.json(response);
  };

  /**
   * POST /api/v1/units-of-measure/convert
   * Convert quantity between units
   */
  convertQuantity = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const { fromUnitId, toUnitId, quantity } = req.body;

    if (!fromUnitId || !toUnitId || quantity === undefined) {
      const response: ApiResponse = {
        success: false,
        message: 'fromUnitId, toUnitId, and quantity are required',
      };
      res.status(400).json(response);
      return;
    }

    const result = await this.unitService.convertQuantity(
      companyId,
      parseInt(fromUnitId),
      parseInt(toUnitId),
      parseFloat(quantity)
    );

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };
}
