import { TOPICS } from '../services/bus/topics';
import { registerConsumer } from '../services/bus';
import { logger } from '@platform/sdk';
import { consumeOnce } from '../events/idempotency/pg';

let pgPool: any;
try { pgPool = (await import('../db/postgres/pool')).pool; } catch {}
try { if (!pgPool) pgPool = (await import('../db/postgres/index')).pool; } catch {}

export async function startEmployeeCreatedAuditConsumer() {
  await registerConsumer(TOPICS.EMPLOYEE_CREATED_V1, async (evt) => {
    const key = evt?.idempotency_key || evt?.id;
    const tenant = evt?.tenant_id;
    if (pgPool?.query) {
      try { await consumeOnce(pgPool, 'employee-created-audit', key, tenant); }
      catch (e: any) {
        if (String(e?.message || e).includes('Duplicate event')) {
          // already processed; skip
          return;
        }
        throw e; // let Kafka adapter retry / DLQ
      }
    }
    logger.info({ msg: 'audit.employee_created', evt });
  });
}