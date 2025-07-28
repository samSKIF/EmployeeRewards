import type { Request, Response, NextFunction } from 'express';
import {
  getTenantDb,
  getCompanyIdFromUser,
  getCompanyIdFromEmail,
} from '../tenant-db';
import { db as managementDb } from '../db';

export interface TenantRequest extends Request {
  user?: any;
  tenantDb?: any;
  companyId?: number;
}

/**
 * Middleware to route database queries to the correct tenant database
 */
export async function tenantRouting(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;

    if (!user) {
      // No user authenticated, use management database
      req.tenantDb = managementDb;
      return next();
    }

    let companyId: number | null = null;

    // Try to get company ID from user's organization
    if (user.id) {
      companyId = await getCompanyIdFromUser(user.id);
    }

    // If no company ID from user, try to get it from email domain
    if (!companyId && user.email) {
      companyId = await getCompanyIdFromEmail(user.email);
    }

    if (companyId) {
      // Route to tenant-specific database
      req.tenantDb = await getTenantDb(companyId);
      req.companyId = companyId;
      console.log(`Routing to tenant database for company ${companyId}`);
    } else {
      // Fallback to management database
      req.tenantDb = managementDb;
      console.log('Using management database (no tenant identified)');
    }

    next();
  } catch (error) {
    console.error('Error in tenant routing:', error);
    // Fallback to management database on error
    req.tenantDb = managementDb;
    next();
  }
}

/**
 * Ensure user can only access their own tenant's data
 */
export function ensureTenantAccess(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  const user = req.user;
  const companyId = req.companyId;

  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Super admins can access any tenant (for management purposes)
  if (user.role_type === 'corporate_admin' && user.permissions?.manageTenants) {
    return next();
  }

  // Regular users must have a valid company ID
  if (!companyId) {
    return res.status(403).json({
      message: 'Access denied: No valid company association found',
    });
  }

  next();
}
