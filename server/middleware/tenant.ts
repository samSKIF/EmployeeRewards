import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express { interface Request { tenantId?: string } }
}

export function tenant(requireTenant = true) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Priority: (1) X-Tenant-Id header, (2) JWT claims (req.user?.tenantId), (3) query for tests
    const headerId = req.header('X-Tenant-Id')?.trim();
    const claimId = (req as any).user?.tenantId;
    const queryId = (req.query.tenant_id as string | undefined)?.trim();
    const tenantId = headerId || claimId || queryId;

    if (requireTenant && !tenantId) {
      return res.status(400).json({ error: { code: 'missing_tenant', message: 'Tenant ID required' } });
    }
    req.tenantId = tenantId;
    next();
  };
}