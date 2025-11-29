import { Request, Response } from 'express';
import { ActivityLogService } from '../services/ActivityLogService';
import { QueryActivityLogsDto } from '../dto/activity-log/query-activity-logs.dto';
import { validateDto } from '../utils/validators.util';
import { ApiResponse } from '../common.types';

export class ActivityLogController {
  private activityLogService = new ActivityLogService();

  /**
   * GET /api/v1/activity-logs
   * Get activity logs with pagination and filters
   */
  getActivityLogs = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user?.companyId as number;

    // Validate query params
    const queryDto = await validateDto(QueryActivityLogsDto, req.query);

    const filters = {
      page: queryDto.page,
      limit: queryDto.limit,
      userId: queryDto.userId,
      activityType: queryDto.activityType,
      entityType: queryDto.entityType,
      startDate: queryDto.startDate ? new Date(queryDto.startDate) : undefined,
      endDate: queryDto.endDate ? new Date(queryDto.endDate) : undefined,
      search: queryDto.search,
    };

    const result = await this.activityLogService.getActivityLogs(companyId, filters);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/activity-logs/stats
   * Get activity statistics
   */
  getActivityStats = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user?.companyId as number;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const stats = await this.activityLogService.getActivityStats(companyId, days);

    const response: ApiResponse = {
      success: true,
      data: stats,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/activity-logs/most-active-users
   * Get most active users
   */
  getMostActiveUsers = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user?.companyId as number;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const activeUsers = await this.activityLogService.getMostActiveUsers(companyId, days, limit);

    const response: ApiResponse = {
      success: true,
      data: activeUsers,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/activity-logs/my-recent
   * Get current user's recent activities
   */
  getMyRecentActivities = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user?.companyId as number;
    const userId = req.user?.userId as number;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const activities = await this.activityLogService.getRecentActivitiesByUser(
      companyId,
      userId,
      limit
    );

    const response: ApiResponse = {
      success: true,
      data: activities,
    };

    res.json(response);
  };
}
