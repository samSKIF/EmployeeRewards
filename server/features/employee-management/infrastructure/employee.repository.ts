// Employee Repository - Data Access Layer
// Handles all database operations for employee management

import { db } from '../../../db';
import { users, accounts, type User, type InsertUser } from '@shared/schema';
import { eq, and, or, count, like, desc, asc, sql, ilike } from 'drizzle-orm';
import { hash, compare } from 'bcrypt';
import type { EmployeeFilters } from '../domain/employee.domain';
import { logger } from '@platform/sdk';

export interface EmployeeDependencies {
  hasActivePosts: boolean;
  hasActiveLeave: boolean;
  hasOpenRecognitions: boolean;
}

export class EmployeeRepository {
  /**
   * Get employee by ID
   */
  async getEmployeeById(id: number): Promise<User | undefined> {
    try {
      const [employee] = await db.select().from(users).where(eq(users.id, id));
      return employee;
    } catch (error: any) {
      logger.error('Error getting employee by ID:', { error: error?.message || 'unknown_error', employeeId: id });
      return undefined;
    }
  }

  /**
   * Get employee by email within organization
   */
  async getEmployeeByEmail(email: string, organizationId: number): Promise<User | undefined> {
    try {
      const [employee] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.organization_id, organizationId)));
      return employee;
    } catch (error: any) {
      logger.error('Error getting employee by email:', { 
        error: error?.message || 'unknown_error', 
        email, 
        organizationId 
      });
      return undefined;
    }
  }

  /**
   * Check for duplicate employees by email and name
   */
  async checkDuplicateEmployee(
    email: string,
    organizationId: number,
    name?: string,
    surname?: string
  ): Promise<{ emailExists: boolean; nameExists: boolean }> {
    try {
      // Check for email duplicates within organization
      const [emailEmployee] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.organization_id, organizationId)));

      let nameEmployee = null;
      if (name && surname) {
        [nameEmployee] = await db
          .select()
          .from(users)
          .where(and(
            eq(users.name, name),
            eq(users.surname, surname),
            eq(users.organization_id, organizationId)
          ));
      }

      return {
        emailExists: !!emailEmployee,
        nameExists: !!nameEmployee,
      };
    } catch (error: any) {
      logger.error('Error checking duplicate employee:', { 
        error: error?.message || 'unknown_error', 
        email, 
        organizationId 
      });
      return { emailExists: false, nameExists: false };
    }
  }

  /**
   * Create new employee with account
   */
  async createEmployee(employeeData: InsertUser): Promise<User> {
    try {
      // Hash password before storing
      const hashedPassword = await hash(employeeData.password, 10);
      
      const [newEmployee] = await db
        .insert(users)
        .values({
          ...employeeData,
          password: hashedPassword,
        })
        .returning();

      // Create default account for the employee
      await db.insert(accounts).values({
        user_id: newEmployee.id,
        account_type: 'user',
        balance: 0,
      });

      logger.info('✅ Employee created in database', { employeeId: newEmployee.id });
      return newEmployee;
    } catch (error: any) {
      logger.error('❌ Error creating employee:', { 
        error: error?.message || 'unknown_error',
        organizationId: employeeData.organization_id 
      });
      throw error;
    }
  }

  /**
   * Update employee data
   */
  async updateEmployee(employeeId: number, updateData: Partial<User>): Promise<User> {
    try {
      const [updatedEmployee] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, employeeId))
        .returning();

      if (!updatedEmployee) {
        throw new Error('Employee not found or could not be updated');
      }

      logger.info('✅ Employee updated in database', { employeeId });
      return updatedEmployee;
    } catch (error: any) {
      logger.error('❌ Error updating employee:', { 
        error: error?.message || 'unknown_error', 
        employeeId 
      });
      throw error;
    }
  }

  /**
   * Soft delete employee (set status to inactive)
   */
  async deactivateEmployee(employeeId: number): Promise<User> {
    try {
      const [deactivatedEmployee] = await db
        .update(users)
        .set({
          status: 'inactive',
        })
        .where(eq(users.id, employeeId))
        .returning();

      if (!deactivatedEmployee) {
        throw new Error('Employee not found or could not be deactivated');
      }

      logger.info('✅ Employee deactivated in database', { employeeId });
      return deactivatedEmployee;
    } catch (error: any) {
      logger.error('❌ Error deactivating employee:', { 
        error: error?.message || 'unknown_error', 
        employeeId 
      });
      throw error;
    }
  }

  /**
   * Get employees with filters and pagination
   */
  async getEmployeesWithFilters(
    organizationId: number,
    filters: EmployeeFilters
  ): Promise<User[]> {
    try {
      // Build where conditions
      const conditions = [eq(users.organization_id, organizationId)];

      // Apply status filter
      if (filters.status) {
        conditions.push(eq(users.status, filters.status));
      }

      // Apply search filter (name, email, job_title)
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          or(
            ilike(users.name, searchTerm),
            ilike(users.email, searchTerm),
            ilike(users.job_title, searchTerm)
          )!
        );
      }

      // Apply department filter
      if (filters.department) {
        conditions.push(eq(users.department, filters.department));
      }

      // Build the main query with proper where conditions
      const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];
      
      let baseQuery = db
        .select()
        .from(users)
        .where(whereCondition);

      // Apply sorting by column name string matching
      if (filters.sortBy && filters.sortBy in users) {
        const sortColumn = users[filters.sortBy as keyof typeof users];
        if (filters.sortOrder === 'desc') {
          baseQuery = baseQuery.orderBy(desc(sortColumn));
        } else {
          baseQuery = baseQuery.orderBy(asc(sortColumn));
        }
      }

      // Apply pagination and execute
      const employees = await baseQuery
        .limit(filters.limit)
        .offset(filters.offset);

      logger.debug('✅ Employees retrieved with filters', {
        organizationId,
        count: employees.length,
        filters
      });

      return employees;
    } catch (error: any) {
      logger.error('❌ Error getting employees with filters:', { 
        error: error?.message || 'unknown_error',
        organizationId,
        filters
      });
      throw error;
    }
  }

  /**
   * Get total count of employees for pagination
   */
  async getEmployeeCount(organizationId: number, filters: Partial<EmployeeFilters> = {}): Promise<number> {
    try {
      // Build where conditions (same as getEmployeesWithFilters)
      const conditions = [eq(users.organization_id, organizationId)];

      // Apply same filters as getEmployeesWithFilters
      if (filters.status) {
        conditions.push(eq(users.status, filters.status));
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          or(
            ilike(users.name, searchTerm),
            ilike(users.email, searchTerm),
            ilike(users.job_title, searchTerm)
          )!
        );
      }

      if (filters.department) {
        conditions.push(eq(users.department, filters.department));
      }

      // Apply where condition properly
      const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];
      
      const [result] = await db
        .select({ count: count() })
        .from(users)
        .where(whereCondition);
        
      return result.count;
    } catch (error: any) {
      logger.error('❌ Error getting employee count:', { 
        error: error?.message || 'unknown_error',
        organizationId,
        filters
      });
      return 0;
    }
  }

  /**
   * Check employee dependencies before deactivation
   */
  async checkEmployeeDependencies(employeeId: number): Promise<EmployeeDependencies> {
    try {
      // This would check various tables for dependencies
      // For now, implementing basic checks - these would be expanded based on actual schema

      // Check for active social posts (placeholder - would check posts table)
      const hasActivePosts = false; // await this.checkActivePosts(employeeId);
      
      // Check for active leave requests (placeholder - would check leave table)
      const hasActiveLeave = false; // await this.checkActiveLeave(employeeId);
      
      // Check for open recognitions (placeholder - would check recognitions table)
      const hasOpenRecognitions = false; // await this.checkOpenRecognitions(employeeId);

      return {
        hasActivePosts,
        hasActiveLeave,
        hasOpenRecognitions,
      };
    } catch (error: any) {
      logger.error('❌ Error checking employee dependencies:', { 
        error: error?.message || 'unknown_error', 
        employeeId 
      });
      return {
        hasActivePosts: false,
        hasActiveLeave: false,
        hasOpenRecognitions: false,
      };
    }
  }

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(organizationId: number, department: string): Promise<User[]> {
    try {
      const employees = await db
        .select()
        .from(users)
        .where(and(
          eq(users.organization_id, organizationId),
          eq(users.department, department),
          eq(users.status, 'active')
        ))
        .orderBy(asc(users.name));

      return employees;
    } catch (error: any) {
      logger.error('❌ Error getting employees by department:', { 
        error: error?.message || 'unknown_error',
        organizationId,
        department
      });
      return [];
    }
  }

  /**
   * Get unique departments in organization
   */
  async getDepartments(organizationId: number): Promise<string[]> {
    try {
      const result = await db
        .selectDistinct({ department: users.department })
        .from(users)
        .where(and(
          eq(users.organization_id, organizationId),
          eq(users.status, 'active')
        ))
        .orderBy(asc(users.department));

      return result.map(r => r.department).filter(Boolean) as string[];
    } catch (error: any) {
      logger.error('❌ Error getting departments:', { 
        error: error?.message || 'unknown_error',
        organizationId
      });
      return [];
    }
  }

  /**
   * Bulk update employees
   */
  async bulkUpdateEmployees(
    employeeIds: number[],
    updateData: Partial<User>
  ): Promise<number> {
    try {
      const result = await db
        .update(users)
        .set(updateData)
        .where(sql`${users.id} = ANY(${employeeIds})`);

      // Get the number of affected rows (Drizzle doesn't return it directly)
      const affectedRows = employeeIds.length;

      logger.info('✅ Bulk employee update completed', { 
        employeeCount: employeeIds.length 
      });
      
      return employeeIds.length;
    } catch (error: any) {
      logger.error('❌ Error in bulk employee update:', { 
        error: error?.message || 'unknown_error',
        employeeCount: employeeIds.length
      });
      throw error;
    }
  }
}