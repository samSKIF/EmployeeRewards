import request from 'supertest';
import { app } from '../../server/index';
import { db } from '../../server/db';
import { users, organizations } from '@shared/schema';
import { eq, and, ne, count } from 'drizzle-orm';

describe('User Count Consistency Integration Tests - Critical Business Logic', () => {
  let adminToken: string;
  let userToken: string;
  let organizationId: number;

  const mockOrganization = {
    name: 'Test Organization',
    domain: 'test.com',
    status: 'active',
    subscription_type: 'enterprise',
    max_users: 500
  };

  const mockAdminUser = {
    username: 'admin_test',
    email: 'admin@test.com',
    name: 'Test',
    surname: 'Admin',
    password: 'hashedPassword123',
    role_type: 'admin',
    is_admin: true,
    status: 'active',
    department: 'Administration',
    job_title: 'Administrator'
  };

  const mockRegularUser = {
    username: 'user_test',
    email: 'user@test.com', 
    name: 'Test',
    surname: 'User',
    password: 'hashedPassword123',
    role_type: 'employee',
    is_admin: false,
    status: 'active',
    department: 'Engineering',
    job_title: 'Software Engineer'
  };

  beforeAll(async () => {
    // Set up test organization
    const [org] = await db.insert(organizations).values(mockOrganization).returning();
    organizationId = org.id;

    // Create admin user
    const [admin] = await db.insert(users).values({
      ...mockAdminUser,
      organization_id: organizationId
    }).returning();

    // Create regular user
    const [user] = await db.insert(users).values({
      ...mockRegularUser,
      organization_id: organizationId
    }).returning();

    // Generate tokens (mocking JWT generation)
    adminToken = `Bearer admin_token_${admin.id}`;
    userToken = `Bearer user_token_${user.id}`;

    // Create additional test employees to reach 402 count
    const additionalEmployees = Array.from({ length: 400 }, (_, i) => ({
      username: `employee_${i + 1}`,
      email: `employee${i + 1}@test.com`,
      name: `Employee${i + 1}`,
      surname: 'Test',
      password: 'hashedPassword123',
      role_type: 'employee',
      is_admin: false,
      status: 'active',
      department: i % 5 === 0 ? 'Engineering' : i % 5 === 1 ? 'Marketing' : i % 5 === 2 ? 'Sales' : i % 5 === 3 ? 'Product' : 'Design',
      job_title: 'Employee',
      organization_id: organizationId
    }));

    await db.insert(users).values(additionalEmployees);
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(users).where(eq(users.organization_id, organizationId));
    await db.delete(organizations).where(eq(organizations.id, organizationId));
  });

  describe('Employee Directory Count Consistency', () => {
    it('should maintain 402 user count across all employee directory endpoints', async () => {
      // Test main employee directory endpoint
      const employeeResponse = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', adminToken)
        .expect(200);

      expect(employeeResponse.body.pagination.total).toBe(402);
      expect(employeeResponse.body.employees).toBeDefined();
      expect(Array.isArray(employeeResponse.body.employees)).toBe(true);

      // Test with different filter combinations
      const departmentFilterResponse = await request(app)
        .get('/api/admin/employees')
        .query({ department: 'Engineering' })
        .set('Authorization', adminToken)
        .expect(200);

      // Should still show total of 402 even with filters
      expect(departmentFilterResponse.body.pagination.total).toBe(402);
      expect(departmentFilterResponse.body.filters.department).toBe('Engineering');

      // Test search with user count consistency
      const searchResponse = await request(app)
        .get('/api/admin/employees')
        .query({ search: 'Test' })
        .set('Authorization', adminToken)
        .expect(200);

      expect(searchResponse.body.pagination.total).toBe(402);
    });

    it('should maintain count consistency when creating new employees', async () => {
      // Get initial count
      const initialResponse = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', adminToken)
        .expect(200);

      const initialCount = initialResponse.body.pagination.total;
      expect(initialCount).toBe(402);

      // Create new employee
      const newEmployeeData = {
        name: 'NewEmployee',
        surname: 'Test',
        email: 'new.employee@test.com',
        department: 'Engineering',
        job_title: 'Junior Developer',
        status: 'active'
      };

      const createResponse = await request(app)
        .post('/api/admin/employees')
        .send(newEmployeeData)
        .set('Authorization', adminToken)
        .expect(201);

      expect(createResponse.body.employee).toBeDefined();
      expect(createResponse.body.employee.email).toBe(newEmployeeData.email);

      // Verify count increased by 1
      const updatedResponse = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', adminToken)
        .expect(200);

      expect(updatedResponse.body.pagination.total).toBe(initialCount + 1);

      // Clean up created employee
      await db.delete(users).where(eq(users.email, newEmployeeData.email));
    });

    it('should maintain count consistency when updating employees', async () => {
      // Get initial count
      const initialResponse = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', adminToken)
        .expect(200);

      const initialCount = initialResponse.body.pagination.total;
      const firstEmployee = initialResponse.body.employees[0];

      // Update employee
      const updateData = {
        job_title: 'Updated Job Title',
        department: 'Updated Department'
      };

      const updateResponse = await request(app)
        .patch(`/api/admin/employees/${firstEmployee.id}`)
        .send(updateData)
        .set('Authorization', adminToken)
        .expect(200);

      expect(updateResponse.body.employee.job_title).toBe(updateData.job_title);

      // Verify count remains the same after update
      const afterUpdateResponse = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', adminToken)
        .expect(200);

      expect(afterUpdateResponse.body.pagination.total).toBe(initialCount);
    });

    it('should maintain count consistency when deleting employees', async () => {
      // Create a temporary employee for deletion test
      const tempEmployee = {
        username: 'temp_delete',
        email: 'temp.delete@test.com',
        name: 'Temp',
        surname: 'Delete',
        password: 'hashedPassword123',
        role_type: 'employee',
        is_admin: false,
        status: 'active',
        department: 'Temp',
        job_title: 'Temp Employee',
        organization_id: organizationId
      };

      const [created] = await db.insert(users).values(tempEmployee).returning();

      // Get count with temp employee
      const beforeDeleteResponse = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', adminToken)
        .expect(200);

      const beforeCount = beforeDeleteResponse.body.pagination.total;

      // Delete employee
      const deleteResponse = await request(app)
        .delete(`/api/admin/employees/${created.id}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(deleteResponse.body.message).toContain('deleted successfully');

      // Verify count decreased by 1
      const afterDeleteResponse = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', adminToken)
        .expect(200);

      expect(afterDeleteResponse.body.pagination.total).toBe(beforeCount - 1);
    });
  });

  describe('Organization Context Count Consistency', () => {
    it('should show consistent counts in corporate organizations endpoint', async () => {
      const orgResponse = await request(app)
        .get('/api/admin/corporate/organizations')
        .set('Authorization', adminToken)
        .expect(200);

      const testOrg = orgResponse.body.find((org: any) => org.id === organizationId);
      expect(testOrg).toBeDefined();
      expect(testOrg.user_count).toBe(402);
      expect(testOrg.active_users).toBeLessThanOrEqual(402);
    });

    it('should maintain organization isolation in user counts', async () => {
      // Create another organization for isolation test
      const anotherOrg = {
        name: 'Another Organization',
        domain: 'another.com',
        status: 'active',
        subscription_type: 'professional',
        max_users: 100
      };

      const [newOrg] = await db.insert(organizations).values(anotherOrg).returning();

      // Create user in different organization
      const crossOrgUser = {
        username: 'cross_org',
        email: 'cross@another.com',
        name: 'Cross',
        surname: 'Org',
        password: 'hashedPassword123',
        role_type: 'employee',
        is_admin: false,
        status: 'active',
        department: 'Engineering',
        job_title: 'Engineer',
        organization_id: newOrg.id
      };

      await db.insert(users).values(crossOrgUser);

      // Verify original org count unchanged
      const employeeResponse = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', adminToken)
        .expect(200);

      expect(employeeResponse.body.pagination.total).toBe(402);

      // Clean up
      await db.delete(users).where(eq(users.organization_id, newOrg.id));
      await db.delete(organizations).where(eq(organizations.id, newOrg.id));
    });
  });

  describe('Subscription Management Count Consistency', () => {
    it('should display consistent user counts in subscription usage', async () => {
      const subscriptionResponse = await request(app)
        .get('/api/admin/subscription/usage')
        .set('Authorization', adminToken)
        .expect(200);

      expect(subscriptionResponse.body.current_users).toBe(402);
      expect(subscriptionResponse.body.max_users).toBe(500);
      expect(subscriptionResponse.body.usage_percentage).toBeCloseTo(80.4); // 402/500 * 100
    });

    it('should handle subscription limits based on accurate user counts', async () => {
      // Test subscription limit validation
      const limitResponse = await request(app)
        .get('/api/admin/subscription/limits')
        .set('Authorization', adminToken)
        .expect(200);

      expect(limitResponse.body.user_limit_status).toBe('within_limit');
      expect(limitResponse.body.users_remaining).toBe(98); // 500 - 402
      expect(limitResponse.body.can_add_users).toBe(true);
    });
  });

  describe('Database Query Consistency Validation', () => {
    it('should maintain count consistency across different database queries', async () => {
      // Direct database count query
      const [dbCount] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.organization_id, organizationId),
            ne(users.status, 'deleted')
          )
        );

      expect(dbCount.count).toBe(402);

      // API endpoint count
      const apiResponse = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', adminToken)
        .expect(200);

      expect(apiResponse.body.pagination.total).toBe(dbCount.count);

      // Active users count
      const [activeCount] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.organization_id, organizationId),
            eq(users.status, 'active')
          )
        );

      const activeResponse = await request(app)
        .get('/api/admin/employees')
        .query({ status: 'active' })
        .set('Authorization', adminToken)
        .expect(200);

      expect(activeResponse.body.pagination.total).toBe(activeCount.count);
    });
  });

  describe('Real-time Count Updates', () => {
    it('should update counts immediately after bulk operations', async () => {
      // Get initial count
      const initialResponse = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', adminToken)
        .expect(200);

      const initialCount = initialResponse.body.pagination.total;

      // Perform bulk create operation
      const bulkEmployees = [
        {
          name: 'Bulk1',
          surname: 'Test',
          email: 'bulk1@test.com',
          department: 'Engineering',
          job_title: 'Engineer'
        },
        {
          name: 'Bulk2',
          surname: 'Test', 
          email: 'bulk2@test.com',
          department: 'Marketing',
          job_title: 'Marketer'
        }
      ];

      const bulkResponse = await request(app)
        .post('/api/admin/employees/bulk-upload')
        .send({ employees: bulkEmployees })
        .set('Authorization', adminToken)
        .expect(200);

      expect(bulkResponse.body.summary.successful_creates).toBe(2);

      // Verify count updated immediately
      const afterBulkResponse = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', adminToken)
        .expect(200);

      expect(afterBulkResponse.body.pagination.total).toBe(initialCount + 2);

      // Clean up bulk created employees
      await db.delete(users).where(
        and(
          eq(users.organization_id, organizationId),
          eq(users.surname, 'Test'),
          ne(users.email, mockAdminUser.email),
          ne(users.email, mockRegularUser.email)
        )
      );
    });
  });

  describe('Error Scenarios and Count Integrity', () => {
    it('should maintain count consistency even during failed operations', async () => {
      // Get initial count
      const initialResponse = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', adminToken)
        .expect(200);

      const initialCount = initialResponse.body.pagination.total;

      // Attempt to create employee with duplicate email (should fail)
      const duplicateEmployee = {
        name: 'Duplicate',
        surname: 'Test',
        email: mockRegularUser.email, // Duplicate email
        department: 'Engineering',
        job_title: 'Developer'
      };

      await request(app)
        .post('/api/admin/employees')
        .send(duplicateEmployee)
        .set('Authorization', adminToken)
        .expect(400); // Should fail

      // Verify count unchanged after failed operation
      const afterFailResponse = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', adminToken)
        .expect(200);

      expect(afterFailResponse.body.pagination.total).toBe(initialCount);
    });

    it('should handle database transaction rollbacks correctly', async () => {
      // This test would verify that failed transactions don't affect counts
      // Implementation depends on specific transaction handling in the application
      const countBefore = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.organization_id, organizationId));

      // Simulate a transaction that should rollback
      try {
        await db.transaction(async (tx) => {
          // Insert valid user
          await tx.insert(users).values({
            username: 'rollback_test',
            email: 'rollback@test.com',
            name: 'Rollback',
            surname: 'Test',
            password: 'hashedPassword123',
            role_type: 'employee',
            is_admin: false,
            status: 'active',
            department: 'Engineering',
            job_title: 'Developer',
            organization_id: organizationId
          });

          // Force rollback with constraint violation
          throw new Error('Forced rollback');
        });
      } catch (error) {
        // Expected error - transaction should rollback
      }

      const countAfter = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.organization_id, organizationId));

      // Count should be unchanged due to rollback
      expect(countAfter[0].count).toBe(countBefore[0].count);
    });
  });
});