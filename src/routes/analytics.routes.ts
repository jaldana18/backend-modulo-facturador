import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All analytics routes require authentication
router.use(authenticateToken);

// Dashboard general
router.get('/dashboard', analyticsController.getDashboard.bind(analyticsController));

// Análisis de ventas
router.get('/sales/timeline', analyticsController.getSalesTimeline.bind(analyticsController));
router.get('/sales/comparison', analyticsController.comparePeriods.bind(analyticsController));

// Análisis de productos
router.get('/products/top-selling', analyticsController.getTopSellingProducts.bind(analyticsController));

// Análisis de categorías
router.get('/categories/performance', analyticsController.getCategoryPerformance.bind(analyticsController));

// Estado de inventario
router.get('/inventory/status', analyticsController.getInventoryStatus.bind(analyticsController));

export default router;
