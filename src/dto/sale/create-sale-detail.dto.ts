import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateSaleDetailDto {
  @IsNumber({}, { message: 'Product ID must be a number' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: number;

  @IsNumber({}, { message: 'Quantity must be a number' })
  @IsNotEmpty({ message: 'Quantity is required' })
  @Min(0.0001, { message: 'Quantity must be greater than 0' })
  quantity: number;

  @IsNumber({}, { message: 'Unit price must be a number' })
  @IsNotEmpty({ message: 'Unit price is required' })
  @Min(0, { message: 'Unit price must be at least 0' })
  unitPrice: number;

  @IsOptional()
  @IsNumber({}, { message: 'Tax percentage must be a number' })
  @Min(0, { message: 'Tax percentage must be at least 0' })
  taxPercentage?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Discount percentage must be a number' })
  @Min(0, { message: 'Discount percentage must be at least 0' })
  discountPercentage?: number;
}
