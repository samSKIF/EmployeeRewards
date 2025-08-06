import request from 'supertest';
import express from 'express';
import { storage } from '../../storage';
import bulkUploadRoutes from './bulkUploadRoutes';
import { verifyToken, verifyAdmin } from '../../middleware/auth';
import fs from 'fs';
import path from 'path';

// Mock dependencies with comprehensive auth middleware pattern
jest.mock('../../storage');
jest.mock('../../middleware/auth');
jest.mock('fs');
jest.mock('@shared/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }
}));

const mockedStorage = storage as jest.Mocked<typeof storage>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockedVerifyAdmin = verifyAdmin as jest.MockedFunction<typeof verifyAdmin>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Bulk Upload Routes - Critical Business Logic Coverage', () => {
  let app: express.Application;

  const mockAdminUser = {
    id: 1,
    organization_id: 1,
    email: 'admin@company.com',
    isAdmin: true,
    role_type: 'admin'
  };

  const mockEmployeeCsvData = [
    {
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@company.com',
      department: 'Engineering',
      location: 'New York',
      jobTitle: 'Software Engineer',
      phoneNumber: '+1234567890',
      birthDate: '1990-01-15',
      hireDate: '2023-06-01'
    },
    {
      name: 'Jane',
      surname: 'Smith',
      email: 'jane.smith@company.com',
      department: 'Marketing',
      location: 'San Francisco',
      jobTitle: 'Marketing Manager',
      phoneNumber: '+0987654321',
      birthDate: '1988-05-20',
      hireDate: '2022-03-15'
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

    app.use('/api/admin/employees', bulkUploadRoutes);
  });

  describe('POST /api/admin/employees/preview - CSV Preview Endpoint', () => {
    it('should analyze CSV file and return preview with department analysis', async () => {
      // Mock file system operations
      const mockCsvContent = 'name,surname,email,department,location\nJohn,Doe,john@company.com,Engineering,NYC\nJane,Smith,jane@company.com,Enginering,SF';
      
      mockedFs.createReadStream = jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              // Simulate CSV parsing
              callback({ name: 'John', surname: 'Doe', email: 'john@company.com', department: 'Engineering' });
              callback({ name: 'Jane', surname: 'Smith', email: 'jane@company.com', department: 'Enginering' }); // Typo
            } else if (event === 'end') {
              callback();
            }
            return this;
          })
        })
      });

      // Mock existing departments for typo detection
      mockedStorage.getDepartmentsByOrganization = jest.fn().mockResolvedValue([
        { name: 'Engineering' },
        { name: 'Marketing' },
        { name: 'Sales' }
      ]);

      const response = await request(app)
        .post('/api/admin/employees/preview')
        .attach('file', Buffer.from(mockCsvContent), 'employees.csv')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('departmentAnalysis');
      expect(response.body).toHaveProperty('validRows');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('warnings');
      
      // Verify department typo detection
      expect(response.body.departmentAnalysis).toContainEqual(
        expect.objectContaining({
          name: 'Enginering',
          action: 'typo',
          suggestion: 'Engineering'
        })
      );

      // Verify storage was called for department comparison
      expect(mockedStorage.getDepartmentsByOrganization).toHaveBeenCalledWith(1);
    });

    it('should validate email formats during preview', async () => {
      const mockCsvWithInvalidEmails = 'name,surname,email,department\nJohn,Doe,invalid-email,Engineering\nJane,Smith,jane@valid.com,Marketing';
      
      mockedFs.createReadStream = jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback({ name: 'John', surname: 'Doe', email: 'invalid-email', department: 'Engineering' });
              callback({ name: 'Jane', surname: 'Smith', email: 'jane@valid.com', department: 'Marketing' });
            } else if (event === 'end') {
              callback();
            }
            return this;
          })
        })
      });

      mockedStorage.getDepartmentsByOrganization = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .post('/api/admin/employees/preview')
        .attach('file', Buffer.from(mockCsvWithInvalidEmails), 'employees.csv')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.errors).toContain(
        expect.stringContaining('Invalid email format: invalid-email')
      );
      expect(response.body.summary.totalRows).toBe(2);
      expect(response.body.summary.validRows).toBe(1); // Only Jane has valid email
      expect(response.body.summary.errorRows).toBe(1);
    });

    it('should detect duplicate emails within CSV file', async () => {
      const mockCsvWithDuplicates = 'name,surname,email,department\nJohn,Doe,john@company.com,Engineering\nJane,Smith,john@company.com,Marketing';
      
      mockedFs.createReadStream = jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback({ name: 'John', surname: 'Doe', email: 'john@company.com', department: 'Engineering' });
              callback({ name: 'Jane', surname: 'Smith', email: 'john@company.com', department: 'Marketing' });
            } else if (event === 'end') {
              callback();
            }
            return this;
          })
        })
      });

      mockedStorage.getDepartmentsByOrganization = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .post('/api/admin/employees/preview')
        .attach('file', Buffer.from(mockCsvWithDuplicates), 'employees.csv')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.warnings).toContain(
        expect.stringContaining('Duplicate email found: john@company.com')
      );
    });

    it('should reject non-CSV file uploads', async () => {
      const response = await request(app)
        .post('/api/admin/employees/preview')
        .attach('file', Buffer.from('not a csv'), 'document.txt')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Only CSV and Excel files are allowed');
    });

    it('should handle file size limits', async () => {
      // Mock large file that exceeds 5MB limit
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

      const response = await request(app)
        .post('/api/admin/employees/preview')
        .attach('file', largeBuffer, 'large.csv')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('file size');
    });
  });

  describe('POST /api/admin/employees/bulk-upload - Bulk Creation Endpoint', () => {
    it('should process bulk employee creation with comprehensive validation', async () => {
      const bulkCreateResults = {
        created: mockEmployeeCsvData.map((emp, index) => ({
          id: 100 + index,
          ...emp,
          organization_id: 1,
          status: 'pending',
          username: `${emp.name.toLowerCase()}.${emp.surname.toLowerCase()}`,
          created_at: new Date()
        })),
        errors: [],
        duplicates: [],
        skipped: []
      };

      mockedStorage.bulkCreateEmployees = jest.fn().mockResolvedValue(bulkCreateResults);
      mockedStorage.getDepartmentsByOrganization = jest.fn().mockResolvedValue([
        { name: 'Engineering' },
        { name: 'Marketing' }
      ]);

      const response = await request(app)
        .post('/api/admin/employees/bulk-upload')
        .send({ 
          employees: mockEmployeeCsvData,
          validateDepartments: true,
          createMissingDepartments: false
        })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.summary).toMatchObject({
        total_processed: 2,
        successful_creates: 2,
        errors: 0,
        duplicates: 0,
        skipped: 0
      });
      expect(response.body.created_employees).toHaveLength(2);

      // Verify bulk creation was called with proper data
      expect(mockedStorage.bulkCreateEmployees).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            ...mockEmployeeCsvData[0],
            organization_id: 1
          }),
          expect.objectContaining({
            ...mockEmployeeCsvData[1],
            organization_id: 1
          })
        ])
      );
    });

    it('should handle partial failures during bulk creation', async () => {
      const partialResults = {
        created: [{ id: 100, ...mockEmployeeCsvData[0] }],
        errors: [
          {
            row: 2,
            email: mockEmployeeCsvData[1].email,
            error: 'Database constraint violation'
          }
        ],
        duplicates: [],
        skipped: []
      };

      mockedStorage.bulkCreateEmployees = jest.fn().mockResolvedValue(partialResults);

      const response = await request(app)
        .post('/api/admin/employees/bulk-upload')
        .send({ employees: mockEmployeeCsvData })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.summary.successful_creates).toBe(1);
      expect(response.body.summary.errors).toBe(1);
      expect(response.body.failed_employees).toHaveLength(1);
      expect(response.body.failed_employees[0]).toMatchObject({
        email: mockEmployeeCsvData[1].email,
        error: 'Database constraint violation'
      });
    });

    it('should detect and handle existing employee duplicates', async () => {
      const duplicateResults = {
        created: [],
        errors: [],
        duplicates: [
          {
            email: mockEmployeeCsvData[0].email,
            existing_id: 50,
            reason: 'Email already exists in system'
          }
        ],
        skipped: [mockEmployeeCsvData[1]]
      };

      mockedStorage.bulkCreateEmployees = jest.fn().mockResolvedValue(duplicateResults);

      const response = await request(app)
        .post('/api/admin/employees/bulk-upload')
        .send({ employees: mockEmployeeCsvData })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.summary.duplicates).toBe(1);
      expect(response.body.summary.skipped).toBe(1);
      expect(response.body.duplicate_employees).toHaveLength(1);
      expect(response.body.duplicate_employees[0]).toMatchObject({
        email: mockEmployeeCsvData[0].email,
        reason: 'Email already exists in system'
      });
    });

    it('should validate bulk upload limits', async () => {
      const tooManyEmployees = Array.from({ length: 1001 }, (_, i) => ({
        name: `Employee${i}`,
        surname: 'User',
        email: `employee${i}@company.com`,
        department: 'Engineering'
      }));

      const response = await request(app)
        .post('/api/admin/employees/bulk-upload')
        .send({ employees: tooManyEmployees })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Too many employees');
      expect(response.body.message).toContain('1000'); // Max limit mentioned

      // Verify no bulk creation was attempted
      expect(mockedStorage.bulkCreateEmployees).not.toHaveBeenCalled();
    });

    it('should handle department creation when missing departments found', async () => {
      const employeesWithNewDept = [
        {
          ...mockEmployeeCsvData[0],
          department: 'New Department'
        }
      ];

      mockedStorage.getDepartmentsByOrganization = jest.fn().mockResolvedValue([
        { name: 'Engineering' }
      ]); // Missing 'New Department'
      
      mockedStorage.createDepartment = jest.fn().mockResolvedValue({ 
        id: 5, 
        name: 'New Department',
        organization_id: 1 
      });

      mockedStorage.bulkCreateEmployees = jest.fn().mockResolvedValue({
        created: [{ id: 101, ...employeesWithNewDept[0] }],
        errors: [],
        duplicates: [],
        skipped: []
      });

      const response = await request(app)
        .post('/api/admin/employees/bulk-upload')
        .send({ 
          employees: employeesWithNewDept,
          createMissingDepartments: true
        })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.departments_created).toContain('New Department');
      
      // Verify department was created
      expect(mockedStorage.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Department',
          organization_id: 1
        })
      );
    });
  });

  describe('Authorization and Security Tests', () => {
    it('should reject non-admin users for bulk operations', async () => {
      mockedVerifyAdmin.mockImplementation((req, res, next) => {
        res.status(403).json({ message: 'Admin access required' });
      });

      const endpoints = [
        { method: 'post', path: '/api/admin/employees/preview' },
        { method: 'post', path: '/api/admin/employees/bulk-upload' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .set('Authorization', 'Bearer user-token');
        
        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Admin access required');
      }
    });

    it('should enforce organization isolation in bulk operations', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = { ...mockAdminUser, organization_id: 999 }; // Different org
        next();
      });

      mockedStorage.getDepartmentsByOrganization = jest.fn().mockResolvedValue([]);
      mockedStorage.bulkCreateEmployees = jest.fn().mockResolvedValue({
        created: [],
        errors: [],
        duplicates: [],
        skipped: []
      });

      const response = await request(app)
        .post('/api/admin/employees/bulk-upload')
        .send({ employees: [mockEmployeeCsvData[0]] })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      
      // Verify organization isolation - should use org 999
      expect(mockedStorage.getDepartmentsByOrganization).toHaveBeenCalledWith(999);
      expect(mockedStorage.bulkCreateEmployees).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ organization_id: 999 })
        ])
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors during bulk operations', async () => {
      const dbError = new Error('Database connection failed');
      mockedStorage.bulkCreateEmployees = jest.fn().mockRejectedValue(dbError);

      const response = await request(app)
        .post('/api/admin/employees/bulk-upload')
        .send({ employees: [mockEmployeeCsvData[0]] })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Bulk upload failed');
    });

    it('should validate required fields in bulk data', async () => {
      const incompleteEmployees = [
        {
          name: 'John', 
          // Missing surname, email, department
        }
      ];

      const response = await request(app)
        .post('/api/admin/employees/bulk-upload')
        .send({ employees: incompleteEmployees })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required fields');
    });

    it('should handle concurrent bulk operations gracefully', async () => {
      // Simulate concurrent modification conflict
      const conflictError = new Error('Concurrent modification detected');
      mockedStorage.bulkCreateEmployees = jest.fn().mockRejectedValue(conflictError);

      const response = await request(app)
        .post('/api/admin/employees/bulk-upload')
        .send({ employees: [mockEmployeeCsvData[0]] })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('conflict');
    });

    it('should provide detailed progress tracking for large uploads', async () => {
      const manyEmployees = Array.from({ length: 500 }, (_, i) => ({
        name: `Employee${i}`,
        surname: 'Test',
        email: `employee${i}@company.com`,
        department: 'Engineering'
      }));

      const largeResults = {
        created: manyEmployees.map((emp, index) => ({
          id: 1000 + index,
          ...emp,
          organization_id: 1
        })),
        errors: [],
        duplicates: [],
        skipped: []
      };

      mockedStorage.bulkCreateEmployees = jest.fn().mockResolvedValue(largeResults);
      mockedStorage.getDepartmentsByOrganization = jest.fn().mockResolvedValue([
        { name: 'Engineering' }
      ]);

      const response = await request(app)
        .post('/api/admin/employees/bulk-upload')
        .send({ employees: manyEmployees })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.summary.total_processed).toBe(500);
      expect(response.body.summary.successful_creates).toBe(500);
      expect(response.body).toHaveProperty('performance_metrics');
      expect(response.body.performance_metrics).toMatchObject({
        processing_time_ms: expect.any(Number),
        records_per_second: expect.any(Number)
      });
    });
  });
});