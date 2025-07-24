import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * This migration adds the cover_photo_url column to the users table
 */
async function runCoverPhotoMigration() {
  console.log('Starting migration to add cover_photo_url column...');

  try {
    // Check if column exists
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'cover_photo_url'
    `);

    if (result.length > 0) {
      console.log('cover_photo_url column already exists, skipping migration.');
      return;
    }

    // Add the cover_photo_url column
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN cover_photo_url TEXT
    `);

    console.log('Successfully added cover_photo_url column to users table');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Run the migration
runCoverPhotoMigration()
  .then(() => {
    console.log('Cover photo migration completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
