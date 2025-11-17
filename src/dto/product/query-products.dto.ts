import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProductsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 20;

  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @IsOptional()
  @IsString({ message: 'SKU must be a string' })
  sku?: string;

  @IsOptional()
  @IsString({ message: 'Category must be a string' })
  category?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'Is active must be a boolean' })
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Min price must be a number' })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Max price must be a number' })
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Min stock must be a number' })
  minStock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Max stock must be a number' })
  maxStock?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'Low stock must be a boolean' })
  lowStock?: boolean;

  @IsOptional()
  @IsEnum(['name', 'sku', 'price', 'createdAt'], {
    message: 'sortBy must be name, sku, price, or createdAt'
  })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'sortOrder must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
