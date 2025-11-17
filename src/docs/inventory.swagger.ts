/**
 * @swagger
 * /inventory/transactions:
 *   get:
 *     summary: Get all inventory transactions with filters
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [inbound, outbound, adjustment, transfer]
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *   post:
 *     summary: Create a new inventory transaction
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTransactionRequest'
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *       400:
 *         description: Insufficient stock or validation error
 *       404:
 *         description: Product or warehouse not found
 */

/**
 * @swagger
 * /inventory/transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *       404:
 *         description: Transaction not found
 */

/**
 * @swagger
 * /inventory/adjust:
 *   post:
 *     summary: Adjust stock to a specific value
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdjustStockRequest'
 *     responses:
 *       201:
 *         description: Stock adjusted successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Product or warehouse not found
 */

/**
 * @swagger
 * /inventory/transfer:
 *   post:
 *     summary: Transfer stock between warehouses
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransferWarehouseRequest'
 *     responses:
 *       201:
 *         description: Transfer completed successfully
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
 *                         outbound:
 *                           $ref: '#/components/schemas/InventoryTransaction'
 *                         inbound:
 *                           $ref: '#/components/schemas/InventoryTransaction'
 *       400:
 *         description: Insufficient stock or same warehouse
 *       404:
 *         description: Product or warehouse not found
 */

/**
 * @swagger
 * /inventory/stock/{productId}:
 *   get:
 *     summary: Get current stock for a product (all warehouses)
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stock retrieved successfully
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
 *                         productId:
 *                           type: integer
 *                         currentStock:
 *                           type: number
 */

/**
 * @swagger
 * /inventory/stock/{productId}/warehouses:
 *   get:
 *     summary: Get stock across all warehouses for a product
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stock by warehouse retrieved successfully
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
 *                         type: object
 *                         properties:
 *                           warehouseId:
 *                             type: integer
 *                           warehouseName:
 *                             type: string
 *                           stock:
 *                             type: number
 */

/**
 * @swagger
 * /inventory/stock/{productId}/warehouse/{warehouseId}:
 *   get:
 *     summary: Get current stock for a product in a specific warehouse
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: warehouseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stock retrieved successfully
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
 *                         productId:
 *                           type: integer
 *                         warehouseId:
 *                           type: integer
 *                         currentStock:
 *                           type: number
 */

/**
 * @swagger
 * /inventory/summary/{productId}:
 *   get:
 *     summary: Get stock summary for a product
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/StockSummary'
 */

/**
 * @swagger
 * /inventory/summary/{productId}/warehouse/{warehouseId}:
 *   get:
 *     summary: Get stock summary for a product in a specific warehouse
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: warehouseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/StockSummary'
 *                         - type: object
 *                           properties:
 *                             warehouseId:
 *                               type: integer
 */

/**
 * @swagger
 * /inventory/history/{productId}:
 *   get:
 *     summary: Get transaction history for a product
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: History retrieved successfully
 */

/**
 * @swagger
 * /inventory/low-stock:
 *   get:
 *     summary: Get products with low stock
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: Low stock products retrieved successfully
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
 *                         $ref: '#/components/schemas/StockSummary'
 */

/**
 * @swagger
 * /inventory/recent:
 *   get:
 *     summary: Get recent transactions
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent transactions retrieved successfully
 */

/**
 * @swagger
 * /inventory/bulk/inbound:
 *   post:
 *     summary: Create multiple inbound transactions
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, reason]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: number
 *                     unitCost:
 *                       type: number
 *                     reference:
 *                       type: string
 *               reason:
 *                 type: string
 *                 enum: [purchase, return, found, initial_stock, other]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bulk inbound created successfully
 */

/**
 * @swagger
 * /inventory/bulk/outbound:
 *   post:
 *     summary: Create multiple outbound transactions
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, reason]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: number
 *                     reference:
 *                       type: string
 *               reason:
 *                 type: string
 *                 enum: [sale, damaged, lost, other]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bulk outbound created successfully
 */

/**
 * @swagger
 * /inventory/reports/totals:
 *   get:
 *     summary: Get totals by transaction type for a date range
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Totals retrieved successfully
 */
