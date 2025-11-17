import { WarehouseRepository } from '../repositories/WarehouseRepository';
import { Warehouse } from '../entities/Warehouse.entity';
import { ApiError } from '../middleware/errorHandler.middleware';
import { loggers } from '../config/logger';

export interface CreateWarehouseDto {
  code: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  managerName?: string;
  isMain?: boolean;
  metadata?: any;
}

export interface UpdateWarehouseDto {
  code?: string;
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  managerName?: string;
  isActive?: boolean;
  isMain?: boolean;
  metadata?: any;
}

export class WarehouseService {
  private warehouseRepository = new WarehouseRepository();

  async getWarehouses(companyId: number, query: any) {
    return this.warehouseRepository.findWithPagination(companyId, query);
  }

  async getWarehouseById(companyId: number, warehouseId: number): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: warehouseId, companyId },
    });

    if (!warehouse) {
      throw new ApiError(404, 'WAREHOUSE_NOT_FOUND', 'Warehouse not found');
    }

    return warehouse;
  }

  async createWarehouse(companyId: number, userId: number, dto: CreateWarehouseDto): Promise<Warehouse> {
    // Check if code already exists
    const existingWarehouse = await this.warehouseRepository.findByCode(companyId, dto.code);
    if (existingWarehouse) {
      throw new ApiError(409, 'CODE_ALREADY_EXISTS', `Warehouse with code "${dto.code}" already exists`);
    }

    // If this is the first warehouse, make it main
    const warehouseCount = await this.warehouseRepository.countByCompany(companyId);
    const isMain = warehouseCount === 0 ? true : (dto.isMain || false);

    const warehouse = this.warehouseRepository.create({
      companyId,
      code: dto.code,
      name: dto.name,
      description: dto.description || null,
      address: dto.address || null,
      city: dto.city || null,
      state: dto.state || null,
      zip: dto.zip || null,
      country: dto.country || null,
      phone: dto.phone || null,
      email: dto.email || null,
      managerName: dto.managerName || null,
      isActive: true,
      isMain,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
    });

    await this.warehouseRepository.save(warehouse);

    if (isMain) {
      await this.warehouseRepository.setMainWarehouse(companyId, warehouse.id);
    }

    loggers.logOperation('warehouse_created', userId, companyId, {
      warehouseId: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
    });

    return warehouse;
  }

  async updateWarehouse(
    companyId: number,
    userId: number,
    warehouseId: number,
    dto: UpdateWarehouseDto
  ): Promise<Warehouse> {
    const warehouse = await this.getWarehouseById(companyId, warehouseId);

    // Check if code is being changed and if it already exists
    if (dto.code && dto.code !== warehouse.code) {
      const isTaken = await this.warehouseRepository.isCodeTaken(companyId, dto.code, warehouseId);
      if (isTaken) {
        throw new ApiError(409, 'CODE_ALREADY_EXISTS', `Warehouse with code "${dto.code}" already exists`);
      }
    }

    // Update fields
    if (dto.code !== undefined) warehouse.code = dto.code;
    if (dto.name !== undefined) warehouse.name = dto.name;
    if (dto.description !== undefined) warehouse.description = dto.description || null;
    if (dto.address !== undefined) warehouse.address = dto.address || null;
    if (dto.city !== undefined) warehouse.city = dto.city || null;
    if (dto.state !== undefined) warehouse.state = dto.state || null;
    if (dto.zip !== undefined) warehouse.zip = dto.zip || null;
    if (dto.country !== undefined) warehouse.country = dto.country || null;
    if (dto.phone !== undefined) warehouse.phone = dto.phone || null;
    if (dto.email !== undefined) warehouse.email = dto.email || null;
    if (dto.managerName !== undefined) warehouse.managerName = dto.managerName || null;
    if (dto.isActive !== undefined) warehouse.isActive = dto.isActive;
    if (dto.metadata !== undefined) {
      warehouse.metadata = dto.metadata ? JSON.stringify(dto.metadata) : null;
    }

    await this.warehouseRepository.save(warehouse);

    // Handle main warehouse change
    if (dto.isMain === true && !warehouse.isMain) {
      await this.warehouseRepository.setMainWarehouse(companyId, warehouseId);
      warehouse.isMain = true;
    }

    loggers.logOperation('warehouse_updated', userId, companyId, {
      warehouseId: warehouse.id,
      code: warehouse.code,
    });

    return warehouse;
  }

  async deleteWarehouse(companyId: number, userId: number, warehouseId: number): Promise<void> {
    const warehouse = await this.getWarehouseById(companyId, warehouseId);

    if (warehouse.isMain) {
      throw new ApiError(400, 'CANNOT_DELETE_MAIN', 'Cannot delete main warehouse');
    }

    await this.warehouseRepository.remove(warehouse);

    loggers.logOperation('warehouse_deleted', userId, companyId, {
      warehouseId,
      code: warehouse.code,
    });
  }

  async getMainWarehouse(companyId: number): Promise<Warehouse | null> {
    return this.warehouseRepository.findMainWarehouse(companyId);
  }

  async getActiveWarehouses(companyId: number): Promise<Warehouse[]> {
    return this.warehouseRepository.findActiveWarehouses(companyId);
  }
}
