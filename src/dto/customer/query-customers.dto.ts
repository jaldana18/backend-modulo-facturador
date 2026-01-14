import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerType } from '../../entities/Customer.entity';

export class QueryCustomersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string; // Buscar por nombre, documento, código

  @IsOptional()
  @IsEnum(CustomerType, { message: 'Type must be valid (retail, wholesale, vip, distributor)' })
  type?: CustomerType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'Is active must be a boolean' })
  isActive?: boolean;
}
