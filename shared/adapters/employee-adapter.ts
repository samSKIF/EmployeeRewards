// Employee Management Adapter
// Provides standardized interface for employee-related operations

import { z } from 'zod';
import { BaseAdapter, AdapterResult, AdapterContext, PaginatedResult, PaginationOptions, AdapterValidator, commonSchemas } from './base-adapter';
import { db } from '../../server/db';
import { users, organizations } from '@shared/schema';
import { eq, and, sql, desc, or, ilike } from 'drizzle-orm';

// Employee-specific schemas
const employeeSchema = z.object({
  id: commonSchemas.id,
  username: z.string().min(1).max(50),
  email: commonSchemas.email,
  name: commonSchemas.name,
  surname: z.string().max(50).optional(),
  phone_number: z.string().max(20).optional(),
  job_title: z.string().max(100).optional(),
  department: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  hire_date: z.date().optional(),
  avatar_url: z.string().url().optional(),
  role_type: z.enum(['employee', 'manager', 'admin', 'corporate_admin']).default('employee'),
  is_admin: z.boolean().default(false),
  organization_id: commonSchemas.organizationId,
  created_at: z.date(),
  updated_at: z.date(),
});

const createEmployeeSchema = employeeSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

const updateEmployeeSchema = createEmployeeSchema.partial().omit({ 
  organization_id: true 
});

const employeeFiltersSchema = z.object({
  department: z.string().optional(),
  job_title: z.string().optional(),
  role_type: z.string().optional(),
  location: z.string().optional(),
  is_active: z.boolean().optional(),
}).optional();

// Employee data types
export type Employee = z.infer<typeof employeeSchema>;
export type CreateEmployeeData = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeData = z.infer<typeof updateEmployeeSchema>;
export type EmployeeFilters = z.infer<typeof employeeFiltersSchema>;

export class EmployeeAdapter extends BaseAdapter {
  constructor() {
    super({
      adapterName: 'employee-adapter',
      version: '1.0.0',
      featureFlag: 'employee_adapter_enabled',
      cacheEnabled: true,
      cacheTtl: 300, // 5 minutes
      fallbackEnabled: true,
    });
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(
    employeeId: number,
    context: AdapterContext
  ): Promise<AdapterResult<Employee | null>> {
    return this.executeOperation('getEmployeeById', async () => {
      const employee = await db.query.users.findFirst({
        where: eq(users.id, employeeId),
        with: {
          organization: {
            columns: {
              id: true,
              name: true,
              domain: true,
            },
          },
        },
      });

      if (!employee) {
        return null;
      }

      return AdapterValidator.validate(employeeSchema, employee);
    }, context);
  }

  /**
   * Get all employees with filtering and pagination
   */
  async getEmployees(
    pagination: PaginationOptions,
    filters: EmployeeFilters,
    context: AdapterContext
  ): Promise<PaginatedResult<Employee>> {
    return this.executeOperation('getEmployees', async () => {
      const validatedPagination = AdapterValidator.validate(
        commonSchemas.pagination,
        pagination
      );
      const validatedFilters = AdapterValidator.optional(
        employeeFiltersSchema,
        filters
      );

      // Build where conditions
      const whereConditions: any[] = [];

      if (context.organizationId) {
        whereConditions.push(eq(users.organization_id, context.organizationId));
      }

      if (validatedFilters?.department) {
        whereConditions.push(eq(users.department, validatedFilters.department));
      }

      if (validatedFilters?.job_title) {
        whereConditions.push(eq(users.job_title, validatedFilters.job_title));
      }

      if (validatedFilters?.role_type) {
        whereConditions.push(eq(users.role_type, validatedFilters.role_type));
      }

      if (validatedFilters?.location) {
        whereConditions.push(eq(users.location, validatedFilters.location));
      }

      if (validatedPagination.search) {
        whereConditions.push(
          or(
            ilike(users.name, `%${validatedPagination.search}%`),
            ilike(users.surname, `%${validatedPagination.search}%`),
            ilike(users.email, `%${validatedPagination.search}%`),
            ilike(users.department, `%${validatedPagination.search}%`)
          )
        );
      }

      // Execute query with pagination
      const offset = (validatedPagination.page - 1) * validatedPagination.limit;
      
      const [employees, totalCountResult] = await Promise.all([
        db.query.users.findMany({
          where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
          limit: validatedPagination.limit,
          offset,
          orderBy: validatedPagination.sortOrder === 'asc' 
            ? users[validatedPagination.sortBy as keyof typeof users] || users.created_at
            : desc(users[validatedPagination.sortBy as keyof typeof users] || users.created_at),
          with: {
            organization: {
              columns: {
                id: true,
                name: true,
                domain: true,
              },
            },
          },
        }),
        db.select({ count: sql<number>`count(*)` })
          .from(users)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      ]);

      const totalCount = totalCountResult[0].count;
      const totalPages = Math.ceil(totalCount / validatedPagination.limit);

      return {
        data: employees.map(emp => AdapterValidator.validate(employeeSchema, emp)),
        pagination: {
          currentPage: validatedPagination.page,
          totalPages,
          totalCount,
          limit: validatedPagination.limit,
          hasNext: validatedPagination.page < totalPages,
          hasPrev: validatedPagination.page > 1,
        },
      };
    }, context) as Promise<PaginatedResult<Employee>>;
  }

  /**
   * Create a new employee
   */
  async createEmployee(
    employeeData: CreateEmployeeData,
    context: AdapterContext
  ): Promise<AdapterResult<Employee>> {
    return this.executeOperation('createEmployee', async () => {
      const validatedData = AdapterValidator.validate(createEmployeeSchema, employeeData);

      // Ensure organization exists
      if (!context.organizationId) {
        throw new Error('Organization ID is required for employee creation');
      }

      const [newEmployee] = await db
        .insert(users)
        .values({
          ...validatedData,
          organization_id: context.organizationId,
        })
        .returning();

      return AdapterValidator.validate(employeeSchema, newEmployee);
    }, context);
  }

  /**
   * Update employee information
   */
  async updateEmployee(
    employeeId: number,
    updateData: UpdateEmployeeData,
    context: AdapterContext
  ): Promise<AdapterResult<Employee>> {
    return this.executeOperation('updateEmployee', async () => {
      const validatedData = AdapterValidator.validate(updateEmployeeSchema, updateData);

      // Verify employee exists and belongs to organization
      const existingEmployee = await db.query.users.findFirst({
        where: and(
          eq(users.id, employeeId),
          context.organizationId ? eq(users.organization_id, context.organizationId) : undefined
        ),
      });

      if (!existingEmployee) {
        throw new Error('Employee not found or access denied');
      }

      const [updatedEmployee] = await db
        .update(users)
        .set({
          ...validatedData,
          updated_at: new Date(),
        })
        .where(eq(users.id, employeeId))
        .returning();

      return AdapterValidator.validate(employeeSchema, updatedEmployee);
    }, context);
  }

  /**
   * Soft delete employee (deactivate)
   */
  async deactivateEmployee(
    employeeId: number,
    reason: string,
    context: AdapterContext
  ): Promise<AdapterResult<boolean>> {
    return this.executeOperation('deactivateEmployee', async () => {
      // Verify employee exists and belongs to organization
      const existingEmployee = await db.query.users.findFirst({
        where: and(
          eq(users.id, employeeId),
          context.organizationId ? eq(users.organization_id, context.organizationId) : undefined
        ),
      });

      if (!existingEmployee) {
        throw new Error('Employee not found or access denied');
      }

      // Soft delete by updating status (assuming we have a status field)
      await db
        .update(users)
        .set({
          updated_at: new Date(),
          // TODO: Add status field to schema for proper soft deletes
          // status: 'inactive',
          // deactivation_reason: reason,
        })
        .where(eq(users.id, employeeId));

      return true;
    }, context);
  }

  /**
   * Search employees by text query
   */
  async searchEmployees(
    query: string,
    context: AdapterContext,
    limit = 10
  ): Promise<AdapterResult<Employee[]>> {
    return this.executeOperation('searchEmployees', async () => {
      if (!query.trim()) {
        return [];
      }

      const employees = await db.query.users.findMany({
        where: and(
          context.organizationId ? eq(users.organization_id, context.organizationId) : undefined,
          or(
            ilike(users.name, `%${query}%`),
            ilike(users.surname, `%${query}%`),
            ilike(users.email, `%${query}%`),
            ilike(users.department, `%${query}%`),
            ilike(users.job_title, `%${query}%`)
          )
        ),
        limit,
        orderBy: [users.name, users.surname],
        with: {
          organization: {
            columns: {
              id: true,
              name: true,
              domain: true,
            },
          },
        },
      });

      return employees.map(emp => AdapterValidator.validate(employeeSchema, emp));
    }, context);
  }

  /**
   * Get employee statistics for dashboard
   */
  async getEmployeeStats(
    context: AdapterContext
  ): Promise<AdapterResult<{
    totalEmployees: number;
    activeEmployees: number;
    departmentBreakdown: Record<string, number>;
    roleBreakdown: Record<string, number>;
    recentHires: number;
  }>> {
    return this.executeOperation('getEmployeeStats', async () => {
      const whereCondition = context.organizationId 
        ? eq(users.organization_id, context.organizationId)
        : undefined;

      const [
        totalCount,
        departmentStats,
        roleStats,
        recentHires,
      ] = await Promise.all([
        // Total employees
        db.select({ count: sql<number>`count(*)` })
          .from(users)
          .where(whereCondition),

        // Department breakdown
        db.select({
          department: users.department,
          count: sql<number>`count(*)`,
        })
          .from(users)
          .where(whereCondition)
          .groupBy(users.department),

        // Role breakdown
        db.select({
          role_type: users.role_type,
          count: sql<number>`count(*)`,
        })
          .from(users)
          .where(whereCondition)
          .groupBy(users.role_type),

        // Recent hires (last 30 days)
        db.select({ count: sql<number>`count(*)` })
          .from(users)
          .where(and(
            whereCondition,
            sql`${users.created_at} >= NOW() - INTERVAL '30 days'`
          ))
      ]);

      // Process results
      const departmentBreakdown: Record<string, number> = {};
      departmentStats.forEach(stat => {
        if (stat.department) {
          departmentBreakdown[stat.department] = stat.count;
        }
      });

      const roleBreakdown: Record<string, number> = {};
      roleStats.forEach(stat => {
        roleBreakdown[stat.role_type] = stat.count;
      });

      return {
        totalEmployees: totalCount[0].count,
        activeEmployees: totalCount[0].count, // TODO: Filter by active status when implemented
        departmentBreakdown,
        roleBreakdown,
        recentHires: recentHires[0].count,
      };
    }, context);
  }
}

// Export singleton instance
export const employeeAdapter = new EmployeeAdapter();