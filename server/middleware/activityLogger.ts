import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { user_activities, audit_logs } from '@shared/schema';
import { logger } from '@shared/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    organization_id: number;
    email: string;
    role_type: string;
  };
}

export interface ActivityLogData {
  action_type: string;
  resource_type?: string;
  resource_id?: number;
  details?: any;
  performance_metrics?: {
    response_time_ms?: number;
    memory_usage?: number;
    query_count?: number;
  };
}

/**
 * Comprehensive activity tracking middleware for AI-ready analytics
 * Logs every user action with full context for behavior analysis
 */
export const activityLogger = (activityData: ActivityLogData) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Capture request details
    const requestDetails = {
      method: req.method,
      url: req.url,
      body: req.method !== 'GET' ? req.body : undefined,
      query: req.query,
      params: req.params,
    };

    // Continue with the request
    next();

    // Log activity after response (non-blocking)
    res.on('finish', async () => {
      try {
        if (!req.user) return; // Skip if no authenticated user

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Prepare comprehensive activity log
        const activityLog = {
          user_id: req.user.id,
          organization_id: req.user.organization_id,
          action_type: activityData.action_type,
          resource_type: activityData.resource_type,
          resource_id: activityData.resource_id,
          details: {
            ...activityData.details,
            request: requestDetails,
            response: {
              status_code: res.statusCode,
              success: res.statusCode >= 200 && res.statusCode < 400,
            },
            timestamp: new Date().toISOString(),
          },
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('User-Agent'),
          session_id: req.sessionID,
          performance_metrics: {
            response_time_ms: responseTime,
            ...activityData.performance_metrics,
          },
        };

        // Insert activity log into database
        await db.insert(user_activities).values(activityLog);

        logger.info('User activity logged', {
          userId: req.user.id,
          actionType: activityData.action_type,
          resourceType: activityData.resource_type,
          responseTime,
          statusCode: res.statusCode,
        });

      } catch (error) {
        logger.error('Failed to log user activity', {
          error,
          userId: req.user?.id,
          actionType: activityData.action_type,
        });
      }
    });
  };
};

/**
 * Audit logger for data modifications with before/after states
 * Essential for compliance and AI training data
 */
export const auditLogger = async (
  userId: number | undefined,
  organizationId: number,
  action: string,
  tableName: string,
  recordId: number,
  oldValues: any,
  newValues: any,
  req?: AuthenticatedRequest
) => {
  try {
    const auditLog = {
      user_id: userId,
      organization_id: organizationId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: req?.ip || req?.connection.remoteAddress,
      user_agent: req?.get('User-Agent'),
    };

    await db.insert(audit_logs).values(auditLog);

    logger.info('Audit log created', {
      userId,
      organizationId,
      action,
      tableName,
      recordId,
    });

  } catch (error) {
    logger.error('Failed to create audit log', {
      error,
      userId,
      organizationId,
      action,
      tableName,
      recordId,
    });
  }
};

/**
 * Quick activity logging function for use in route handlers
 */
export const logActivity = async (
  req: AuthenticatedRequest,
  actionType: string,
  resourceType?: string,
  resourceId?: number,
  details?: any
) => {
  try {
    if (!req.user) return;

    const activityLog = {
      user_id: req.user.id,
      organization_id: req.user.organization_id,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      details: {
        ...details,
        timestamp: new Date().toISOString(),
        endpoint: req.originalUrl,
        method: req.method,
      },
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      session_id: req.sessionID,
      performance_metrics: {
        timestamp: Date.now(),
      },
    };

    await db.insert(user_activities).values(activityLog);

  } catch (error) {
    logger.error('Failed to log activity', {
      error,
      userId: req.user?.id,
      actionType,
    });
  }
};