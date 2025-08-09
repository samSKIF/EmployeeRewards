/**
 * Helpers for tenant isolation with Postgres Row Level Security (RLS).
 * Use: const client = await getClientWithTenant(pool, req.tenantId!)
 */
import type { Pool, PoolClient } from 'pg';

export async function setTenantOnSession(client: PoolClient, tenantId: string) {
  await client.query('SELECT set_config($1, $2, false)', ['app.tenant_id', tenantId]);
}

export async function getClientWithTenant(pool: Pool, tenantId: string): Promise<PoolClient> {
  const client = await pool.connect();
  try {
    await setTenantOnSession(client, tenantId);
    return client;
  } catch (e) {
    client.release();
    throw e;
  }
}