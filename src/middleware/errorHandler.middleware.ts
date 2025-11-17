import { Request, Response, NextFunction } from 'express';
import { logger, loggers } from '../config/logger';
import { ApiResponse } from '../common.types';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Default error response
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  // Handle custom ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  }
  // Handle TypeORM errors
  else if (err.name === 'QueryFailedError') {
    statusCode = 400;
    errorCode = 'DATABASE_ERROR';
    message = 'Database query failed';
    details = process.env.NODE_ENV === 'development' ? err.message : undefined;
  }
  // Handle validation errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message;
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // Log error
  loggers.logError(err, {
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.userId,
    companyId: req.user?.companyId,
    statusCode,
  });

  // Send error response
  const response: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      details,
    },
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    (response.error as any).stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  };

  logger.warn({
    type: 'not_found',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  res.status(404).json(response);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
