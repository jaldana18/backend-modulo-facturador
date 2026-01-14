import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentDetailDto {
  @IsNumber({}, { message: 'Payment method ID must be a number' })
  @IsNotEmpty({ message: 'Payment method ID is required' })
  paymentMethodId: number;

  @IsNumber({}, { message: 'Amount must be a number' })
  @IsNotEmpty({ message: 'Amount is required' })
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsOptional()
  @IsString({ message: 'Reference number must be a string' })
  referenceNumber?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}

export class CreatePaymentDto {
  @IsNumber({}, { message: 'Sale ID must be a number' })
  @IsNotEmpty({ message: 'Sale ID is required' })
  saleId: number;

  @IsArray({ message: 'Payments must be an array' })
  @ValidateNested({ each: true })
  @Type(() => PaymentDetailDto)
  @IsNotEmpty({ message: 'Payments are required' })
  payments: PaymentDetailDto[]; // Soporte para múltiples métodos de pago

  @IsOptional()
  metadata?: any;
}
