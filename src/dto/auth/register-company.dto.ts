import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CompanyInfoDto {
  @IsString({ message: 'Company name must be a string' })
  @IsNotEmpty({ message: 'Company name is required' })
  @MaxLength(200, { message: 'Company name must not exceed 200 characters' })
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
  @IsEmail({}, { message: 'Company email must be valid' })
  @MaxLength(200, { message: 'Company email must not exceed 200 characters' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(50, { message: 'Phone must not exceed 50 characters' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Address must be a string' })
  @MaxLength(500, { message: 'Address must not exceed 500 characters' })
  address?: string;
}

class AdminUserDto {
  @IsEmail({}, { message: 'Email must be valid' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(200, { message: 'Email must not exceed 200 characters' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100, { message: 'Password must not exceed 100 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  firstName: string;

  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  lastName: string;
}

export class RegisterCompanyDto {
  @ValidateNested()
  @Type(() => CompanyInfoDto)
  @IsNotEmpty({ message: 'Company information is required' })
  company: CompanyInfoDto;

  @ValidateNested()
  @Type(() => AdminUserDto)
  @IsNotEmpty({ message: 'Admin user information is required' })
  adminUser: AdminUserDto;
}
