import { Router } from 'express';
import { AuditLogController } from '../controllers/AuditLogController';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const auditLogController = new AuditLogController();

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Get audit logs with filtering
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering (ISO 8601)
 *       - in: query
 *         name: level
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [error, warn, info, http, debug]
 *         description: Filter by log level
 *       - in: query
 *         name: type
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [http_request, database_query, database_query_error, authentication, business_operation, application_error, security_event, migration_status]
 *         description: Filter by log type
 *       - in: query
 *         name: operation
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by operation name
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Filter by company ID (admin only)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in message and details
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
 *         description: Records per page
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
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
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                     filters:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid parameters
 */
router.get('/', authenticateToken, auditLogController.getLogs);

/**
 * @swagger
 * /api/audit-logs/stats:
 *   get:
 *     summary: Get audit log statistics
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
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
 *                     byLevel:
 *                       type: object
 *                     byType:
 *                       type: object
 *                     byOperation:
 *                       type: object
 *                     lastHour:
 *                       type: integer
 *                     last24Hours:
 *                       type: integer
 *                     last7Days:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticateToken, auditLogController.getStats);

/**
 * @swagger
 * /api/audit-logs/export:
 *   get:
 *     summary: Export audit logs to CSV
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: level
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *     responses:
 *       200:
 *         description: CSV file generated
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/export', authenticateToken, auditLogController.exportLogs);

/**
 * @swagger
 * /api/audit-logs/operations:
 *   get:
 *     summary: Get available operations for filtering
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operations list retrieved
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
 *         description: Unauthorized
 */
router.get('/operations', authenticateToken, auditLogController.getOperations);

/**
 * @swagger
 * /api/audit-logs/types:
 *   get:
 *     summary: Get available log types for filtering
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Types list retrieved
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
 *         description: Unauthorized
 */
router.get('/types', authenticateToken, auditLogController.getTypes);

export default router;
