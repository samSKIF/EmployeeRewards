import { TOPICS } from '../services/bus/topics';
import { registerConsumer } from '../services/bus';
import { logger } from '@platform/sdk';

export async function startEmployeeCreatedAuditConsumer() {
  await registerConsumer(TOPICS.EMPLOYEE_CREATED_V1, async (evt) => {
    // In real life, persist to audit table with idempotency. For now, log.
    logger.info({ msg: 'audit.employee_created', evt });
  });
}