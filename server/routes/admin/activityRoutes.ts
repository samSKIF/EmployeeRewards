import { Router } from 'express';
import { verifyToken, verifyAdmin, AuthenticatedRequest } from '../../middleware/auth';
import { db } from '../../db';
import { user_activities, audit_logs } from '@shared/schema';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';
import { logger } from '@shared/logger';

const router = Router();

/**
 * Get user activities for analytics and monitoring
 * AI-ready endpoint for behavior analysis
 */
router.get('/activities', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organization_id;
    const { 
      limit = 50, 
      offset = 0, 
      action_type, 
      resource_type, 
      user_id,
      start_date,
      end_date 
    } = req.query;

    let whereConditions: any[] = [eq(user_activities.organization_id, organizationId)];

    // Add filters
    if (action_type) {
      whereConditions.push(eq(user_activities.action_type, action_type as string));
    }
    if (resource_type) {
      whereConditions.push(eq(user_activities.resource_type, resource_type as string));
    }
    if (user_id) {
      whereConditions.push(eq(user_activities.user_id, parseInt(user_id as string)));
    }
    if (start_date) {
      whereConditions.push(gte(user_activities.created_at, new Date(start_date as string)));
    }
    if (end_date) {
      whereConditions.push(lte(user_activities.created_at, new Date(end_date as string)));
    }

    const activities = await db
      .select()
      .from(user_activities)
      .where(and(...whereConditions))
      .orderBy(desc(user_activities.created_at))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({
      activities,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: activities.length,
      },
    });

  } catch (error) {
    logger.error('Error fetching user activities', { error, organizationId: req.user?.organization_id });
    res.status(500).json({ message: 'Failed to fetch user activities' });
  }
});

/**
 * Get audit logs for compliance tracking
 * Essential for data modification tracking
 */
router.get('/audit-logs', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organization_id;
    const { 
      limit = 50, 
      offset = 0, 
      action, 
      table_name, 
      user_id,
      start_date,
      end_date 
    } = req.query;

    let whereConditions: any[] = [eq(audit_logs.organization_id, organizationId)];

    // Add filters
    if (action) {
      whereConditions.push(eq(audit_logs.action, action as string));
    }
    if (table_name) {
      whereConditions.push(eq(audit_logs.table_name, table_name as string));
    }
    if (user_id) {
      whereConditions.push(eq(audit_logs.user_id, parseInt(user_id as string)));
    }
    if (start_date) {
      whereConditions.push(gte(audit_logs.created_at, new Date(start_date as string)));
    }
    if (end_date) {
      whereConditions.push(lte(audit_logs.created_at, new Date(end_date as string)));
    }

    const logs = await db
      .select()
      .from(audit_logs)
      .where(and(...whereConditions))
      .orderBy(desc(audit_logs.created_at))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({
      audit_logs: logs,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: logs.length,
      },
    });

  } catch (error) {
    logger.error('Error fetching audit logs', { error, organizationId: req.user?.organization_id });
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

/**
 * Get activity analytics for AI training data
 * Aggregated metrics for behavior analysis
 */
router.get('/analytics', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organization_id;
    const { period = '7d' } = req.query; // 1d, 7d, 30d, 90d

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get activities in the period
    const activities = await db
      .select()
      .from(user_activities)
      .where(
        and(
          eq(user_activities.organization_id, organizationId),
          gte(user_activities.created_at, startDate)
        )
      );

    // Aggregate analytics
    const analytics = {
      total_activities: activities.length,
      unique_users: new Set(activities.map(a => a.user_id)).size,
      action_types: {} as Record<string, number>,
      resource_types: {} as Record<string, number>,
      hourly_distribution: {} as Record<number, number>,
      average_response_time: 0,
      most_active_users: {} as Record<number, number>,
      period: period,
      date_range: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
    };

    // Calculate metrics
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    activities.forEach(activity => {
      // Action types distribution
      analytics.action_types[activity.action_type] = 
        (analytics.action_types[activity.action_type] || 0) + 1;

      // Resource types distribution
      if (activity.resource_type) {
        analytics.resource_types[activity.resource_type] = 
          (analytics.resource_types[activity.resource_type] || 0) + 1;
      }

      // Hourly distribution
      const hour = new Date(activity.created_at).getHours();
      analytics.hourly_distribution[hour] = 
        (analytics.hourly_distribution[hour] || 0) + 1;

      // User activity count
      analytics.most_active_users[activity.user_id] = 
        (analytics.most_active_users[activity.user_id] || 0) + 1;

      // Response time calculation
      if (activity.performance_metrics?.response_time_ms) {
        totalResponseTime += activity.performance_metrics.response_time_ms;
        responseTimeCount++;
      }
    });

    // Calculate average response time
    if (responseTimeCount > 0) {
      analytics.average_response_time = Math.round(totalResponseTime / responseTimeCount);
    }

    // Sort most active users
    const sortedUsers = Object.entries(analytics.most_active_users)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {} as Record<string, number>);

    analytics.most_active_users = sortedUsers;

    res.json(analytics);

  } catch (error) {
    logger.error('Error generating activity analytics', { error, organizationId: req.user?.organization_id });
    res.status(500).json({ message: 'Failed to generate analytics' });
  }
});

export default router;