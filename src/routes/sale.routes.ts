import { Router } from 'express';
import { SaleController } from '../controllers/SaleController';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { tenantContextMiddleware } from '../middleware/tenantContext.middleware';

const router = Router();
const saleController = new SaleController();

// Apply authentication and tenant context to all routes
router.use(authenticateToken);
router.use(tenantContextMiddleware);

/**
 * @route   GET /api/v1/sales
 * @desc    Get all sales with pagination and filters
 * @access  Private
 */
router.get('/', saleController.getSales);

/**
 * @route   GET /api/v1/sales/:id
 * @desc    Get sale by ID
 * @access  Private
 */
router.get('/:id', saleController.getSaleById);

/**
 * @route   POST /api/v1/sales
 * @desc    Create new sale (draft)
 * @access  Private (admin, manager, salesperson)
 */
router.post('/', requireRole('admin', 'manager', 'salesperson'), saleController.createSale);

/**
 * @route   PUT /api/v1/sales/:id
 * @desc    Update sale (only if in draft status)
 * @access  Private (admin, manager, salesperson)
 */
router.put('/:id', requireRole('admin', 'manager', 'salesperson'), saleController.updateSale);

/**
 * @route   DELETE /api/v1/sales/:id
 * @desc    Delete sale (only if in draft status)
 * @access  Private (admin, manager)
 */
router.delete('/:id', requireRole('admin', 'manager'), saleController.deleteSale);

/**
 * @route   POST /api/v1/sales/:id/confirm
 * @desc    Confirm sale and affect inventory
 * @access  Private (admin, manager)
 */
router.post('/:id/confirm', requireRole('admin', 'manager'), saleController.confirmSale);

/**
 * @route   POST /api/v1/sales/:id/cancel
 * @desc    Cancel sale and reverse inventory if applicable
 * @access  Private (admin, manager)
 */
router.post('/:id/cancel', requireRole('admin', 'manager'), saleController.cancelSale);

/**
 * @route   POST /api/v1/sales/:id/convert-to-invoice
 * @desc    Convert quote to invoice
 * @access  Private (admin, manager, salesperson)
 */
router.post(
  '/:id/convert-to-invoice',
  requireRole('admin', 'manager', 'salesperson'),
  saleController.convertToInvoice
);

/**
 * @route   POST /api/v1/sales/:id/convert-to-proforma
 * @desc    Convert quote to proforma invoice
 * @access  Private (admin, manager, salesperson)
 */
router.post(
  '/:id/convert-to-proforma',
  requireRole('admin', 'manager', 'salesperson'),
  saleController.convertToProforma
);

/**
 * @route   POST /api/v1/sales/:id/credit-note
 * @desc    Create credit note for a sale
 * @access  Private (admin, manager)
 */
router.post('/:id/credit-note', requireRole('admin', 'manager'), saleController.createCreditNote);

/**
 * @route   POST /api/v1/sales/remission
 * @desc    Create remission (no inventory impact)
 * @access  Private (admin, manager, salesperson)
 */
router.post('/remission', requireRole('admin', 'manager', 'salesperson'), saleController.createRemission);

/**
 * @route   POST /api/v1/sales/:id/dispatch
 * @desc    Mark sale as dispatched
 * @access  Private (admin, manager, warehouse)
 */
router.post('/:id/dispatch', requireRole('admin', 'manager', 'warehouse'), saleController.dispatchSale);

/**
 * @route   POST /api/v1/sales/:id/deliver
 * @desc    Mark sale as delivered
 * @access  Private (admin, manager, warehouse)
 */
router.post('/:id/deliver', requireRole('admin', 'manager', 'warehouse'), saleController.deliverSale);

export default router;
