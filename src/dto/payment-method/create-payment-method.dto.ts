import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @IsString({ message: 'Code must be a string' })
  @IsNotEmpty({ message: 'Code is required' })
  @MaxLength(50, { message: 'Code must not exceed 50 characters' })
  code: string;

  @IsOptional()
  @IsBoolean({ message: 'Requires reference must be a boolean' })
  requiresReference?: boolean;

  @IsOptional()
  metadata?: any; // Will be stringified to JSON
}
