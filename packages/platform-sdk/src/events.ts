import Ajv from 'ajv';
export interface EventEnvelope<T = unknown> {
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
const ajv = new Ajv({ allErrors: true });
export function compileSchema(schema: object) { return ajv.compile(schema); }