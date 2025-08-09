import { randomUUID } from 'node:crypto';
import { validateEmployeeCreated } from '../validators/employee-created';
import { publish } from '../../services/event-bus';

// Temporary EventEnvelope interface until @platform/sdk is available
interface EventEnvelope<T = unknown> {
  id: string;
  type: string;
  version: number;
  source: string;
  timestamp: string;
  tenant_id: string;
  correlation_id?: string;
  causation_id?: string;
  idempotency_key?: string;
  payload: T;
}

type Input = {
  tenantId: string;
  employeeId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  correlationId?: string;
  source?: string;
};

export async function publishEmployeeCreated(input: Input): Promise<EventEnvelope> {
  const envelope: EventEnvelope = {
    id: randomUUID(),
    type: 'employee.created',
    version: 1,
    source: input.source ?? 'server',
    timestamp: new Date().toISOString(),
    tenant_id: input.tenantId,
    correlation_id: input.correlationId,
    payload: {
      employee_id: input.employeeId,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName
    }
  };

  // validate against JSON-Schema
  validateEmployeeCreated(envelope);

  // publish to a semantic topic (will be Kafka later)
  await publish('employee.created.v1', envelope);

  return envelope;
}