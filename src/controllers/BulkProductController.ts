import { Request, Response } from 'express';
import { BulkProductService } from '../services/BulkProductService';
import { ApiError } from '../middleware/errorHandler.middleware';
import { BulkUploadOptions } from '../dto/product/bulk-upload-product.dto';

/**
 * Controller for bulk product operations
 */
export class BulkProductController {
  private bulkProductService: BulkProductService;

  constructor() {
    this.bulkProductService = new BulkProductService();
  }

  /**
   * POST /api/v1/products/bulk/upload
   * Upload Excel file for bulk product creation/update
   */
  uploadProducts = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    // Check if file was uploaded
    if (!req.file) {
      throw new ApiError(400, 'NO_FILE', 'No se proporcionó ningún archivo');
    }

    // Parse options from request body
    const options: BulkUploadOptions = {
      updateExisting: req.body.updateExisting === 'true' || req.body.updateExisting === true,
      skipErrors: req.body.skipErrors !== 'false' && req.body.skipErrors !== false, // Default true
      dryRun: req.body.dryRun === 'true' || req.body.dryRun === true,
    };

    // Process the file
    const result = await this.bulkProductService.processExcelUpload(
      companyId,
      req.file.buffer,
      options
    );

    // Determine response status
    const hasErrors = result.errorCount > 0;
    const hasSuccess = result.successCount > 0;

    let message: string;
    if (options.dryRun) {
      message = `Validación completada: ${result.successCount} filas válidas, ${result.errorCount} con errores`;
    } else if (!hasErrors) {
      message = `Carga completada exitosamente: ${result.createdProducts.length} productos creados, ${result.updatedProducts.length} actualizados`;
    } else if (hasSuccess) {
      message = `Carga parcialmente exitosa: ${result.successCount} procesados, ${result.errorCount} con errores`;
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
   * POST /api/v1/products/bulk/validate
   * Validate Excel file without saving to database
   */
  validateFile = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw new ApiError(400, 'NO_FILE', 'No se proporcionó ningún archivo');
    }

    const validation = await this.bulkProductService.validateExcelFile(req.file.buffer);

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
   * GET /api/v1/products/bulk/template
   * Download Excel template for bulk upload
   */
  downloadTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const buffer = this.bulkProductService.generateTemplate();
      const filename = 'plantilla-productos.xlsx';

      // Set response headers
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

      // Send buffer
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
   * POST /api/v1/products/bulk/preview
   * Preview what will be created/updated without saving
   */
  previewUpload = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    if (!req.file) {
      throw new ApiError(400, 'NO_FILE', 'No se proporcionó ningún archivo');
    }

    const options: BulkUploadOptions = {
      updateExisting: req.body.updateExisting === 'true' || req.body.updateExisting === true,
      skipErrors: true,
      dryRun: true, // Always dry run for preview
    };

    const result = await this.bulkProductService.processExcelUpload(
      companyId,
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
          willCreate: result.createdProducts.length,
          willUpdate: result.updatedProducts.length,
        },
        errors: result.errors,
        preview: {
          toCreate: result.createdProducts.slice(0, 10), // First 10
          toUpdate: result.updatedProducts.slice(0, 10), // First 10
        },
      },
    });
  };
}
