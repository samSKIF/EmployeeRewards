import { Router } from 'express';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { db, pool } from '../db';
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

    // Get organization and subscription information using raw SQL
    const orgResult = await pool.query(`
      SELECT 
        o.*,
        s.subscribed_users,
        s.is_active as subscription_active
      FROM organizations o
      LEFT JOIN subscriptions s ON o.current_subscription_id = s.id
      WHERE o.id = $1
    `, [organizationId]);

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const orgData = orgResult.rows[0];

    // Get employee counts using raw SQL to avoid Drizzle ORM column issues
    const employeeResult = await pool.query(`
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_employees,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_employees,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_employees,
        COUNT(CASE WHEN status = 'terminated' THEN 1 END) as terminated_employees,
        COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END) as billable_employees
      FROM users 
      WHERE organization_id = $1
    `, [organizationId]);

    // Add main super user account to billing count
    const superUserResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE organization_id IS NULL AND role_type = 'corporate_admin'
    `);

    const employeeCounts = employeeResult.rows[0];
    const superUserCount = superUserResult.rows[0];

    const subscriptionLimit = orgData.subscribed_users || 500;
    const activeEmployees = Number(employeeCounts.active_employees);
    const billableUsers = Number(employeeCounts.billable_employees) + Number(superUserCount.count);
    const totalEmployees = Number(employeeCounts.total_employees);

    const usageData = {
      subscribed_users: subscriptionLimit,
      // BUSINESS RULE: Use billable users (Active + Pending + Main super user) for billing
      current_usage: billableUsers,
      active_employees: activeEmployees,
      total_employees: totalEmployees,
      pending_employees: Number(employeeCounts.pending_employees),
      inactive_employees: Number(employeeCounts.inactive_employees),
      terminated_employees: Number(employeeCounts.terminated_employees),
      billable_users: billableUsers,
      usage_percentage: subscriptionLimit > 0 ? Math.round((billableUsers / subscriptionLimit) * 100) : 0,
      available_slots: Math.max(0, subscriptionLimit - billableUsers),
      subscription_status: orgData.subscription_active ? 'active' : 'inactive',
      organization_name: orgData.name,
    };

    logger.info(`Subscription usage for org ${organizationId}: ${billableUsers}/${subscriptionLimit} (${usageData.usage_percentage}%) - Active: ${activeEmployees}, Pending: ${employeeCounts.pending_employees}, Super User: ${superUserCount.count}`);

    res.json(usageData);
  } catch (error: any) {
    logger.error('Error fetching subscription usage:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to fetch subscription usage' 
    });
  }
});

export default router;