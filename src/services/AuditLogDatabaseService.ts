import { AppDataSource } from '../config/database';
import { AuditLog } from '../entities/AuditLog.entity';
import { Repository, Between, In, Like, FindOptionsWhere } from 'typeorm';
import { ApiError } from '../middleware/errorHandler.middleware';
import { Request } from 'express';

/**
 * Interface for creating audit log entries
 */
export interface CreateAuditLogDto {
  companyId: number;
  userId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  description: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  severity?: 'info' | 'warning' | 'critical';
  module?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Interface for querying audit logs
 */
export interface AuditLogQueryParams {
  companyId?: number;
  userId?: number;
  action?: string[];
  entityType?: string[];
  entityId?: number;
  severity?: ('info' | 'warning' | 'critical')[];
  module?: string[];
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Service for managing audit logs in database
 * Provides optimized queries with proper indexing for scalability
 */
export class AuditLogDatabaseService {
  private repository: Repository<AuditLog>;

  constructor() {
    this.repository = AppDataSource.getRepository(AuditLog);
  }

  /**
   * Create a new audit log entry
   */
  async createLog(data: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const auditLog = this.repository.create({
        companyId: data.companyId,
        userId: data.userId || null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || null,
        description: data.description,
        oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
        newValues: data.newValues ? JSON.stringify(data.newValues) : null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        severity: data.severity || 'info',
        module: data.module || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      });

      return await this.repository.save(auditLog);
    } catch (error: any) {
      console.error('Error creating audit log:', error);
      throw new ApiError(500, 'AUDIT_LOG_CREATE_ERROR', 'Error al crear registro de auditoría');
    }
  }

  /**
   * Create audit log from Express request context
   */
  async logAction(
    req: Request,
    action: string,
    entityType: string,
    description: string,
    options?: {
      entityId?: number;
      oldValues?: any;
      newValues?: any;
      metadata?: any;
      severity?: 'info' | 'warning' | 'critical';
      module?: string;
    }
  ): Promise<AuditLog> {
    const user = req.user;

    return this.createLog({
      companyId: user?.companyId || 0,
      userId: user?.userId,
      action,
      entityType,
      entityId: options?.entityId,
      description,
      oldValues: options?.oldValues,
      newValues: options?.newValues,
      metadata: options?.metadata,
      severity: options?.severity || 'info',
      module: options?.module,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });
  }

  /**
   * Get audit logs with advanced filtering and pagination
   */
  async getLogs(params: AuditLogQueryParams): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      companyId,
      userId,
      action,
      entityType,
      entityId,
      severity,
      module,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sortOrder = 'DESC',
    } = params;

    // Validate pagination
    if (limit > 500) {
      throw new ApiError(400, 'INVALID_LIMIT', 'El límite máximo es 500 registros');
    }

    // Normalize sortOrder to uppercase
    const normalizedSortOrder = (sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

    // Build where clause
    const where: FindOptionsWhere<AuditLog> = {};

    if (companyId) {
      where.companyId = companyId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (action && action.length > 0) {
      where.action = In(action);
    }

    if (entityType && entityType.length > 0) {
      where.entityType = In(entityType);
    }

    if (entityId !== undefined) {
      where.entityId = entityId;
    }

    if (severity && severity.length > 0) {
      where.severity = In(severity);
    }

    if (module && module.length > 0) {
      where.module = In(module);
    }

    // Date range filter
    if (startDate || endDate) {
      const start = startDate || new Date(0);
      const end = endDate || new Date();
      where.createdAt = Between(start, end);
    }

    // Build query
    const queryBuilder = this.repository
      .createQueryBuilder('audit_log')
      .leftJoinAndSelect('audit_log.user', 'user')
      .where(where);

    // Search in description
    if (search) {
      queryBuilder.andWhere('audit_log.description LIKE :search', {
        search: `%${search}%`,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination and sorting
    const logs = await queryBuilder
      .orderBy('audit_log.createdAt', normalizedSortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityHistory(
    companyId: number,
    entityType: string,
    entityId: number,
    limit: number = 50
  ): Promise<AuditLog[]> {
    return this.repository.find({
      where: {
        companyId,
        entityType,
        entityId,
      },
      relations: ['user'],
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Get user activity history
   */
  async getUserActivity(
    companyId: number,
    userId: number,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<AuditLog[]> {
    const where: FindOptionsWhere<AuditLog> = {
      companyId,
      userId,
    };

    if (startDate || endDate) {
      where.createdAt = Between(
        startDate || new Date(0),
        endDate || new Date()
      );
    }

    return this.repository.find({
      where,
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Get audit log statistics
   */
  async getStats(companyId?: number, startDate?: Date, endDate?: Date): Promise<{
    totalLogs: number;
    byAction: Record<string, number>;
    bySeverity: Record<string, number>;
    byModule: Record<string, number>;
    byEntityType: Record<string, number>;
    recentActivity: AuditLog[];
  }> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (companyId) {
      where.companyId = companyId;
    }

    if (startDate || endDate) {
      where.createdAt = Between(
        startDate || new Date(0),
        endDate || new Date()
      );
    }

    // Get total logs
    const totalLogs = await this.repository.count({ where });

    // Get aggregations using raw queries for better performance
    const [byAction, bySeverity, byModule, byEntityType] = await Promise.all([
      this.repository
        .createQueryBuilder('audit_log')
        .select('audit_log.action', 'action')
        .addSelect('COUNT(*)', 'count')
        .where(where)
        .groupBy('audit_log.action')
        .getRawMany(),

      this.repository
        .createQueryBuilder('audit_log')
        .select('audit_log.severity', 'severity')
        .addSelect('COUNT(*)', 'count')
        .where(where)
        .groupBy('audit_log.severity')
        .getRawMany(),

      this.repository
        .createQueryBuilder('audit_log')
        .select('audit_log.module', 'module')
        .addSelect('COUNT(*)', 'count')
        .where(where)
        .andWhere('audit_log.module IS NOT NULL')
        .groupBy('audit_log.module')
        .getRawMany(),

      this.repository
        .createQueryBuilder('audit_log')
        .select('audit_log.entity_type', 'entityType')
        .addSelect('COUNT(*)', 'count')
        .where(where)
        .groupBy('audit_log.entity_type')
        .getRawMany(),
    ]);

    // Get recent activity
    const recentActivity = await this.repository.find({
      where,
      relations: ['user'],
      order: {
        createdAt: 'DESC',
      },
      take: 20,
    });

    return {
      totalLogs,
      byAction: Object.fromEntries(byAction.map(item => [item.action, parseInt(item.count)])),
      bySeverity: Object.fromEntries(bySeverity.map(item => [item.severity, parseInt(item.count)])),
      byModule: Object.fromEntries(byModule.map(item => [item.module, parseInt(item.count)])),
      byEntityType: Object.fromEntries(byEntityType.map(item => [item.entityType, parseInt(item.count)])),
      recentActivity,
    };
  }

  /**
   * Delete old audit logs (for retention policy)
   */
  async deleteOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get available actions for filtering
   */
  async getAvailableActions(companyId?: number): Promise<string[]> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (companyId) {
      where.companyId = companyId;
    }

    const results = await this.repository
      .createQueryBuilder('audit_log')
      .select('DISTINCT audit_log.action', 'action')
      .where(where)
      .getRawMany();

    return results.map(r => r.action);
  }

  /**
   * Get available entity types for filtering
   */
  async getAvailableEntityTypes(companyId?: number): Promise<string[]> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (companyId) {
      where.companyId = companyId;
    }

    const results = await this.repository
      .createQueryBuilder('audit_log')
      .select('DISTINCT audit_log.entity_type', 'entityType')
      .where(where)
      .getRawMany();

    return results.map(r => r.entityType);
  }

  /**
   * Get available modules for filtering
   */
  async getAvailableModules(companyId?: number): Promise<string[]> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (companyId) {
      where.companyId = companyId;
    }

    const results = await this.repository
      .createQueryBuilder('audit_log')
      .select('DISTINCT audit_log.module', 'module')
      .where(where)
      .andWhere('audit_log.module IS NOT NULL')
      .getRawMany();

    return results.map(r => r.module);
  }
}
