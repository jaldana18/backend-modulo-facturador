import * as XLSX from 'xlsx';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product.entity';
import { Warehouse } from '../entities/Warehouse.entity';
import { InventoryTransaction, TransactionType, TransactionReason } from '../entities/InventoryTransaction.entity';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  BulkUploadInventoryDto,
  BulkInventoryUploadResult,
  BulkInventoryUploadError,
  BulkInventoryUploadOptions,
} from '../dto/inventory/bulk-upload-inventory.dto';
import { ApiError } from '../middleware/errorHandler.middleware';
import { Repository } from 'typeorm';
import { BatchService } from './BatchService';

/**
 * Service for bulk inventory operations
 */
export class BulkInventoryService {
  private productRepository: Repository<Product>;
  private warehouseRepository: Repository<Warehouse>;
  private transactionRepository: Repository<InventoryTransaction>;
  private batchService: BatchService;

  constructor() {
    this.productRepository = AppDataSource.getRepository(Product);
    this.warehouseRepository = AppDataSource.getRepository(Warehouse);
    this.transactionRepository = AppDataSource.getRepository(InventoryTransaction);
    this.batchService = new BatchService();
  }

  /**
   * Process Excel file for bulk inventory upload
   */
  async processExcelUpload(
    companyId: number,
    userId: number,
    fileBuffer: Buffer,
    options: BulkInventoryUploadOptions = {}
  ): Promise<BulkInventoryUploadResult> {
    const {
      skipErrors = true,
      dryRun = false,
      defaultWarehouseCode,
      autoCreateProducts = true, // Default to true for better UX
    } = options;

    // Parse Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new ApiError(400, 'INVALID_FILE', 'El archivo Excel está vacío');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false,
    });

    if (rawData.length === 0) {
      throw new ApiError(400, 'EMPTY_FILE', 'El archivo no contiene datos');
    }

    const result: BulkInventoryUploadResult = {
      totalRows: rawData.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      createdTransactions: [],
      createdProducts: [],
      summary: {
        totalQuantity: 0,
        totalCost: 0,
        productsAffected: 0,
        batchesCreated: 0,
        productsCreated: 0,
      },
    };

    // Get products by SKU for validation
    const products = await this.productRepository.find({
      where: { companyId },
    });
    const productMap = new Map(
      products.map((p) => [p.sku.toLowerCase(), p])
    );

    // Get warehouses by code
    const warehouses = await this.warehouseRepository.find({
      where: { companyId },
    });
    const warehouseMap = new Map(
      warehouses.map((w) => [w.code.toLowerCase(), w])
    );

    // Get default warehouse
    let defaultWarehouse: Warehouse | null = null;
    if (defaultWarehouseCode) {
      defaultWarehouse = warehouseMap.get(defaultWarehouseCode.toLowerCase()) || null;
    }
    if (!defaultWarehouse) {
      // Get main warehouse as fallback
      defaultWarehouse =
        warehouses.find((w) => w.isMain) || warehouses[0] || null;
    }

    const processedProducts = new Set<number>();

    // Process each row
    for (let i = 0; i < rawData.length; i++) {
      const rowNumber = i + 2; // Excel rows start at 1, header is row 1
      const row: any = rawData[i];

      try {
        // Map Excel columns to DTO
        const dto = this.mapExcelRowToDto(row, rowNumber);

        // Validate DTO
        const validationErrors = await this.validateInventoryDto(dto);
        if (validationErrors.length > 0) {
          result.errors.push(...validationErrors);
          result.errorCount++;
          if (!skipErrors) {
            break;
          }
          continue;
        }

        // Find or create product
        let product = productMap.get(dto.sku.toLowerCase());
        
        if (!product) {
          // Auto-create product if enabled and data is provided
          if (autoCreateProducts && dto.productName) {
            if (!dryRun) {
              // Create new product
              const newProduct = this.productRepository.create({
                companyId,
                sku: dto.sku,
                name: dto.productName,
                description: dto.description || null,
                category: dto.category || null,
                unitOfMeasure: dto.unitOfMeasure || 'unidad',
                cost: dto.unitCost,
                price: dto.salePrice || dto.unitCost * 1.3, // Default 30% markup if no price provided
                minimumStock: 0,
                reorderPoint: 0,
                isActive: true,
              });

              product = await this.productRepository.save(newProduct);
              
              // Add to map for subsequent rows with same SKU
              productMap.set(dto.sku.toLowerCase(), product);
              
              // Track created product
              result.createdProducts!.push({
                sku: product.sku,
                name: product.name,
                productId: product.id,
              });
              result.summary.productsCreated!++;
            } else {
              // In dry-run, simulate product creation
              result.createdProducts!.push({
                sku: dto.sku,
                name: dto.productName,
                productId: -1, // Placeholder for dry-run
              });
              result.summary.productsCreated!++;
              
              // Continue validation even in dry-run
              processedProducts.add(-1);
              result.successCount++;
              result.summary.totalQuantity += dto.quantity;
              result.summary.totalCost += dto.quantity * dto.unitCost;
              continue;
            }
          } else {
            // Product doesn't exist and auto-create is disabled or no name provided
            const missingInfo = !dto.productName ? ' Falta el nombre del producto.' : '';
            result.errors.push({
              row: rowNumber,
              sku: dto.sku,
              message: `Producto con SKU '${dto.sku}' no existe.${autoCreateProducts ? missingInfo : ' Debe crear el producto primero o habilitar autoCreateProducts.'}`,
            });
            result.errorCount++;
            if (!skipErrors) {
              break;
            }
            continue;
          }
        }

        // Find warehouse
        let warehouse: Warehouse | null = defaultWarehouse;
        if (dto.warehouseCode) {
          warehouse = warehouseMap.get(dto.warehouseCode.toLowerCase()) || null;
          if (!warehouse) {
            result.errors.push({
              row: rowNumber,
              sku: dto.sku,
              field: 'warehouseCode',
              message: `Almacén '${dto.warehouseCode}' no existe`,
              value: dto.warehouseCode,
            });
            result.errorCount++;
            if (!skipErrors) {
              break;
            }
            continue;
          }
        }

        if (!warehouse) {
          result.errors.push({
            row: rowNumber,
            sku: dto.sku,
            message: 'No se especificó almacén y no hay almacén por defecto',
          });
          result.errorCount++;
          if (!skipErrors) {
            break;
          }
          continue;
        }

        // Skip saving if dry run
        if (dryRun) {
          result.successCount++;
          result.summary.totalQuantity += dto.quantity;
          result.summary.totalCost += dto.quantity * dto.unitCost;
          processedProducts.add(product.id);
          continue;
        }

        // Create inbound transaction
        const transaction = this.transactionRepository.create({
          companyId,
          productId: product.id,
          warehouseId: warehouse.id,
          userId,
          type: TransactionType.INBOUND,
          reason: TransactionReason.PURCHASE,
          quantity: dto.quantity,
          unitCost: dto.unitCost,
          totalCost: dto.quantity * dto.unitCost,
          reference: dto.reference || null,
          location: dto.location || null,
          notes: dto.notes || null,
        });

        const savedTransaction: InventoryTransaction = await this.transactionRepository.save(transaction);

        // Create batch for this purchase
        const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;

        const batch = await this.batchService.createBatch(
          companyId,
          product.id,
          savedTransaction.id,
          {
            quantity: dto.quantity,
            unitCost: dto.unitCost,
            warehouseId: warehouse.id,
            expiryDate: expiryDate || undefined,
            lotNumber: dto.lotNumber,
            notes: dto.notes,
          }
        );

        result.createdTransactions.push({
          sku: dto.sku,
          productName: product.name,
          quantity: dto.quantity,
          batchNumber: batch.batchNumber,
          transactionId: savedTransaction.id,
        });

        result.summary.totalQuantity += dto.quantity;
        result.summary.totalCost += dto.quantity * dto.unitCost;
        result.summary.batchesCreated++;
        processedProducts.add(product.id);

        result.successCount++;
      } catch (error: any) {
        result.errors.push({
          row: rowNumber,
          message: error.message || 'Error desconocido al procesar la fila',
        });
        result.errorCount++;

        if (!skipErrors) {
          break;
        }
      }
    }

    result.summary.productsAffected = processedProducts.size;

    return result;
  }

  /**
   * Map Excel row to DTO
   */
  private mapExcelRowToDto(row: any, rowNumber: number): BulkUploadInventoryDto {
    const dto = plainToClass(BulkUploadInventoryDto, {
      sku: this.getColumnValue(row, ['sku', 'SKU', 'código', 'codigo']),
      productName: this.getColumnValue(row, [
        'productName',
        'product_name',
        'nombre',
        'nombre del producto',
        'producto',
        'name',
      ]),
      category: this.getColumnValue(row, ['category', 'categoría', 'categoria']),
      unitOfMeasure: this.getColumnValue(row, [
        'unitOfMeasure',
        'unit_of_measure',
        'unidad de medida',
        'unidad',
        'uom',
      ]),
      salePrice: this.parseNumber(
        this.getColumnValue(row, [
          'salePrice',
          'sale_price',
          'precio de venta',
          'precio venta',
          'precio',
          'price',
        ])
      ),
      description: this.getColumnValue(row, ['description', 'descripción', 'descripcion']),
      quantity: this.parseNumber(
        this.getColumnValue(row, ['quantity', 'cantidad', 'qty'])
      ),
      unitCost: this.parseNumber(
        this.getColumnValue(row, ['unitCost', 'unit_cost', 'costo unitario', 'costo', 'cost'])
      ),
      lotNumber: this.getColumnValue(row, ['lotNumber', 'lot_number', 'lote', 'número de lote']),
      expiryDate: this.getColumnValue(row, [
        'expiryDate',
        'expiry_date',
        'fecha de vencimiento',
        'vencimiento',
      ]),
      warehouseCode: this.getColumnValue(row, [
        'warehouseCode',
        'warehouse_code',
        'warehouse',
        'almacén',
        'almacen',
        'bodega',
      ]),
      supplier: this.getColumnValue(row, ['supplier', 'proveedor']),
      reference: this.getColumnValue(row, [
        'reference',
        'referencia',
        'orden de compra',
        'OC',
        'purchase order',
        'PO',
      ]),
      location: this.getColumnValue(row, ['location', 'ubicación', 'ubicacion']),
      notes: this.getColumnValue(row, ['notes', 'notas', 'observaciones']),
      _rowNumber: rowNumber,
    });

    return dto;
  }

  /**
   * Get column value with flexible column name matching
   */
  private getColumnValue(row: any, possibleNames: string[]): any {
    for (const name of possibleNames) {
      const key = Object.keys(row).find(
        (k) => k.toLowerCase() === name.toLowerCase()
      );
      if (key !== undefined && row[key] !== null && row[key] !== '') {
        return row[key];
      }
    }
    return undefined;
  }

  /**
   * Parse number from string or number
   */
  private parseNumber(value: any): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Validate inventory DTO
   */
  private async validateInventoryDto(
    dto: BulkUploadInventoryDto
  ): Promise<BulkInventoryUploadError[]> {
    const errors: BulkInventoryUploadError[] = [];
    const validationErrors = await validate(dto);

    for (const error of validationErrors) {
      const constraints = error.constraints;
      if (constraints) {
        for (const key in constraints) {
          errors.push({
            row: dto._rowNumber || 0,
            sku: dto.sku,
            field: error.property,
            message: constraints[key],
            value: error.value,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Generate Excel template for bulk inventory upload
   */
  generateTemplate(): Buffer {
    const wb = XLSX.utils.book_new();

    // Define headers with new product fields
    const headers = [
      'SKU',
      'Nombre Producto',
      'Categoría',
      'Unidad de Medida',
      'Precio de Venta',
      'Descripción',
      'Cantidad',
      'Costo Unitario',
      'Número de Lote',
      'Fecha de Vencimiento',
      'Almacén',
      'Proveedor',
      'Referencia/OC',
      'Ubicación',
      'Notas',
    ];

    // Sample data with product information
    const sampleData = [
      [
        'PROD-001',
        'Producto Ejemplo 1',
        'Electrónica',
        'unidad',
        75000,
        'Producto de ejemplo para carga masiva',
        100,
        50000,
        'LOTE-2025-001',
        '2026-12-31',
        'WH-001',
        'Proveedor ABC',
        'OC-12345',
        'Estante A-1',
        'Pedido de enero',
      ],
      [
        'PROD-002',
        'Producto Ejemplo 2',
        'Hogar',
        'caja',
        180000,
        '',
        50,
        120000,
        'LOTE-2025-002',
        '',
        'WH-001',
        'Proveedor XYZ',
        'OC-12346',
        'Estante B-3',
        '',
      ],
    ];

    const wsData = [headers, ...sampleData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Adjust column widths for better readability
    ws['!cols'] = [
      { wch: 15 }, // SKU
      { wch: 25 }, // Nombre Producto
      { wch: 15 }, // Categoría
      { wch: 18 }, // Unidad de Medida
      { wch: 18 }, // Precio de Venta
      { wch: 30 }, // Descripción
      { wch: 12 }, // Cantidad
      { wch: 15 }, // Costo Unitario
      { wch: 18 }, // Número de Lote
      { wch: 20 }, // Fecha de Vencimiento
      { wch: 12 }, // Almacén
      { wch: 20 }, // Proveedor
      { wch: 18 }, // Referencia/OC
      { wch: 15 }, // Ubicación
      { wch: 30 }, // Notas
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    // Instructions sheet
    const instructionsData = [
      ['INSTRUCCIONES PARA CARGA MASIVA DE INVENTARIO'],
      [''],
      ['IMPORTANTE: Esta plantilla es para REGISTRAR ENTRADAS DE MERCANCÍA (compras/pedidos)'],
      ['NO es para crear productos. Los productos deben existir previamente en el sistema.'],
      [''],
      ['Campos Obligatorios:'],
      ['  - SKU: Código del producto (debe existir en el sistema)'],
      ['  - Cantidad: Cantidad que está ingresando al inventario'],
      ['  - Costo Unitario: Costo de compra unitario'],
      [''],
      ['Campos Opcionales:'],
      ['  - Número de Lote: Identificador del lote de producción'],
      ['  - Fecha de Vencimiento: Formato YYYY-MM-DD (ej: 2026-12-31) para productos perecederos'],
      ['  - Almacén: Código del almacén (si no se especifica, usa el almacén principal)'],
      ['  - Proveedor: Nombre del proveedor'],
      ['  - Referencia/OC: Número de orden de compra o referencia'],
      ['  - Ubicación: Ubicación física dentro del almacén (ej: Estante A-1)'],
      ['  - Notas: Observaciones adicionales'],
      [''],
      ['Proceso Automático:'],
      ['  1. Crea una transacción de entrada (INBOUND) por cada fila'],
      ['  2. Crea un lote (BATCH) automáticamente con el costo especificado'],
      ['  3. Actualiza el stock del producto'],
      ['  4. Registra la trazabilidad completa para futuras ventas'],
      [''],
      ['Notas Importantes:'],
      ['  - Los productos (SKUs) DEBEN existir antes de cargar inventario'],
      ['  - Si un producto no existe, use primero la carga masiva de productos'],
      ['  - Cada fila crea un lote independiente (permite diferentes costos)'],
      ['  - Los números deben usar punto como separador decimal (ej: 1000.50)'],
      ['  - Las fechas deben estar en formato YYYY-MM-DD'],
      ['  - El archivo puede tener hasta 1000 filas'],
      [''],
      ['Diferencia con Carga de Productos:'],
      ['  - Carga de Productos: Crea/actualiza el CATÁLOGO de productos (nombre, precio, etc.)'],
      ['  - Carga de Inventario: Registra ENTRADA de mercancía al almacén (cantidades, lotes)'],
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 85 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Validate Excel file before processing
   */
  async validateExcelFile(fileBuffer: Buffer): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    rowCount: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

      if (workbook.SheetNames.length === 0) {
        errors.push('El archivo no contiene hojas');
        return { valid: false, errors, warnings, rowCount: 0 };
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        errors.push('El archivo no contiene datos');
        return { valid: false, errors, warnings, rowCount: 0 };
      }

      if (data.length > 1000) {
        errors.push('El archivo excede el límite de 1000 filas');
        return { valid: false, errors, warnings, rowCount: data.length };
      }

      // Check for required columns
      const firstRow: any = data[0];
      const hasSkuColumn = this.getColumnValue(firstRow, ['sku', 'SKU', 'código', 'codigo']) !== undefined;
      const hasQuantityColumn = this.getColumnValue(firstRow, ['quantity', 'cantidad', 'qty']) !== undefined;

      if (!hasSkuColumn) {
        warnings.push('No se encontró columna de SKU');
      }
      if (!hasQuantityColumn) {
        warnings.push('No se encontró columna de Cantidad');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        rowCount: data.length,
      };
    } catch (error: any) {
      errors.push(`Error al leer el archivo: ${error.message}`);
      return { valid: false, errors, warnings, rowCount: 0 };
    }
  }
}
