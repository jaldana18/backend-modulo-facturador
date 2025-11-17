import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(200, { message: 'Name must not exceed 200 characters' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Legal name must be a string' })
  @MaxLength(300, { message: 'Legal name must not exceed 300 characters' })
  legalName?: string;

  @IsString({ message: 'Tax ID must be a string' })
  @IsNotEmpty({ message: 'Tax ID is required' })
  @MinLength(5, { message: 'Tax ID must be at least 5 characters' })
  @MaxLength(50, { message: 'Tax ID must not exceed 50 characters' })
  taxId: string;

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
  settings?: any;
}
