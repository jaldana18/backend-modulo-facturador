import { Router } from 'express';
import { BulkProductController } from '../controllers/BulkProductController';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload, handleUploadError } from '../middleware/upload.middleware';

const router = Router();
const bulkProductController = new BulkProductController();

/**
 * @route   POST /api/v1/products/bulk/upload
 * @desc    Upload Excel file for bulk product creation/update
 * @access  Private
 * @body    file: Excel file (.xls, .xlsx)
 *          updateExisting: boolean (optional, default: false) - Update products with existing SKUs
 *          skipErrors: boolean (optional, default: true) - Continue processing if errors occur
 *          dryRun: boolean (optional, default: false) - Validate only, don't save
 */
router.post(
  '/upload',
  authenticateToken,
  upload.single('file'),
  handleUploadError,
  bulkProductController.uploadProducts
);

/**
 * @route   POST /api/v1/products/bulk/validate
 * @desc    Validate Excel file structure without processing
 * @access  Private
 * @body    file: Excel file (.xls, .xlsx)
 */
router.post(
  '/validate',
  authenticateToken,
  upload.single('file'),
  handleUploadError,
  bulkProductController.validateFile
);

/**
 * @route   POST /api/v1/products/bulk/preview
 * @desc    Preview what will be created/updated without saving to database
 * @access  Private
 * @body    file: Excel file (.xls, .xlsx)
 *          updateExisting: boolean (optional, default: false)
 */
router.post(
  '/preview',
  authenticateToken,
  upload.single('file'),
  handleUploadError,
  bulkProductController.previewUpload
);

/**
 * @route   GET /api/v1/products/bulk/template
 * @desc    Download Excel template for bulk upload
 * @access  Private
 */
router.get(
  '/template',
  authenticateToken,
  bulkProductController.downloadTemplate
);

export default router;
