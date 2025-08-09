import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  // Simple console logging until platform SDK is available
  console.log('Request:', {
    method: req.method,
    path: req.originalUrl,
    correlation_id: req.correlationId,
    timestamp: new Date().toISOString()
  });
  next();
}