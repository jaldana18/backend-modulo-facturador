import { Request, Response, NextFunction } from 'express';
import { loggers } from '../config/logger';

/**
 * Request logger middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    loggers.logRequest(req, res, duration);
  });

  next();
};
