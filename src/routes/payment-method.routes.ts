import { Router } from 'express';
import { PaymentMethodController } from '../controllers/PaymentMethodController';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { tenantContextMiddleware } from '../middleware/tenantContext.middleware';

const router = Router();
const paymentMethodController = new PaymentMethodController();

// Apply authentication and tenant context to all routes
router.use(authenticateToken);
router.use(tenantContextMiddleware);

/**
 * @route   GET /api/v1/payment-methods
 * @desc    Get all payment methods
 * @access  Private
 */
router.get('/', paymentMethodController.getPaymentMethods);

/**
 * @route   GET /api/v1/payment-methods/:id
 * @desc    Get payment method by ID
 * @access  Private
 */
router.get('/:id', paymentMethodController.getPaymentMethodById);

/**
 * @route   POST /api/v1/payment-methods
 * @desc    Create new payment method
 * @access  Private (admin only)
 */
router.post('/', requireRole('admin'), paymentMethodController.createPaymentMethod);

/**
 * @route   PUT /api/v1/payment-methods/:id
 * @desc    Update payment method
 * @access  Private (admin only)
 */
router.put('/:id', requireRole('admin'), paymentMethodController.updatePaymentMethod);

/**
 * @route   PATCH /api/v1/payment-methods/:id/deactivate
 * @desc    Deactivate payment method
 * @access  Private (admin only)
 */
router.patch('/:id/deactivate', requireRole('admin'), paymentMethodController.deactivatePaymentMethod);

export default router;
