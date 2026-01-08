import { Router } from 'express';
import { AuditLogDatabaseController } from '../controllers/AuditLogDatabaseController';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuditLogDatabaseController();

/**
 * @swagger
 * /audit-logs-db:
 *   get:
 *     summary: Get audit logs from database with filtering and pagination
 *     tags: [Audit Logs Database]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by action (CREATE, UPDATE, DELETE, etc.)
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by entity type (Product, User, Customer, etc.)
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: integer
 *         description: Filter by entity ID
 *       - in: query
 *         name: severity
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [info, warning, critical]
 *         description: Filter by severity level
 *       - in: query
 *         name: module
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by module (inventory, sales, users, etc.)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 50
 *         description: Items per page
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Filter by company (admin only)
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', authenticateToken, controller.getLogs);

/**
 * @swagger
 * /audit-logs-db/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get audit history for a specific entity
 *     tags: [Audit Logs Database]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity type (Product, User, Customer, etc.)
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Entity ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of logs to return
 *     responses:
 *       200:
 *         description: Entity history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/entity/:entityType/:entityId', authenticateToken, controller.getEntityHistory);

/**
 * @swagger
 * /audit-logs-db/user/{userId}:
 *   get:
 *     summary: Get activity history for a specific user
 *     tags: [Audit Logs Database]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of logs
 *     responses:
 *       200:
 *         description: User activity retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/user/:userId', authenticateToken, controller.getUserActivity);

/**
 * @swagger
 * /audit-logs-db/stats:
 *   get:
 *     summary: Get audit log statistics
 *     tags: [Audit Logs Database]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for statistics
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Company ID (admin only)
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalLogs:
 *                       type: integer
 *                     byAction:
 *                       type: object
 *                     bySeverity:
 *                       type: object
 *                     byModule:
 *                       type: object
 *                     byEntityType:
 *                       type: object
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/stats', authenticateToken, controller.getStats);

/**
 * @swagger
 * /audit-logs-db/filters/actions:
 *   get:
 *     summary: Get available actions for filtering
 *     tags: [Audit Logs Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Actions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/filters/actions', authenticateToken, controller.getAvailableActions);

/**
 * @swagger
 * /audit-logs-db/filters/entity-types:
 *   get:
 *     summary: Get available entity types for filtering
 *     tags: [Audit Logs Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Entity types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/filters/entity-types', authenticateToken, controller.getAvailableEntityTypes);

/**
 * @swagger
 * /audit-logs-db/filters/modules:
 *   get:
 *     summary: Get available modules for filtering
 *     tags: [Audit Logs Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Modules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/filters/modules', authenticateToken, controller.getAvailableModules);

export default router;
