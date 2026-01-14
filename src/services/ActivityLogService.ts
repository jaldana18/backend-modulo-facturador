import { AppDataSource } from '../config/database';
import { ActivityLog, ActivityType } from '../entities/ActivityLog.entity';
import { Repository } from 'typeorm';

export interface LogActivityParams {
  companyId: number;
  userId: number;
  activityType: ActivityType;
  description: string;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ActivityLogFilters {
  page?: number;
  limit?: number;
  userId?: number;
  activityType?: ActivityType;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface PaginatedActivityLogs {
  items: ActivityLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ActivityStats {
  activityType: string;
  count: number;
}

export interface ActiveUserStats {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  activityCount: number;
}

/**
 * Service for managing business activity logs
 */
export class ActivityLogService {
  private activityLogRepository: Repository<ActivityLog>;

  constructor() {
    this.activityLogRepository = AppDataSource.getRepository(ActivityLog);
  }

  /**
   * Log a business activity
   */
  async logActivity(params: LogActivityParams): Promise<ActivityLog> {
    const activityLog = this.activityLogRepository.create({
      companyId: params.companyId,
      userId: params.userId,
      activityType: params.activityType,
      activityDescription: params.description,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      entityName: params.entityName || null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });

    return await this.activityLogRepository.save(activityLog);
  }

  /**
   * Get activity logs with pagination and filters
   */
  async getActivityLogs(
    companyId: number,
    filters: ActivityLogFilters = {}
  ): Promise<PaginatedActivityLogs> {
    const {
      page = 1,
      limit = 50,
      userId,
      activityType,
      entityType,
      startDate,
      endDate,
      search,
    } = filters;

    const skip = (page - 1) * limit;

    const queryBuilder = this.activityLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.companyId = :companyId', { companyId });

    // Apply filters
    if (userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId });
    }

    if (activityType) {
      queryBuilder.andWhere('log.activityType = :activityType', { activityType });
    }

    if (entityType) {
      queryBuilder.andWhere('log.entityType = :entityType', { entityType });
    }

    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
    }

    if (search) {
      queryBuilder.andWhere(
        '(log.activityDescription LIKE :search OR log.entityName LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const items = await queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get recent activities for a user
   */
  async getRecentActivitiesByUser(
    companyId: number,
    userId: number,
    limit: number = 10
  ): Promise<ActivityLog[]> {
    return await this.activityLogRepository.find({
      where: { companyId, userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(companyId: number, days: number = 30): Promise<ActivityStats[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.activityLogRepository
      .createQueryBuilder('log')
      .select('log.activityType', 'activityType')
      .addSelect('COUNT(*)', 'count')
      .where('log.companyId = :companyId', { companyId })
      .andWhere('log.createdAt >= :startDate', { startDate })
      .groupBy('log.activityType')
      .orderBy('count', 'DESC')
      .getRawMany();

    return stats;
  }

  /**
   * Get most active users
   */
  async getMostActiveUsers(companyId: number, days: number = 30, limit: number = 10): Promise<ActiveUserStats[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activeUsers = await this.activityLogRepository
      .createQueryBuilder('log')
      .leftJoin('log.user', 'user')
      .select('log.userId', 'userId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('user.email', 'email')
      .addSelect('COUNT(*)', 'activityCount')
      .where('log.companyId = :companyId', { companyId })
      .andWhere('log.createdAt >= :startDate', { startDate })
      .groupBy('log.userId')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .addGroupBy('user.email')
      .orderBy('activityCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return activeUsers;
  }
}
