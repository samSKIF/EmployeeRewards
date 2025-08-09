import type { Request, Response, NextFunction } from 'express';
import { verifyServiceToken } from '@platform/sdk';

declare global {
  namespace Express { interface Request { service?: { name: string } } }
}

/**
 * Validates internal service-to-service calls.
 * Looks for Authorization: Bearer <token> or X-Service-Auth.
 */
export function serviceAuth(options?: { audience?: string; required?: boolean }) {
  const required = options?.required ?? true;
  const audience = options?.audience;
  const secret = process.env.SERVICE_TOKEN_SECRET || '';

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hdr = req.header('authorization') || req.header('Authorization') || '';
      const alt = req.header('X-Service-Auth') || '';
      const token = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : alt.trim();

      if (!token) {
        if (!required) return next();
        return res.status(401).json({ error: { code: 'missing_service_token', message: 'Service token required' } });
      }
      if (!secret) {
        // Fail closed if required
        if (!required) return next();
        return res.status(500).json({ error: { code: 'server_misconfig', message: 'SERVICE_TOKEN_SECRET unset' } });
      }

      const claims = await verifyServiceToken(secret, token, audience);
      if (!claims?.svc) throw new Error('missing svc claim');
      req.service = { name: String(claims.svc) };
      return next();
    } catch (e: any) {
      const msg = e?.message || 'invalid service token';
      if (options?.required !== false) {
        return res.status(401).json({ error: { code: 'invalid_service_token', message: msg } });
      }
      return next();
    }
  };
}