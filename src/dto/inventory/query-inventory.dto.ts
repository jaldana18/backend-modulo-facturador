import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, TransactionReason } from '../../entities/InventoryTransaction.entity';

export class QueryInventoryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Product ID must be an integer' })
  productId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Warehouse ID must be an integer' })
  warehouseId?: number;

  @IsOptional()
  @IsEnum(TransactionType, { message: 'Invalid transaction type' })
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionReason, { message: 'Invalid transaction reason' })
  reason?: TransactionReason;

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date' })
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Min quantity must be a number' })
  minQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Max quantity must be a number' })
  maxQuantity?: number;

  @IsOptional()
  @IsString({ message: 'Reference must be a string' })
  reference?: string;

  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'quantity', 'productId'], {
    message: 'sortBy must be createdAt, quantity, or productId'
  })
  sortBy?: 'createdAt' | 'quantity' | 'productId';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'sortOrder must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC';
}
