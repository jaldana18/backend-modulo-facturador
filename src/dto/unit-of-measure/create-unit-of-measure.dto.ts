import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUnitOfMeasureDto {
  @IsString()
  @MaxLength(20)
  code: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  symbol?: string;

  @IsOptional()
  @IsBoolean()
  isBaseUnit?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  baseUnitId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  conversionFactor?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
