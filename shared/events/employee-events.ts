// Employee Management Domain Events
// Defines all events related to employee lifecycle and management

import { z } from 'zod';
import { TypedEvent } from './event-system';

// Employee data schema for events
const employeeDataSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  name: z.string(),
  surname: z.string().optional(),
  job_title: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  role_type: z.enum(['employee', 'manager', 'admin', 'corporate_admin']),
  organization_id: z.number(),
  hire_date: z.date().optional(),
  avatar_url: z.string().url().optional(),
});

// Event schemas
export const employeeCreatedSchema = z.object({
  employee: employeeDataSchema,
  createdBy: z.number(),
  welcomeEmailSent: z.boolean().default(false),
});

export const employeeUpdatedSchema = z.object({
  employee: employeeDataSchema,
  previousData: employeeDataSchema.partial(),
  updatedBy: z.number(),
  updatedFields: z.array(z.string()),
});

export const employeeDeactivatedSchema = z.object({
  employeeId: z.number(),
  employee: employeeDataSchema,
  deactivatedBy: z.number(),
  reason: z.string(),
  effectiveDate: z.date(),
  offboardingTasks: z.array(z.object({
    task: z.string(),
    assignedTo: z.number().optional(),
    dueDate: z.date().optional(),
  })).default([]),
});

export const employeeRoleChangedSchema = z.object({
  employeeId: z.number(),
  previousRole: z.string(),
  newRole: z.string(),
  changedBy: z.number(),
  effectiveDate: z.date(),
  permissions: z.object({
    added: z.array(z.string()),
    removed: z.array(z.string()),
  }),
});

export const employeeDepartmentChangedSchema = z.object({
  employeeId: z.number(),
  employee: employeeDataSchema,
  previousDepartment: z.string().optional(),
  newDepartment: z.string(),
  changedBy: z.number(),
  effectiveDate: z.date(),
  managerChanged: z.boolean(),
  newManagerId: z.number().optional(),
});

// Event types
export type EmployeeCreatedEvent = TypedEvent<z.infer<typeof employeeCreatedSchema>>;
export type EmployeeUpdatedEvent = TypedEvent<z.infer<typeof employeeUpdatedSchema>>;
export type EmployeeDeactivatedEvent = TypedEvent<z.infer<typeof employeeDeactivatedSchema>>;
export type EmployeeRoleChangedEvent = TypedEvent<z.infer<typeof employeeRoleChangedSchema>>;
export type EmployeeDepartmentChangedEvent = TypedEvent<z.infer<typeof employeeDepartmentChangedSchema>>;

// Event type constants
export const EMPLOYEE_EVENTS = {
  CREATED: 'employee.created',
  UPDATED: 'employee.updated',
  DEACTIVATED: 'employee.deactivated',
  ROLE_CHANGED: 'employee.role_changed',
  DEPARTMENT_CHANGED: 'employee.department_changed',
} as const;

// Event factory functions
export const createEmployeeCreatedEvent = (
  data: z.infer<typeof employeeCreatedSchema>,
  metadata?: Record<string, any>
): Omit<EmployeeCreatedEvent, 'id' | 'timestamp'> => ({
  type: EMPLOYEE_EVENTS.CREATED,
  source: 'employee-management',
  version: '1.0',
  userId: data.createdBy,
  organizationId: data.employee.organization_id,
  data,
  metadata,
});

export const createEmployeeUpdatedEvent = (
  data: z.infer<typeof employeeUpdatedSchema>,
  correlationId?: string,
  metadata?: Record<string, any>
): Omit<EmployeeUpdatedEvent, 'id' | 'timestamp'> => ({
  type: EMPLOYEE_EVENTS.UPDATED,
  source: 'employee-management',
  version: '1.0',
  correlationId,
  userId: data.updatedBy,
  organizationId: data.employee.organization_id,
  data,
  metadata,
});

export const createEmployeeDeactivatedEvent = (
  data: z.infer<typeof employeeDeactivatedSchema>,
  correlationId?: string,
  metadata?: Record<string, any>
): Omit<EmployeeDeactivatedEvent, 'id' | 'timestamp'> => ({
  type: EMPLOYEE_EVENTS.DEACTIVATED,
  source: 'employee-management',
  version: '1.0',
  correlationId,
  userId: data.deactivatedBy,
  organizationId: data.employee.organization_id,
  data,
  metadata,
});

export const createEmployeeRoleChangedEvent = (
  data: z.infer<typeof employeeRoleChangedSchema>,
  correlationId?: string,
  metadata?: Record<string, any>
): Omit<EmployeeRoleChangedEvent, 'id' | 'timestamp'> => ({
  type: EMPLOYEE_EVENTS.ROLE_CHANGED,
  source: 'employee-management',
  version: '1.0',
  correlationId,
  userId: data.changedBy,
  organizationId: metadata?.organizationId,
  data,
  metadata,
});

export const createEmployeeDepartmentChangedEvent = (
  data: z.infer<typeof employeeDepartmentChangedSchema>,
  correlationId?: string,
  metadata?: Record<string, any>
): Omit<EmployeeDepartmentChangedEvent, 'id' | 'timestamp'> => ({
  type: EMPLOYEE_EVENTS.DEPARTMENT_CHANGED,
  source: 'employee-management',
  version: '1.0',
  correlationId,
  userId: data.changedBy,
  organizationId: data.employee.organization_id,
  data,
  metadata,
});