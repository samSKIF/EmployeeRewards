import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { AppError } from './errors';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv as any); // Temporary fix for AJV version mismatch

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

/** Compile and return a raw AJV validator */
export function compileSchema(schema: object) {
  return ajv.compile(schema);
}

/** Create a validator that throws AppError(400) if data is invalid */
export function createValidator(schema: object) {
  const validate = compileSchema(schema);
  return (data: unknown) => {
    if (!validate(data)) {
      throw new AppError('invalid_event', 'Event failed validation', {
        cause: validate.errors,
        status: 400
      });
    }
    return data;
  };
}