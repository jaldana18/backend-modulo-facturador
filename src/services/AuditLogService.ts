import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import { Readable } from 'stream';
import { ApiError } from '../middleware/errorHandler.middleware';

/**
 * Log level types
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';

/**
 * Log operation types
 */
export type LogType =
  | 'http_request'
  | 'database_query'
  | 'database_query_error'
  | 'authentication'
  | 'business_operation'
  | 'application_error'
  | 'security_event'
  | 'migration_status';

/**
 * Log entry structure
 */
export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  environment: string;
  type?: LogType;
  userId?: number;
  companyId?: number;
  operation?: string;
  details?: any;
  [key: string]: any; // For additional metadata
}

/**
 * Query parameters for filtering logs
 */
export interface LogQueryParams {
  startDate?: string;
  endDate?: string;
  level?: LogLevel[];
  type?: LogType[];
  operation?: string[];
  userId?: number;
  companyId?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'level' | 'type';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Log statistics
 */
export interface LogStats {
  totalLogs: number;
  byLevel: Record<LogLevel, number>;
  byType: Record<string, number>;
  byOperation: Record<string, number>;
  lastHour: number;
  last24Hours: number;
  last7Days: number;
}

/**
 * Service for reading and querying audit logs from Winston log files
 */
export class AuditLogService {
  private logsDirectory: string;

  constructor() {
    this.logsDirectory = path.join(process.cwd(), 'logs');
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getLogs(params: LogQueryParams): Promise<{
    logs: LogEntry[];
    pagination: PaginationInfo;
    filters: Partial<LogQueryParams>;
  }> {
    const {
      startDate,
      endDate,
      level,
      type,
      operation,
      userId,
      companyId,
      search,
      page = 1,
      limit = 50,
      sortOrder = 'desc',
    } = params;

    // Validate parameters
    if (limit > 500) {
      throw new ApiError(400, 'INVALID_LIMIT', 'El límite máximo es 500 registros');
    }

    if (page < 1) {
      throw new ApiError(400, 'INVALID_PAGE', 'El número de página debe ser mayor a 0');
    }

    // Get log files to read based on date range
    const logFiles = await this.getLogFilesInRange(startDate, endDate);

    // Read and parse logs from files
    let allLogs = await this.readLogsFromFiles(logFiles);

    // Apply filters
    allLogs = this.filterLogs(allLogs, {
      level,
      type,
      operation,
      userId,
      companyId,
      search,
    });

    // Sort logs
    allLogs = this.sortLogs(allLogs, sortOrder);

    // Calculate pagination
    const total = allLogs.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Get paginated results
    const paginatedLogs = allLogs.slice(startIndex, endIndex);

    return {
      logs: paginatedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      filters: {
        level,
        type,
        operation,
        userId,
        companyId,
        search,
        startDate,
        endDate,
      },
    };
  }

  /**
   * Get log statistics
   */
  async getStats(params?: LogQueryParams): Promise<LogStats> {
    const { startDate, endDate, companyId } = params || {};

    // Get log files
    const logFiles = await this.getLogFilesInRange(startDate, endDate);

    // Read all logs
    let allLogs = await this.readLogsFromFiles(logFiles);

    // Filter by company if specified
    if (companyId) {
      allLogs = allLogs.filter((log) => log.companyId === companyId);
    }

    // Calculate statistics
    const stats: LogStats = {
      totalLogs: allLogs.length,
      byLevel: {
        error: 0,
        warn: 0,
        info: 0,
        http: 0,
        debug: 0,
      },
      byType: {},
      byOperation: {},
      lastHour: 0,
      last24Hours: 0,
      last7Days: 0,
    };

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    allLogs.forEach((log) => {
      // Count by level
      if (log.level in stats.byLevel) {
        stats.byLevel[log.level]++;
      }

      // Count by type
      if (log.type) {
        stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      }

      // Count by operation (for business_operation type)
      if (log.operation) {
        stats.byOperation[log.operation] = (stats.byOperation[log.operation] || 0) + 1;
      }

      // Time-based counts
      const logDate = new Date(log.timestamp);
      if (logDate >= oneHourAgo) {
        stats.lastHour++;
      }
      if (logDate >= oneDayAgo) {
        stats.last24Hours++;
      }
      if (logDate >= sevenDaysAgo) {
        stats.last7Days++;
      }
    });

    return stats;
  }

  /**
   * Get available log files within date range
   */
  private async getLogFilesInRange(
    startDate?: string,
    endDate?: string
  ): Promise<string[]> {
    try {
      const files = await fs.readdir(this.logsDirectory);

      // Filter for combined log files only
      let logFiles = files.filter((file) => file.startsWith('combined-') && file.endsWith('.log'));

      // Filter by date range if specified
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();

        logFiles = logFiles.filter((file) => {
          const match = file.match(/combined-(\d{4}-\d{2}-\d{2})\.log/);
          if (!match) return false;

          const fileDate = new Date(match[1]);
          return fileDate >= start && fileDate <= end;
        });
      }

      // Sort by date (newest first)
      logFiles.sort((a, b) => {
        const dateA = a.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
        const dateB = b.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
        return dateB.localeCompare(dateA);
      });

      return logFiles.map((file) => path.join(this.logsDirectory, file));
    } catch (error: any) {
      throw new ApiError(500, 'LOG_READ_ERROR', `Error leyendo archivos de log: ${error.message}`);
    }
  }

  /**
   * Read and parse logs from multiple files
   */
  private async readLogsFromFiles(filePaths: string[]): Promise<LogEntry[]> {
    const allLogs: LogEntry[] = [];

    for (const filePath of filePaths) {
      try {
        const logs = await this.readLogsFromFile(filePath);
        allLogs.push(...logs);
      } catch (error: any) {
        console.error(`Error reading log file ${filePath}:`, error);
        // Continue with other files
      }
    }

    return allLogs;
  }

  /**
   * Read and parse logs from a single file
   */
  private async readLogsFromFile(filePath: string): Promise<LogEntry[]> {
    const logs: LogEntry[] = [];

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const lines = fileContent.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const logEntry = JSON.parse(line) as LogEntry;

          // Generate ID if not present (based on timestamp and random)
          if (!logEntry.id) {
            logEntry.id = `${new Date(logEntry.timestamp).getTime()}-${Math.random().toString(36).substr(2, 9)}`;
          }

          logs.push(logEntry);
        } catch (parseError) {
          // Skip invalid JSON lines
          continue;
        }
      }
    } catch (error: any) {
      console.error(`Error reading file ${filePath}:`, error);
    }

    return logs;
  }

  /**
   * Filter logs based on criteria
   */
  private filterLogs(
    logs: LogEntry[],
    filters: {
      level?: LogLevel[];
      type?: LogType[];
      operation?: string[];
      userId?: number;
      companyId?: number;
      search?: string;
    }
  ): LogEntry[] {
    let filtered = logs;

    // Filter by level
    if (filters.level && filters.level.length > 0) {
      filtered = filtered.filter((log) => filters.level!.includes(log.level));
    }

    // Filter by type
    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter((log) => log.type && filters.type!.includes(log.type));
    }

    // Filter by operation
    if (filters.operation && filters.operation.length > 0) {
      filtered = filtered.filter((log) => log.operation && filters.operation!.includes(log.operation));
    }

    // Filter by userId
    if (filters.userId !== undefined) {
      filtered = filtered.filter((log) => log.userId === filters.userId);
    }

    // Filter by companyId
    if (filters.companyId !== undefined) {
      filtered = filtered.filter((log) => log.companyId === filters.companyId);
    }

    // Filter by search text
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((log) => {
        const messageMatch = log.message?.toLowerCase().includes(searchLower);
        const detailsMatch = log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower);
        const operationMatch = log.operation?.toLowerCase().includes(searchLower);

        return messageMatch || detailsMatch || operationMatch;
      });
    }

    return filtered;
  }

  /**
   * Sort logs
   */
  private sortLogs(logs: LogEntry[], sortOrder: 'asc' | 'desc'): LogEntry[] {
    return logs.sort((a, b) => {
      const timestampA = new Date(a.timestamp).getTime();
      const timestampB = new Date(b.timestamp).getTime();

      if (sortOrder === 'asc') {
        return timestampA - timestampB;
      } else {
        return timestampB - timestampA;
      }
    });
  }

  /**
   * Export logs to CSV format
   */
  async exportLogsToCSV(params: LogQueryParams): Promise<string> {
    const { logs } = await this.getLogs({ ...params, limit: 10000 }); // Max 10k for export

    // CSV Header
    const headers = [
      'Timestamp',
      'Level',
      'Type',
      'Operation',
      'Message',
      'User ID',
      'Company ID',
      'Details',
    ];

    // CSV Rows
    const rows = logs.map((log) => [
      log.timestamp,
      log.level,
      log.type || '',
      log.operation || '',
      log.message,
      log.userId || '',
      log.companyId || '',
      log.details ? JSON.stringify(log.details) : '',
    ]);

    // Build CSV
    const csvLines = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ];

    return csvLines.join('\n');
  }

  /**
   * Get operations list (for filter dropdown)
   */
  async getAvailableOperations(companyId?: number): Promise<string[]> {
    const stats = await this.getStats({ companyId });
    return Object.keys(stats.byOperation).sort();
  }

  /**
   * Get log types list (for filter dropdown)
   */
  async getAvailableTypes(companyId?: number): Promise<LogType[]> {
    const stats = await this.getStats({ companyId });
    return Object.keys(stats.byType) as LogType[];
  }
}
