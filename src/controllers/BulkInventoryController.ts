import { Request, Response } from 'express';
import { BulkInventoryService } from '../services/BulkInventoryService';
import { ApiError } from '../middleware/errorHandler.middleware';
import { BulkInventoryUploadOptions } from '../dto/inventory/bulk-upload-inventory.dto';

/**
 * Controller for bulk inventory operations
 */
export class BulkInventoryController {
  private bulkInventoryService: BulkInventoryService;

  constructor() {
    this.bulkInventoryService = new BulkInventoryService();
  }

  /**
   * POST /api/v1/inventory/bulk/upload
   * Upload Excel file for bulk inventory inbound (purchase/receiving)
   */
  uploadInventory = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    if (!req.file) {
      throw new ApiError(400, 'NO_FILE', 'No se proporcionó ningún archivo');
    }

    const options: BulkInventoryUploadOptions = {
      skipErrors: req.body.skipErrors !== 'false' && req.body.skipErrors !== false,
      dryRun: req.body.dryRun === 'true' || req.body.dryRun === true,
      defaultWarehouseCode: req.body.defaultWarehouseCode || undefined,
      autoCreateProducts: req.body.autoCreateProducts !== 'false' && req.body.autoCreateProducts !== false, // Default true
    };

    const result = await this.bulkInventoryService.processExcelUpload(
      companyId,
      userId,
      req.file.buffer,
      options
    );

    const hasErrors = result.errorCount > 0;
    const hasSuccess = result.successCount > 0;

    let message: string;
    const productsCreated = result.summary.productsCreated || 0;
    
    if (options.dryRun) {
      message = `Validación completada: ${result.successCount} filas válidas, ${result.errorCount} con errores`;
      if (productsCreated > 0) {
        message += `, ${productsCreated} productos serían creados`;
      }
    } else if (!hasErrors) {
      message = `Carga completada exitosamente: ${result.createdTransactions.length} entradas registradas, ${result.summary.batchesCreated} lotes creados`;
      if (productsCreated > 0) {
        message += `, ${productsCreated} productos creados`;
      }
    } else if (hasSuccess) {
      message = `Carga parcialmente exitosa: ${result.successCount} procesados, ${result.errorCount} con errores`;
      if (productsCreated > 0) {
        message += `, ${productsCreated} productos creados`;
      }
    } else {
      message = `Carga fallida: todas las filas contienen errores`;
    }

    res.status(hasErrors && !hasSuccess ? 400 : 200).json({
      success: !hasErrors || hasSuccess,
      message,
      data: result,
    });
  };

  /**
   * POST /api/v1/inventory/bulk/validate
   * Validate Excel file without saving to database
   */
  validateFile = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw new ApiError(400, 'NO_FILE', 'No se proporcionó ningún archivo');
    }

    const validation = await this.bulkInventoryService.validateExcelFile(req.file.buffer);

    res.json({
      success: validation.valid,
      message: validation.valid
        ? 'Archivo válido y listo para procesar'
        : 'El archivo contiene errores',
      data: {
        valid: validation.valid,
        rowCount: validation.rowCount,
        errors: validation.errors,
        warnings: validation.warnings,
      },
    });
  };

  /**
   * GET /api/v1/inventory/bulk/template
   * Download Excel template for bulk inventory upload
   */
  downloadTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const buffer = this.bulkInventoryService.generateTemplate();
      const filename = 'plantilla-inventario.xlsx';

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.setHeader('Content-Length', buffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache');

      res.status(200).send(buffer);
    } catch (error: any) {
      throw new ApiError(
        500,
        'TEMPLATE_GENERATION_ERROR',
        `Error al generar la plantilla: ${error.message}`
      );
    }
  };

  /**
   * POST /api/v1/inventory/bulk/preview
   * Preview what will be created without saving
   */
  previewUpload = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    if (!req.file) {
      throw new ApiError(400, 'NO_FILE', 'No se proporcionó ningún archivo');
    }

    const options: BulkInventoryUploadOptions = {
      skipErrors: true,
      dryRun: true, // Always dry run for preview
      defaultWarehouseCode: req.body.defaultWarehouseCode || undefined,
      autoCreateProducts: req.body.autoCreateProducts !== 'false' && req.body.autoCreateProducts !== false,
    };

    const result = await this.bulkInventoryService.processExcelUpload(
      companyId,
      userId,
      req.file.buffer,
      options
    );

    res.json({
      success: true,
      message: 'Vista previa generada',
      data: {
        summary: {
          totalRows: result.totalRows,
          validRows: result.successCount,
          invalidRows: result.errorCount,
          totalQuantity: result.summary.totalQuantity,
          totalCost: result.summary.totalCost,
          productsAffected: result.summary.productsAffected,
          productsToCreate: result.summary.productsCreated || 0,
        },
        createdProducts: result.createdProducts || [],
        errors: result.errors,
      },
    });
  };
}
