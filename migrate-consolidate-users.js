/**
 * Migration script to consolidate employees table into users table
 * This fixes the dual table architecture issue
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, organizations } from './shared/schema.js';
import { eq, sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function consolidateUserTables() {
  console.log('Starting user table consolidation...');
  
  try {
    // 1. First, migrate all employee data to users table
    console.log('Migrating employee data to users table...');
    
    const migrateQuery = sql`
      INSERT INTO users (
        name, surname, email, username, password, birth_date, hire_date,
        job_title, department, status, phone_number, avatar_url, 
        firebase_uid, organization_id, last_seen_at, created_at, created_by
      )
      SELECT 
        e.name,
        e.surname,
        e.email,
        LOWER(REPLACE(e.email, '@', '_')) as username, -- Generate username from email
        e.password,
        e.date_of_birth,
        e.date_joined,
        e.job_title,
        e.department,
        e.status,
        e.phone_number,
        e.photo_url,
        e.firebase_uid,
        e.company_id,
        e.last_seen_at,
        e.created_at,
        e.created_by_id
      FROM employees e
      WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.email = e.email
      );
    `;
    
    await db.execute(migrateQuery);
    console.log('Employee data migrated successfully');
    
    // 2. Update branding_settings to reference organizations correctly
    console.log('Updating branding settings references...');
    
    await db.execute(sql`
      UPDATE branding_settings 
      SET organization_id = (
        SELECT id FROM organizations 
        WHERE organizations.id = branding_settings.organization_id
        LIMIT 1
      )
      WHERE organization_id IS NOT NULL;
    `);
    
    // 3. Drop the employees table
    console.log('Dropping employees table...');
    await db.execute(sql`DROP TABLE IF EXISTS employees CASCADE;`);
    
    console.log('Consolidation completed successfully!');
    
    // 4. Show summary
    const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM users;`);
    console.log(`Total users in consolidated table: ${userCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the migration
consolidateUserTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });