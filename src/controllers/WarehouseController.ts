import { Request, Response } from 'express';
import { WarehouseService } from '../services/WarehouseService';
import { CreateWarehouseDto } from '../dto/warehouse/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/warehouse/update-warehouse.dto';
import { validateDto } from '../utils/validators.util';
import { ApiResponse } from '../common.types';

export class WarehouseController {
  private warehouseService = new WarehouseService();

  getWarehouses = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const result = await this.warehouseService.getWarehouses(companyId, req.query);
    res.json({ success: true, data: result });
  };

  getWarehouseById = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const warehouseId = parseInt(req.params.id);
    const warehouse = await this.warehouseService.getWarehouseById(companyId, warehouseId);
    res.json({ success: true, data: warehouse });
  };

  createWarehouse = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const createDto = await validateDto(CreateWarehouseDto, req.body);
    const warehouse = await this.warehouseService.createWarehouse(companyId, userId, createDto);
    res.status(201).json({ success: true, data: warehouse });
  };

  updateWarehouse = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const warehouseId = parseInt(req.params.id);
    const updateDto = await validateDto(UpdateWarehouseDto, req.body);
    const warehouse = await this.warehouseService.updateWarehouse(companyId, userId, warehouseId, updateDto);
    res.json({ success: true, data: warehouse });
  };

  deleteWarehouse = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const warehouseId = parseInt(req.params.id);
    await this.warehouseService.deleteWarehouse(companyId, userId, warehouseId);
    res.json({ success: true, data: { message: 'Warehouse deleted successfully' } });
  };

  getMainWarehouse = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const warehouse = await this.warehouseService.getMainWarehouse(companyId);
    res.json({ success: true, data: warehouse });
  };

  getActiveWarehouses = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const warehouses = await this.warehouseService.getActiveWarehouses(companyId);
    res.json({ success: true, data: warehouses });
  };
}
