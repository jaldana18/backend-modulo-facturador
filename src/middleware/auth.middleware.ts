import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { ApiError } from './errorHandler.middleware';
import { loggers } from '../config/logger';
import { UserRole } from '../common.types';

/**
 * Middleware to authenticate JWT token
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ApiError(401, 'MISSING_TOKEN', 'No authentication token provided');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new ApiError(401, 'INVALID_TOKEN_FORMAT', 'Invalid token format. Use: Bearer <token>');
    }

    const token = parts[1];

    try {
      const decoded = verifyAccessToken(token);

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        companyId: decoded.companyId,
        email: decoded.email,
        role: decoded.role,
      };

      loggers.logAuth('token_verified', decoded.userId, decoded.email, true);
      next();
    } catch (error) {
      const message = (error as Error).message;

      if (message === 'TOKEN_EXPIRED') {
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Authentication token has expired');
      }

      if (message === 'INVALID_TOKEN') {
        throw new ApiError(401, 'INVALID_TOKEN', 'Invalid authentication token');
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      if (!roles.includes(req.user.role as UserRole)) {
        loggers.logSecurity('unauthorized_role_access', 'medium', {
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRoles: roles,
          path: req.path,
        });

        throw new ApiError(
          403,
          'FORBIDDEN',
          `Insufficient permissions. Required roles: ${roles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user belongs to the company in request
 */
export const requireOwnCompany = (paramName: string = 'companyId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const companyId = parseInt(req.params[paramName] || req.body[paramName]);

      if (!companyId) {
        throw new ApiError(400, 'MISSING_COMPANY_ID', 'Company ID is required');
      }

      // Admin users can access any company
      if (req.user.role === 'admin') {
        next();
        return;
      }

      // Regular users can only access their own company
      if (req.user.companyId !== companyId) {
        loggers.logSecurity('cross_company_access_attempt', 'high', {
          userId: req.user.userId,
          userCompanyId: req.user.companyId,
          attemptedCompanyId: companyId,
          path: req.path,
        });

        throw new ApiError(403, 'FORBIDDEN', 'Access to this company is not allowed');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];

      try {
        const decoded = verifyAccessToken(token);
        req.user = {
          userId: decoded.userId,
          companyId: decoded.companyId,
          email: decoded.email,
          role: decoded.role,
        };
      } catch (error) {
        // Ignore invalid tokens in optional auth
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
