import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ApiError } from './errorHandler.middleware';

/**
 * Middleware to set tenant context in SQL Server session
 * This enables Row-Level Security filtering
 *
 * IMPORTANT: This middleware must run AFTER authenticateToken middleware
 */
export const tenantContextMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required for tenant context');
    }

    // Check if DataSource is available
    if (!req.dataSource || !req.dataSource.isInitialized) {
      throw new ApiError(500, 'DATABASE_NOT_AVAILABLE', 'Database connection not available');
    }

    const companyId = req.user.companyId;

    // Set tenant context in SQL Server session
    // This will be used by Row-Level Security policies
    await req.dataSource.query(`EXEC sp_set_session_context @key = N'TenantId', @value = @0`, [
      companyId,
    ]);

    logger.debug({
      type: 'tenant_context_set',
      userId: req.user.userId,
      companyId: companyId,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error('Error setting tenant context:', error);
    next(error);
  }
};

/**
 * Middleware to clear tenant context (optional cleanup)
 */
export const clearTenantContext = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.dataSource && req.dataSource.isInitialized) {
      await req.dataSource.query(
        `EXEC sp_set_session_context @key = N'TenantId', @value = NULL`
      );
    }
    next();
  } catch (error) {
    // Don't fail the request if cleanup fails
    logger.warn('Error clearing tenant context:', error);
    next();
  }
};
