import { Router } from 'express';
import { BatchController } from '../controllers/BatchController';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const batchController = new BatchController();

/**
 * @route   GET /api/v1/batches/products/:productId/grouped
 * @desc    Get batches grouped by unit cost (HYBRID VIEW)
 * @access  Private
 */
router.get(
  '/products/:productId/grouped',
  authenticateToken,
  batchController.getBatchesGroupedByPrice
);

/**
 * @route   POST /api/v1/batches/auto-select
 * @desc    Auto-select batches using FEFO logic
 * @access  Private
 */
router.post('/auto-select', authenticateToken, batchController.autoSelectBatches);

/**
 * @route   POST /api/v1/batches/calculate-cost
 * @desc    Calculate total cost for selected batches
 * @access  Private
 */
router.post('/calculate-cost', authenticateToken, batchController.calculateCost);

/**
 * @route   POST /api/v1/batches/reservations
 * @desc    Create a batch reservation
 * @access  Private
 */
router.post('/reservations', authenticateToken, batchController.createReservation);

/**
 * @route   DELETE /api/v1/batches/reservations/:reservationId
 * @desc    Cancel a batch reservation
 * @access  Private
 */
router.delete(
  '/reservations/:reservationId',
  authenticateToken,
  batchController.cancelReservation
);

/**
 * @route   GET /api/v1/batches/products/:productId/allocations
 * @desc    Get allocation history for a product
 * @access  Private
 */
router.get(
  '/products/:productId/allocations',
  authenticateToken,
  batchController.getAllocationHistory
);

export default router;
