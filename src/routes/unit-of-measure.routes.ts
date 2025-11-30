import { Router } from 'express';
import { UnitOfMeasureController } from '../controllers/UnitOfMeasureController';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { tenantContextMiddleware } from '../middleware/tenantContext.middleware';

const router = Router();
const unitController = new UnitOfMeasureController();

// Apply authentication and tenant context to all routes
router.use(authenticateToken);
router.use(tenantContextMiddleware);

/**
 * @swagger
 * /units-of-measure/stats:
 *   get:
 *     summary: Get unit of measure statistics
 *     tags: [Units of Measure]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unit statistics
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
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         inactive:
 *                           type: integer
 *                         baseUnits:
 *                           type: integer
 *                         derivedUnits:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/stats', unitController.getUnitStats);

/**
 * @swagger
 * /units-of-measure/active:
 *   get:
 *     summary: Get all active units (for dropdowns)
 *     tags: [Units of Measure]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active units
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
 *                         $ref: '#/components/schemas/UnitOfMeasure'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/active', unitController.getActiveUnits);

/**
 * @swagger
 * /units-of-measure/base:
 *   get:
 *     summary: Get base units only
 *     tags: [Units of Measure]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of base units
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
 *                         $ref: '#/components/schemas/UnitOfMeasure'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/base', unitController.getBaseUnits);

/**
 * @swagger
 * /units-of-measure/convert:
 *   post:
 *     summary: Convert quantity between units
 *     tags: [Units of Measure]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromUnitId
 *               - toUnitId
 *               - quantity
 *             properties:
 *               fromUnitId:
 *                 type: integer
 *               toUnitId:
 *                 type: integer
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Conversion result
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
 *                         convertedQuantity:
 *                           type: number
 *                         fromUnit:
 *                           $ref: '#/components/schemas/UnitOfMeasure'
 *                         toUnit:
 *                           $ref: '#/components/schemas/UnitOfMeasure'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/convert', unitController.convertQuantity);

/**
 * @swagger
 * /units-of-measure:
 *   get:
 *     summary: Get all units with pagination and filters
 *     tags: [Units of Measure]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by code, name, or description
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: isBaseUnit
 *         schema:
 *           type: boolean
 *         description: Filter by base unit status
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive units
 *       - in: query
 *         name: includeProductCount
 *         schema:
 *           type: boolean
 *         description: Include product count for each unit
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [code, name, createdAt]
 *         description: Sort by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Paginated units list
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
 *                             $ref: '#/components/schemas/UnitOfMeasure'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationInfo'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', unitController.getUnits);

/**
 * @swagger
 * /units-of-measure/{id}:
 *   get:
 *     summary: Get unit by ID
 *     tags: [Units of Measure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unit ID
 *     responses:
 *       200:
 *         description: Unit details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UnitOfMeasure'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', unitController.getUnitById);

/**
 * @swagger
 * /units-of-measure:
 *   post:
 *     summary: Create new unit (admin/manager only)
 *     tags: [Units of Measure]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *             properties:
 *               code:
 *                 type: string
 *                 maxLength: 20
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               symbol:
 *                 type: string
 *                 maxLength: 50
 *               isBaseUnit:
 *                 type: boolean
 *               baseUnitId:
 *                 type: integer
 *               conversionFactor:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Unit created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UnitOfMeasure'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/', requireRole('admin', 'manager'), unitController.createUnit);

/**
 * @swagger
 * /units-of-measure/{id}:
 *   put:
 *     summary: Update unit (admin/manager only)
 *     tags: [Units of Measure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 maxLength: 20
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               symbol:
 *                 type: string
 *                 maxLength: 50
 *               isBaseUnit:
 *                 type: boolean
 *               baseUnitId:
 *                 type: integer
 *               conversionFactor:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Unit updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UnitOfMeasure'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.put('/:id', requireRole('admin', 'manager'), unitController.updateUnit);

/**
 * @swagger
 * /units-of-measure/{id}:
 *   delete:
 *     summary: Delete unit (soft delete by default, permanent with ?permanent=true)
 *     tags: [Units of Measure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unit ID
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *         description: Permanently delete (admin only)
 *     responses:
 *       200:
 *         description: Unit deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/:id',
  (req, res, next) => {
    const permanent = req.query.permanent === 'true';
    if (permanent) {
      return requireRole('admin')(req, res, next);
    }
    return requireRole('admin', 'manager')(req, res, next);
  },
  unitController.deleteUnit
);

export default router;
