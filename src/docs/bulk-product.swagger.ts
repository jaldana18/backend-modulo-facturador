/**
 * @swagger
 * /products/bulk/upload:
 *   post:
 *     summary: Upload Excel file for bulk product creation/update
 *     description: Permite cargar productos masivamente desde un archivo Excel (.xls, .xlsx). Soporta creación y actualización de productos.
 *     tags: [Bulk Products]
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
 *                 description: Archivo Excel (.xls o .xlsx) con los productos a cargar
 *               updateExisting:
 *                 type: boolean
 *                 default: false
 *                 description: Si es true, actualiza productos con SKUs existentes. Si es false, genera error en duplicados.
 *               skipErrors:
 *                 type: boolean
 *                 default: true
 *                 description: Si es true, continúa procesando aunque haya errores. Si es false, detiene al primer error.
 *               dryRun:
 *                 type: boolean
 *                 default: false
 *                 description: Si es true, solo valida sin guardar en base de datos.
 *     responses:
 *       200:
 *         description: Carga completada (puede tener errores parciales si skipErrors=true)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/BulkUploadResult'
 *       400:
 *         description: Error en validación o archivo inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               noFile:
 *                 summary: No se proporcionó archivo
 *                 value:
 *                   success: false
 *                   code: "NO_FILE"
 *                   message: "No se proporcionó ningún archivo"
 *               invalidFile:
 *                 summary: Archivo inválido
 *                 value:
 *                   success: false
 *                   code: "INVALID_FILE_TYPE"
 *                   message: "Solo se permiten archivos Excel (.xls, .xlsx)"
 *               emptyFile:
 *                 summary: Archivo vacío
 *                 value:
 *                   success: false
 *                   code: "EMPTY_FILE"
 *                   message: "El archivo no contiene datos"
 */

/**
 * @swagger
 * /products/bulk/validate:
 *   post:
 *     summary: Validate Excel file structure without processing
 *     description: Valida la estructura del archivo Excel sin procesar ni guardar datos. Útil para verificar antes de la carga.
 *     tags: [Bulk Products]
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
 *                 description: Archivo Excel a validar
 *     responses:
 *       200:
 *         description: Validación completada
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
 *                       description: Indica si el archivo es válido
 *                     rowCount:
 *                       type: integer
 *                       description: Número de filas en el archivo
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Lista de errores encontrados
 *                     warnings:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Lista de advertencias
 *       400:
 *         description: Error al validar archivo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /products/bulk/preview:
 *   post:
 *     summary: Preview what will be created/updated without saving
 *     description: Genera una vista previa de los productos que se crearán o actualizarán sin guardar en la base de datos.
 *     tags: [Bulk Products]
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
 *                 description: Archivo Excel con productos
 *               updateExisting:
 *                 type: boolean
 *                 default: false
 *                 description: Si es true, incluye productos existentes en la vista previa de actualización
 *     responses:
 *       200:
 *         description: Vista previa generada exitosamente
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRows:
 *                           type: integer
 *                         validRows:
 *                           type: integer
 *                         invalidRows:
 *                           type: integer
 *                         willCreate:
 *                           type: integer
 *                         willUpdate:
 *                           type: integer
 *                     errors:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BulkUploadError'
 *                     preview:
 *                       type: object
 *                       properties:
 *                         toCreate:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/BulkProductPreview'
 *                         toUpdate:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/BulkProductPreview'
 */

/**
 * @swagger
 * /products/bulk/template:
 *   get:
 *     summary: Download Excel template for bulk upload
 *     description: Descarga una plantilla Excel con la estructura correcta, datos de ejemplo e instrucciones detalladas.
 *     tags: [Bulk Products]
 *     responses:
 *       200:
 *         description: Plantilla Excel descargada
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: attachment; filename=plantilla-productos.xlsx
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BulkUploadResult:
 *       type: object
 *       properties:
 *         totalRows:
 *           type: integer
 *           description: Total de filas procesadas
 *           example: 100
 *         successCount:
 *           type: integer
 *           description: Número de filas procesadas exitosamente
 *           example: 95
 *         errorCount:
 *           type: integer
 *           description: Número de filas con errores
 *           example: 5
 *         errors:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BulkUploadError'
 *         createdProducts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BulkProductPreview'
 *         updatedProducts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BulkProductPreview'
 *     BulkUploadError:
 *       type: object
 *       properties:
 *         row:
 *           type: integer
 *           description: Número de fila en el Excel (incluye encabezado)
 *           example: 5
 *         sku:
 *           type: string
 *           description: SKU del producto con error (si está disponible)
 *           example: "PROD-001"
 *         field:
 *           type: string
 *           description: Campo que causó el error
 *           example: "unitOfMeasure"
 *         message:
 *           type: string
 *           description: Mensaje descriptivo del error
 *           example: "Unidad de medida es requerida"
 *         value:
 *           description: Valor que causó el error
 *           example: null
 *     BulkProductPreview:
 *       type: object
 *       properties:
 *         sku:
 *           type: string
 *           example: "PROD-001"
 *         name:
 *           type: string
 *           example: "Mouse USB"
 *         id:
 *           type: integer
 *           description: ID del producto (solo para productos actualizados)
 *           example: 123
 */
