import { Router } from 'express';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { users, organizations, subscriptions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '@shared/logger';

const router = Router();

// Get subscription usage information
router.get('/usage', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const organizationId = req.user.organization_id;
    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Get organization and subscription information
    const [orgData] = await db
      .select({
        organization: organizations,
        subscription: subscriptions,
      })
      .from(organizations)
      .leftJoin(subscriptions, eq(organizations.current_subscription_id, subscriptions.id))
      .where(eq(organizations.id, organizationId));

    if (!orgData) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Get employee counts
    const [employeeCounts] = await db
      .select({
        total_employees: sql<number>`COUNT(*)`,
        active_employees: sql<number>`COUNT(CASE WHEN ${users.status} = 'active' THEN 1 END)`,
        pending_employees: sql<number>`COUNT(CASE WHEN ${users.status} = 'pending' THEN 1 END)`,
        inactive_employees: sql<number>`COUNT(CASE WHEN ${users.status} = 'inactive' THEN 1 END)`,
        terminated_employees: sql<number>`COUNT(CASE WHEN ${users.status} = 'terminated' THEN 1 END)`,
      })
      .from(users)
      .where(eq(users.organization_id, organizationId));

    const subscriptionLimit = orgData.subscription?.subscribed_users || 500;
    const activeEmployees = Number(employeeCounts.active_employees);
    const totalEmployees = Number(employeeCounts.total_employees);

    const usageData = {
      subscribed_users: subscriptionLimit,
      current_usage: activeEmployees,
      active_employees: activeEmployees,
      total_employees: totalEmployees,
      pending_employees: Number(employeeCounts.pending_employees),
      inactive_employees: Number(employeeCounts.inactive_employees),
      terminated_employees: Number(employeeCounts.terminated_employees),
      usage_percentage: subscriptionLimit > 0 ? Math.round((activeEmployees / subscriptionLimit) * 100) : 0,
      available_slots: Math.max(0, subscriptionLimit - activeEmployees),
      subscription_status: orgData.subscription?.status || 'inactive',
      organization_name: orgData.organization.name,
    };

    logger.info(`Subscription usage for org ${organizationId}: ${activeEmployees}/${subscriptionLimit} (${usageData.usage_percentage}%)`);

    res.json(usageData);
  } catch (error: any) {
    logger.error('Error fetching subscription usage:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to fetch subscription usage' 
    });
  }
});

export default router;