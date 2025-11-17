import * as XLSX from 'xlsx';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product.entity';
import { Category } from '../entities/Category.entity';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  BulkUploadProductDto,
  BulkUploadResult,
  BulkUploadError,
  BulkUploadOptions,
} from '../dto/product/bulk-upload-product.dto';
import { ApiError } from '../middleware/errorHandler.middleware';
import { Repository } from 'typeorm';

/**
 * Service for bulk product operations
 */
export class BulkProductService {
  private productRepository: Repository<Product>;
  private categoryRepository: Repository<Category>;

  constructor() {
    this.productRepository = AppDataSource.getRepository(Product);
    this.categoryRepository = AppDataSource.getRepository(Category);
  }

  /**
   * Process Excel file for bulk product upload
   */
  async processExcelUpload(
    companyId: number,
    fileBuffer: Buffer,
    options: BulkUploadOptions = {}
  ): Promise<BulkUploadResult> {
    const {
      updateExisting = false,
      skipErrors = true,
      dryRun = false,
    } = options;

    // Parse Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new ApiError(400, 'INVALID_FILE', 'El archivo Excel está vacío');
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with header mapping
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false, // Get formatted values
    });

    if (rawData.length === 0) {
      throw new ApiError(400, 'EMPTY_FILE', 'El archivo no contiene datos');
    }

    const result: BulkUploadResult = {
      totalRows: rawData.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      createdProducts: [],
      updatedProducts: [],
    };

    // Get existing categories for the company
    const categories = await this.categoryRepository.find({
      where: { companyId },
    });
    const categoryMap = new Map(
      categories.map((c) => [c.name.toLowerCase(), c.id])
    );

    // Get existing products to check for duplicates
    const existingProducts = await this.productRepository.find({
      where: { companyId },
      select: ['id', 'sku'],
    });
    const skuMap = new Map(existingProducts.map((p) => [p.sku.toLowerCase(), p]));

    // Process each row
    for (let i = 0; i < rawData.length; i++) {
      const rowNumber = i + 2; // Excel rows start at 1, header is row 1
      const row: any = rawData[i];

      try {
        // Map Excel columns to DTO
        const dto = this.mapExcelRowToDto(row, rowNumber);

        // Validate DTO
        const validationErrors = await this.validateProductDto(dto);
        if (validationErrors.length > 0) {
          result.errors.push(...validationErrors);
          result.errorCount++;
          if (!skipErrors) {
            break;
          }
          continue;
        }

        // Check for duplicate SKU
        const existingProduct = skuMap.get(dto.sku.toLowerCase());

        if (existingProduct && !updateExisting) {
          result.errors.push({
            row: rowNumber,
            sku: dto.sku,
            message: `SKU '${dto.sku}' ya existe en el sistema`,
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
          continue;
        }

        // Get or create category
        let categoryId: number | null = null;
        if (dto.category) {
          categoryId = categoryMap.get(dto.category.toLowerCase()) || null;
          if (!categoryId) {
            // Create category if it doesn't exist
            const newCategory = this.categoryRepository.create({
              companyId,
              name: dto.category,
              description: `Categoría creada automáticamente desde carga masiva`,
              isActive: true,
            });
            const savedCategory = await this.categoryRepository.save(newCategory);
            categoryId = savedCategory.id;
            categoryMap.set(dto.category.toLowerCase(), categoryId);
          }
        }

        // Create or update product
        if (existingProduct) {
          // Update existing product
          await this.productRepository.update(
            { id: existingProduct.id, companyId },
            {
              name: dto.name,
              description: dto.description || null,
              category: dto.category || null,
              categoryId,
              unitOfMeasure: dto.unitOfMeasure,
              minimumStock: dto.minimumStock ?? 0,
              reorderPoint: dto.reorderPoint ?? 0,
              cost: dto.cost ?? 0,
              price: dto.price ?? 0,
              isActive: dto.isActive ?? true,
            }
          );

          result.updatedProducts.push({
            sku: dto.sku,
            name: dto.name,
            id: existingProduct.id,
          });
        } else {
          // Create new product
          const product = this.productRepository.create({
            companyId,
            sku: dto.sku,
            name: dto.name,
            description: dto.description || null,
            category: dto.category || null,
            categoryId,
            unitOfMeasure: dto.unitOfMeasure,
            minimumStock: dto.minimumStock ?? 0,
            reorderPoint: dto.reorderPoint ?? 0,
            cost: dto.cost ?? 0,
            price: dto.price ?? 0,
            isActive: dto.isActive ?? true,
          });

          const savedProduct = await this.productRepository.save(product);

          result.createdProducts.push({
            sku: dto.sku,
            name: dto.name,
            id: savedProduct.id,
          });

          // Add to SKU map to detect duplicates within the same upload
          skuMap.set(dto.sku.toLowerCase(), savedProduct);
        }

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

    return result;
  }

  /**
   * Map Excel row to DTO
   */
  private mapExcelRowToDto(row: any, rowNumber: number): BulkUploadProductDto {
    // Support different column name variations
    const dto = plainToClass(BulkUploadProductDto, {
      sku: this.getColumnValue(row, ['sku', 'SKU', 'código', 'codigo']),
      name: this.getColumnValue(row, ['name', 'nombre', 'producto']),
      description: this.getColumnValue(row, ['description', 'descripción', 'descripcion']),
      category: this.getColumnValue(row, ['category', 'categoría', 'categoria']),
      unitOfMeasure: this.getColumnValue(row, [
        'unitOfMeasure',
        'unit_of_measure',
        'unidad',
        'unidad de medida',
        'uom',
      ]),
      minimumStock: this.parseNumber(
        this.getColumnValue(row, ['minimumStock', 'minimum_stock', 'stock mínimo', 'stock minimo'])
      ),
      reorderPoint: this.parseNumber(
        this.getColumnValue(row, ['reorderPoint', 'reorder_point', 'punto de reorden'])
      ),
      cost: this.parseNumber(
        this.getColumnValue(row, ['cost', 'costo', 'precio de compra'])
      ),
      price: this.parseNumber(
        this.getColumnValue(row, ['price', 'precio', 'precio de venta'])
      ),
      isActive: this.parseBoolean(
        this.getColumnValue(row, ['isActive', 'is_active', 'activo', 'active'])
      ),
      _rowNumber: rowNumber,
    });

    return dto;
  }

  /**
   * Get column value with flexible column name matching
   */
  private getColumnValue(row: any, possibleNames: string[]): any {
    for (const name of possibleNames) {
      // Try exact match (case-insensitive)
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
   * Parse boolean from string or boolean
   */
  private parseBoolean(value: any): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    const str = String(value).toLowerCase();
    if (str === 'true' || str === '1' || str === 'si' || str === 'sí' || str === 'yes') {
      return true;
    }
    if (str === 'false' || str === '0' || str === 'no') {
      return false;
    }
    return undefined;
  }

  /**
   * Validate product DTO
   */
  private async validateProductDto(
    dto: BulkUploadProductDto
  ): Promise<BulkUploadError[]> {
    const errors: BulkUploadError[] = [];
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
   * Generate Excel template for bulk upload
   */
  generateTemplate(): Buffer {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Define headers with exact column names
    const headers = [
      'SKU',
      'Nombre',
      'Descripción',
      'Categoría',
      'Unidad de Medida',
      'Stock Mínimo',
      'Punto de Reorden',
      'Costo',
      'Precio',
      'Activo',
    ];

    // Sample data rows
    const sampleData = [
      [
        'PROD-001',
        'Producto Ejemplo 1',
        'Descripción del producto',
        'Electrónicos',
        'Unidad',
        10,
        5,
        100000,
        150000,
        'SI',
      ],
      [
        'PROD-002',
        'Producto Ejemplo 2',
        'Otra descripción',
        'Herramientas',
        'Caja',
        20,
        10,
        50000,
        80000,
        'SI',
      ],
    ];

    // Create worksheet from array of arrays
    const wsData = [headers, ...sampleData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths for better visibility
    ws['!cols'] = [
      { wch: 15 }, // SKU
      { wch: 30 }, // Nombre
      { wch: 40 }, // Descripción
      { wch: 20 }, // Categoría
      { wch: 20 }, // Unidad de Medida
      { wch: 15 }, // Stock Mínimo
      { wch: 18 }, // Punto de Reorden
      { wch: 15 }, // Costo
      { wch: 15 }, // Precio
      { wch: 10 }, // Activo
    ];

    // Add worksheet to workbook with sheet name
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');

    // Add instructions sheet
    const instructionsData = [
      ['INSTRUCCIONES PARA CARGA MASIVA DE PRODUCTOS'],
      [''],
      ['Campos Obligatorios:'],
      ['  - SKU: Código único del producto (máx. 100 caracteres)'],
      ['  - Nombre: Nombre del producto (máx. 300 caracteres)'],
      ['  - Unidad de Medida: Unidad en la que se mide el producto (máx. 50 caracteres)'],
      [''],
      ['Campos Opcionales:'],
      ['  - Descripción: Descripción detallada del producto'],
      ['  - Categoría: Categoría del producto (se creará si no existe)'],
      ['  - Stock Mínimo: Cantidad mínima en inventario (número >= 0)'],
      ['  - Punto de Reorden: Cantidad que dispara alerta de reorden (número >= 0)'],
      ['  - Costo: Precio de compra (número >= 0)'],
      ['  - Precio: Precio de venta (número >= 0)'],
      ['  - Activo: SI/NO - indica si el producto está activo'],
      [''],
      ['Notas Importantes:'],
      ['  - El SKU debe ser único para cada producto'],
      ['  - Los números deben usar punto como separador decimal (ej: 1000.50)'],
      ['  - Las categorías se crearán automáticamente si no existen'],
      ['  - Si un SKU ya existe, puede elegir actualizar o ignorar'],
      ['  - El archivo puede tener hasta 1000 filas'],
      [''],
      ['Valores para "Activo":'],
      ['  - Valores aceptados como SI: SI, SÍ, YES, TRUE, 1'],
      ['  - Valores aceptados como NO: NO, FALSE, 0'],
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

    // Write to buffer
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
      const hasNameColumn = this.getColumnValue(firstRow, ['name', 'nombre', 'producto']) !== undefined;

      if (!hasSkuColumn) {
        warnings.push('No se encontró columna de SKU - asegúrese de que existe');
      }
      if (!hasNameColumn) {
        warnings.push('No se encontró columna de Nombre - asegúrese de que existe');
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
