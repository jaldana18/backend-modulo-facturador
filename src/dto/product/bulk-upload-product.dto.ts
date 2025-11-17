import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';

/**
 * DTO for bulk product upload from Excel
 * Represents a single row in the Excel file
 */
export class BulkUploadProductDto {
  @IsString()
  @IsNotEmpty({ message: 'SKU es requerido' })
  @MaxLength(100, { message: 'SKU no puede exceder 100 caracteres' })
  sku: string;

  @IsString()
  @IsNotEmpty({ message: 'Nombre es requerido' })
  @MaxLength(300, { message: 'Nombre no puede exceder 300 caracteres' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Categoría no puede exceder 100 caracteres' })
  category?: string;

  @IsString()
  @IsNotEmpty({ message: 'Unidad de medida es requerida' })
  @MaxLength(50, { message: 'Unidad de medida no puede exceder 50 caracteres' })
  unitOfMeasure: string;

  @IsNumber({}, { message: 'Stock mínimo debe ser un número' })
  @Min(0, { message: 'Stock mínimo no puede ser negativo' })
  @IsOptional()
  minimumStock?: number;

  @IsNumber({}, { message: 'Punto de reorden debe ser un número' })
  @Min(0, { message: 'Punto de reorden no puede ser negativo' })
  @IsOptional()
  reorderPoint?: number;

  @IsNumber({}, { message: 'Costo debe ser un número' })
  @Min(0, { message: 'Costo no puede ser negativo' })
  @IsOptional()
  cost?: number;

  @IsNumber({}, { message: 'Precio debe ser un número' })
  @Min(0, { message: 'Precio no puede ser negativo' })
  @IsOptional()
  price?: number;

  @IsBoolean({ message: 'isActive debe ser true o false' })
  @IsOptional()
  isActive?: boolean;

  // Row number for error reporting
  _rowNumber?: number;
}

/**
 * Result of bulk upload operation
 */
export interface BulkUploadResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: BulkUploadError[];
  createdProducts: Array<{
    sku: string;
    name: string;
    id: number;
  }>;
  updatedProducts: Array<{
    sku: string;
    name: string;
    id: number;
  }>;
}

/**
 * Error details for bulk upload
 */
export interface BulkUploadError {
  row: number;
  sku?: string;
  field?: string;
  message: string;
  value?: any;
}

/**
 * Options for bulk upload
 */
export interface BulkUploadOptions {
  updateExisting?: boolean; // If true, update products with existing SKUs
  skipErrors?: boolean; // If true, continue processing even if some rows have errors
  dryRun?: boolean; // If true, validate but don't save to database
}
