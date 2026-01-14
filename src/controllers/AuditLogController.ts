import { Request, Response } from 'express';
import { AuditLogService } from '../services/AuditLogService';
import { GetAuditLogsDto } from '../dto/audit-log/get-audit-logs.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Controller for audit log operations
 */
export class AuditLogController {
  private auditLogService: AuditLogService;

  constructor() {
    this.auditLogService = new AuditLogService();
  }

  /**
   * Get audit logs with filtering and pagination
   * GET /api/audit-logs
   */
  getLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      // Transform and validate query parameters
      const dto = plainToClass(GetAuditLogsDto, req.query);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map((error) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        });
        return;
      }

      // Non-admin users can only see their company's logs
      const user = req.user!;
      if (user.role !== 'admin') {
        dto.companyId = user.companyId;
      }

      const result = await this.auditLogService.getLogs(dto);

      res.json({
        success: true,
        data: result,
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
   * Get audit log statistics
   * GET /api/audit-logs/stats
   */
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;

      // Non-admin users can only see their company's stats
      const companyId = user.role === 'admin' ? undefined : user.companyId;

      const stats = await this.auditLogService.getStats({ companyId });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error al obtener estadísticas de auditoría',
        code: error.code,
      });
    }
  };

  /**
   * Export audit logs to CSV
   * GET /api/audit-logs/export
   */
  exportLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      // Transform and validate query parameters
      const dto = plainToClass(GetAuditLogsDto, req.query);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map((error) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        });
        return;
      }

      // Non-admin users can only export their company's logs
      const user = req.user!;
      if (user.role !== 'admin') {
        dto.companyId = user.companyId;
      }

      const csv = await this.auditLogService.exportLogsToCSV(dto);

      // Set CSV headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`
      );

      res.send(csv);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error al exportar logs de auditoría',
        code: error.code,
      });
    }
  };

  /**
   * Get available operations for filtering
   * GET /api/audit-logs/operations
   */
  getOperations = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const companyId = user.role === 'admin' ? undefined : user.companyId;

      const operations = await this.auditLogService.getAvailableOperations(companyId);

      res.json({
        success: true,
        data: operations,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error al obtener operaciones disponibles',
        code: error.code,
      });
    }
  };

  /**
   * Get available log types for filtering
   * GET /api/audit-logs/types
   */
  getTypes = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const companyId = user.role === 'admin' ? undefined : user.companyId;

      const types = await this.auditLogService.getAvailableTypes(companyId);

      res.json({
        success: true,
        data: types,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error al obtener tipos de log disponibles',
        code: error.code,
      });
    }
  };
}
