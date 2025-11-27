import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { tenantContextMiddleware } from '../middleware/tenantContext.middleware';
import { uploadSingleImage, handleImageUploadError } from '../middleware/imageUpload.middleware';

const router = Router();
const productController = new ProductController();

// Apply authentication and tenant context to all routes
router.use(authenticateToken);
router.use(tenantContextMiddleware);

/**
 * @route   GET /api/v1/products/statistics
 * @desc    Get product statistics
 * @access  Private (admin, manager)
 */
router.get('/statistics', requireRole('admin', 'manager'), productController.getStatistics);

/**
 * @route   GET /api/v1/products/categories
 * @desc    Get all categories
 * @access  Private
 */
router.get('/categories', productController.getCategories);

/**
 * @route   GET /api/v1/products/category/:category
 * @desc    Get products by category
 * @access  Private
 */
router.get('/category/:category', productController.getProductsByCategory);

/**
 * @route   GET /api/v1/products
 * @desc    Get all products with pagination and filters
 * @access  Private
 */
router.get('/', productController.getProducts);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get product by ID
 * @access  Private
 */
router.get('/:id', productController.getProductById);

/**
 * @route   POST /api/v1/products
 * @desc    Create new product
 * @access  Private (admin, manager)
 */
router.post('/', requireRole('admin', 'manager'), productController.createProduct);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update product
 * @access  Private (admin, manager)
 */
router.put('/:id', requireRole('admin', 'manager'), productController.updateProduct);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete product (soft delete by default, ?permanent=true for hard delete)
 * @access  Private (admin only for permanent delete)
 */
router.delete('/:id', (req, res, next) => {
  const permanent = req.query.permanent === 'true';
  if (permanent) {
    return requireRole('admin')(req, res, next);
  }
  return requireRole('admin', 'manager')(req, res, next);
}, productController.deleteProduct);

/**
 * @route   POST /api/v1/products/:id/image
 * @desc    Upload or replace product image
 * @access  Private (admin, manager)
 */
router.post(
  '/:id/image',
  requireRole('admin', 'manager'),
  uploadSingleImage,
  handleImageUploadError,
  productController.uploadProductImage
);

/**
 * @route   DELETE /api/v1/products/:id/image
 * @desc    Delete product image
 * @access  Private (admin, manager)
 */
router.delete(
  '/:id/image',
  requireRole('admin', 'manager'),
  productController.deleteProductImage
);

export default router;
