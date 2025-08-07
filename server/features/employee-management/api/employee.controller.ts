// Employee Controller - API Layer
// Handles HTTP requests and coordinates between domain and infrastructure

import { Request, Response } from 'express';
import { z } from 'zod';
import { EmployeeDomain, type CreateEmployeeData, type UpdateEmployeeData } from '../domain/employee.domain';
import { EmployeeRepository } from '../infrastructure/employee.repository';
import { logger } from '@shared/logger';
import { logActivity } from '../../../middleware/activityLogger';
import type { AuthenticatedRequest } from '../../../middleware/auth';

// Request validation schemas
const createEmployeeRequestSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  surname: z.string().max(100).optional(),
  job_title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  role_type: z.enum(['employee', 'manager', 'admin']).default('employee'),
  hire_date: z.string().transform(str => str ? new Date(str) : undefined).optional(),
  avatar_url: z.string().url().optional(),
  password: z.string().min(8),
});

const updateEmployeeRequestSchema = createEmployeeRequestSchema.partial().omit({ password: true });

const employeeFiltersRequestSchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  limit: z.string().transform(str => parseInt(str) || 50).optional(),
  offset: z.string().transform(str => parseInt(str) || 0).optional(),
  sort_by: z.enum(['name', 'email', 'job_title', 'department', 'hire_date']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

export class EmployeeController {
  private repository = new EmployeeRepository();

  /**
   * Get all employees with filters and pagination
   */
  getEmployees = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.user?.organization_id;
      if (!organizationId) {
        res.status(400).json({ message: 'User not associated with an organization' });
        return;
      }

      // Validate and parse query parameters
      const queryParams = employeeFiltersRequestSchema.parse(req.query);
      const filters = EmployeeDomain.validateEmployeeFilters({
        search: queryParams.search,
        department: queryParams.department,
        status: queryParams.status,
        limit: queryParams.limit || 50,
        offset: queryParams.offset || 0,
        sortBy: queryParams.sort_by,
        sortOrder: queryParams.sort_order,
      });

      // Log the employee directory access
      await logActivity(req, 'view_employee_directory', 'employees', undefined, {
        search_params: filters,
        filters_applied: !!filters.search || !!filters.department || filters.status !== 'active',
      });

      // Get employees and total count
      const [employees, totalCount] = await Promise.all([
        this.repository.getEmployeesWithFilters(organizationId, filters),
        this.repository.getEmployeeCount(organizationId, filters)
      ]);

      res.json({
        employees,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: totalCount,
          pages: Math.ceil(totalCount / filters.limit),
        },
        filters: { 
          search: filters.search, 
          department: filters.department, 
          status: filters.status 
        },
      });

    } catch (error: any) {
      logger.error('❌ Error fetching employees:', { 
        error: error?.message || 'unknown_error', 
        organizationId: req.user?.organization_id 
      });
      res.status(500).json({ message: 'Failed to fetch employees' });
    }
  };

  /**
   * Get employee by ID
   */
  getEmployeeById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const employeeId = parseInt(req.params.id);
      const organizationId = req.user?.organization_id;

      if (!organizationId) {
        res.status(400).json({ message: 'User not associated with an organization' });
        return;
      }

      if (isNaN(employeeId)) {
        res.status(400).json({ message: 'Invalid employee ID' });
        return;
      }

      const employee = await this.repository.getEmployeeById(employeeId);
      
      if (!employee || employee.organization_id !== organizationId) {
        res.status(404).json({ message: 'Employee not found' });
        return;
      }

      // Log the employee profile view
      await logActivity(req, 'view_employee_profile', 'employees', employeeId, {
        employee_name: employee.name,
        employee_department: employee.department,
      });

      res.json({ employee });

    } catch (error: any) {
      logger.error('❌ Error fetching employee by ID:', { 
        error: error?.message || 'unknown_error', 
        employeeId: req.params.id 
      });
      res.status(500).json({ message: 'Failed to fetch employee' });
    }
  };

  /**
   * Create new employee
   */
  createEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.user?.organization_id;
      const createdBy = req.user?.id;

      if (!organizationId || !createdBy) {
        res.status(400).json({ message: 'User not associated with an organization' });
        return;
      }

      // Validate request body
      const validatedData = createEmployeeRequestSchema.parse(req.body);
      const createData: CreateEmployeeData = validatedData;

      // Create employee using domain logic
      const newEmployee = await EmployeeDomain.createEmployee(
        createData,
        organizationId,
        createdBy,
        // Inject repository methods
        async (insertData) => await this.repository.createEmployee(insertData)
      );

      // Log the employee creation
      await logActivity(req, 'create_employee', 'employees', newEmployee.id, {
        employee_name: newEmployee.name,
        employee_email: newEmployee.email,
        employee_role: newEmployee.role_type,
      });

      res.status(201).json({ 
        message: 'Employee created successfully',
        employee: newEmployee 
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ 
          message: 'Invalid employee data', 
          errors: error.errors 
        });
        return;
      }

      const message = error?.message || 'unknown_error';
      logger.error('❌ Error creating employee:', { 
        error: message, 
        organizationId: req.user?.organization_id 
      });

      if (message.includes('already exists')) {
        res.status(409).json({ message });
        return;
      }

      res.status(500).json({ message: 'Failed to create employee' });
    }
  };

  /**
   * Update employee
   */
  updateEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const employeeId = parseInt(req.params.id);
      const organizationId = req.user?.organization_id;
      const updatedBy = req.user?.id;

      if (!organizationId || !updatedBy) {
        res.status(400).json({ message: 'User not associated with an organization' });
        return;
      }

      if (isNaN(employeeId)) {
        res.status(400).json({ message: 'Invalid employee ID' });
        return;
      }

      // Validate request body
      const validatedData = updateEmployeeRequestSchema.parse(req.body);
      const updateData: UpdateEmployeeData = validatedData;

      // Update employee using domain logic
      const updatedEmployee = await EmployeeDomain.updateEmployee(
        employeeId,
        updateData,
        updatedBy,
        // Inject repository methods
        async (id) => await this.repository.getEmployeeById(id),
        async (id, data) => await this.repository.updateEmployee(id, data)
      );

      // Log the employee update
      await logActivity(req, 'update_employee', 'employees', employeeId, {
        employee_name: updatedEmployee.name,
        updated_fields: Object.keys(updateData),
      });

      res.json({ 
        message: 'Employee updated successfully',
        employee: updatedEmployee 
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ 
          message: 'Invalid employee data', 
          errors: error.errors 
        });
        return;
      }

      const message = error?.message || 'unknown_error';
      logger.error('❌ Error updating employee:', { 
        error: message, 
        employeeId: req.params.id 
      });

      if (message.includes('not found')) {
        res.status(404).json({ message });
        return;
      }

      res.status(500).json({ message: 'Failed to update employee' });
    }
  };

  /**
   * Deactivate employee (soft delete)
   */
  deactivateEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const employeeId = parseInt(req.params.id);
      const organizationId = req.user?.organization_id;
      const deactivatedBy = req.user?.id;
      const { reason } = req.body;

      if (!organizationId || !deactivatedBy) {
        res.status(400).json({ message: 'User not associated with an organization' });
        return;
      }

      if (isNaN(employeeId)) {
        res.status(400).json({ message: 'Invalid employee ID' });
        return;
      }

      if (!reason || typeof reason !== 'string') {
        res.status(400).json({ message: 'Deactivation reason is required' });
        return;
      }

      // Deactivate employee using domain logic
      const deactivatedEmployee = await EmployeeDomain.deactivateEmployee(
        employeeId,
        reason,
        deactivatedBy,
        // Inject repository methods
        async (id) => await this.repository.getEmployeeById(id),
        async (id) => await this.repository.checkEmployeeDependencies(id),
        async (id) => await this.repository.deactivateEmployee(id)
      );

      // Log the employee deactivation
      await logActivity(req, 'deactivate_employee', 'employees', employeeId, {
        employee_name: deactivatedEmployee.name,
        deactivation_reason: reason,
      });

      res.json({ 
        message: 'Employee deactivated successfully',
        employee: deactivatedEmployee 
      });

    } catch (error: any) {
      const message = error?.message || 'unknown_error';
      logger.error('❌ Error deactivating employee:', { 
        error: message, 
        employeeId: req.params.id 
      });

      if (message.includes('not found')) {
        res.status(404).json({ message });
        return;
      }

      if (message.includes('already inactive')) {
        res.status(409).json({ message });
        return;
      }

      res.status(500).json({ message: 'Failed to deactivate employee' });
    }
  };

  /**
   * Get departments in organization
   */
  getDepartments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.user?.organization_id;

      if (!organizationId) {
        res.status(400).json({ message: 'User not associated with an organization' });
        return;
      }

      const departments = await this.repository.getDepartments(organizationId);

      res.json({ departments });

    } catch (error: any) {
      logger.error('❌ Error fetching departments:', { 
        error: error?.message || 'unknown_error', 
        organizationId: req.user?.organization_id 
      });
      res.status(500).json({ message: 'Failed to fetch departments' });
    }
  };

  /**
   * Get employees by department
   */
  getEmployeesByDepartment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.user?.organization_id;
      const { department } = req.params;

      if (!organizationId) {
        res.status(400).json({ message: 'User not associated with an organization' });
        return;
      }

      if (!department) {
        res.status(400).json({ message: 'Department parameter is required' });
        return;
      }

      const employees = await this.repository.getEmployeesByDepartment(
        organizationId, 
        decodeURIComponent(department)
      );

      res.json({ employees, department: decodeURIComponent(department) });

    } catch (error: any) {
      logger.error('❌ Error fetching employees by department:', { 
        error: error?.message || 'unknown_error', 
        department: req.params.department,
        organizationId: req.user?.organization_id 
      });
      res.status(500).json({ message: 'Failed to fetch employees by department' });
    }
  };
}