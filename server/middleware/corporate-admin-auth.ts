import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { logger } from '@shared/logger';

/**
 * Middleware to ensure only corporate admins can access management routes
 */
export const requireCorporateAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;

  if (!user) {
    logger.warn('Corporate admin access denied: No authenticated user');
    return res.status(401).json({ 
      message: 'Authentication required',
      error: 'UNAUTHORIZED'
    });
  }

  // Check if user is a corporate admin
  if (user.roleType !== 'corporate_admin') {
    logger.warn(`Corporate admin access denied for user ${user.email}: Role is ${user.roleType}`);
    return res.status(403).json({ 
      message: 'Corporate admin access required',
      error: 'FORBIDDEN',
      userRole: user.roleType
    });
  }

  // Verify corporate admin has no organization_id (should be null)
  if (user.organizationId !== null) {
    logger.error(`SECURITY VIOLATION: Corporate admin ${user.email} has organization_id: ${user.organizationId}`);
    return res.status(403).json({ 
      message: 'Invalid corporate admin configuration',
      error: 'SECURITY_VIOLATION'
    });
  }

  logger.debug(`Corporate admin access granted to ${user.email}`);
  next();
};

/**
 * Middleware to ensure users can only access their own organization's data
 */
export const enforceOrganizationAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  const organizationId = parseInt(req.params.organizationId || req.params.id);

  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Corporate admins can access any organization
  if (user.roleType === 'corporate_admin') {
    return next();
  }

  // Regular users can only access their own organization
  if (user.organizationId !== organizationId) {
    logger.warn(`Organization access denied: User ${user.email} (org: ${user.organizationId}) tried to access org ${organizationId}`);
    return res.status(403).json({ 
      message: 'Access denied: Can only access your own organization',
      error: 'ORGANIZATION_ACCESS_DENIED'
    });
  }

  next();
};