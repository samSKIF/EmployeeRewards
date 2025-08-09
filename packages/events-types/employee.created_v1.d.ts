export interface EmployeeCreatedV1 {
id: string
type: "employee.created"
version: 1
source?: string
timestamp: string
tenant_id: string
correlation_id?: string
causation_id?: string
idempotency_key?: string
payload: {
employee_id: string
email: string
first_name?: string
last_name?: string
[k: string]: unknown
}
}
