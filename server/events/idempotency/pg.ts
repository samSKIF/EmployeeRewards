import type { Pool } from 'pg';
import { AppError, logger } from '@platform/sdk';

export async function consumeOnce(pool: Pool, consumer: string, key: string, tenantId?: string) {
  if (!key) throw new AppError('missing_idempotency_key', 'Missing idempotency key', { status: 400 });
  // Create table if not exists (best-effort, idempotent)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_consumptions (
      consumer TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      tenant_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (consumer, idempotency_key)
    );
  `);
  try {
    await pool.query(
      'INSERT INTO event_consumptions (consumer, idempotency_key, tenant_id) VALUES ($1, $2, $3)',
      [consumer, key, tenantId ?? null]
    );
  } catch (e: any) {
    // Unique violation => already processed
    const msg = String(e?.message || e);
    if (msg.includes('duplicate key') || msg.includes('unique')) {
      logger.info({ msg: 'event_skip_duplicate', consumer, key });
      throw new AppError('duplicate_event', 'Duplicate event (already processed)', { status: 409 });
    }
    throw e;
  }
}