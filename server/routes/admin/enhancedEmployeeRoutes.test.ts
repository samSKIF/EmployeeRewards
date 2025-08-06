import request from 'supertest';
import express from 'express';
import { db } from '../../db';
import { storage } from '../../storage';
import { logActivity } from '../../middleware/activityLogger';
import enhancedEmployeeRoutes from './enhancedEmployeeRoutes';
import { verifyToken, verifyAdmin } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock dependencies with comprehensive auth middleware pattern
jest.mock('../../db');
jest.mock('../../storage');
jest.mock('../../middleware/auth');
jest.mock('../../middleware/activityLogger');
jest.mock('@shared/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }
}));

const mockedDb = db as jest.Mocked<typeof db>;
const mockedStorage = storage as jest.Mocked<typeof storage>;
const mockedLogActivity = logActivity as jest.MockedFunction<typeof logActivity>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockedVerifyAdmin = verifyAdmin as jest.MockedFunction<typeof verifyAdmin>;

describe('Enhanced Employee Routes - Critical Business Logic Coverage', () => {
  let app: express.Application;

  const mockAdminUser = {
    id: 1,
    organization_id: 1,
    email: 'admin@company.com',
    name: 'Admin User',
    isAdmin: true,
    role_type: 'admin',
    status: 'active'
  };

  const mockEmployees = [
    {
      id: 1,
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@company.com',
      department: 'Engineering',
      location: 'New York',
      job_title: 'Software Engineer',
      status: 'active',
      hire_date: '2023-01-15',
      last_seen_at: '2025-08-06T10:00:00Z',
      organization_id: 1
    },
    {
      id: 2,
      name: 'Jane',
      surname: 'Smith',
      email: 'jane.smith@company.com',
      department: 'Marketing',
      location: 'San Francisco',
      job_title: 'Marketing Manager',
      status: 'active',
      hire_date: '2022-06-01',
      last_seen_at: '2025-08-05T14:30:00Z',
      organization_id: 1
    }
  ];

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();

    // Mock auth middleware with proper patterns
    mockedVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = mockAdminUser;
      next();
    });

    mockedVerifyAdmin.mockImplementation((req: any, res, next) => {
      if (req.user?.isAdmin) {
        next();
      } else {
        res.status(403).json({ message: 'Admin access required' });
      }
    });

    // Mock activity logger
    mockedLogActivity.mockResolvedValue(undefined);

    app.use('/api/admin/employees', enhancedEmployeeRoutes);
  });

  describe('GET /api/admin/employees - Employee Directory Endpoint', () => {
    it('should return employees with comprehensive filtering and logging', async () => {
      const mockFilters = {
        search: 'john',
        department: 'Engineering', 
        status: 'active',
        limit: 50,
        offset: 0,
        sortBy: 'name',
        sortOrder: 'asc'
      };

      mockedStorage.getEmployeesWithFilters = jest.fn().mockResolvedValue(mockEmployees);

      const response = await request(app)
        .get('/api/admin/employees')
        .query({
          search: 'john',
          department: 'Engineering',
          status: 'active'
        })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('employees');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('filters');
      expect(response.body).toHaveProperty('meta');
      
      // Verify storage was called with correct parameters
      expect(mockedStorage.getEmployeesWithFilters).toHaveBeenCalledWith(1, expect.objectContaining({
        search: 'john',
        department: 'Engineering',
        status: 'active'
      }));

      // Verify activity logging was called
      expect(mockedLogActivity).toHaveBeenCalledTimes(2);
      expect(mockedLogActivity).toHaveBeenCalledWith(
        expect.any(Object),
        'view_employee_directory',
        'employees',
        undefined,
        expect.objectContaining({
          search_params: expect.objectContaining({ search: 'john' }),
          organization_context: 1
        })
      );
    });

    it('should handle empty results with proper logging', async () => {
      mockedStorage.getEmployeesWithFilters = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.employees).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
      
      // Verify empty result logging
      expect(mockedLogActivity).toHaveBeenCalledWith(
        expect.any(Object),
        'employees_data_retrieved',
        'employees',
        undefined,
        expect.objectContaining({
          employee_count: 0,
          performance_note: 'successful_retrieval'
        })
      );
    });

    it('should handle database errors with proper error logging', async () => {
      const dbError = new Error('Database connection failed');
      mockedStorage.getEmployeesWithFilters = jest.fn().mockRejectedValue(dbError);

      const response = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to fetch employees');
      
      // Verify error logging was called
      expect(mockedLogActivity).toHaveBeenCalledWith(
        expect.any(Object),
        'employees_fetch_error',
        'employees',
        undefined,
        expect.objectContaining({
          error_type: 'Database connection failed',
          failure_reason: 'database_query_failed'
        })
      );
    });

    it('should reject requests without organization association', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = { ...mockAdminUser, organization_id: null };
        next();
      });

      const response = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User not associated with an organization');
    });
  });

  describe('POST /api/admin/employees - Employee Creation Endpoint', () => {
    const newEmployeeData = {
      name: 'Alice',
      surname: 'Johnson',
      email: 'alice.johnson@company.com',
      department: 'Product',
      location: 'Remote',
      job_title: 'Product Manager',
      phone_number: '+1234567890',
      birth_date: '1990-05-15',
      hire_date: '2025-08-06'
    };

    it('should create employee with comprehensive validation and logging', async () => {
      const mockCreatedEmployee = {
        id: 3,
        ...newEmployeeData,
        username: 'alice.johnson',
        status: 'pending',
        organization_id: 1,
        created_at: new Date(),
        avatar_url: null
      };

      mockedStorage.createEmployee = jest.fn().mockResolvedValue(mockCreatedEmployee);
      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(null); // Email not taken

      const response = await request(app)
        .post('/api/admin/employees')
        .send(newEmployeeData)
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('employee');
      expect(response.body.employee.email).toBe(newEmployeeData.email);
      
      // Verify employee creation was called with proper data
      expect(mockedStorage.createEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newEmployeeData,
          organization_id: 1,
          status: 'pending'
        })
      );

      // Verify activity logging
      expect(mockedLogActivity).toHaveBeenCalledWith(
        expect.any(Object),
        'employee_created',
        'employees',
        3,
        expect.objectContaining({
          new_employee_data: expect.objectContaining({
            email: newEmployeeData.email,
            department: newEmployeeData.department
          })
        })
      );
    });

    it('should prevent duplicate email addresses', async () => {
      const existingEmployee = { id: 999, email: newEmployeeData.email };
      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(existingEmployee);

      const response = await request(app)
        .post('/api/admin/employees')
        .send(newEmployeeData)
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('email already exists');
      
      // Verify creation was not attempted
      expect(mockedStorage.createEmployee).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const incompleteData = { name: 'John' }; // Missing required fields

      const response = await request(app)
        .post('/api/admin/employees')
        .send(incompleteData)
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });
  });

  describe('PATCH /api/admin/employees/:id - Employee Update Endpoint', () => {
    const updateData = {
      name: 'John Updated',
      job_title: 'Senior Software Engineer',
      department: 'Engineering',
      phone_number: '+9876543210'
    };

    it('should update employee with field mapping and audit logging', async () => {
      const existingEmployee = mockEmployees[0];
      const updatedEmployee = { ...existingEmployee, ...updateData };

      mockedStorage.getUser = jest.fn().mockResolvedValue(existingEmployee);
      mockedStorage.updateUser = jest.fn().mockResolvedValue(updatedEmployee);

      const response = await request(app)
        .patch('/api/admin/employees/1')
        .send(updateData)
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.employee.name).toBe(updateData.name);
      expect(response.body.employee.job_title).toBe(updateData.job_title);
      
      // Verify update was called
      expect(mockedStorage.updateUser).toHaveBeenCalledWith(1, expect.objectContaining(updateData));

      // Verify audit logging with before/after states
      expect(mockedLogActivity).toHaveBeenCalledWith(
        expect.any(Object),
        'employee_updated',
        'employees',
        1,
        expect.objectContaining({
          before_state: expect.objectContaining(existingEmployee),
          after_state: expect.objectContaining(updatedEmployee),
          changes_made: expect.objectContaining(updateData)
        })
      );
    });

    it('should handle non-existent employee updates', async () => {
      mockedStorage.getUser = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/admin/employees/999')
        .send(updateData)
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Employee not found');
      
      // Verify no update was attempted
      expect(mockedStorage.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/admin/employees/:id - Employee Deletion Endpoint', () => {
    it('should delete employee with safety checks and comprehensive logging', async () => {
      const employeeToDelete = mockEmployees[0];
      
      mockedStorage.getUser = jest.fn().mockResolvedValue(employeeToDelete);
      mockedStorage.deleteUser = jest.fn().mockResolvedValue(true);
      mockedStorage.checkEmployeeActiveContent = jest.fn().mockResolvedValue(false); // No active content

      const response = await request(app)
        .delete('/api/admin/employees/1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Employee deleted successfully');
      
      // Verify safety check was performed
      expect(mockedStorage.checkEmployeeActiveContent).toHaveBeenCalledWith(1);
      
      // Verify deletion was executed
      expect(mockedStorage.deleteUser).toHaveBeenCalledWith(1);

      // Verify comprehensive audit logging
      expect(mockedLogActivity).toHaveBeenCalledWith(
        expect.any(Object),
        'employee_deleted',
        'employees',
        1,
        expect.objectContaining({
          deleted_employee_data: expect.objectContaining({
            email: employeeToDelete.email,
            name: employeeToDelete.name
          }),
          safety_checks_passed: true,
          deletion_reason: 'admin_request'
        })
      );
    });

    it('should prevent deletion of employees with active content', async () => {
      const employeeToDelete = mockEmployees[0];
      
      mockedStorage.getUser = jest.fn().mockResolvedValue(employeeToDelete);
      mockedStorage.checkEmployeeActiveContent = jest.fn().mockResolvedValue(true); // Has active content

      const response = await request(app)
        .delete('/api/admin/employees/1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('active content');
      
      // Verify deletion was not executed
      expect(mockedStorage.deleteUser).not.toHaveBeenCalled();
      
      // Verify prevention logging
      expect(mockedLogActivity).toHaveBeenCalledWith(
        expect.any(Object),
        'employee_deletion_prevented',
        'employees',
        1,
        expect.objectContaining({
          prevention_reason: 'has_active_content',
          safety_checks_passed: false
        })
      );
    });
  });

  describe('POST /api/admin/employees/bulk-upload - Bulk Upload Endpoint', () => {
    it('should handle bulk employee creation with validation and progress tracking', async () => {
      const bulkEmployeeData = [
        {
          name: 'Bulk',
          surname: 'Employee1',
          email: 'bulk1@company.com',
          department: 'Sales',
          location: 'Chicago'
        },
        {
          name: 'Bulk',
          surname: 'Employee2', 
          email: 'bulk2@company.com',
          department: 'Sales',
          location: 'Chicago'
        }
      ];

      const mockCreatedEmployees = bulkEmployeeData.map((emp, index) => ({
        id: 100 + index,
        ...emp,
        organization_id: 1,
        status: 'pending',
        username: `${emp.name.toLowerCase()}.${emp.surname.toLowerCase()}`,
        created_at: new Date()
      }));

      mockedStorage.createBulkEmployees = jest.fn().mockResolvedValue({
        created: mockCreatedEmployees,
        errors: [],
        duplicates: []
      });

      const response = await request(app)
        .post('/api/admin/employees/bulk-upload')
        .send({ employees: bulkEmployeeData })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.summary.total_processed).toBe(2);
      expect(response.body.summary.successful_creates).toBe(2);
      expect(response.body.summary.errors).toBe(0);
      
      // Verify bulk creation was called
      expect(mockedStorage.createBulkEmployees).toHaveBeenCalledWith(
        expect.arrayContaining(bulkEmployeeData.map(emp => 
          expect.objectContaining({ ...emp, organization_id: 1 })
        ))
      );

      // Verify comprehensive bulk operation logging
      expect(mockedLogActivity).toHaveBeenCalledWith(
        expect.any(Object),
        'bulk_employees_uploaded',
        'employees',
        undefined,
        expect.objectContaining({
          bulk_operation_summary: expect.objectContaining({
            total_processed: 2,
            successful_creates: 2,
            errors: 0
          }),
          operation_type: 'bulk_create'
        })
      );
    });
  });

  describe('Authorization and Security Tests', () => {
    it('should reject non-admin users for all endpoints', async () => {
      mockedVerifyAdmin.mockImplementation((req, res, next) => {
        res.status(403).json({ message: 'Admin access required' });
      });

      const endpoints = [
        { method: 'get', path: '/api/admin/employees' },
        { method: 'post', path: '/api/admin/employees' },
        { method: 'patch', path: '/api/admin/employees/1' },
        { method: 'delete', path: '/api/admin/employees/1' },
        { method: 'post', path: '/api/admin/employees/bulk-upload' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .set('Authorization', 'Bearer user-token');
        
        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Admin access required');
      }
    });

    it('should enforce organization isolation', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = { ...mockAdminUser, organization_id: 999 }; // Different org
        next();
      });

      mockedStorage.getEmployeesWithFilters = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      
      // Verify isolation - should only get employees from org 999
      expect(mockedStorage.getEmployeesWithFilters).toHaveBeenCalledWith(999, expect.any(Object));
    });
  });
});