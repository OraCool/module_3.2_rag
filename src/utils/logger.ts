/**
 * Logging utility using Winston
 */

import winston from 'winston';
import { env } from '../config/env.js';

/**
 * Custom log format for better readability
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    const msg = `${timestamp} [${level}]: ${message}`;
    return stack ? `${msg}\n${stack}` : msg;
  })
);

/**
 * Global logger instance
 */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console output
    new winston.transports.Console({
      handleExceptions: true,
    }),
    // File output for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      handleExceptions: true,
    }),
    // File output for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      handleExceptions: true,
    }),
  ],
  exitOnError: false,
});

/**
 * Create a child logger with a specific context/module
 */
export function createLogger(context: string): winston.Logger {
  return logger.child({ context });
}

/**
 * Log a performance metric
 */
export function logPerformance(operation: string, durationMs: number): void {
  logger.info(`[PERF] ${operation}: ${durationMs}ms`);
}

/**
 * Log progress during batch operations
 */
export function logProgress(current: number, total: number, operation: string): void {
  const percentage = ((current / total) * 100).toFixed(1);
  logger.info(`[PROGRESS] ${operation}: ${current}/${total} (${percentage}%)`);
}
