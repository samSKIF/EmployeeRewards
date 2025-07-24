/**
 * This migration adds missing columns to the leave_types and holidays tables
 * directly using PostgreSQL client
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure Neon to use WebSocket
neonConfig.webSocketConstructor = ws;

async function runLeaveMigration() {
  console.log('Running leave management database migration...');

  // Create a direct connection to the database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
    } else {
      console.log('allows_half_day column already exists in leave_types table');
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
    } else {
      console.log('updated_at column already exists in holidays table');
    }

    console.log('Leave management tables migration completed successfully');
  } catch (error) {
    console.error('Error running leave management migration:', error);
  } finally {
    await pool.end();
  }
}

runLeaveMigration();
