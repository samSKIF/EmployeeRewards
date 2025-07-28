import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '../db';
import { users, organizations, subscriptions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import subscriptionRoutes from '../routes/subscriptionRoutes';
import { verifyToken } from '../middleware/auth';

// Mock middleware and dependencies
vi.mock('../middleware/auth');
vi.mock('@shared/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }
}));

const mockVerifyToken = vi.mocked(verifyToken);

describe('Subscription Usage Integration Tests', () => {
  let app: express.Application;
  let testOrgId: number;
  let testSubscriptionId: number;
  let testUserId: number;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    mockVerifyToken.mockImplementation((req: any, res: any, next: any) => {
      req.user = {
        id: testUserId,
        organization_id: testOrgId,
        email: 'admin@test.com',
        name: 'Test Admin',
        is_admin: true
      };
      next();
    });
    
    app.use('/api/admin/subscription', subscriptionRoutes);
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanup();
    
    // Create test data
    const setupResult = await setupTestData();
    testOrgId = setupResult.orgId;
    testSubscriptionId = setupResult.subscriptionId;
    testUserId = setupResult.userId;
  });

  afterEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  async function setupTestData() {
    // Create test subscription
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        service_name: 'Test Subscription',
        subscribed_users: 500,
        total_monthly_amount: 5000,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();

    // Create test organization
    const [organization] = await db
      .insert(organizations)
      .values({
        name: 'Test Organization',
        domain: 'test.com',
        status: 'active',
        current_subscription_id: subscription.id,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();

    // Create test users with different statuses
    const userInserts = [
      {
        username: 'admin_user',
        email: 'admin@test.com',
        password: 'hashed_password',
        name: 'Admin User',
        organization_id: organization.id,
        status: 'active',
        is_admin: true,
        role_type: 'admin',
        department: 'Administration',
        job_title: 'Administrator',
        location: 'New York',
        created_at: new Date(),
        updated_at: new Date()
      },
      // Active employees
      ...Array.from({ length: 450 }, (_, i) => ({
        username: `user${i + 1}`,
        email: `user${i + 1}@test.com`,
        password: 'hashed_password',
        name: `User ${i + 1}`,
        organization_id: organization.id,
        status: 'active',
        is_admin: false,
        role_type: 'employee',
        department: i % 2 === 0 ? 'Engineering' : 'Marketing',
        job_title: 'Employee',
        location: i % 3 === 0 ? 'New York' : 'San Francisco',
        created_at: new Date(),
        updated_at: new Date()
      })),
      // Pending employees
      ...Array.from({ length: 5 }, (_, i) => ({
        username: `pending_user${i + 1}`,
        email: `pending${i + 1}@test.com`,
        password: 'hashed_password',
        name: `Pending User ${i + 1}`,
        organization_id: organization.id,
        status: 'pending',
        is_admin: false,
        role_type: 'employee',
        department: 'HR',
        job_title: 'Pending Employee',
        location: 'New York',
        created_at: new Date(),
        updated_at: new Date()
      })),
      // Inactive employees
      ...Array.from({ length: 3 }, (_, i) => ({
        username: `inactive_user${i + 1}`,
        email: `inactive${i + 1}@test.com`,
        password: 'hashed_password',
        name: `Inactive User ${i + 1}`,
        organization_id: organization.id,
        status: 'inactive',
        is_admin: false,
        role_type: 'employee',
        department: 'Operations',
        job_title: 'Inactive Employee',
        location: 'Chicago',
        created_at: new Date(),
        updated_at: new Date()
      }))
    ];

    const insertedUsers = await db.insert(users).values(userInserts).returning();

    return {
      orgId: organization.id,
      subscriptionId: subscription.id,
      userId: insertedUsers[0].id // Admin user
    };
  }

  async function cleanup() {
    try {
      await db.delete(users).where(eq(users.email, 'admin@test.com'));
      await db.delete(users).where(sql`${users.email} LIKE 'user%@test.com'`);
      await db.delete(users).where(sql`${users.email} LIKE 'pending%@test.com'`);
      await db.delete(users).where(sql`${users.email} LIKE 'inactive%@test.com'`);
      await db.delete(organizations).where(eq(organizations.name, 'Test Organization'));
      await db.delete(subscriptions).where(eq(subscriptions.service_name, 'Test Subscription'));
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  describe('Real Database Integration', () => {
    it('should return accurate subscription usage with real data', async () => {
      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .expect(200);

      expect(response.body).toMatchObject({
        subscribed_users: 500,
        current_usage: 451, // 1 admin + 450 active users
        active_employees: 451,
        total_employees: 459, // 451 active + 5 pending + 3 inactive
        pending_employees: 5,
        inactive_employees: 3,
        terminated_employees: 0,
        usage_percentage: 90, // 451/500 = 90.2%, rounded to 90%
        available_slots: 49,
        subscription_status: 'active',
        organization_name: 'Test Organization'
      });
    });

    it('should handle near-capacity scenarios correctly', async () => {
      // Add more users to approach the limit
      const additionalUsers = Array.from({ length: 45 }, (_, i) => ({
        username: `additional_user${i + 1}`,
        email: `additional${i + 1}@test.com`,
        password: 'hashed_password',
        name: `Additional User ${i + 1}`,
        organization_id: testOrgId,
        status: 'active',
        is_admin: false,
        role_type: 'employee',
        department: 'Sales',
        job_title: 'Sales Rep',
        location: 'Boston',
        created_at: new Date(),
        updated_at: new Date()
      }));

      await db.insert(users).values(additionalUsers);

      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .expect(200);

      expect(response.body).toMatchObject({
        subscribed_users: 500,
        current_usage: 496, // 451 + 45 = 496
        active_employees: 496,
        usage_percentage: 99, // 496/500 = 99.2%, rounded to 99%
        available_slots: 4
      });

      // Cleanup additional users
      await db.delete(users).where(sql`${users.email} LIKE 'additional%@test.com'`);
    });

    it('should handle over-capacity scenarios', async () => {
      // Add users beyond the subscription limit
      const excessUsers = Array.from({ length: 60 }, (_, i) => ({
        username: `excess_user${i + 1}`,
        email: `excess${i + 1}@test.com`,
        password: 'hashed_password',
        name: `Excess User ${i + 1}`,
        organization_id: testOrgId,
        status: 'active',
        is_admin: false,
        role_type: 'employee',
        department: 'Support',
        job_title: 'Support Agent',
        location: 'Austin',
        created_at: new Date(),
        updated_at: new Date()
      }));

      await db.insert(users).values(excessUsers);

      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .expect(200);

      expect(response.body).toMatchObject({
        subscribed_users: 500,
        current_usage: 511, // 451 + 60 = 511
        active_employees: 511,
        usage_percentage: 102, // 511/500 = 102.2%, rounded to 102%
        available_slots: -11 // Negative available slots
      });

      // Cleanup excess users
      await db.delete(users).where(sql`${users.email} LIKE 'excess%@test.com'`);
    });

    it('should only count active employees for subscription usage', async () => {
      // Change some active users to inactive
      await db
        .update(users)
        .set({ status: 'inactive' })
        .where(sql`${users.email} LIKE 'user1%@test.com' AND ${users.organization_id} = ${testOrgId}`);

      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .expect(200);

      // Should exclude the inactive users from current_usage
      expect(response.body.current_usage).toBeLessThan(451);
      expect(response.body.active_employees).toBeLessThan(451);
      expect(response.body.inactive_employees).toBeGreaterThan(3);
    });

    it('should handle organization without subscription', async () => {
      // Remove subscription from organization
      await db
        .update(organizations)
        .set({ current_subscription_id: null })
        .where(eq(organizations.id, testOrgId));

      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .expect(200);

      expect(response.body).toMatchObject({
        subscribed_users: 500, // Default fallback
        subscription_status: 'inactive',
        organization_name: 'Test Organization'
      });
    });

    it('should calculate correct department and location counts', async () => {
      // Verify the test data setup created the expected departments and locations
      const [departmentCounts] = await db
        .select({
          unique_departments: sql<number>`COUNT(DISTINCT ${users.department})`
        })
        .from(users)
        .where(eq(users.organization_id, testOrgId));

      const [locationCounts] = await db
        .select({
          unique_locations: sql<number>`COUNT(DISTINCT ${users.location})`
        })
        .from(users)
        .where(eq(users.organization_id, testOrgId));

      expect(Number(departmentCounts.unique_departments)).toBeGreaterThanOrEqual(4); // Admin, Engineering, Marketing, HR, Operations
      expect(Number(locationCounts.unique_locations)).toBeGreaterThanOrEqual(3); // New York, San Francisco, Chicago
    });

    it('should handle database errors gracefully', async () => {
      // Mock a user with invalid organization_id
      mockVerifyToken.mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = {
          id: 999999,
          organization_id: 999999, // Non-existent organization
          email: 'invalid@test.com',
          name: 'Invalid User',
          is_admin: true
        };
        next();
      });

      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .expect(404);

      expect(response.body.message).toBe('Organization not found');
    });
  });

  describe('Performance Tests', () => {
    it('should respond quickly even with large datasets', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
      expect(response.body).toHaveProperty('subscribed_users');
      expect(response.body).toHaveProperty('current_usage');
    });

    it('should handle concurrent requests correctly', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/api/admin/subscription/usage')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('subscribed_users', 500);
        expect(response.body).toHaveProperty('active_employees', 451);
      });
    });
  });
});