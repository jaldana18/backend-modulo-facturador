import { Request, Response } from 'express';
import { AuditLogDatabaseService } from '../services/AuditLogDatabaseService';
import { ApiError } from '../middleware/errorHandler.middleware';

/**
 * Controller for audit log database operations
 */
export class AuditLogDatabaseController {
  private auditLogService: AuditLogDatabaseService;

  constructor() {
    this.auditLogService = new AuditLogDatabaseService();
  }

  /**
   * Get audit logs with filtering and pagination
   * GET /api/v1/audit-logs-db
   */
  getLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;

      // Parse query parameters
      const {
        userId,
        action,
        entityType,
        entityId,
        severity,
        module,
        startDate,
        endDate,
        search,
        page,
        limit,
        sortOrder,
      } = req.query;

      // Build query params
      const queryParams: any = {
        userId: userId ? parseInt(userId as string) : undefined,
        action: action ? (Array.isArray(action) ? action : [action]) : undefined,
        entityType: entityType ? (Array.isArray(entityType) ? entityType : [entityType]) : undefined,
        entityId: entityId ? parseInt(entityId as string) : undefined,
        severity: severity ? (Array.isArray(severity) ? severity : [severity]) : undefined,
        module: module ? (Array.isArray(module) ? module : [module]) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        search: search as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        sortOrder: (sortOrder as 'ASC' | 'DESC') || 'DESC',
      };

      // Non-admin users can only see their company's logs
      if (user.role !== 'admin') {
        queryParams.companyId = user.companyId;
      } else if (req.query.companyId) {
        queryParams.companyId = parseInt(req.query.companyId as string);
      }

      const result = await this.auditLogService.getLogs(queryParams);

      res.json({
        success: true,
        data: {
          logs: result.logs,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error al obtener logs de auditoría',
        code: error.code,
      });
    }
  };

  /**
   * Get entity history
   * GET /api/v1/audit-logs-db/entity/:entityType/:entityId
   */
  getEntityHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { entityType, entityId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const logs = await this.auditLogService.getEntityHistory(
        user.companyId,
        entityType,
        parseInt(entityId),
        limit
      );

      res.json({
        success: true,
        data: logs,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error al obtener historial de entidad',
        code: error.code,
      });
    }
  };

  /**
   * Get user activity history
   * GET /api/v1/audit-logs-db/user/:userId
   */
  getUserActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { userId } = req.params;
      const { startDate, endDate, limit } = req.query;

      const logs = await this.auditLogService.getUserActivity(
        user.companyId,
        parseInt(userId),
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        limit ? parseInt(limit as string) : 100
      );

      res.json({
        success: true,
        data: logs,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error al obtener actividad de usuario',
        code: error.code,
      });
    }
  };

  /**
   * Get statistics
   * GET /api/v1/audit-logs-db/stats
   */
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { startDate, endDate } = req.query;

      const companyId = user.role === 'admin' && req.query.companyId
        ? parseInt(req.query.companyId as string)
        : user.companyId;

      const stats = await this.auditLogService.getStats(
        companyId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error al obtener estadísticas',
        code: error.code,
      });
    }
  };

  /**
   * Get available actions
   * GET /api/v1/audit-logs-db/filters/actions
   */
  getAvailableActions = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const companyId = user.role !== 'admin' ? user.companyId : undefined;

      const actions = await this.auditLogService.getAvailableActions(companyId);

      res.json({
        success: true,
        data: actions,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error al obtener acciones disponibles',
        code: error.code,
      });
    }
  };

  /**
   * Get available entity types
   * GET /api/v1/audit-logs-db/filters/entity-types
   */
  getAvailableEntityTypes = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const companyId = user.role !== 'admin' ? user.companyId : undefined;

      const entityTypes = await this.auditLogService.getAvailableEntityTypes(companyId);

      res.json({
        success: true,
        data: entityTypes,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error al obtener tipos de entidad disponibles',
        code: error.code,
      });
    }
  };

  /**
   * Get available modules
   * GET /api/v1/audit-logs-db/filters/modules
   */
  getAvailableModules = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const companyId = user.role !== 'admin' ? user.companyId : undefined;

      const modules = await this.auditLogService.getAvailableModules(companyId);

      res.json({
        success: true,
        data: modules,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error al obtener módulos disponibles',
        code: error.code,
      });
    }
  };
}
