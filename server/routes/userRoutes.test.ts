import request from 'supertest';
import express from 'express';
import userRoutes from './userRoutes';
import { storage } from '../storage';
import { verifyToken } from '../middleware/auth';

// Mock dependencies
jest.mock('../storage');
jest.mock('../middleware/auth');
jest.mock('../db');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('User Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    
    // Mock auth middleware to always pass with test user
    mockVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = {
        id: 1,
        email: 'test@test.com',
        organizationId: 1,
        isAdmin: false,
      };
      next();
    });
    
    app.use('/api', userRoutes);
  });

  describe('GET /api/users', () => {
    it('should return paginated users for organization', async () => {
      const mockUsers = [
        { id: 1, name: 'User 1', email: 'user1@test.com', organizationId: 1 },
        { id: 2, name: 'User 2', email: 'user2@test.com', organizationId: 1 },
      ];
      
      mockStorage.getUsers.mockResolvedValue(mockUsers);
      mockStorage.getUserCount.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer test-token')
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUsers);
      expect(mockStorage.getUsers).toHaveBeenCalledWith(1, 10, 0, undefined);
    });

    it('should filter by status when provided', async () => {
      mockStorage.getUsers.mockResolvedValue([]);
      mockStorage.getUserCount.mockResolvedValue(0);

      await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer test-token')
        .query({ status: 'active' });

      expect(mockStorage.getUsers).toHaveBeenCalledWith(1, 50, 0, 'active');
    });

    it('should return 401 without auth token', async () => {
      mockVerifyToken.mockImplementation((req, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/users/me', () => {
    it('should return current user data', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
        isAdmin: false,
        organizationId: 1,
      };
      
      mockStorage.getUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
      });
      expect(response.body.password).toBeUndefined();
    });

    it('should return 404 if user not found', async () => {
      mockStorage.getUser.mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by id from same organization', async () => {
      const mockUser = {
        id: 2,
        email: 'user2@test.com',
        name: 'User 2',
        organizationId: 1,
      };
      
      mockStorage.getUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/2')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 2,
        email: 'user2@test.com',
      });
    });

    it('should return 404 for user from different organization', async () => {
      const mockUser = {
        id: 2,
        email: 'user2@test.com',
        organizationId: 2, // Different org
      };
      
      mockStorage.getUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/2')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/users/count', () => {
    it('should return total and active user counts', async () => {
      mockStorage.getUserCount.mockResolvedValueOnce(100); // Total
      mockStorage.getUserCount.mockResolvedValueOnce(85); // Active

      const response = await request(app)
        .get('/api/users/count')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        total: 100,
        active: 85,
      });
      expect(mockStorage.getUserCount).toHaveBeenCalledWith(1, undefined);
      expect(mockStorage.getUserCount).toHaveBeenCalledWith(1, 'active');
    });
  });

  describe('GET /api/users/departments', () => {
    it('should return unique departments for organization', async () => {
      const mockDepartments = ['Engineering', 'Sales', 'Marketing'];
      mockStorage.getDepartments.mockResolvedValue(mockDepartments);

      const response = await request(app)
        .get('/api/users/departments')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockDepartments);
      expect(mockStorage.getDepartments).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /api/users/locations', () => {
    it('should return unique locations for organization', async () => {
      const mockLocations = ['New York', 'London', 'Tokyo'];
      mockStorage.getLocations.mockResolvedValue(mockLocations);

      const response = await request(app)
        .get('/api/users/locations')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLocations);
      expect(mockStorage.getLocations).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /api/users/search', () => {
    it('should search users by name', async () => {
      const mockResults = [
        { id: 1, name: 'John Doe', email: 'john@test.com' },
      ];
      mockStorage.searchUsers.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'john' })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResults);
      expect(mockStorage.searchUsers).toHaveBeenCalledWith(1, 'john');
    });

    it('should return 400 without search query', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Search query required');
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should prevent access to users from other organizations', async () => {
      // Set up user from org 1
      mockVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = { id: 1, organizationId: 1 };
        next();
      });

      // Try to access user from org 2
      const userFromOtherOrg = {
        id: 99,
        organizationId: 2,
        email: 'other@org.com',
      };
      mockStorage.getUser.mockResolvedValue(userFromOtherOrg);

      const response = await request(app)
        .get('/api/users/99')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });
});