import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString({ message: 'SKU must be a string' })
  @MaxLength(100, { message: 'SKU must not exceed 100 characters' })
  sku?: string;

  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(300, { message: 'Name must not exceed 300 characters' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Category must be a string' })
  @MaxLength(100, { message: 'Category must not exceed 100 characters' })
  category?: string;

  @IsOptional()
  @IsString({ message: 'Unit of measure must be a string' })
  @MaxLength(50, { message: 'Unit of measure must not exceed 50 characters' })
  unitOfMeasure?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Minimum stock must be a number' })
  @Min(0, { message: 'Minimum stock must be at least 0' })
  minimumStock?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Reorder point must be a number' })
  @Min(0, { message: 'Reorder point must be at least 0' })
  reorderPoint?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Cost must be a number' })
  @Min(0, { message: 'Cost must be at least 0' })
  cost?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be at least 0' })
  price?: number;

  @IsOptional()
  @IsBoolean({ message: 'Is active must be a boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsString({ message: 'Image URL must be a string' })
  @MaxLength(500, { message: 'Image URL must not exceed 500 characters' })
  imageUrl?: string | null;

  @IsOptional()
  metadata?: any; // Will be stringified to JSON
}
