// Employee Domain - Business Logic Layer
// Handles employee lifecycle, validation, and business rules

import { z } from 'zod';
import type { User, InsertUser } from '@shared/schema';
import { 
  createEmployeeCreatedEvent,
  createEmployeeUpdatedEvent,
  createEmployeeDeactivatedEvent,
  createEmployeeRoleChangedEvent,
  createEmployeeDepartmentChangedEvent,
  type EmployeeCreatedEvent,
  type EmployeeUpdatedEvent
} from '@shared/events';
import { publish } from '@shared/events';
import { logger } from '@platform/sdk';

// Employee filters and search options
export const employeeFiltersSchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['name', 'email', 'job_title', 'department', 'hire_date']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type EmployeeFilters = z.infer<typeof employeeFiltersSchema>;

// Employee creation with validation
export const createEmployeeSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  surname: z.string().max(100).optional(),
  job_title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  role_type: z.enum(['employee', 'manager', 'admin', 'corporate_admin']).default('employee'),
  hire_date: z.date().optional(),
  avatar_url: z.string().url().optional(),
  password: z.string().min(8),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().omit({ password: true });

export type CreateEmployeeData = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeData = z.infer<typeof updateEmployeeSchema>;

// Employee business rules and validation
export class EmployeeDomain {
  /**
   * Validate employee creation data and business rules
   */
  static async validateEmployeeCreation(
    data: CreateEmployeeData,
    organizationId: number,
    checkDuplicate: (email: string, name?: string, surname?: string) => Promise<{emailExists: boolean; nameExists: boolean}>
  ): Promise<void> {
    // Validate schema
    createEmployeeSchema.parse(data);

    // Check for duplicate email and name
    const duplicates = await checkDuplicate(data.email, data.name, data.surname);
    
    if (duplicates.emailExists) {
      throw new Error('Employee with this email already exists');
    }
    
    if (duplicates.nameExists && data.surname) {
      throw new Error('Employee with this name already exists');
    }

    // Business rule: Only corporate_admin can create other corporate_admin users
    if (data.role_type === 'corporate_admin') {
      throw new Error('Cannot create corporate admin users through employee creation');
    }

    // Business rule: Hire date cannot be in the future
    if (data.hire_date && data.hire_date > new Date()) {
      throw new Error('Hire date cannot be in the future');
    }
  }

  /**
   * Create employee and publish domain event
   */
  static async createEmployee(
    data: CreateEmployeeData,
    organizationId: number,
    createdBy: number,
    persistEmployee: (insertData: InsertUser) => Promise<User>
  ): Promise<User> {
    try {
      // Validate business rules
      await this.validateEmployeeCreation(
        data, 
        organizationId,
        async (email, name, surname) => ({ emailExists: false, nameExists: false }) // This would be injected
      );

      // Prepare data for persistence
      const insertData: InsertUser = {
        ...data,
        // Convert Date to string for database
        hire_date: data.hire_date ? data.hire_date.toISOString().split('T')[0] : null,
        organization_id: organizationId,
        status: 'active',
      };

      // Persist employee
      const newEmployee = await persistEmployee(insertData);

      // Publish domain event
      const eventData = {
        employee: {
          id: newEmployee.id,
          username: newEmployee.username,
          email: newEmployee.email,
          name: newEmployee.name,
          surname: newEmployee.surname || undefined,
          job_title: newEmployee.job_title || undefined,
          department: newEmployee.department || undefined,
          location: newEmployee.location || undefined,
          role_type: newEmployee.role_type as any,
          organization_id: newEmployee.organization_id || organizationId,
          hire_date: newEmployee.hire_date ? new Date(newEmployee.hire_date) : undefined,
          avatar_url: newEmployee.avatar_url || undefined,
        },
        createdBy,
        welcomeEmailSent: false,
      };

      await publish(createEmployeeCreatedEvent(eventData));

      logger.info('✅ Employee created successfully', {
        employeeId: newEmployee.id,
        organizationId,
        createdBy,
      });

      return newEmployee;
    } catch (error: any) {
      logger.error('❌ Employee creation failed', {
        error: error?.message || 'unknown_error',
        organizationId,
        createdBy,
      });
      throw error;
    }
  }

  /**
   * Update employee and publish domain event
   */
  static async updateEmployee(
    employeeId: number,
    data: UpdateEmployeeData,
    updatedBy: number,
    getCurrentEmployee: (id: number) => Promise<User | undefined>,
    persistEmployeeUpdate: (id: number, data: Partial<User>) => Promise<User>
  ): Promise<User> {
    try {
      // Get current employee data
      const currentEmployee = await getCurrentEmployee(employeeId);
      if (!currentEmployee) {
        throw new Error('Employee not found');
      }

      // Validate update data
      updateEmployeeSchema.parse(data);

      // Business rule: Cannot change role_type to corporate_admin
      if (data.role_type === 'corporate_admin') {
        throw new Error('Cannot promote employee to corporate admin');
      }

      // Track what fields are being updated
      const updatedFields = Object.keys(data).filter(key => 
        data[key as keyof UpdateEmployeeData] !== currentEmployee[key as keyof User]
      );

      if (updatedFields.length === 0) {
        logger.info('No changes detected for employee update', { employeeId });
        return currentEmployee;
      }

      // Prepare update data with proper date formatting
      const updateData = {
        ...data,
        hire_date: data.hire_date ? data.hire_date.toISOString().split('T')[0] : undefined,
      };

      // Persist update
      const updatedEmployee = await persistEmployeeUpdate(employeeId, updateData);

      // Publish domain event
      const eventData = {
        employee: {
          id: updatedEmployee.id,
          username: updatedEmployee.username,
          email: updatedEmployee.email,
          name: updatedEmployee.name,
          surname: updatedEmployee.surname || undefined,
          job_title: updatedEmployee.job_title || undefined,
          department: updatedEmployee.department || undefined,
          location: updatedEmployee.location || undefined,
          role_type: updatedEmployee.role_type as any,
          organization_id: updatedEmployee.organization_id || currentEmployee.organization_id,
          hire_date: updatedEmployee.hire_date ? new Date(updatedEmployee.hire_date) : undefined,
          avatar_url: updatedEmployee.avatar_url || undefined,
        },
        previousData: {
          id: currentEmployee.id,
          username: currentEmployee.username,
          email: currentEmployee.email,
          name: currentEmployee.name,
          surname: currentEmployee.surname || undefined,
          job_title: currentEmployee.job_title || undefined,
          department: currentEmployee.department || undefined,
          location: currentEmployee.location || undefined,
          role_type: currentEmployee.role_type as any,
          organization_id: currentEmployee.organization_id || 0,
          hire_date: currentEmployee.hire_date ? new Date(currentEmployee.hire_date) : undefined,
          avatar_url: currentEmployee.avatar_url || undefined,
        },
        updatedBy,
        updatedFields,
      };

      await publish(createEmployeeUpdatedEvent(eventData));

      logger.info('✅ Employee updated successfully', {
        employeeId,
        updatedFields,
        updatedBy,
      });

      return updatedEmployee;
    } catch (error: any) {
      logger.error('❌ Employee update failed', {
        error: error?.message || 'unknown_error',
        employeeId,
        updatedBy,
      });
      throw error;
    }
  }

  /**
   * Deactivate employee (soft delete) and publish domain event
   */
  static async deactivateEmployee(
    employeeId: number,
    reason: string,
    deactivatedBy: number,
    getCurrentEmployee: (id: number) => Promise<User | undefined>,
    checkUserDependencies: (id: number) => Promise<{hasActivePosts: boolean; hasActiveLeave: boolean; hasOpenRecognitions: boolean}>,
    persistEmployeeDeactivation: (id: number) => Promise<User>
  ): Promise<User> {
    try {
      // Get current employee data
      const currentEmployee = await getCurrentEmployee(employeeId);
      if (!currentEmployee) {
        throw new Error('Employee not found');
      }

      if (currentEmployee.status === 'inactive') {
        throw new Error('Employee is already inactive');
      }

      // Check for dependencies that would prevent deactivation
      const dependencies = await checkUserDependencies(employeeId);
      const offboardingTasks = [];

      if (dependencies.hasActivePosts) {
        offboardingTasks.push({
          task: 'Archive or transfer active social posts',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });
      }

      if (dependencies.hasActiveLeave) {
        offboardingTasks.push({
          task: 'Complete or transfer pending leave requests',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        });
      }

      if (dependencies.hasOpenRecognitions) {
        offboardingTasks.push({
          task: 'Process pending recognitions given or received',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
        });
      }

      // Persist deactivation
      const deactivatedEmployee = await persistEmployeeDeactivation(employeeId);

      // Publish domain event
      const eventData = {
        employeeId,
        employee: {
          id: currentEmployee.id,
          username: currentEmployee.username,
          email: currentEmployee.email,
          name: currentEmployee.name,
          surname: currentEmployee.surname || undefined,
          job_title: currentEmployee.job_title || undefined,
          department: currentEmployee.department || undefined,
          location: currentEmployee.location || undefined,
          role_type: currentEmployee.role_type as any,
          organization_id: currentEmployee.organization_id || 0,
          hire_date: currentEmployee.hire_date ? new Date(currentEmployee.hire_date) : undefined,
          avatar_url: currentEmployee.avatar_url || undefined,
        },
        deactivatedBy,
        reason,
        effectiveDate: new Date(),
        offboardingTasks,
      };

      await publish(createEmployeeDeactivatedEvent(eventData));

      logger.info('✅ Employee deactivated successfully', {
        employeeId,
        reason,
        deactivatedBy,
        offboardingTasks: offboardingTasks.length,
      });

      return deactivatedEmployee;
    } catch (error: any) {
      logger.error('❌ Employee deactivation failed', {
        error: error?.message || 'unknown_error',
        employeeId,
        deactivatedBy,
      });
      throw error;
    }
  }

  /**
   * Validate employee filters for search operations
   */
  static validateEmployeeFilters(filters: any): EmployeeFilters {
    return employeeFiltersSchema.parse(filters);
  }

  /**
   * Business rule validation for bulk operations
   */
  static validateBulkOperation(employeeIds: number[], operationType: string): void {
    if (employeeIds.length === 0) {
      throw new Error('No employees selected for bulk operation');
    }

    if (employeeIds.length > 100) {
      throw new Error('Bulk operation limited to 100 employees at a time');
    }

    const validOperations = ['deactivate', 'update_department', 'update_role', 'export'];
    if (!validOperations.includes(operationType)) {
      throw new Error(`Invalid bulk operation: ${operationType}`);
    }
  }
}