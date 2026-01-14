import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SaleStatus, SaleType, PaymentStatus } from '../../entities/Sale.entity';

export class QuerySalesDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number = 10;

  @IsOptional()
  @IsEnum(SaleStatus, { message: 'Status must be valid' })
  status?: SaleStatus;

  @IsOptional()
  @IsEnum(SaleType, { message: 'Type must be valid' })
  type?: SaleType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Customer ID must be a number' })
  customerId?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date' })
  endDate?: string;

  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string; // Buscar por número, cliente

  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Payment status must be valid' })
  paymentStatus?: PaymentStatus;
}
