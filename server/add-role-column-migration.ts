import { pool } from './db';

/**
 * This script adds the missing role column to the interest_channel_members table
 */
async function addRoleColumnMigration() {
  console.log('Adding role column to interest_channel_members table...');

  try {
    // Check if role column exists in interest_channel_members table
    const checkRoleColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'interest_channel_members' AND column_name = 'role'
    `);

    // If role column doesn't exist, add it
    if (checkRoleColumn.rows.length === 0) {
      console.log('Adding role column to interest_channel_members table...');
      await pool.query(`
        ALTER TABLE interest_channel_members 
        ADD COLUMN role text DEFAULT 'member' NOT NULL
      `);
      console.log('Added role column to interest_channel_members table');
    } else {
      console.log(
        'role column already exists in interest_channel_members table'
      );
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await pool.end();
  }
}

addRoleColumnMigration();
