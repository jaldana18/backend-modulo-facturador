import { Router } from 'express';
import { ActivityLogController } from '../controllers/ActivityLogController';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const activityLogController = new ActivityLogController();

/**
 * All routes require authentication
 */
router.use(authenticateToken);

/**
 * @swagger
 * /activity-logs:
 *   get:
 *     summary: Get activity logs
 *     description: Get paginated activity logs with filters
 *     tags: [Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           default: 50
 *         description: Items per page
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: activityType
 *         schema:
 *           type: string
 *         description: Filter by activity type
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filter by entity type (e.g., product, sale, customer)
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
 *         description: Search in description and entity name
 *     responses:
 *       200:
 *         description: Activity logs retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', activityLogController.getActivityLogs);

/**
 * @swagger
 * /activity-logs/stats:
 *   get:
 *     summary: Get activity statistics
 *     description: Get activity statistics grouped by type
 *     tags: [Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to include in statistics
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/stats', activityLogController.getActivityStats);

/**
 * @swagger
 * /activity-logs/most-active-users:
 *   get:
 *     summary: Get most active users
 *     description: Get users with most activities in the specified period
 *     tags: [Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users to return
 *     responses:
 *       200:
 *         description: Most active users retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/most-active-users', activityLogController.getMostActiveUsers);

/**
 * @swagger
 * /activity-logs/my-recent:
 *   get:
 *     summary: Get my recent activities
 *     description: Get recent activities for the current user
 *     tags: [Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of activities to return
 *     responses:
 *       200:
 *         description: Recent activities retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/my-recent', activityLogController.getMyRecentActivities);

export default router;
