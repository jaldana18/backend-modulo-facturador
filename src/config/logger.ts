import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from './environment';
import { ActivityLogService } from '../services/ActivityLogService';
import { ActivityType } from '../entities/ActivityLog.entity';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = `\n${JSON.stringify(meta, null, 2)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // Error log file (rotating)
  new DailyRotateFile({
    filename: path.join('logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: config.logger.fileMaxSize,
    maxFiles: config.logger.fileMaxFiles,
    format: logFormat,
  }),

  // Combined log file (rotating)
  new DailyRotateFile({
    filename: path.join('logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: config.logger.fileMaxSize,
    maxFiles: config.logger.fileMaxFiles,
    format: logFormat,
  }),
];

// Create logger instance
export const logger = winston.createLogger({
  level: config.logger.level,
  format: logFormat,
  defaultMeta: {
    service: 'inventory-api',
    environment: config.nodeEnv,
  },
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logger
export const loggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const loggers = {
  /**
   * Log API request
   */
  logRequest: (req: any, res: any, duration: number) => {
    logger.http({
      type: 'http_request',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.userId,
      companyId: req.user?.companyId,
    });
  },

  /**
   * Log database query
   */
  logQuery: (query: string, duration: number, error?: any) => {
    if (error) {
      logger.error({
        type: 'database_query_error',
        query,
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack,
      });
    } else {
      logger.debug({
        type: 'database_query',
        query: query.length > 200 ? query.substring(0, 200) + '...' : query,
        duration: `${duration}ms`,
      });
    }
  },

  /**
   * Log authentication event
   */
  logAuth: (event: string, userId?: number, email?: string, success: boolean = true, reason?: string) => {
    logger.info({
      type: 'authentication',
      event,
      userId,
      email,
      success,
      reason,
    });
  },

  /**
   * Log business operation
   */
  logOperation: (operation: string, userId: number, companyId: number, details?: any) => {
    logger.info({
      type: 'business_operation',
      operation,
      userId,
      companyId,
      details,
    });
  },

  /**
   * Log error with context
   */
  logError: (error: Error, context?: any) => {
    logger.error({
      type: 'application_error',
      message: error.message,
      stack: error.stack,
      context,
    });
  },

  /**
   * Log security event
   */
  logSecurity: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any) => {
    logger.warn({
      type: 'security_event',
      event,
      severity,
      details,
    });
  },

  /**
   * Log business activity (user action)
   * This saves to both Winston logs and activity_logs table
   */
  logActivity: async (params: {
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
  }) => {
    // Log to Winston for technical logs
    logger.info({
      type: 'user_activity',
      companyId: params.companyId,
      userId: params.userId,
      activityType: params.activityType,
      description: params.description,
      entityType: params.entityType,
      entityId: params.entityId,
    });

    // Save to database for business activity tracking
    try {
      const activityLogService = new ActivityLogService();
      await activityLogService.logActivity(params);
    } catch (error) {
      logger.error({
        type: 'activity_log_error',
        message: 'Failed to save activity to database',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
};

export default logger;
