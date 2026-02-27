/**
 * Request logging middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

/**
 * Log incoming HTTP requests
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request
  logger.info(`[${req.method}] ${req.path}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusColor = res.statusCode >= 400 ? 'error' : 'info';

    logger.log(statusColor, `[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
}
