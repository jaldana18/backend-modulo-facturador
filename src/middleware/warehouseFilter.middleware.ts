import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler.middleware';

/**
 * Middleware to filter queries by warehouse for 'user' role
 * Admin and manager can access all warehouses
 * Users can only access their assigned warehouse
 */
export const warehouseFilterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const userRole = req.user.role;
    const userWarehouseId = req.user.warehouseId;

    // If user role is 'user', enforce warehouse filter
    if (userRole === 'user') {
      if (!userWarehouseId) {
        throw new ApiError(
          403,
          'NO_WAREHOUSE_ASSIGNED',
          'User does not have a warehouse assigned'
        );
      }

      // If warehouseId is in body, validate it matches user's warehouse
      if (req.body && req.body.warehouseId) {
        if (req.body.warehouseId !== userWarehouseId) {
          throw new ApiError(
            403,
            'WAREHOUSE_ACCESS_DENIED',
            'You can only access your assigned warehouse'
          );
        }
      } else if (req.body) {
        // Auto-assign user's warehouse if not provided
        req.body.warehouseId = userWarehouseId;
      }

      // If warehouseId is in query params, validate it
      if (req.query && req.query.warehouseId) {
        const queryWarehouseId = parseInt(req.query.warehouseId as string);
        if (queryWarehouseId !== userWarehouseId) {
          throw new ApiError(
            403,
            'WAREHOUSE_ACCESS_DENIED',
            'You can only access your assigned warehouse'
          );
        }
      } else if (req.query) {
        // Auto-assign user's warehouse if not provided
        req.query.warehouseId = userWarehouseId.toString();
      }

      // If warehouseId is in params, validate it
      if (req.params && req.params.warehouseId) {
        const paramWarehouseId = parseInt(req.params.warehouseId);
        if (paramWarehouseId !== userWarehouseId) {
          throw new ApiError(
            403,
            'WAREHOUSE_ACCESS_DENIED',
            'You can only access your assigned warehouse'
          );
        }
      }
    }

    // Admin and manager can access all warehouses - no restrictions
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware variant that only validates without auto-assigning
 * Useful for GET endpoints where warehouseId is optional
 */
export const validateWarehouseAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const userRole = req.user.role;
    const userWarehouseId = req.user.warehouseId;

    // If user role is 'user', validate warehouse access if provided
    if (userRole === 'user' && userWarehouseId) {
      // Check body
      if (req.body && req.body.warehouseId && req.body.warehouseId !== userWarehouseId) {
        throw new ApiError(
          403,
          'WAREHOUSE_ACCESS_DENIED',
          'You can only access your assigned warehouse'
        );
      }

      // Check query
      if (req.query && req.query.warehouseId) {
        const queryWarehouseId = parseInt(req.query.warehouseId as string);
        if (queryWarehouseId !== userWarehouseId) {
          throw new ApiError(
            403,
            'WAREHOUSE_ACCESS_DENIED',
            'You can only access your assigned warehouse'
          );
        }
      }

      // Check params
      if (req.params && req.params.warehouseId) {
        const paramWarehouseId = parseInt(req.params.warehouseId);
        if (paramWarehouseId !== userWarehouseId) {
          throw new ApiError(
            403,
            'WAREHOUSE_ACCESS_DENIED',
            'You can only access your assigned warehouse'
          );
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
