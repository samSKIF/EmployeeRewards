import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Initialize database connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[recognition-rewards] DATABASE_URL not provided');
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[recognition-rewards] Database connection healthy');
    return true;
  } catch (error) {
    console.error('[recognition-rewards] Database health check failed:', error);
    return false;
  }
}