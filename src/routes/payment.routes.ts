import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { tenantContextMiddleware } from '../middleware/tenantContext.middleware';

const router = Router();
const paymentController = new PaymentController();

// Apply authentication and tenant context to all routes
router.use(authenticateToken);
router.use(tenantContextMiddleware);

/**
 * @route   GET /api/v1/payments
 * @desc    Get all payments with pagination and filters
 * @access  Private
 */
router.get('/', paymentController.getPayments);

/**
 * @route   GET /api/v1/payments/summary
 * @desc    Get payment summary by payment method
 * @access  Private (admin, manager, accountant)
 */
router.get(
  '/summary',
  requireRole('admin', 'manager', 'accountant'),
  paymentController.getPaymentSummary
);

/**
 * @route   GET /api/v1/payments/sale/:saleId
 * @desc    Get all payments for a specific sale
 * @access  Private
 */
router.get('/sale/:saleId', paymentController.getPaymentsBySale);

/**
 * @route   GET /api/v1/payments/:id
 * @desc    Get payment by ID
 * @access  Private
 */
router.get('/:id', paymentController.getPaymentById);

/**
 * @route   POST /api/v1/payments
 * @desc    Create new payment
 * @access  Private (admin, manager, accountant)
 */
router.post('/', requireRole('admin', 'manager', 'accountant'), paymentController.createPayment);

/**
 * @route   POST /api/v1/payments/:id/refund
 * @desc    Refund a payment
 * @access  Private (admin, manager)
 */
router.post('/:id/refund', requireRole('admin', 'manager'), paymentController.refundPayment);

/**
 * @route   POST /api/v1/payments/:id/cancel
 * @desc    Cancel a pending payment
 * @access  Private (admin, manager)
 */
router.post('/:id/cancel', requireRole('admin', 'manager'), paymentController.cancelPayment);

export default router;
