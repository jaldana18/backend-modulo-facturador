import { IsOptional, IsString, IsBoolean, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCategoriesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20;

  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Parent ID must be an integer' })
  parentId?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'includeInactive must be a boolean' })
  includeInactive?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'includeProductCount must be a boolean' })
  includeProductCount?: boolean;

  @IsOptional()
  @IsEnum(['name', 'sortOrder', 'createdAt'], { message: 'Invalid sort field' })
  sortBy?: 'name' | 'sortOrder' | 'createdAt' = 'sortOrder';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'Sort order must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
