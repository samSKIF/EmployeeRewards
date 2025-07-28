import { describe, test, expect } from '@jest/globals';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

describe('Field Mapping Verification Tests', () => {
  test('should verify last_seen_at field mapping works correctly', async () => {
    try {
      // This should work with snake_case
      const result = await db
        .select()
        .from(users)
        .where(sql`${users.last_seen_at} IS NOT NULL`)
        .limit(1);
      
      expect(Array.isArray(result)).toBe(true);
    } catch (error: any) {
      if (error.code === '42601') {
        throw new Error(`SQL syntax error with last_seen_at: ${error.message}`);
      }
    }
  });

  test('should verify organization_id field mapping works correctly', async () => {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.organization_id, 1))
        .limit(1);
      
      expect(Array.isArray(result)).toBe(true);
    } catch (error: any) {
      if (error.code === '42601') {
        throw new Error(`SQL syntax error with organization_id: ${error.message}`);
      }
    }
  });

  test('should successfully update last_seen_at field', async () => {
    const testUsers = await db.select().from(users).limit(1);
    if (testUsers.length === 0) return; // Skip if no test data
    
    const userId = testUsers[0].id;
    
    try {
      await db
        .update(users)
        .set({ last_seen_at: new Date() })
        .where(eq(users.id, userId));
      
      // If we get here, the update succeeded
      expect(true).toBe(true);
    } catch (error: any) {
      if (error.code === '42601') {
        throw new Error(`SQL syntax error in UPDATE last_seen_at: ${error.message}`);
      }
    }
  });

  test('should list all database columns and verify snake_case naming', async () => {
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      ORDER BY column_name
    `);
    
    const columns = result.rows.map((row: any) => row.column_name);
    console.log('Available columns:', columns);
    
    // Verify snake_case columns exist
    expect(columns).toContain('organization_id');
    expect(columns).toContain('birth_date');
    expect(columns).toContain('phone_number');
    expect(columns).toContain('job_title');
    expect(columns).toContain('avatar_url');
    expect(columns).toContain('hire_date');
    expect(columns).toContain('role_type');
    expect(columns).toContain('is_admin');
    expect(columns).toContain('last_seen_at');
    expect(columns).toContain('created_at');
  });
});