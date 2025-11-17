import { Router } from 'express';
import { WarehouseController } from '../controllers/WarehouseController';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { tenantContextMiddleware } from '../middleware/tenantContext.middleware';

const router = Router();
const warehouseController = new WarehouseController();

router.use(authenticateToken);
router.use(tenantContextMiddleware);

router.get('/main', warehouseController.getMainWarehouse);
router.get('/active', warehouseController.getActiveWarehouses);
router.get('/', warehouseController.getWarehouses);
router.get('/:id', warehouseController.getWarehouseById);
router.post('/', requireRole('admin', 'manager'), warehouseController.createWarehouse);
router.put('/:id', requireRole('admin', 'manager'), warehouseController.updateWarehouse);
router.delete('/:id', requireRole('admin'), warehouseController.deleteWarehouse);

export default router;
