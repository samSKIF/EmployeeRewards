import { randomUUID } from 'crypto';
import { publish } from '../../services/bus';
import { TOPICS } from '../../services/bus/topics';

interface EmployeeCreatedInput {
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  source?: string;
  correlationId?: string;
}

interface EventEnvelope {
  id: string;
  type: string;
  version: number;
  source: string;
  timestamp: string;
  tenant_id: string;
  correlation_id?: string;
  payload: any;
  idempotency_key?: string;
}

export async function publishEmployeeCreated(input: EmployeeCreatedInput) {
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

  // default idempotency_key
  (envelope as any).idempotency_key = (envelope as any).id;

  await publish(TOPICS.EMPLOYEE_CREATED_V1, envelope);
}