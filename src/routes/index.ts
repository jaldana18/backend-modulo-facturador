import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import inventoryRoutes from './inventory.routes';
import warehouseRoutes from './warehouse.routes';
import companyRoutes from './company.routes';
import userRoutes from './user.routes';
import categoryRoutes from './category.routes';
import analyticsRoutes from './analytics.routes';
import batchRoutes from './batch.routes';
import bulkProductRoutes from './bulk-product.routes';
import bulkInventoryRoutes from './bulk-inventory.routes';

const router = Router();

/**
 * Mount route modules
 */
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/products/bulk', bulkProductRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/inventory/bulk', bulkInventoryRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/companies', companyRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/batches', batchRoutes);

export default router;
