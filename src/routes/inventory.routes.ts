import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { tenantContextMiddleware } from '../middleware/tenantContext.middleware';
import { warehouseFilterMiddleware, validateWarehouseAccess } from '../middleware/warehouseFilter.middleware';

const router = Router();
const inventoryController = new InventoryController();

// Apply authentication and tenant context to all routes
router.use(authenticateToken);
router.use(tenantContextMiddleware);

/**
 * @swagger
 * /inventory/query:
 *   get:
 *     summary: Query inventory with dynamic filters
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *         description: Filter by product ID
 *       - in: query
 *         name: warehouseId
 *         schema:
 *           type: integer
 *         description: Filter by warehouse ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [INBOUND, OUTBOUND, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT]
 *         description: Filter by transaction type
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *         description: Filter by transaction reason
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *       - in: query
 *         name: minQuantity
 *         schema:
 *           type: number
 *         description: Minimum quantity (absolute value)
 *       - in: query
 *         name: maxQuantity
 *         schema:
 *           type: number
 *         description: Maximum quantity (absolute value)
 *       - in: query
 *         name: reference
 *         schema:
 *           type: string
 *         description: Filter by reference
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in product name, SKU, reference, or notes
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, quantity, productId]
 *         description: Sort by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Paginated inventory transactions
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/InventoryTransaction'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationInfo'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/query', inventoryController.queryInventory);

/**
 * @route   GET /api/v1/inventory/low-stock
 * @desc    Get products with low stock
 * @access  Private
 */
router.get('/low-stock', inventoryController.getLowStockProducts);

/**
 * @route   GET /api/v1/inventory/recent
 * @desc    Get recent transactions
 * @access  Private
 */
router.get('/recent', inventoryController.getRecentTransactions);

/**
 * @route   GET /api/v1/inventory/reports/totals
 * @desc    Get totals by transaction type for a date range
 * @access  Private
 */
router.get('/reports/totals', inventoryController.getTotalsByType);

/**
 * @route   POST /api/v1/inventory/adjust
 * @desc    Adjust stock to a specific value
 * @access  Private (admin, manager, user)
 * @swagger
 * /inventory/adjust:
 *   post:
 *     summary: Adjust stock to specific value
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdjustStockRequest'
 *     responses:
 *       201:
 *         description: Stock adjusted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Warehouse access denied (for users restricted to specific warehouse)
 */
router.post('/adjust', requireRole('admin', 'manager', 'user'), warehouseFilterMiddleware, inventoryController.adjustStock);

/**
 * @route   POST /api/v1/inventory/bulk/inbound
 * @desc    Create multiple inbound transactions
 * @access  Private (admin, manager, user)
 * @swagger
 * /inventory/bulk/inbound:
 *   post:
 *     summary: Create multiple inbound transactions (REQUIRES warehouseId)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkTransactionRequest'
 *           example:
 *             warehouseId: 2
 *             items:
 *               - productId: 1
 *                 quantity: 100
 *                 unitCost: 15.50
 *                 reference: "FAC-001"
 *               - productId: 2
 *                 quantity: 50
 *                 unitCost: 25.00
 *                 reference: "FAC-001"
 *             reason: "purchase"
 *             notes: "Compra masiva proveedor XYZ"
 *     responses:
 *       201:
 *         description: Bulk inbound transactions created successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Warehouse access denied
 */
router.post('/bulk/inbound', requireRole('admin', 'manager', 'user'), warehouseFilterMiddleware, inventoryController.bulkInbound);

/**
 * @route   POST /api/v1/inventory/bulk/outbound
 * @desc    Create multiple outbound transactions
 * @access  Private (admin, manager, user)
 * @swagger
 * /inventory/bulk/outbound:
 *   post:
 *     summary: Create multiple outbound transactions (REQUIRES warehouseId)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkTransactionRequest'
 *           example:
 *             warehouseId: 2
 *             items:
 *               - productId: 1
 *                 quantity: 10
 *                 reference: "VENTA-001"
 *               - productId: 2
 *                 quantity: 5
 *                 reference: "VENTA-001"
 *             reason: "sale"
 *             notes: "Venta cliente ABC"
 *     responses:
 *       201:
 *         description: Bulk outbound transactions created successfully
 *       400:
 *         description: Insufficient stock
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Warehouse access denied
 */
router.post('/bulk/outbound', requireRole('admin', 'manager', 'user'), warehouseFilterMiddleware, inventoryController.bulkOutbound);

/**
 * @route   GET /api/v1/inventory/stock/:productId
 * @desc    Get current stock for a product
 * @access  Private
 */
router.get('/stock/:productId', inventoryController.getCurrentStock);

/**
 * @route   GET /api/v1/inventory/summary/:productId
 * @desc    Get stock summary for a product
 * @access  Private
 */
router.get('/summary/:productId', inventoryController.getStockSummary);

/**
 * @route   GET /api/v1/inventory/history/:productId
 * @desc    Get transaction history for a product
 * @access  Private
 */
router.get('/history/:productId', inventoryController.getProductHistory);

/**
 * @route   GET /api/v1/inventory/transactions
 * @desc    Get all inventory transactions with filters
 * @access  Private
 */
router.get('/transactions', inventoryController.getTransactions);

/**
 * @route   GET /api/v1/inventory/transactions/:id
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get('/transactions/:id', inventoryController.getTransactionById);

/**
 * @route   POST /api/v1/inventory/transactions
 * @desc    Create a new inventory transaction
 * @access  Private (admin, manager, user)
 */
router.post('/transactions', requireRole('admin', 'manager', 'user'), warehouseFilterMiddleware, inventoryController.createTransaction);

/**
 * @route   POST /api/v1/inventory/transfer
 * @desc    Transfer stock between warehouses
 * @access  Private (admin, manager, user)
 */
router.post('/transfer', requireRole('admin', 'manager', 'user'), warehouseFilterMiddleware, inventoryController.transferBetweenWarehouses);

/**
 * @route   GET /api/v1/inventory/stock/:productId/warehouses
 * @desc    Get stock across all warehouses for a product
 * @access  Private
 */
router.get('/stock/:productId/warehouses', inventoryController.getStockByAllWarehouses);

/**
 * @route   GET /api/v1/inventory/stock/:productId/warehouse/:warehouseId
 * @desc    Get current stock for a product in a specific warehouse
 * @access  Private
 */
router.get('/stock/:productId/warehouse/:warehouseId', inventoryController.getStockByWarehouse);

/**
 * @route   GET /api/v1/inventory/summary/:productId/warehouse/:warehouseId
 * @desc    Get stock summary for a product in a specific warehouse
 * @access  Private
 */
router.get('/summary/:productId/warehouse/:warehouseId', inventoryController.getStockSummaryByWarehouse);

/**
 * @route   GET /api/v1/inventory/warehouses/summary
 * @desc    Get inventory summary for all warehouses
 * @access  Private
 * @swagger
 * /inventory/warehouses/summary:
 *   get:
 *     summary: Get inventory summary for all warehouses
 *     description: Returns stock status and statistics for each warehouse. Useful for admin dashboard.
 *     tags: [Warehouse Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Warehouses summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/WarehouseSummary'
 *             example:
 *               success: true
 *               data:
 *                 - warehouse:
 *                     id: 1
 *                     code: "BOD-001"
 *                     name: "Bodega Principal"
 *                     isMain: true
 *                     address: "Calle 123, Ciudad"
 *                     managerName: "Juan Pérez"
 *                   stats:
 *                     currentStock: 5000
 *                     totalInbound: 10000
 *                     totalOutbound: 4500
 *                     totalAdjustments: -500
 *                     uniqueProducts: 150
 *                     transactionCount: 850
 *                   lastActivity:
 *                     date: "2025-11-17T10:30:00Z"
 *                     type: "OUTBOUND"
 *                     reason: "SALE"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/warehouses/summary', inventoryController.getWarehousesSummary);

/**
 * @route   GET /api/v1/inventory/warehouses/:warehouseId/summary
 * @desc    Get detailed inventory summary for a specific warehouse
 * @access  Private
 * @swagger
 * /inventory/warehouses/{warehouseId}/summary:
 *   get:
 *     summary: Get detailed inventory summary for a specific warehouse
 *     description: Returns detailed stock information including products and recent transactions for a warehouse.
 *     tags: [Warehouse Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: warehouseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Warehouse ID
 *     responses:
 *       200:
 *         description: Warehouse summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/WarehouseDetailedSummary'
 *             example:
 *               success: true
 *               data:
 *                 warehouse:
 *                   id: 2
 *                   code: "PV-001"
 *                   name: "Punto de Venta Centro"
 *                   isMain: false
 *                   address: "Av. Principal 456"
 *                   managerName: "María González"
 *                   phone: "555-1234"
 *                   email: "pv-centro@empresa.com"
 *                 stats:
 *                   currentStock: 1200
 *                   totalInbound: 3000
 *                   totalOutbound: 1750
 *                   totalAdjustments: -50
 *                   uniqueProducts: 80
 *                   transactionCount: 320
 *                 products:
 *                   - productId: 1
 *                     productName: "Producto A"
 *                     productSku: "SKU-001"
 *                     currentStock: 50
 *                     lastUpdated: "2025-11-17T10:30:00Z"
 *                 recentTransactions:
 *                   - id: 1234
 *                     type: "OUTBOUND"
 *                     reason: "SALE"
 *                     quantity: -5
 *                     productName: "Producto A"
 *                     reference: "VENTA-001"
 *                     createdAt: "2025-11-17T15:45:00Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Warehouse access denied (users can only access their assigned warehouse)
 *       404:
 *         description: Warehouse not found
 */
router.get('/warehouses/:warehouseId/summary', inventoryController.getWarehouseSummary);

export default router;
