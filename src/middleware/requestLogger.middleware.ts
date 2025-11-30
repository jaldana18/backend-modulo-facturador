import { Request, Response, NextFunction } from 'express';
import { loggers } from '../config/logger';

/**
 * Request logger middleware
 * Only logs important requests (errors, slow requests, auth endpoints)
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    const isSlow = duration > 1000; // Log if request takes > 1 second
    const isAuthEndpoint = req.path.includes('/auth/');
    const isHealthCheck = req.path === '/health';

    // Only log if it's an error, slow request, or auth endpoint (skip health checks)
    if ((isError || isSlow || isAuthEndpoint) && !isHealthCheck) {
      loggers.logRequest(req, res, duration);
    }
  });

  next();
};
