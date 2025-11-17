import { Router } from 'express';
import { BulkInventoryController } from '../controllers/BulkInventoryController';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload, handleUploadError } from '../middleware/upload.middleware';

const router = Router();
const bulkInventoryController = new BulkInventoryController();

/**
 * @route   POST /api/v1/inventory/bulk/upload
 * @desc    Upload Excel file for bulk inventory inbound (receiving/purchase)
 * @access  Private
 * @body    file: Excel file (.xls, .xlsx)
 *          skipErrors: boolean (optional, default: true)
 *          dryRun: boolean (optional, default: false)
 *          defaultWarehouseCode: string (optional) - Default warehouse if not specified in rows
 */
router.post(
  '/upload',
  authenticateToken,
  upload.single('file'),
  handleUploadError,
  bulkInventoryController.uploadInventory
);

/**
 * @route   POST /api/v1/inventory/bulk/validate
 * @desc    Validate Excel file structure without processing
 * @access  Private
 * @body    file: Excel file (.xls, .xlsx)
 */
router.post(
  '/validate',
  authenticateToken,
  upload.single('file'),
  handleUploadError,
  bulkInventoryController.validateFile
);

/**
 * @route   POST /api/v1/inventory/bulk/preview
 * @desc    Preview what will be created without saving to database
 * @access  Private
 * @body    file: Excel file (.xls, .xlsx)
 *          defaultWarehouseCode: string (optional)
 */
router.post(
  '/preview',
  authenticateToken,
  upload.single('file'),
  handleUploadError,
  bulkInventoryController.previewUpload
);

/**
 * @route   GET /api/v1/inventory/bulk/template
 * @desc    Download Excel template for bulk inventory upload
 * @access  Private
 */
router.get(
  '/template',
  authenticateToken,
  bulkInventoryController.downloadTemplate
);

export default router;
