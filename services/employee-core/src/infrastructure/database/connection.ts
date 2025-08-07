// Database connection for Employee Core Service
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Use the existing DATABASE_URL for now
// Will migrate to separate database (employee_core_db) later for full microservice isolation
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

// Create connection pool
export const pool = new Pool({ connectionString: DATABASE_URL });

// Create Drizzle instance with schema
export const db = drizzle({ 
  client: pool, 
  schema,
  logger: process.env.NODE_ENV === 'development',
});

// Export schema for use in other files
export * from './schema';

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1');
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Employee Core] Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await pool.end();
    console.log('[Employee Core] Database connection closed');
  } catch (error) {
    console.error('[Employee Core] Error closing database connection:', error);
  }
}