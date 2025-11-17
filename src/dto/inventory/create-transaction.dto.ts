import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsInt,
} from 'class-validator';
import { TransactionType, TransactionReason } from '../../entities/InventoryTransaction.entity';

export class CreateTransactionDto {
  @IsInt({ message: 'Product ID must be an integer' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: number;

  @IsOptional()
  @IsInt({ message: 'Warehouse ID must be an integer' })
  warehouseId?: number;

  @IsEnum(TransactionType, { message: 'Invalid transaction type' })
  @IsNotEmpty({ message: 'Transaction type is required' })
  type: TransactionType;

  @IsEnum(TransactionReason, { message: 'Invalid transaction reason' })
  @IsNotEmpty({ message: 'Transaction reason is required' })
  reason: TransactionReason;

  @IsNumber({}, { message: 'Quantity must be a number' })
  @IsNotEmpty({ message: 'Quantity is required' })
  quantity: number;

  @IsOptional()
  @IsNumber({}, { message: 'Unit cost must be a number' })
  @Min(0, { message: 'Unit cost must be at least 0' })
  unitCost?: number;

  @IsOptional()
  @IsString({ message: 'Reference must be a string' })
  @MaxLength(100, { message: 'Reference must not exceed 100 characters' })
  reference?: string;

  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  @MaxLength(100, { message: 'Location must not exceed 100 characters' })
  location?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes must not exceed 500 characters' })
  notes?: string;

  @IsOptional()
  metadata?: any;
}
