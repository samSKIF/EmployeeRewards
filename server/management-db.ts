import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as managementSchema from '@shared/management-schema';

neonConfig.webSocketConstructor = ws;

// Use a separate database URL for the management system
// This would be a different database than the client databases
const MANAGEMENT_DB_URL =
  process.env.MANAGEMENT_DATABASE_URL || process.env.DATABASE_URL;

if (!MANAGEMENT_DB_URL) {
  throw new Error(
    'MANAGEMENT_DATABASE_URL must be set for the management backend'
  );
}

export const managementPool = new Pool({ connectionString: MANAGEMENT_DB_URL });
export const managementDb = drizzle({
  client: managementPool,
  schema: managementSchema,
});
