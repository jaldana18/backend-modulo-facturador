import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsBoolean({ message: 'Requires reference must be a boolean' })
  requiresReference?: boolean;

  @IsOptional()
  metadata?: any; // Will be stringified to JSON
}
