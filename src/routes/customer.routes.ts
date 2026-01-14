import { Router } from 'express';
import { CustomerController } from '../controllers/CustomerController';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { tenantContextMiddleware } from '../middleware/tenantContext.middleware';

const router = Router();
const customerController = new CustomerController();

// Apply authentication and tenant context to all routes
router.use(authenticateToken);
router.use(tenantContextMiddleware);

/**
 * @route   GET /api/v1/customers
 * @desc    Get all customers with pagination and filters
 * @access  Private
 */
router.get('/', customerController.getCustomers);

/**
 * @route   GET /api/v1/customers/:id
 * @desc    Get customer by ID
 * @access  Private
 */
router.get('/:id', customerController.getCustomerById);

/**
 * @route   POST /api/v1/customers
 * @desc    Create new customer
 * @access  Private (admin, manager)
 */
router.post('/', requireRole('admin', 'manager'), customerController.createCustomer);

/**
 * @route   PUT /api/v1/customers/:id
 * @desc    Update customer
 * @access  Private (admin, manager)
 */
router.put('/:id', requireRole('admin', 'manager'), customerController.updateCustomer);

/**
 * @route   PATCH /api/v1/customers/:id/deactivate
 * @desc    Deactivate customer
 * @access  Private (admin, manager)
 */
router.patch('/:id/deactivate', requireRole('admin', 'manager'), customerController.deactivateCustomer);

/**
 * @route   PATCH /api/v1/customers/:id/activate
 * @desc    Activate customer
 * @access  Private (admin, manager)
 */
router.patch('/:id/activate', requireRole('admin', 'manager'), customerController.activateCustomer);

/**
 * @route   GET /api/v1/customers/:id/sales-history
 * @desc    Get customer sales history
 * @access  Private
 */
router.get('/:id/sales-history', customerController.getSalesHistory);

export default router;
