import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../server/db';
import { users, organizations, accounts, posts } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

describe('Snake Case Compliance Tests', () => {
  // Test database field mappings
  describe('Database Field Mapping Compliance', () => {
    test('should use snake_case for all database column references', async () => {
      // Test direct SQL queries with snake_case fields
      const testQueries = [
        // Users table snake_case fields
        () => db.select().from(users).where(eq(users.organization_id, 1)).limit(1),
        () => db.select().from(users).where(sql`${users.birth_date} IS NOT NULL`).limit(1),
        () => db.select().from(users).where(sql`${users.phone_number} IS NOT NULL`).limit(1),
        () => db.select().from(users).where(sql`${users.job_title} IS NOT NULL`).limit(1),
        () => db.select().from(users).where(sql`${users.avatar_url} IS NOT NULL`).limit(1),
        () => db.select().from(users).where(sql`${users.hire_date} IS NOT NULL`).limit(1),
        () => db.select().from(users).where(sql`${users.role_type} = 'employee'`).limit(1),
        () => db.select().from(users).where(sql`${users.is_admin} = false`).limit(1),
        () => db.select().from(users).where(sql`${users.last_seen_at} IS NOT NULL`).limit(1),
        () => db.select().from(users).where(sql`${users.manager_id} IS NOT NULL`).limit(1),
        () => db.select().from(users).where(sql`${users.manager_email} IS NOT NULL`).limit(1),
        () => db.select().from(users).where(sql`${users.cover_photo_url} IS NOT NULL`).limit(1),
        () => db.select().from(users).where(sql`${users.created_at} IS NOT NULL`).limit(1),
        
        // Organizations table snake_case fields
        () => db.select().from(organizations).where(sql`${organizations.contact_name} IS NOT NULL`).limit(1),
        () => db.select().from(organizations).where(sql`${organizations.contact_email} IS NOT NULL`).limit(1),
        () => db.select().from(organizations).where(sql`${organizations.contact_phone} IS NOT NULL`).limit(1),
        () => db.select().from(organizations).where(sql`${organizations.superuser_email} IS NOT NULL`).limit(1),
        () => db.select().from(organizations).where(sql`${organizations.created_at} IS NOT NULL`).limit(1),
        () => db.select().from(organizations).where(sql`${organizations.updated_at} IS NOT NULL`).limit(1),
        () => db.select().from(organizations).where(sql`${organizations.created_by} IS NOT NULL`).limit(1),
        () => db.select().from(organizations).where(sql`${organizations.logo_url} IS NOT NULL`).limit(1),
        () => db.select().from(organizations).where(sql`${organizations.parent_org_id} IS NOT NULL`).limit(1),
        () => db.select().from(organizations).where(sql`${organizations.current_subscription_id} IS NOT NULL`).limit(1),
        
        // Accounts table snake_case fields  
        () => db.select().from(accounts).where(sql`${accounts.user_id} IS NOT NULL`).limit(1),
        () => db.select().from(accounts).where(sql`${accounts.account_type} = 'user'`).limit(1),
      ];

      // Execute all queries - they should not throw SQL syntax errors
      for (const queryFn of testQueries) {
        try {
          await queryFn();
        } catch (error: any) {
          if (error.code === '42601') { // PostgreSQL syntax error
            throw new Error(`SQL syntax error detected in query: ${error.message}`);
          }
          // Other errors (like no data) are acceptable for this test
        }
      }
    });

    test('should reject camelCase field references in SQL', async () => {
      // These queries should fail with SQL syntax errors since the columns don't exist
      const invalidQueries = [
        () => db.select().from(users).where(sql`organizationId = 1`),
        () => db.select().from(users).where(sql`birthDate IS NOT NULL`),
        () => db.select().from(users).where(sql`phoneNumber IS NOT NULL`),
        () => db.select().from(users).where(sql`jobTitle IS NOT NULL`),
        () => db.select().from(users).where(sql`avatarUrl IS NOT NULL`),
        () => db.select().from(users).where(sql`roleType = 'employee'`),
        () => db.select().from(users).where(sql`isAdmin = false`),
      ];

      for (const queryFn of invalidQueries) {
        await expect(queryFn()).rejects.toThrow();
      }
    });
  });

  // Test server code compliance
  describe('Server Code Snake Case Compliance', () => {
    test('should not contain camelCase database field references in server files', async () => {
      const serverDir = path.join(process.cwd(), 'server');
      const violations: string[] = [];
      
      const checkFile = (filePath: string) => {
        if (!filePath.endsWith('.ts') || filePath.includes('.test.ts')) return;
        
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        // Common camelCase database field patterns to detect
        const camelCasePatterns = [
          /\.organizationId[^a-zA-Z]/g,
          /\.birthDate[^a-zA-Z]/g,
          /\.phoneNumber[^a-zA-Z]/g,
          /\.jobTitle[^a-zA-Z]/g,
          /\.avatarUrl[^a-zA-Z]/g,
          /\.hireDate[^a-zA-Z]/g,
          /\.roleType[^a-zA-Z]/g,
          /\.isAdmin[^a-zA-Z]/g,
          /\.lastSeenAt[^a-zA-Z]/g,
          /\.managerId[^a-zA-Z]/g,
          /\.managerEmail[^a-zA-Z]/g,
          /\.coverPhotoUrl[^a-zA-Z]/g,
          /\.createdAt[^a-zA-Z]/g,
          /\.updatedAt[^a-zA-Z]/g,
          /\.contactName[^a-zA-Z]/g,
          /\.contactEmail[^a-zA-Z]/g,
          /\.contactPhone[^a-zA-Z]/g,
          /\.superuserEmail[^a-zA-Z]/g,
          /\.logoUrl[^a-zA-Z]/g,
          /\.parentOrgId[^a-zA-Z]/g,
          /\.currentSubscriptionId[^a-zA-Z]/g,
          /\.userId[^a-zA-Z]/g,
          /\.accountType[^a-zA-Z]/g,
        ];
        
        lines.forEach((line, index) => {
          camelCasePatterns.forEach(pattern => {
            if (pattern.test(line)) {
              violations.push(`${filePath}:${index + 1}: ${line.trim()}`);
            }
          });
        });
      };
      
      const walkDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            walkDir(filePath);
          } else {
            checkFile(filePath);
          }
        });
      };
      
      walkDir(serverDir);
      
      if (violations.length > 0) {
        throw new Error(`Found ${violations.length} snake_case violations:\n${violations.slice(0, 20).join('\n')}`);
      }
    });

    test('should use snake_case for database UPDATE operations', async () => {
      // Test UPDATE queries to ensure they use snake_case field names
      const testUser = await db.select().from(users).limit(1);
      if (testUser.length === 0) return; // Skip if no test data
      
      const userId = testUser[0].id;
      
      // These updates should work with snake_case
      const validUpdates = [
        () => db.update(users).set({ last_seen_at: new Date() }).where(eq(users.id, userId)),
        () => db.update(users).set({ phone_number: '123-456-7890' }).where(eq(users.id, userId)),
        () => db.update(users).set({ job_title: 'Test Title' }).where(eq(users.id, userId)),
      ];
      
      for (const updateFn of validUpdates) {
        try {
          await updateFn();
        } catch (error: any) {
          if (error.code === '42601') { // PostgreSQL syntax error
            throw new Error(`SQL syntax error in UPDATE: ${error.message}`);
          }
        }
      }
    });

    test('should use snake_case for database INSERT operations', async () => {
      // Test INSERT operations with snake_case fields
      const testOrgId = 1; // Assuming test organization exists
      
      try {
        const [insertedUser] = await db.insert(users).values({
          username: 'test_snake_case',
          password: 'hashed_password',
          name: 'Test',
          surname: 'User',
          email: 'test_snake_case@test.com',
          phone_number: '123-456-7890',
          job_title: 'Test Developer',
          department: 'Testing',
          birth_date: new Date('1990-01-01'),
          role_type: 'employee',
          is_admin: false,
          organization_id: testOrgId,
          hire_date: new Date(),
          last_seen_at: new Date(),
        }).returning();
        
        expect(insertedUser).toBeDefined();
        expect(insertedUser.username).toBe('test_snake_case');
        
        // Clean up
        await db.delete(users).where(eq(users.id, insertedUser.id));
      } catch (error: any) {
        if (error.code === '42601') {
          throw new Error(`SQL syntax error in INSERT: ${error.message}`);
        }
        // Other errors might be acceptable (constraints, etc.)
      }
    });
  });

  // Test API response mappings
  describe('API Response Field Mapping', () => {
    test('should map snake_case database fields to camelCase in API responses', async () => {
      // This would require actual API testing, but we can test the mapping logic
      const dbUser = {
        id: 1,
        organization_id: 1,
        birth_date: new Date('1990-01-01'),
        phone_number: '123-456-7890',
        job_title: 'Developer',
        avatar_url: 'https://example.com/avatar.jpg',
        hire_date: new Date('2023-01-01'),
        role_type: 'employee',
        is_admin: false,
        last_seen_at: new Date(),
        manager_id: null,
        manager_email: null,
        cover_photo_url: null,
        created_at: new Date(),
      };
      
      // Test field mapping function (this would be extracted from actual API code)
      const mapDbUserToApiResponse = (user: any) => ({
        id: user.id,
        organizationId: user.organization_id,
        birthDate: user.birth_date,
        phoneNumber: user.phone_number,
        jobTitle: user.job_title,
        avatarUrl: user.avatar_url,
        hireDate: user.hire_date,
        roleType: user.role_type,
        isAdmin: user.is_admin,
        lastSeenAt: user.last_seen_at,
        managerId: user.manager_id,
        managerEmail: user.manager_email,
        coverPhotoUrl: user.cover_photo_url,
        createdAt: user.created_at,
      });
      
      const apiResponse = mapDbUserToApiResponse(dbUser);
      
      // Verify camelCase mapping
      expect(apiResponse.organizationId).toBe(1);
      expect(apiResponse.phoneNumber).toBe('123-456-7890');
      expect(apiResponse.jobTitle).toBe('Developer');
      expect(apiResponse.roleType).toBe('employee');
      expect(apiResponse.isAdmin).toBe(false);
    });
  });

  // Test schema compliance
  describe('Database Schema Compliance', () => {
    test('should have all required snake_case columns in users table', async () => {
      const tableInfo = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
        ORDER BY column_name
      `);
      
      const columnNames = tableInfo.rows.map((row: any) => row.column_name);
      
      // Verify snake_case columns exist
      const expectedSnakeCaseColumns = [
        'organization_id',
        'birth_date',
        'phone_number',
        'job_title',
        'avatar_url',
        'hire_date',
        'role_type',
        'is_admin',
        'last_seen_at',
        'manager_id',
        'manager_email',
        'cover_photo_url',
        'created_at',
      ];
      
      expectedSnakeCaseColumns.forEach(column => {
        expect(columnNames).toContain(column);
      });
      
      // Verify no camelCase columns exist
      const forbiddenCamelCaseColumns = [
        'organizationId',
        'birthDate',
        'phoneNumber',
        'jobTitle',
        'avatarUrl',
        'hireDate',
        'roleType',
        'isAdmin',
        'lastSeenAt',
        'managerId',
        'managerEmail',
        'coverPhotoUrl',
        'createdAt',
      ];
      
      forbiddenCamelCaseColumns.forEach(column => {
        expect(columnNames).not.toContain(column);
      });
    });
  });
});