import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
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
import { InventoryService } from './InventoryService';
import { loggers } from '../config/logger';
import { ActivityType } from '../entities/ActivityLog.entity';

/**
 * Service for bulk inventory operations
 */
export class BulkInventoryService {
  private productRepository: Repository<Product>;
  private warehouseRepository: Repository<Warehouse>;
  private transactionRepository: Repository<InventoryTransaction>;
  private batchService: BatchService;
  private inventoryService: InventoryService;

  constructor() {
    this.productRepository = AppDataSource.getRepository(Product);
    this.warehouseRepository = AppDataSource.getRepository(Warehouse);
    this.transactionRepository = AppDataSource.getRepository(InventoryTransaction);
    this.batchService = new BatchService();
    this.inventoryService = new InventoryService();
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

    // Validate that company has at least one warehouse
    if (warehouses.length === 0) {
      throw new ApiError(
        400,
        'NO_WAREHOUSES',
        'No hay almacenes registrados en la empresa. Debe crear al menos un almacén antes de cargar inventario.'
      );
    }

    // Get default warehouse
    let defaultWarehouse: Warehouse | null = null;
    if (defaultWarehouseCode) {
      defaultWarehouse = warehouseMap.get(defaultWarehouseCode.toLowerCase()) || null;
      if (!defaultWarehouse) {
        throw new ApiError(
          400,
          'INVALID_DEFAULT_WAREHOUSE',
          `El almacén por defecto '${defaultWarehouseCode}' no existe. Almacenes disponibles: ${warehouses.map(w => w.code).join(', ')}`
        );
      }
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

              // Log auto-created product
              loggers.logOperation('product_auto_created', userId, companyId, {
                productId: product.id,
                sku: product.sku,
                name: product.name,
                source: 'bulk_inventory_upload',
                rowNumber,
              });
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

        // Get current stock before transaction
        const currentStock = await this.inventoryService.getCurrentStockByWarehouse(
          companyId,
          product.id,
          warehouse.id
        );
        const newStock = currentStock + dto.quantity;

        // Create inbound transaction
        const transaction = this.transactionRepository.create({
          companyId,
          productId: product.id,
          warehouseId: warehouse.id,
          userId,
          type: TransactionType.INBOUND,
          reason: TransactionReason.PURCHASE,
          quantity: dto.quantity,
          previousStock: currentStock,
          newStock: newStock,
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

        // Log individual row errors for critical failures
        if (!skipErrors || result.errorCount === 1) {
          loggers.logError(error, {
            operation: 'bulk_inventory_upload_row_error',
            userId,
            companyId,
            rowNumber,
            skipErrors,
          });
        }

        if (!skipErrors) {
          break;
        }
      }
    }

    result.summary.productsAffected = processedProducts.size;

    // Log the bulk upload operation
    if (!dryRun) {
      loggers.logOperation('bulk_inventory_upload', userId, companyId, {
        totalRows: result.totalRows,
        successCount: result.successCount,
        errorCount: result.errorCount,
        productsCreated: result.summary.productsCreated,
        productsAffected: result.summary.productsAffected,
        batchesCreated: result.summary.batchesCreated,
        totalQuantity: result.summary.totalQuantity,
        totalCost: result.summary.totalCost,
        autoCreateProducts,
        skipErrors,
        hasErrors: result.errorCount > 0,
      });

      // Log user activity for frontend
      if (result.successCount > 0) {
        await loggers.logActivity({
          companyId,
          userId,
          activityType: ActivityType.INVENTORY_UPLOAD,
          description: `Cargó ${result.successCount} productos al inventario (${result.summary.totalQuantity} unidades, $${result.summary.totalCost.toFixed(2)})`,
          entityType: 'inventory',
          metadata: {
            totalRows: result.totalRows,
            successCount: result.successCount,
            errorCount: result.errorCount,
            totalQuantity: result.summary.totalQuantity,
            totalCost: result.summary.totalCost,
            batchesCreated: result.summary.batchesCreated,
          },
        });
      }
    }

    return result;
  }

  /**
   * Map Excel row to DTO
   */
  private mapExcelRowToDto(row: any, rowNumber: number): BulkUploadInventoryDto {
    const dto = plainToClass(BulkUploadInventoryDto, {
      sku: this.getColumnValue(row, ['sku', 'SKU', 'sku *', 'SKU *', 'código', 'codigo']),
      productName: this.getColumnValue(row, [
        'productName',
        'product_name',
        'nombre producto **',
        'nombre producto',
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
        this.getColumnValue(row, ['quantity', 'cantidad', 'cantidad *', 'qty'])
      ),
      unitCost: this.parseNumber(
        this.getColumnValue(row, ['unitCost', 'unit_cost', 'costo unitario', 'costo unitario *', 'costo', 'cost'])
      ),
      lotNumber: this.getColumnValue(row, ['lotNumber', 'lot_number', 'número de lote', 'lote']),
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
        'referencia/oc',
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
   * Generate Excel template for bulk inventory upload with colors using ExcelJS
   */
  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventario');

    // Define headers with clear indication of required fields
    const headers = [
      'SKU *',
      'Cantidad *',
      'Costo Unitario *',
      'Número de Lote',
      'Fecha de Vencimiento',
      'Almacén',
      'Proveedor',
      'Referencia/OC',
      'Ubicación',
      'Notas',
      '--- SEPARADOR ---',
      'Nombre Producto **',
      'Categoría',
      'Unidad de Medida',
      'Precio de Venta',
      'Descripción',
    ];

    // Add headers
    worksheet.addRow(headers);

    // Sample data rows
    const sampleData = [
      ['PROD-001', 100, 50000, 'LOTE-2025-001', '2026-12-31', 'WH-001', 'Proveedor ABC', 'OC-12345', 'Estante A-1', 'Pedido de enero', '', 'Laptop Dell', 'Electrónica', 'unidad', 75000, 'Laptop profesional'],
      ['PROD-002', 50, 120000, 'LOTE-2025-002', '', 'WH-001', 'Proveedor XYZ', 'OC-12346', 'Estante B-3', '', '', 'Mouse Logitech', 'Electrónica', 'unidad', 180000, 'Mouse inalámbrico'],
      ['PROD-003', 200, 15000, '', '', '', 'Proveedor ABC', 'OC-12347', '', 'Compra urgente', '', '', '', '', '', ''],
    ];

    sampleData.forEach(row => worksheet.addRow(row));

    // Set column widths
    worksheet.columns = [
      { width: 18 }, // SKU *
      { width: 15 }, // Cantidad *
      { width: 18 }, // Costo Unitario *
      { width: 18 }, // Número de Lote
      { width: 20 }, // Fecha de Vencimiento
      { width: 15 }, // Almacén
      { width: 20 }, // Proveedor
      { width: 18 }, // Referencia/OC
      { width: 15 }, // Ubicación
      { width: 30 }, // Notas
      { width: 5 },  // Separador
      { width: 25 }, // Nombre Producto **
      { width: 15 }, // Categoría
      { width: 18 }, // Unidad de Medida
      { width: 18 }, // Precio de Venta
      { width: 30 }, // Descripción
    ];

    // Style header row with colors
    const headerRow = worksheet.getRow(1);
    headerRow.height = 35;
    headerRow.font = { bold: true, size: 11 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      
      if (header.includes('*') && !header.includes('**')) {
        // Required fields - Red background
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCC' }
        };
        cell.font = { bold: true, color: { argb: 'FFCC0000' }, size: 11 };
      } else if (header.includes('**')) {
        // Conditional required - Orange background
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFE5CC' }
        };
        cell.font = { bold: true, color: { argb: 'FFCC6600' }, size: 11 };
      } else if (header.includes('---')) {
        // Separator - Gray background
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCCCCC' }
        };
        cell.font = { bold: true, size: 10 };
      } else if (index >= 11) {
        // Product creation fields - Light blue
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCE5FF' }
        };
        cell.font = { bold: true, color: { argb: 'FF0066CC' }, size: 11 };
      } else {
        // Optional fields - Light green
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCFFCC' }
        };
        cell.font = { bold: false, size: 11 };
      }
      
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Instructions sheet with color-coded legend
    const instructionsData = [
      ['📦 INSTRUCCIONES PARA CARGA MASIVA DE INVENTARIO'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════════'],
      ['🎯 PROPÓSITO'],
      ['Esta plantilla es para REGISTRAR ENTRADAS DE MERCANCÍA (compras/recepciones de inventario)'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════════'],
      ['🎨 CÓDIGO DE COLORES DE LA PLANTILLA'],
      [''],
      ['  🔴 ROJO (*)          → Campos OBLIGATORIOS - Siempre requeridos'],
      ['  🟠 NARANJA (**)      → Campos CONDICIONALES - Solo si el producto NO existe'],
      ['  🟢 VERDE            → Campos OPCIONALES - Información adicional útil'],
      ['  🔵 AZUL             → Campos de PRODUCTO - Para crear productos automáticamente'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════════'],
      ['✅ CAMPOS OBLIGATORIOS (Columnas con fondo ROJO)'],
      [''],
      ['  1. SKU *                  → Código único del producto (debe existir en el sistema)'],
      ['                              Ejemplo: PROD-001, LAP-DELL-XPS'],
      [''],
      ['  2. Cantidad *             → Unidades que ingresan al inventario (número > 0)'],
      ['                              Ejemplo: 100, 25.5'],
      [''],
      ['  3. Costo Unitario *       → Precio de compra por unidad (número > 0)'],
      ['                              Ejemplo: 50000, 125.99'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════════'],
      ['⚠️ CAMPOS CONDICIONALES (Columnas con fondo NARANJA)'],
      [''],
      ['  Nombre Producto **        → OBLIGATORIO solo si el producto NO existe y autoCreateProducts=true'],
      ['                              Si el SKU ya existe en el sistema, este campo se IGNORA'],
      ['                              Ejemplo: Laptop Dell XPS 15'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════════'],
      ['📝 CAMPOS OPCIONALES (Columnas con fondo VERDE)'],
      [''],
      ['  Número de Lote            → Identificador del lote del proveedor'],
      ['                              Ejemplo: LOTE-2025-001, BATCH-ABC123'],
      ['                              Útil para: Trazabilidad, control de calidad'],
      [''],
      ['  Fecha de Vencimiento      → Fecha de expiración (formato: YYYY-MM-DD o DD/MM/YYYY)'],
      ['                              Ejemplo: 2026-12-31, 31/12/2026'],
      ['                              Útil para: Medicinas, alimentos, productos perecederos'],
      [''],
      ['  Almacén                   → Código del almacén destino'],
      ['                              Ejemplo: WH-001, BODEGA-PRINCIPAL'],
      ['                              Si no se especifica: usa el almacén principal'],
      [''],
      ['  Proveedor                 → Nombre del proveedor/fabricante'],
      ['                              Ejemplo: Proveedor ABC, Samsung Colombia'],
      [''],
      ['  Referencia/OC             → Número de orden de compra o factura'],
      ['                              Ejemplo: OC-12345, FC-001234'],
      ['                              Útil para: Auditoría, conciliación contable'],
      [''],
      ['  Ubicación                 → Ubicación física dentro del almacén'],
      ['                              Ejemplo: A-15-B (Pasillo A, Estante 15, Nivel B)'],
      ['                              Útil para: Facilitar picking, organización'],
      [''],
      ['  Notas                     → Observaciones adicionales sobre esta entrada'],
      ['                              Ejemplo: Producto defectuoso, Promoción del proveedor'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════════'],
      ['🆕 CAMPOS DE CREACIÓN DE PRODUCTOS (Columnas con fondo AZUL)'],
      [''],
      ['Estos campos SOLO se usan cuando el producto NO existe y autoCreateProducts=true'],
      ['Si el producto YA existe, estos campos se IGNORAN completamente'],
      [''],
      ['  Categoría                 → Clasificación del producto'],
      ['                              Ejemplo: Electrónica, Ferretería, Alimentos'],
      [''],
      ['  Unidad de Medida          → Cómo se mide/vende el producto'],
      ['                              Ejemplo: unidad, caja, kg, litro, metro'],
      ['                              Por defecto: "unidad"'],
      [''],
      ['  Precio de Venta           → Precio al que se venderá'],
      ['                              Ejemplo: 75000, 125.99'],
      ['                              Por defecto: Costo * 1.30 (30% de ganancia)'],
      [''],
      ['  Descripción               → Información adicional del producto'],
      ['                              Ejemplo: Laptop para desarrollo de software'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════════'],
      ['🔄 PROCESO AUTOMÁTICO AL CARGAR EL ARCHIVO'],
      [''],
      ['Para cada fila válida del Excel:'],
      ['  1. 🔍 Busca el producto por SKU'],
      ['  2. 🆕 Si no existe y autoCreateProducts=true → lo crea con los campos azules'],
      ['  3. 📥 Crea una transacción de ENTRADA (INBOUND)'],
      ['  4. 🏷️  Crea un LOTE (batch) con el costo especificado'],
      ['  5. 📊 Actualiza el stock del almacén'],
      ['  6. 📝 Registra auditoría completa'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════════'],
      ['❓ PREGUNTAS FRECUENTES'],
      [''],
      ['Q: ¿Qué pasa si cargo un producto que ya existe pero con diferente costo?'],
      ['A: El sistema NO modifica el producto. Crea un nuevo LOTE con el costo que especifiques.'],
      ['   Cada lote mantiene su costo individual, lo cual es correcto porque cada compra'],
      ['   puede tener precios diferentes. El sistema calcula el costo promedio automáticamente.'],
      [''],
      ['Q: ¿Puedo actualizar el precio de venta de productos existentes?'],
      ['A: NO. Esta carga es solo para INVENTARIO. Para actualizar productos usa la'],
      ['   carga masiva de PRODUCTOS (diferente endpoint).'],
      [''],
      ['Q: ¿Qué pasa si no especifico almacén?'],
      ['A: El sistema usa el almacén principal de tu empresa o el especificado en'],
      ['   el parámetro defaultWarehouseCode del API.'],
      [''],
      ['Q: ¿Puedo cargar productos que no existen?'],
      ['A: SÍ, si usas autoCreateProducts=true (default). Solo asegúrate de completar'],
      ['   el campo "Nombre Producto" (naranja) en ese caso.'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════════'],
      ['⚠️ VALIDACIONES Y RESTRICCIONES'],
      [''],
      ['  ✓ SKU debe existir (o se crea si autoCreateProducts=true)'],
      ['  ✓ Cantidad debe ser mayor a 0'],
      ['  ✓ Costo Unitario debe ser mayor a 0'],
      ['  ✓ Almacén debe existir en el sistema (si se especifica)'],
      ['  ✓ Fechas deben estar en formato YYYY-MM-DD o DD/MM/YYYY'],
      ['  ✓ Números deben usar punto (.) como separador decimal: 1000.50'],
      ['  ✓ Máximo 1000 filas por archivo'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════════'],
      ['💡 CASOS DE USO COMUNES'],
      [''],
      ['Caso 1: Compra de productos existentes'],
      ['  → Llena solo columnas ROJAS: SKU, Cantidad, Costo'],
      ['  → Opcionalmente: Referencia/OC, Proveedor'],
      [''],
      ['Caso 2: Primera compra de productos nuevos'],
      ['  → Llena columnas ROJAS: SKU, Cantidad, Costo'],
      ['  → Llena columna NARANJA: Nombre Producto'],
      ['  → Llena columnas AZULES: Categoría, Unidad, Precio, Descripción'],
      [''],
      ['Caso 3: Productos con vencimiento (medicinas, alimentos)'],
      ['  → Llena columnas ROJAS + Fecha de Vencimiento + Número de Lote'],
      [''],
      ['Caso 4: Inventario con ubicaciones específicas'],
      ['  → Llena columnas ROJAS + Almacén + Ubicación'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════════'],
      ['📊 DIFERENCIA ENTRE CARGA DE INVENTARIO Y CARGA DE PRODUCTOS'],
      [''],
      ['  📦 CARGA DE INVENTARIO (este archivo):'],
      ['     • Propósito: Registrar ENTRADAS de mercancía (compras, recepciones)'],
      ['     • Crea: Transacciones, lotes, actualiza stock'],
      ['     • Endpoint: POST /api/v1/inventory/bulk/upload'],
      [''],
      ['  📝 CARGA DE PRODUCTOS (diferente archivo):'],
      ['     • Propósito: Crear/actualizar el CATÁLOGO de productos'],
      ['     • Crea: Productos, actualiza precios, descripciones'],
      ['     • Endpoint: POST /api/v1/products/bulk/upload'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════════'],
      ['🚀 PASOS RECOMENDADOS'],
      [''],
      ['  1. Descarga esta plantilla'],
      ['  2. Llena los datos (respeta los campos obligatorios en ROJO)'],
      ['  3. Guarda el archivo Excel'],
      ['  4. (Opcional) Valida: POST /api/v1/inventory/bulk/validate'],
      ['  5. (Recomendado) Vista previa: POST /api/v1/inventory/bulk/preview'],
      ['  6. Carga definitiva: POST /api/v1/inventory/bulk/upload'],
      [''],
      ['═══════════════════════════════════════════════════════════════════════════════════'],
      ['📞 ¿Necesitas ayuda? Contacta al administrador del sistema'],
    ];

    // Instructions sheet
    const instructionsSheet = workbook.addWorksheet('Instrucciones');
    instructionsSheet.columns = [{ width: 95 }];

    instructionsData.forEach(row => instructionsSheet.addRow(row));

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
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
