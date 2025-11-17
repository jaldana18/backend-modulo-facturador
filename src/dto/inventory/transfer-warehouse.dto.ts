import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class TransferWarehouseDto {
  @IsInt({ message: 'Product ID must be an integer' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: number;

  @IsInt({ message: 'From warehouse ID must be an integer' })
  @IsNotEmpty({ message: 'From warehouse ID is required' })
  fromWarehouseId: number;

  @IsInt({ message: 'To warehouse ID must be an integer' })
  @IsNotEmpty({ message: 'To warehouse ID is required' })
  toWarehouseId: number;

  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0.01, { message: 'Quantity must be greater than 0' })
  @IsNotEmpty({ message: 'Quantity is required' })
  quantity: number;

  @IsOptional()
  @IsString({ message: 'Reference must be a string' })
  @MaxLength(100, { message: 'Reference must not exceed 100 characters' })
  reference?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes must not exceed 500 characters' })
  notes?: string;
}
