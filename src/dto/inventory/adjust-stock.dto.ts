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
import { TransactionReason } from '../../entities/InventoryTransaction.entity';

export class AdjustStockDto {
  @IsInt({ message: 'Product ID must be an integer' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: number;

  @IsOptional()
  @IsInt({ message: 'Warehouse ID must be an integer' })
  warehouseId?: number;

  @IsNumber({}, { message: 'New stock must be a number' })
  @Min(0, { message: 'New stock must be at least 0' })
  @IsNotEmpty({ message: 'New stock is required' })
  newStock: number;

  @IsEnum(TransactionReason, { message: 'Invalid transaction reason' })
  @IsNotEmpty({ message: 'Transaction reason is required' })
  reason: TransactionReason;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes must not exceed 500 characters' })
  notes?: string;
}
