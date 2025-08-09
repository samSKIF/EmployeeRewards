import type { Request, Response, NextFunction } from 'express';
import { trace } from '@opentelemetry/api';

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId;
  
  // Enhanced console logging with trace correlation
  console.log('Request:', {
    method: req.method,
    path: req.originalUrl,
    correlation_id: req.correlationId,
    trace_id: traceId,
    timestamp: new Date().toISOString()
  });
  next();
}