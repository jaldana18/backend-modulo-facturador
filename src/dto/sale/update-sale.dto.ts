import {
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';

export class UpdateSaleDto {
  @IsOptional()
  @IsNumber({}, { message: 'Warehouse ID must be a number' })
  warehouseId?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Sale date must be a valid date' })
  saleDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid date' })
  dueDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Tax percentage must be a number' })
  @Min(0, { message: 'Tax percentage must be at least 0' })
  taxPercentage?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Discount amount must be a number' })
  @Min(0, { message: 'Discount amount must be at least 0' })
  discountAmount?: number;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;

  @IsOptional()
  metadata?: any;
}
