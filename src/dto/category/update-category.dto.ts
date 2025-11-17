import { IsString, IsOptional, IsInt, IsBoolean, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Color must be a string' })
  @MaxLength(50, { message: 'Color cannot exceed 50 characters' })
  color?: string;

  @IsOptional()
  @IsString({ message: 'Icon must be a string' })
  @MaxLength(50, { message: 'Icon cannot exceed 50 characters' })
  icon?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sort order must be an integer' })
  @Min(0, { message: 'Sort order must be at least 0' })
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Parent ID must be an integer' })
  parentId?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
