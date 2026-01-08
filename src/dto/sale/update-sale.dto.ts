import {
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
  IsEnum,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { DiscountType } from '../../entities/Sale.entity';

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
  @IsEnum(DiscountType, { message: 'Discount type must be valid (none, percentage, fixed)' })
  discountType?: DiscountType;

  @ValidateIf((o) => o.discountType === DiscountType.PERCENTAGE)
  @IsNumber({}, { message: 'Discount percentage must be a number' })
  @Min(0, { message: 'Discount percentage must be at least 0' })
  @Max(100, { message: 'Discount percentage cannot exceed 100%' })
  discountPercentage?: number;

  @ValidateIf((o) => o.discountType === DiscountType.FIXED)
  @IsNumber({}, { message: 'Discount amount must be a number' })
  @Min(0, { message: 'Discount amount must be at least 0' })
  discountAmount?: number;

  @IsOptional()
  @IsString({ message: 'Discount reason must be a string' })
  discountReason?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;

  @IsOptional()
  metadata?: any;
}
