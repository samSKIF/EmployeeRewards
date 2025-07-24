/**
 * This migration adds missing columns to the leave_types and holidays tables
 */
import { pool } from './db';

async function runLeaveMigration() {
  console.log('Running leave management database migration...');

  try {
    // Check if allows_half_day column exists in leave_types table
    const leaveTypesCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='leave_types' AND column_name='allows_half_day'
    `);

    if (leaveTypesCheck.rows.length === 0) {
      console.log('Adding allows_half_day column to leave_types table');
      await pool.query(`
        ALTER TABLE leave_types 
        ADD COLUMN allows_half_day BOOLEAN DEFAULT TRUE
      `);
    }

    // Check if updated_at column exists in holidays table
    const holidaysCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='holidays' AND column_name='updated_at'
    `);

    if (holidaysCheck.rows.length === 0) {
      console.log('Adding updated_at column to holidays table');
      await pool.query(`
        ALTER TABLE holidays 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
    }

    console.log('Leave management tables migration completed successfully');
  } catch (error) {
    console.error('Error running leave management migration:', error);
  } finally {
    await pool.end();
  }
}

runLeaveMigration();
