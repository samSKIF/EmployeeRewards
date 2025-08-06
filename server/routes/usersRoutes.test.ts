import request from 'supertest';
import express from 'express';
import { db } from '../db';
import { storage } from '../storage';
import usersRoutes from './usersRoutes';
import { verifyToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../middleware/auth';

// Mock dependencies with comprehensive auth middleware pattern
jest.mock('../db');
jest.mock('../storage');
jest.mock('../middleware/auth');
jest.mock('@shared/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }
}));

const mockedDb = db as jest.Mocked<typeof db>;
const mockedStorage = storage as jest.Mocked<typeof storage>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Users Routes - Core API Endpoints Coverage', () => {
  let app: express.Application;

  const mockUser = {
    id: 1,
    organization_id: 1,
    email: 'user@company.com',
    name: 'Test',
    surname: 'User',
    username: 'test.user',
    department: 'Engineering',
    location: 'New York',
    job_title: 'Software Engineer',
    status: 'active',
    isAdmin: false,
    avatar_url: null,
    phone_number: '+1234567890',
    birth_date: '1990-01-01',
    hire_date: '2023-01-01',
    last_seen_at: '2025-08-06T10:00:00Z'
  };

  const mockDepartments = ['Engineering', 'Product', 'Design', 'Marketing'];
  const mockLocations = ['New York', 'San Francisco', 'Remote', 'London'];

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();

    // Mock auth middleware with proper patterns
    mockedVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = mockUser;
      next();
    });

    app.use('/api/users', usersRoutes);
  });

  describe('GET /api/users/me - User Profile Endpoint', () => {
    it('should return authenticated user profile with comprehensive data', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        department: mockUser.department,
        isAdmin: mockUser.isAdmin
      });
      
      // Verify sensitive data is not exposed
      expect(response.body.password).toBeUndefined();
    });

    it('should return 401 when no authentication provided', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const response = await request(app)
        .get('/api/users/me');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('GET /api/users/:id - User Profile by ID Endpoint', () => {
    it('should return user profile by ID with organization isolation', async () => {
      const targetUser = { ...mockUser, id: 2, name: 'Target User' };
      mockedStorage.getUserById = jest.fn().mockResolvedValue(targetUser);

      const response = await request(app)
        .get('/api/users/2')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Target User');
      expect(response.body.id).toBe(2);
      
      // Verify storage was called with correct ID
      expect(mockedStorage.getUserById).toHaveBeenCalledWith(2);
    });

    it('should return 404 for non-existent user', async () => {
      mockedStorage.getUserById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/999')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should enforce organization isolation for cross-org access', async () => {
      const crossOrgUser = { ...mockUser, id: 2, organization_id: 999 };
      mockedStorage.getUserById = jest.fn().mockResolvedValue(crossOrgUser);

      const response = await request(app)
        .get('/api/users/2')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('organization');
    });
  });

  describe('PATCH /api/users/me - Profile Update Endpoint', () => {
    const profileUpdates = {
      name: 'Updated Name',
      phone_number: '+9876543210',
      location: 'San Francisco',
      bio: 'Updated bio information'
    };

    it('should update user profile with field validation', async () => {
      const updatedUser = { ...mockUser, ...profileUpdates };
      mockedStorage.updateUser = jest.fn().mockResolvedValue(updatedUser);

      const response = await request(app)
        .patch('/api/users/me')
        .send(profileUpdates)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(profileUpdates.name);
      expect(response.body.phone_number).toBe(profileUpdates.phone_number);
      
      // Verify update was called with correct data
      expect(mockedStorage.updateUser).toHaveBeenCalledWith(mockUser.id, profileUpdates);
    });

    it('should prevent updating restricted fields by regular users', async () => {
      const restrictedUpdates = {
        is_admin: true,
        organization_id: 999,
        salary: 100000,
        role_type: 'admin'
      };

      const response = await request(app)
        .patch('/api/users/me')
        .send(restrictedUpdates)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('restricted');
      
      // Verify no update was attempted
      expect(mockedStorage.updateUser).not.toHaveBeenCalled();
    });

    it('should validate email format when updating email', async () => {
      const invalidEmailUpdate = { email: 'invalid-email-format' };

      const response = await request(app)
        .patch('/api/users/me')
        .send(invalidEmailUpdate)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('email');
    });
  });

  describe('GET /api/users/departments - Departments Endpoint', () => {
    it('should return unique departments for organization with proper caching', async () => {
      mockedStorage.getDepartmentsByOrganization = jest.fn().mockResolvedValue(
        mockDepartments.map(dept => ({ name: dept }))
      );

      const response = await request(app)
        .get('/api/users/departments')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockDepartments);
      
      // Verify organization isolation
      expect(mockedStorage.getDepartmentsByOrganization).toHaveBeenCalledWith(mockUser.organization_id);
    });

    it('should handle empty departments list', async () => {
      mockedStorage.getDepartmentsByOrganization = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/api/users/departments')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/users/locations - Locations Endpoint', () => {
    it('should return unique locations for organization', async () => {
      mockedStorage.getLocationsByOrganization = jest.fn().mockResolvedValue(
        mockLocations.map(loc => ({ name: loc }))
      );

      const response = await request(app)
        .get('/api/users/locations')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLocations);
      
      // Verify organization isolation
      expect(mockedStorage.getLocationsByOrganization).toHaveBeenCalledWith(mockUser.organization_id);
    });

    it('should filter out empty/null locations', async () => {
      const locationsWithEmpties = [
        { name: 'New York' },
        { name: '' },
        { name: 'Remote' },
        { name: null }
      ];
      mockedStorage.getLocationsByOrganization = jest.fn().mockResolvedValue(locationsWithEmpties);

      const response = await request(app)
        .get('/api/users/locations')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(['New York', 'Remote']);
    });
  });

  describe('PATCH /api/users/bulk - Bulk Operations Endpoint', () => {
    const bulkUpdateData = {
      user_ids: [1, 2, 3],
      updates: {
        department: 'Engineering',
        location: 'Remote'
      }
    };

    it('should perform bulk updates with proper authorization', async () => {
      // Mock admin user for bulk operations
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = { ...mockUser, isAdmin: true };
        next();
      });

      const bulkResults = {
        updated: [1, 2, 3],
        failed: [],
        total: 3
      };
      
      mockedStorage.bulkUpdateUsers = jest.fn().mockResolvedValue(bulkResults);

      const response = await request(app)
        .patch('/api/users/bulk')
        .send(bulkUpdateData)
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.summary.total_processed).toBe(3);
      expect(response.body.summary.successful_updates).toBe(3);
      
      // Verify bulk operation was called
      expect(mockedStorage.bulkUpdateUsers).toHaveBeenCalledWith(
        bulkUpdateData.user_ids,
        bulkUpdateData.updates,
        mockUser.organization_id
      );
    });

    it('should reject bulk operations for non-admin users', async () => {
      const response = await request(app)
        .patch('/api/users/bulk')
        .send(bulkUpdateData)
        .set('Authorization', 'Bearer user-token');

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('admin');
      
      // Verify no bulk operation was attempted
      expect(mockedStorage.bulkUpdateUsers).not.toHaveBeenCalled();
    });

    it('should validate bulk operation limits', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = { ...mockUser, isAdmin: true };
        next();
      });

      const largeBulkData = {
        user_ids: Array.from({ length: 1001 }, (_, i) => i + 1), // Over limit
        updates: { department: 'Engineering' }
      };

      const response = await request(app)
        .patch('/api/users/bulk')
        .send(largeBulkData)
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('limit');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      const dbError = new Error('Database connection lost');
      mockedStorage.getUserById = jest.fn().mockRejectedValue(dbError);

      const response = await request(app)
        .get('/api/users/2')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should validate request parameters and reject malformed data', async () => {
      const malformedUpdate = {
        birth_date: 'not-a-date',
        hire_date: '2025-13-45', // Invalid date
        email: 'not-an-email'
      };

      const response = await request(app)
        .patch('/api/users/me')
        .send(malformedUpdate)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('validation');
    });

    it('should handle concurrent modification conflicts', async () => {
      const conflictError = new Error('Concurrent modification detected');
      mockedStorage.updateUser = jest.fn().mockRejectedValue(conflictError);

      const response = await request(app)
        .patch('/api/users/me')
        .send({ name: 'New Name' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('conflict');
    });
  });

  describe('Performance and Caching Tests', () => {
    it('should implement proper caching for department lookups', async () => {
      mockedStorage.getDepartmentsByOrganization = jest.fn().mockResolvedValue(
        mockDepartments.map(dept => ({ name: dept }))
      );

      // Make multiple requests
      await request(app).get('/api/users/departments').set('Authorization', 'Bearer valid-token');
      await request(app).get('/api/users/departments').set('Authorization', 'Bearer valid-token');

      // Verify caching reduces database calls
      expect(mockedStorage.getDepartmentsByOrganization).toHaveBeenCalledTimes(1);
    });

    it('should handle high-volume user lookup requests efficiently', async () => {
      const startTime = Date.now();
      
      mockedStorage.getUserById = jest.fn().mockResolvedValue(mockUser);

      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app).get(`/api/users/${i + 1}`).set('Authorization', 'Bearer valid-token')
      );

      await Promise.all(requests);
      const endTime = Date.now();

      // Verify reasonable performance (under 1 second for 10 requests)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});