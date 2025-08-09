// Temporary implementation until @platform/sdk is built
const schema = {
  type: "object",
  required: ["id", "type", "version", "source", "timestamp", "tenant_id", "payload"],
  properties: {
    id: { type: "string" },
    type: { const: "employee.created" },
    version: { const: 1 },
    source: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
    tenant_id: { type: "string" },
    correlation_id: { type: "string" },
    payload: {
      type: "object",
      required: ["employee_id", "email"],
      properties: {
        employee_id: { type: "string" },
        email: { type: "string", format: "email" },
        first_name: { type: "string" },
        last_name: { type: "string" }
      }
    }
  }
};

// Simple validation function until SDK is available
export function validateEmployeeCreated(data: unknown) {
  // Basic validation - replace with proper JSON schema validation later
  const envelope = data as any;
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('Invalid event envelope');
  }
  if (!envelope.id || !envelope.type || !envelope.tenant_id || !envelope.payload) {
    throw new Error('Missing required event envelope fields');
  }
  if (envelope.type !== 'employee.created') {
    throw new Error('Invalid event type');
  }
  return data;
}