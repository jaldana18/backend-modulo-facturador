import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsString,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SaleType } from '../../entities/Sale.entity';
import { CreateSaleDetailDto } from './create-sale-detail.dto';

export class CreateSaleDto {
  @IsEnum(SaleType, { message: 'Sale type must be valid (quote, proforma, invoice, remission, credit_note)' })
  @IsNotEmpty({ message: 'Sale type is required' })
  saleType: SaleType;

  @IsNumber({}, { message: 'Customer ID must be a number' })
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: number;

  @IsOptional()
  @IsNumber({}, { message: 'Warehouse ID must be a number' })
  warehouseId?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Sale date must be a valid date' })
  saleDate?: string; // Default: now

  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid date' })
  dueDate?: string; // Para crédito

  @IsOptional()
  @IsNumber({}, { message: 'Tax percentage must be a number' })
  @Min(0, { message: 'Tax percentage must be at least 0' })
  taxPercentage?: number; // Default: 19

  @IsOptional()
  @IsNumber({}, { message: 'Discount amount must be a number' })
  @Min(0, { message: 'Discount amount must be at least 0' })
  discountAmount?: number;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;

  @IsArray({ message: 'Details must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateSaleDetailDto)
  @IsNotEmpty({ message: 'Details are required' })
  details: CreateSaleDetailDto[];

  @IsOptional()
  @IsNumber({}, { message: 'Reference sale ID must be a number' })
  referenceSaleId?: number; // Para notas crédito

  @IsOptional()
  metadata?: any; // Will be stringified to JSON
}
