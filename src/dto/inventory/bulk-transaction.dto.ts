import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionReason } from '../../entities/InventoryTransaction.entity';

export class BulkTransactionItemDto {
  @IsInt({ message: 'Product ID must be an integer' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: number;

  @IsNumber({}, { message: 'Quantity must be a number' })
  @IsNotEmpty({ message: 'Quantity is required' })
  @Min(0.0001, { message: 'Quantity must be greater than 0' })
  quantity: number;

  @IsOptional()
  @IsNumber({}, { message: 'Unit cost must be a number' })
  @Min(0, { message: 'Unit cost must be at least 0' })
  unitCost?: number;

  @IsOptional()
  @IsString({ message: 'Reference must be a string' })
  @MaxLength(100, { message: 'Reference must not exceed 100 characters' })
  reference?: string;
}

export class BulkTransactionDto {
  @IsArray({ message: 'Items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => BulkTransactionItemDto)
  @IsNotEmpty({ message: 'Items are required' })
  items: BulkTransactionItemDto[];

  @IsInt({ message: 'Warehouse ID must be an integer' })
  @IsNotEmpty({ message: 'Warehouse ID is required' })
  warehouseId: number;

  @IsEnum(TransactionReason, { message: 'Invalid transaction reason' })
  @IsNotEmpty({ message: 'Transaction reason is required' })
  reason: TransactionReason;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes must not exceed 500 characters' })
  notes?: string;
}
