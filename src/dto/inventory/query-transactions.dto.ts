import { IsOptional, IsEnum, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, TransactionReason } from '../../entities/InventoryTransaction.entity';

export class QueryTransactionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Product ID must be an integer' })
  productId?: number;

  @IsOptional()
  @IsEnum(TransactionType, { message: 'Invalid transaction type' })
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionReason, { message: 'Invalid transaction reason' })
  reason?: TransactionReason;

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date string' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date string' })
  endDate?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'quantity', 'productId'], { message: 'Invalid sort field' })
  sortBy?: 'createdAt' | 'quantity' | 'productId';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'Sort order must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC';
}
