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
import customerRoutes from './customer.routes';
import paymentMethodRoutes from './payment-method.routes';
import saleRoutes from './sale.routes';
import paymentRoutes from './payment.routes';
import auditLogRoutes from './audit-log.routes';
import activityLogRoutes from './activity-log.routes';
import unitOfMeasureRoutes from './unit-of-measure.routes';

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
router.use('/customers', customerRoutes);
router.use('/payment-methods', paymentMethodRoutes);
router.use('/sales', saleRoutes);
router.use('/payments', paymentRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/units-of-measure', unitOfMeasureRoutes);

export default router;
