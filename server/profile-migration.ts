/**
 * This migration adds profile fields to the users table
 */
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { sql } from "drizzle-orm";
import ws from 'ws';

async function runProfileMigration() {
  console.log("Starting profile fields migration...");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  // Configure Neon to use the WebSocket polyfill
  neonConfig.webSocketConstructor = ws;
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // Add the new profile fields to the users table if they don't exist
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS location TEXT,
      ADD COLUMN IF NOT EXISTS responsibilities TEXT;
    `);

    console.log("Profile fields migration completed successfully.");
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
runProfileMigration()
  .then(() => {
    console.log("Profile fields migration script completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });