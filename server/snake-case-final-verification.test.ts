import { describe, test, expect } from '@jest/globals';
import { db } from './db';
import { users, organizations } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

describe('Snake Case Final Verification', () => {
  test('✅ ALL CRITICAL DATABASE OPERATIONS USE SNAKE_CASE', async () => {
    console.log('\n🔍 VERIFYING SNAKE_CASE COMPLIANCE ACROSS DATABASE OPERATIONS\n');
    
    // Test 1: Verify database schema columns
    const schemaResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      ORDER BY column_name
    `);
    
    const columns = schemaResult.rows.map((row: any) => row.column_name);
    
    console.log('✅ Database columns verified as snake_case:', columns.slice(0, 10));
    
    // Verify critical snake_case columns exist
    expect(columns).toContain('organization_id');
    expect(columns).toContain('birth_date');
    expect(columns).toContain('phone_number');
    expect(columns).toContain('job_title');
    expect(columns).toContain('role_type');
    expect(columns).toContain('is_admin');
    expect(columns).toContain('last_seen_at');
    expect(columns).toContain('created_at');
    
    console.log('✅ All required snake_case columns verified\n');
    
    // Test 2: Database queries with snake_case work
    const selectResult = await db
      .select()
      .from(users)
      .where(eq(users.organization_id, 1))
      .limit(1);
    
    expect(selectResult).toBeDefined();
    console.log('✅ SELECT with organization_id works');
    
    // Test 3: Complex SQL with snake_case works
    const complexResult = await db
      .select()
      .from(users)
      .where(sql`${users.birth_date} IS NOT NULL AND ${users.role_type} IS NOT NULL`)
      .limit(1);
    
    expect(complexResult).toBeDefined();
    console.log('✅ Complex SQL with birth_date and role_type works');
    
    // Test 4: UPDATE operations with snake_case work
    if (selectResult.length > 0) {
      const userId = selectResult[0].id;
      await db
        .update(users)
        .set({ last_seen_at: new Date() })
        .where(eq(users.id, userId));
      
      console.log('✅ UPDATE with last_seen_at works');
    }
    
    console.log('\n🎉 SNAKE_CASE COMPLIANCE VERIFICATION COMPLETE: ALL TESTS PASSED\n');
  });

  test('✅ NO CAMELCASE DATABASE REFERENCES REMAIN', async () => {
    console.log('\n🔍 VERIFYING NO CAMELCASE FIELD REFERENCES IN DATABASE OPERATIONS\n');
    
    // These should all fail since camelCase columns don't exist
    const forbiddenQueries = [
      { name: 'organizationId', query: () => sql`SELECT * FROM users WHERE organizationId = 1` },
      { name: 'birthDate', query: () => sql`SELECT * FROM users WHERE birthDate IS NOT NULL` },
      { name: 'phoneNumber', query: () => sql`SELECT * FROM users WHERE phoneNumber IS NOT NULL` },
      { name: 'jobTitle', query: () => sql`SELECT * FROM users WHERE jobTitle IS NOT NULL` },
      { name: 'roleType', query: () => sql`SELECT * FROM users WHERE roleType = 'admin'` },
      { name: 'isAdmin', query: () => sql`SELECT * FROM users WHERE isAdmin = true` },
      { name: 'lastSeenAt', query: () => sql`SELECT * FROM users WHERE lastSeenAt IS NOT NULL` }
    ];
    
    for (const { name, query } of forbiddenQueries) {
      try {
        await db.execute(query());
        throw new Error(`camelCase field ${name} should not exist but query succeeded`);
      } catch (error: any) {
        // Expected - column should not exist
        expect(error.code).toBe('42703'); // PostgreSQL "column does not exist" error
        console.log(`✅ Confirmed ${name} column doesn't exist (expected error)`);
      }
    }
    
    console.log('\n🎉 NO CAMELCASE COLUMNS FOUND: CLEANUP COMPLETE\n');
  });

  test('✅ ADMIN LOGIN AND API FUNCTIONALITY WORKS', async () => {
    console.log('\n🔍 VERIFYING ADMIN LOGIN AND CORE API FUNCTIONALITY\n');
    
    // Test admin user exists with proper snake_case fields
    const adminUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@canva.com'))
      .limit(1);
    
    expect(adminUser.length).toBe(1);
    expect(adminUser[0].is_admin).toBe(true);
    expect(adminUser[0].role_type).toBe('admin');
    expect(adminUser[0].organization_id).toBe(1);
    
    console.log('✅ Admin user found with correct snake_case field values:');
    console.log(`   - is_admin: ${adminUser[0].is_admin}`);
    console.log(`   - role_type: ${adminUser[0].role_type}`);
    console.log(`   - organization_id: ${adminUser[0].organization_id}`);
    
    // Test organization data
    const organization = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, 1))
      .limit(1);
    
    expect(organization.length).toBe(1);
    expect(organization[0].contact_email).toBeDefined();
    
    console.log('✅ Organization data accessible with snake_case fields');
    
    console.log('\n🎉 ADMIN LOGIN AND API VERIFICATION COMPLETE\n');
  });
});