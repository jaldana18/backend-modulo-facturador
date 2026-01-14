import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEmail,
  IsEnum,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { DocumentType, CustomerType } from '../../entities/Customer.entity';

export class CreateCustomerDto {
  @IsOptional()
  @IsString({ message: 'Code must be a string' })
  @MaxLength(20, { message: 'Code must not exceed 20 characters' })
  code?: string; // Auto-generado si no se provee

  @IsEnum(DocumentType, { message: 'Document type must be valid (CC, NIT, CE, PASSPORT)' })
  @IsNotEmpty({ message: 'Document type is required' })
  documentType: DocumentType;

  @IsString({ message: 'Document number must be a string' })
  @IsNotEmpty({ message: 'Document number is required' })
  @MaxLength(50, { message: 'Document number must not exceed 50 characters' })
  documentNumber: string;

  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(200, { message: 'Name must not exceed 200 characters' })
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
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
  @IsString({ message: 'City must be a string' })
  @MaxLength(100, { message: 'City must not exceed 100 characters' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'State must be a string' })
  @MaxLength(100, { message: 'State must not exceed 100 characters' })
  state?: string;

  @IsOptional()
  @IsString({ message: 'Zip code must be a string' })
  @MaxLength(20, { message: 'Zip code must not exceed 20 characters' })
  zipCode?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Credit limit must be a number' })
  @Min(0, { message: 'Credit limit must be at least 0' })
  creditLimit?: number;

  @IsOptional()
  @IsEnum(CustomerType, { message: 'Customer type must be valid (retail, wholesale, vip, distributor)' })
  customerType?: CustomerType;

  @IsOptional()
  @IsBoolean({ message: 'Tax responsible must be a boolean' })
  taxResponsible?: boolean;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;

  @IsOptional()
  metadata?: any; // Will be stringified to JSON
}
