# Postgres tenant usage
```ts
import { Pool } from 'pg';
import { getClientWithTenant } from './tenant';

const pool = new Pool(/* ... */);

export async function getEmployees(tenantId: string) {
  const client = await getClientWithTenant(pool, tenantId);
  try {
    const { rows } = await client.query('SELECT * FROM employees ORDER BY created_at DESC');
    return rows;
  } finally {
    client.release();
  }
}
```