import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Only log full stack trace as logger.error for 500-level internal server errors
  if (statusCode >= 500) {
    logger.error(message, { stack: err.stack, path: req.originalUrl, method: req.method });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${statusCode}: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack })
  });
}
