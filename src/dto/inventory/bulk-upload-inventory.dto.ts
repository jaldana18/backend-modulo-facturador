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

  // Campos opcionales para auto-creación de productos
  @IsString()
  @IsOptional()
  @MaxLength(300, { message: 'Nombre no puede exceder 300 caracteres' })
  productName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Categoría no puede exceder 100 caracteres' })
  category?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Unidad de medida no puede exceder 50 caracteres' })
  unitOfMeasure?: string;

  @IsNumber({}, { message: 'Precio de venta debe ser un número' })
  @IsOptional()
  @Min(0, { message: 'Precio de venta no puede ser negativo' })
  salePrice?: number;

  @IsString()
  @IsOptional()
  description?: string;

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
 * Options for bulk inventory upload
 */
export interface BulkInventoryUploadOptions {
  skipErrors?: boolean;
  dryRun?: boolean;
  defaultWarehouseCode?: string;
  autoCreateProducts?: boolean; // Auto-create products that don't exist
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
  createdProducts?: Array<{
    sku: string;
    name: string;
    productId: number;
  }>;
  summary: {
    totalQuantity: number;
    totalCost: number;
    productsAffected: number;
    batchesCreated: number;
    productsCreated?: number;
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
