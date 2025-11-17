import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(200, { message: 'Name must not exceed 200 characters' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Legal name must be a string' })
  @MaxLength(300, { message: 'Legal name must not exceed 300 characters' })
  legalName?: string;

  @IsOptional()
  @IsString({ message: 'Tax ID must be a string' })
  @MinLength(5, { message: 'Tax ID must be at least 5 characters' })
  @MaxLength(50, { message: 'Tax ID must not exceed 50 characters' })
  taxId?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be valid' })
  @MaxLength(200, { message: 'Email must not exceed 200 characters' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(50, { message: 'Phone must not exceed 50 characters' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Address must be a string' })
  @MaxLength(500, { message: 'Address must not exceed 500 characters' })
  address?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @IsOptional()
  settings?: any;
}
