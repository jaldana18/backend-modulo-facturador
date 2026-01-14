import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsArray, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { LogLevel, LogType } from '../../services/AuditLogService';

/**
 * DTO for querying audit logs
 */
export class GetAuditLogsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(['error', 'warn', 'info', 'http', 'debug'], { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  level?: LogLevel[];

  @IsOptional()
  @IsArray()
  @IsEnum([
    'http_request',
    'database_query',
    'database_query_error',
    'authentication',
    'business_operation',
    'application_error',
    'security_event',
    'migration_status',
  ], { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  type?: LogType[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  operation?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 50;

  @IsOptional()
  @IsEnum(['timestamp', 'level', 'type'])
  sortBy?: 'timestamp' | 'level' | 'type' = 'timestamp';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
