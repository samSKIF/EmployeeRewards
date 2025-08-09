import type { Request, Response, NextFunction } from 'express';

// Temporary simple error handling until @platform/sdk is available
function normalizeError(err: unknown): { message: string; status?: number; code?: string; stack?: string } {
  if (err instanceof Error) {
    return {
      message: err.message,
      status: (err as any).status || (err as any).statusCode || 500,
      code: (err as any).code || 'internal_error',
      stack: err.stack
    };
  }
  return {
    message: 'Internal Server Error',
    status: 500,
    code: 'internal_error'
  };
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const normalized = normalizeError(err);
  const status = normalized.status || 500;

  // Simple console logging until platform SDK is available
  console.error('Request failed:', {
    status,
    code: normalized.code,
    method: req.method,
    path: req.originalUrl,
    correlation_id: req.correlationId,
    tenant_id: req.tenantId,
    message: normalized.message
  });

  res.status(status).json({
    error: {
      code: normalized.code || 'internal_error',
      message: normalized.message || 'Internal Server Error',
      correlation_id: req.correlationId
    }
  });
}