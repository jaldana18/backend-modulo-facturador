import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  MaxLength,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';

/**
 * DTO for bulk inventory upload from Excel
 * Represents an incoming shipment/purchase order
 */
export class BulkUploadInventoryDto {
  @IsString()
  @IsNotEmpty({ message: 'SKU es requerido' })
  @MaxLength(100, { message: 'SKU no puede exceder 100 caracteres' })
  sku: string;

  @IsNumber({}, { message: 'Cantidad debe ser un número' })
  @Min(0.01, { message: 'Cantidad debe ser mayor a 0' })
  quantity: number;

  @IsNumber({}, { message: 'Costo unitario debe ser un número' })
  @Min(0, { message: 'Costo unitario no puede ser negativo' })
  unitCost: number;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Número de lote no puede exceder 100 caracteres' })
  lotNumber?: string;

  @IsDateString({}, { message: 'Fecha de vencimiento debe ser una fecha válida (YYYY-MM-DD)' })
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Código de almacén no puede exceder 100 caracteres' })
  warehouseCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Proveedor no puede exceder 100 caracteres' })
  supplier?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Referencia no puede exceder 100 caracteres' })
  reference?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Ubicación no puede exceder 100 caracteres' })
  location?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Notas no pueden exceder 500 caracteres' })
  notes?: string;

  // Row number for error reporting
  _rowNumber?: number;
}

/**
 * Result of bulk inventory upload operation
 */
export interface BulkInventoryUploadResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: BulkInventoryUploadError[];
  createdTransactions: Array<{
    sku: string;
    productName: string;
    quantity: number;
    batchNumber: string;
    transactionId: number;
  }>;
  summary: {
    totalQuantity: number;
    totalCost: number;
    productsAffected: number;
    batchesCreated: number;
  };
}

/**
 * Error details for bulk inventory upload
 */
export interface BulkInventoryUploadError {
  row: number;
  sku?: string;
  field?: string;
  message: string;
  value?: any;
}

/**
 * Options for bulk inventory upload
 */
export interface BulkInventoryUploadOptions {
  skipErrors?: boolean; // If true, continue processing even if some rows have errors
  dryRun?: boolean; // If true, validate but don't save to database
  defaultWarehouseCode?: string; // Default warehouse if not specified in rows
}
