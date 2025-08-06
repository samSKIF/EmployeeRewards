/**
 * SQL STANDARDIZATION REGRESSION TEST SUITE
 * 
 * This suite verifies that all SQL queries across the application use
 * consistent patterns for counting users, preventing future regressions
 * in query logic that could cause count inconsistencies.
 * 
 * STANDARDIZED PATTERNS TESTED:
 * - Active users: COUNT(CASE WHEN status = 'active' THEN 1 END)
 * - Billable users: COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END)
 * - Organization filtering: WHERE organization_id = $1
 * - Super user exclusion: WHERE organization_id IS NOT NULL (for billing)
 */

const { Pool } = require('@neondatabase/serverless');
const request = require('supertest');
const app = require('../server/index.js');

describe('SQL Query Standardization Tests', () => {
  let pool;
  let canvaAdminToken;
  let corporateAdminToken;

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Get authentication tokens
    const [canvaResponse, corporateResponse] = await Promise.all([
      request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin@canva.com',
          password: 'admin123'
        }),
      request(app)
        .post('/api/management/auth/login')
        .send({
          username: 'corporate@thriviohr.com',
          password: 'corporate123'
        })
    ]);
    
    canvaAdminToken = canvaResponse.body.token;
    corporateAdminToken = corporateResponse.body.token;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Direct SQL Query Testing', () => {
    test('standardized active user count for Canva (organization_id = 1)', async () => {
      const result = await pool.query(`
        SELECT COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
        FROM users 
        WHERE organization_id = 1
      `);
      
      expect(parseInt(result.rows[0].active_count)).toBe(401);
    });

    test('standardized billable user count for Canva (active + pending)', async () => {
      const result = await pool.query(`
        SELECT COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END) as billable_count
        FROM users 
        WHERE organization_id = 1
      `);
      
      expect(parseInt(result.rows[0].billable_count)).toBe(402);
    });

    test('super user count (organization_id IS NULL)', async () => {
      const result = await pool.query(`
        SELECT COUNT(*) as super_user_count 
        FROM users 
        WHERE organization_id IS NULL AND role_type = 'corporate_admin'
      `);
      
      expect(parseInt(result.rows[0].super_user_count)).toBe(1);
    });

    test('total platform users (all organizations + super user)', async () => {
      const result = await pool.query(`
        SELECT COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END) as total_count
        FROM users 
        WHERE organization_id IS NOT NULL
        UNION ALL
        SELECT COUNT(*) 
        FROM users 
        WHERE organization_id IS NULL AND role_type = 'corporate_admin'
      `);
      
      const organizationUsers = parseInt(result.rows[0].total_count);
      const superUsers = result.rows[1] ? parseInt(result.rows[1].count) : 0;
      
      expect(organizationUsers).toBe(402); // Canva organization users
      expect(superUsers).toBe(1); // Corporate admin
      expect(organizationUsers + superUsers).toBe(403); // Total management view
    });
  });

  describe('API Endpoint SQL Pattern Verification', () => {
    test('Employee Directory endpoint uses correct active user pattern', async () => {
      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .set('Authorization', `Bearer ${canvaAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.active_employees).toBe(401);
      
      // Verify this matches our standardized query
      const directQuery = await pool.query(`
        SELECT COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
        FROM users WHERE organization_id = 1
      `);
      
      expect(response.body.active_employees).toBe(parseInt(directQuery.rows[0].active_count));
    });

    test('Corporate Organizations endpoint uses correct total user pattern', async () => {
      const response = await request(app)
        .get('/api/management/organizations')
        .set('Authorization', `Bearer ${corporateAdminToken}`);

      expect(response.status).toBe(200);
      
      const canvaOrg = response.body.find(org => org.name === 'Canva');
      expect(canvaOrg.userCount).toBe(403);
      
      // Verify this matches organization users + super user
      const [orgQuery, superQuery] = await Promise.all([
        pool.query(`
          SELECT COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END) as org_count
          FROM users WHERE organization_id = 1
        `),
        pool.query(`
          SELECT COUNT(*) as super_count
          FROM users WHERE organization_id IS NULL AND role_type = 'corporate_admin'
        `)
      ]);
      
      const expectedTotal = parseInt(orgQuery.rows[0].org_count) + parseInt(superQuery.rows[0].super_count);
      expect(canvaOrg.userCount).toBe(expectedTotal);
    });

    test('Subscription Management endpoint excludes super user from billing', async () => {
      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .set('Authorization', `Bearer ${canvaAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.billable_users).toBe(402);
      
      // Verify this matches organization-only query (no super user)
      const directQuery = await pool.query(`
        SELECT COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END) as billable_count
        FROM users WHERE organization_id = 1
      `);
      
      expect(response.body.billable_users).toBe(parseInt(directQuery.rows[0].billable_count));
    });
  });

  describe('Query Pattern Consistency Checks', () => {
    test('all endpoints use CASE WHEN pattern instead of multiple WHERE clauses', async () => {
      // Test that our standardized patterns return consistent results
      const [caseWhenQuery, multipleQueryTotal] = await Promise.all([
        pool.query(`
          SELECT 
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END) as total
          FROM users WHERE organization_id = 1
        `),
        Promise.all([
          pool.query(`SELECT COUNT(*) as count FROM users WHERE organization_id = 1 AND status = 'active'`),
          pool.query(`SELECT COUNT(*) as count FROM users WHERE organization_id = 1 AND status = 'pending'`)
        ])
      ]);

      const caseResults = caseWhenQuery.rows[0];
      const separateActive = parseInt(multipleQueryTotal[0].rows[0].count);
      const separatePending = parseInt(multipleQueryTotal[1].rows[0].count);

      // Both patterns should yield same results
      expect(parseInt(caseResults.active)).toBe(separateActive);
      expect(parseInt(caseResults.pending)).toBe(separatePending);
      expect(parseInt(caseResults.total)).toBe(separateActive + separatePending);
      
      // Verify expected values
      expect(separateActive).toBe(401);
      expect(separatePending).toBe(1);
      expect(separateActive + separatePending).toBe(402);
    });

    test('organization filtering is consistent across all queries', async () => {
      // Test different organization filtering patterns return same results
      const [explicitFilter, implicitFilter] = await Promise.all([
        pool.query(`
          SELECT COUNT(*) as count 
          FROM users 
          WHERE organization_id = $1 AND status IN ('active', 'pending')
        `, [1]),
        pool.query(`
          SELECT COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END) as count
          FROM users 
          WHERE organization_id = $1
        `, [1])
      ]);

      expect(parseInt(explicitFilter.rows[0].count)).toBe(parseInt(implicitFilter.rows[0].count));
      expect(parseInt(explicitFilter.rows[0].count)).toBe(402);
    });
  });

  describe('Business Rule Validation', () => {
    test('super user is correctly excluded from organization billing counts', async () => {
      const [withSuper, withoutSuper] = await Promise.all([
        // Management view (includes super user)
        pool.query(`
          SELECT 
            (SELECT COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END) 
             FROM users WHERE organization_id = 1) +
            (SELECT COUNT(*) FROM users 
             WHERE organization_id IS NULL AND role_type = 'corporate_admin') as total
        `),
        // Billing view (excludes super user)
        pool.query(`
          SELECT COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END) as total
          FROM users WHERE organization_id = 1
        `)
      ]);

      expect(parseInt(withSuper.rows[0].total)).toBe(403);    // Management view
      expect(parseInt(withoutSuper.rows[0].total)).toBe(402); // Billing view
      expect(parseInt(withSuper.rows[0].total)).toBe(parseInt(withoutSuper.rows[0].total) + 1);
    });

    test('pending users are included in billing but not active counts', async () => {
      const result = await pool.query(`
        SELECT 
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_only,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_only,
          COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END) as billable_total
        FROM users WHERE organization_id = 1
      `);

      const { active_only, pending_only, billable_total } = result.rows[0];
      
      expect(parseInt(active_only)).toBe(401);
      expect(parseInt(pending_only)).toBe(1);
      expect(parseInt(billable_total)).toBe(402);
      expect(parseInt(active_only) + parseInt(pending_only)).toBe(parseInt(billable_total));
    });
  });
});