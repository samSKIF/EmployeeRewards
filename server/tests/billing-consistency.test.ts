import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { pool } from '../db';

describe('Billing Consistency Tests', () => {
  let app: express.Application;
  let token: string;
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  beforeAll(async () => {
    // Create test app instance
    app = express();
    app.use(express.json());
    
    // Import and setup routes
    const { registerRoutes } = await import('../routes');
    const managementRoutes = await import('../management-routes');
    
    await registerRoutes(app);
    app.use('/api/management', managementRoutes.default);

    // Generate test token for corporate admin
    const adminResult = await pool.query(`
      SELECT id FROM users 
      WHERE email = 'admin@canva.com' AND role_type = 'corporate_admin'
      LIMIT 1
    `);
    
    if (adminResult.rows.length > 0) {
      token = jwt.sign({ id: adminResult.rows[0].id }, JWT_SECRET, { expiresIn: '1h' });
    }
  });

  describe('Billing Logic Consistency', () => {
    it('should have consistent billable user counts across all endpoints', async () => {
      // Test subscription usage endpoint
      const subscriptionResponse = await request(app)
        .get('/api/admin/subscription/usage')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Test management analytics endpoint  
      const analyticsResponse = await request(app)
        .get('/api/management/analytics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify the counts match
      expect(subscriptionResponse.body.billable_users).toBeDefined();
      expect(analyticsResponse.body.organizationStats.currentEmployees).toBeDefined();
      
      // The key test: These values should be exactly the same
      expect(subscriptionResponse.body.billable_users).toBe(
        analyticsResponse.body.organizationStats.currentEmployees
      );

      // Additional verification of business rule compliance
      expect(subscriptionResponse.body.billable_users).toBeGreaterThan(0);
      expect(analyticsResponse.body.organizationStats.currentEmployees).toBeGreaterThan(0);
      
      console.log('Subscription endpoint billable users:', subscriptionResponse.body.billable_users);
      console.log('Analytics endpoint current employees:', analyticsResponse.body.organizationStats.currentEmployees);
    });

    it('should exclude corporate super user from billing counts', async () => {
      // Get direct database counts
      const dbResult = await pool.query(`
        SELECT 
          COUNT(CASE WHEN status IN ('active', 'pending') AND organization_id IS NOT NULL THEN 1 END) as org_employees,
          COUNT(CASE WHEN status IN ('active', 'pending') AND organization_id IS NULL THEN 1 END) as super_users
        FROM users
      `);

      const { org_employees, super_users } = dbResult.rows[0];

      // Test API endpoint
      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Billable users should equal organization employees only (excluding super users)
      expect(parseInt(response.body.billable_users)).toBe(parseInt(org_employees));
      expect(parseInt(response.body.billable_users)).not.toBe(parseInt(org_employees) + parseInt(super_users));
    });

    it('should use same SQL logic in both endpoints', async () => {
      // This test verifies that both endpoints use Active + Pending only
      const directDbQuery = await pool.query(`
        SELECT COUNT(*) as billable_count
        FROM users 
        WHERE status IN ('active', 'pending') AND organization_id IS NOT NULL
      `);

      const expectedCount = parseInt(directDbQuery.rows[0].billable_count);

      // Test both endpoints
      const subscriptionResponse = await request(app)
        .get('/api/admin/subscription/usage')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const analyticsResponse = await request(app)
        .get('/api/management/analytics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(subscriptionResponse.body.billable_users).toBe(expectedCount);
      expect(analyticsResponse.body.organizationStats.currentEmployees).toBe(expectedCount);
    });
  });

  describe('Business Rule Validation', () => {
    it('should confirm billable users = active + pending employees only', async () => {
      const statusBreakdown = await pool.query(`
        SELECT 
          status,
          COUNT(*) as count,
          organization_id IS NULL as is_super_user
        FROM users 
        GROUP BY status, (organization_id IS NULL)
        ORDER BY status, is_super_user
      `);

      console.log('User status breakdown:', statusBreakdown.rows);

      // Calculate expected billable count
      const expectedBillable = statusBreakdown.rows
        .filter(row => ['active', 'pending'].includes(row.status) && !row.is_super_user)
        .reduce((sum, row) => sum + parseInt(row.count), 0);

      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.billable_users).toBe(expectedBillable);
    });
  });

  afterAll(async () => {
    // Cleanup if needed
  });
});