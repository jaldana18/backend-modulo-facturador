/**
 * @swagger
 * tags:
 *   name: Bulk Inventory
 *   description: Bulk inventory upload operations (Excel-based)
 */

/**
 * @swagger
 * /inventory/bulk/upload:
 *   post:
 *     summary: Upload Excel file for bulk inventory inbound (purchase/receiving)
 *     description: Upload an Excel file to create multiple inventory inbound transactions and batches. Creates PURCHASE transactions with automatic batch generation.
 *     tags: [Bulk Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file (.xls or .xlsx) with inventory data
 *               skipErrors:
 *                 type: boolean
 *                 default: true
 *                 description: Continue processing even if some rows have errors
 *               dryRun:
 *                 type: boolean
 *                 default: false
 *                 description: Validate without saving to database
 *               defaultWarehouseCode:
 *                 type: string
 *                 description: Default warehouse code to use if not specified in rows
 *     responses:
 *       200:
 *         description: Upload completed successfully or with partial errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/BulkInventoryUploadResult'
 *       400:
 *         description: Upload failed - validation errors or no file provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                     message:
 *                       type: string
 */

/**
 * @swagger
 * /inventory/bulk/validate:
 *   post:
 *     summary: Validate Excel file structure without processing
 *     description: Validates that the Excel file has the correct structure and column names
 *     tags: [Bulk Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file (.xls or .xlsx)
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                     rowCount:
 *                       type: integer
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           field:
 *                             type: string
 *                           message:
 *                             type: string
 *                     warnings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           field:
 *                             type: string
 *                           message:
 *                             type: string
 */

/**
 * @swagger
 * /inventory/bulk/preview:
 *   post:
 *     summary: Preview what will be created without saving to database
 *     description: Process the Excel file and show what transactions and batches would be created, without actually saving to database
 *     tags: [Bulk Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file (.xls or .xlsx)
 *               defaultWarehouseCode:
 *                 type: string
 *                 description: Default warehouse code to use if not specified in rows
 *     responses:
 *       200:
 *         description: Preview generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/BulkInventoryUploadResult'
 */

/**
 * @swagger
 * /inventory/bulk/template:
 *   get:
 *     summary: Download Excel template for bulk inventory upload
 *     description: Downloads an Excel template with the correct column headers and sample data
 *     tags: [Bulk Inventory]
 *     responses:
 *       200:
 *         description: Excel template file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BulkInventoryUploadResult:
 *       type: object
 *       properties:
 *         totalRows:
 *           type: integer
 *           description: Total number of rows in the Excel file
 *         successCount:
 *           type: integer
 *           description: Number of rows processed successfully
 *         errorCount:
 *           type: integer
 *           description: Number of rows with errors
 *         errors:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BulkInventoryUploadError'
 *         createdTransactions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BulkInventoryCreatedTransaction'
 *         summary:
 *           type: object
 *           properties:
 *             totalQuantity:
 *               type: number
 *               description: Total quantity processed
 *             totalCost:
 *               type: number
 *               description: Total cost of all transactions
 *             productsAffected:
 *               type: integer
 *               description: Number of unique products affected
 *             batchesCreated:
 *               type: integer
 *               description: Number of batches created
 *     BulkInventoryUploadError:
 *       type: object
 *       properties:
 *         row:
 *           type: integer
 *           description: Excel row number (1-indexed)
 *         sku:
 *           type: string
 *           description: Product SKU from the row
 *         field:
 *           type: string
 *           description: Field that caused the error
 *         message:
 *           type: string
 *           description: Error message
 *         value:
 *           description: Invalid value that caused the error
 *     BulkInventoryCreatedTransaction:
 *       type: object
 *       properties:
 *         sku:
 *           type: string
 *           description: Product SKU
 *         productName:
 *           type: string
 *           description: Product name
 *         quantity:
 *           type: number
 *           description: Quantity received
 *         batchNumber:
 *           type: string
 *           description: Generated batch number
 *         transactionId:
 *           type: integer
 *           description: ID of the created transaction
 */
