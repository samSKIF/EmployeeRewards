import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express { interface Request { tenantId?: string } }
}

export function tenant(requireTenant = true) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip tenant requirement for frontend routes, static assets, and certain API endpoints
    const skipPaths = ['/health', '/__ready', '/auth', '/api/auth', '/favicon.ico'];
    const isStaticAsset = req.path.includes('.') || req.path.startsWith('/assets') || req.path.startsWith('/_vite');
    const isFrontendRoute = req.method === 'GET' && !req.path.startsWith('/api/');
    const shouldSkip = skipPaths.some(path => req.path.startsWith(path)) || isStaticAsset || isFrontendRoute;

    // Priority: (1) X-Tenant-Id header, (2) JWT claims (req.user?.tenantId), (3) query for tests
    const headerId = req.header('X-Tenant-Id')?.trim();
    const claimId = (req as any).user?.tenantId;
    const queryId = (req.query.tenant_id as string | undefined)?.trim();
    const tenantId = headerId || claimId || queryId;

    if (requireTenant && !tenantId && !shouldSkip) {
      return res.status(400).json({ error: { code: 'missing_tenant', message: 'Tenant ID required' } });
    }
    
    // Set default tenant for development
    req.tenantId = tenantId || (process.env.NODE_ENV === 'development' ? 'dev-tenant' : undefined);
    next();
  };
}