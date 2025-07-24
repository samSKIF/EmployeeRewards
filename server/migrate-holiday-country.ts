/**
 * This migration adds the country column to the holidays table
 */
import { db } from './db';
import { sql } from 'drizzle-orm';

async function runHolidayCountryMigration() {
  try {
    console.log('Starting holiday country migration...');

    // Check if column exists first to avoid errors on repeat runs
    const columnCheckResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'holidays' AND column_name = 'country'
    `);

    if (columnCheckResult.rows.length === 0) {
      // Add country column
      await db.execute(sql`
        ALTER TABLE holidays 
        ADD COLUMN country TEXT NOT NULL DEFAULT 'Global'
      `);
      console.log('Added country column to holidays table');
    } else {
      console.log('Country column already exists in holidays table');
    }

    // Check if column exists first to avoid errors on repeat runs
    const isRecurringCheckResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'holidays' AND column_name = 'is_recurring_yearly'
    `);

    if (isRecurringCheckResult.rows.length === 0) {
      // If the column doesn't exist, add it with default value to false
      await db.execute(sql`
        ALTER TABLE holidays 
        ADD COLUMN is_recurring_yearly BOOLEAN NOT NULL DEFAULT false
      `);
      console.log('Added is_recurring_yearly column to holidays table');
    } else {
      console.log(
        'is_recurring_yearly column already exists in holidays table'
      );
    }

    console.log('Holiday country migration completed successfully!');
  } catch (error) {
    console.error('Error during holiday country migration:', error);
    throw error;
  }
}

// Run the migration immediately
runHolidayCountryMigration()
  .then(() => {
    console.log('Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
