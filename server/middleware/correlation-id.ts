import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      tenantId?: string; // optional: set upstream
    }
  }
}

export function correlationId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('X-Correlation-Id');
  const id = incoming && incoming.trim() !== '' ? incoming : randomUUID();
  req.correlationId = id;
  res.setHeader('X-Correlation-Id', id);
  next();
}