import request from 'supertest';
import express from 'express';
import { db } from '../db';
import { users, accounts } from '@shared/schema';

// Mock dependencies
jest.mock('../db');
jest.mock('../middleware/auth');
jest.mock('../storage');

// Import the router after mocking
import userRouter from './userRoutes';
import { verifyToken, verifyAdmin } from '../middleware/auth';
import { storage } from '../storage';

const mockedDb = db as jest.Mocked<typeof db>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockedVerifyAdmin = verifyAdmin as jest.MockedFunction<typeof verifyAdmin>;
const mockedStorage = storage as jest.Mocked<typeof storage>;

describe('User Routes', () => {
  let app: express.Application;

  const mockUser = {
    id: 1,
    organizationId: 1,
    email: 'user@example.com',
    name: 'Test User',
    isAdmin: false,
    department: 'Engineering',
    status: 'active',
  };

  const mockAdmin = {
    id: 2,
    organizationId: 1,
    email: 'admin@example.com',
    name: 'Admin User',
    isAdmin: true,
    department: 'Administration',
    status: 'active',
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/users', userRouter);
    jest.clearAllMocks();

    // Default auth middleware behavior
    mockedVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = mockUser;
      next();
    });

    mockedVerifyAdmin.mockImplementation((req: any, res, next) => {
      if (req.user?.is_admin) {
        next();
      } else {
        res.status(403).json({ message: 'Admin access required' });
      }
    });
  });

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      mockedStorage.getUser = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app).get('/users/me');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
      expect(mockedStorage.getUser).toHaveBeenCalledWith(1);
    });

    it('should handle user not found', async () => {
      mockedStorage.getUser = jest.fn().mockResolvedValue(undefined);

      const response = await request(app).get('/users/me');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should include balance information', async () => {
      const userWithBalance = {
        ...mockUser,
        balance: 1500,
      };

      mockedStorage.getUser = jest.fn().mockResolvedValue(userWithBalance);

      const response = await request(app).get('/users/me');

      expect(response.status).toBe(200);
      expect(response.body.balance).toBe(1500);
    });
  });

  describe('PATCH /users/me', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        phoneNumber: '+1-555-0123',
        aboutMe: 'Updated bio',
      };

      const updatedUser = {
        ...mockUser,
        ...updateData,
      };

      mockedStorage.updateUser = jest.fn().mockResolvedValue(updatedUser);

      const response = await request(app)
        .patch('/users/me')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedUser);
      expect(mockedStorage.updateUser).toHaveBeenCalledWith(1, updateData);
    });

    it('should validate email format', async () => {
      const invalidData = {
        email: 'invalid-email-format',
      };

      const response = await request(app)
        .patch('/users/me')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid email format');
    });

    it('should prevent updating protected fields', async () => {
      const protectedData = {
        id: 999,
        organizationId: 999,
        isAdmin: true,
        balance: 10000,
      };

      mockedStorage.updateUser = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .patch('/users/me')
        .send(protectedData);

      // Should filter out protected fields
      expect(mockedStorage.updateUser).not.toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({
          id: 999,
          organizationId: 999,
          isAdmin: true,
          balance: 10000,
        })
      );
    });

    it('should handle storage errors', async () => {
      mockedStorage.updateUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .patch('/users/me')
        .send({ name: 'New Name' });

      expect(response.status).toBe(500);
    });
  });

  describe('GET /users', () => {
    beforeEach(() => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = mockAdmin;
        next();
      });
    });

    it('should return filtered users for organization', async () => {
      const mockUsers = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          department: 'Engineering',
          status: 'active',
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          department: 'Marketing',
          status: 'active',
        },
      ];

      mockedStorage.getUsers = jest.fn().mockResolvedValue(mockUsers);
      mockedStorage.getUserCount = jest.fn().mockResolvedValue({
        totalUsers: 50,
        activeUsers: 45,
      });

      const response = await request(app).get('/users');

      expect(response.status).toBe(200);
      expect(response.body.users).toEqual(mockUsers);
      expect(response.body.pagination.totalUsers).toBe(50);
      expect(response.body.pagination.activeUsers).toBe(45);
    });

    it('should handle pagination parameters', async () => {
      mockedStorage.getUsers = jest.fn().mockResolvedValue([]);
      mockedStorage.getUserCount = jest.fn().mockResolvedValue({
        totalUsers: 0,
        activeUsers: 0,
      });

      const response = await request(app)
        .get('/users')
        .query({ page: '2', limit: '10' });

      expect(response.status).toBe(200);
      expect(mockedStorage.getUsers).toHaveBeenCalledWith(
        1, // organizationId
        undefined, // filters
        10, // offset (page 2 * limit 10 - limit 10)
        10 // limit
      );
    });

    it('should apply search filter', async () => {
      mockedStorage.getUsers = jest.fn().mockResolvedValue([]);
      mockedStorage.getUserCount = jest.fn().mockResolvedValue({
        totalUsers: 0,
        activeUsers: 0,
      });

      const response = await request(app)
        .get('/users')
        .query({ search: 'john' });

      expect(response.status).toBe(200);
      expect(mockedStorage.getUsers).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ search: 'john' }),
        0,
        50
      );
    });

    it('should apply department filter', async () => {
      mockedStorage.getUsers = jest.fn().mockResolvedValue([]);
      mockedStorage.getUserCount = jest.fn().mockResolvedValue({
        totalUsers: 0,
        activeUsers: 0,
      });

      const response = await request(app)
        .get('/users')
        .query({ department: 'Engineering' });

      expect(response.status).toBe(200);
      expect(mockedStorage.getUsers).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ department: 'Engineering' }),
        0,
        50
      );
    });

    it('should apply status filter', async () => {
      mockedStorage.getUsers = jest.fn().mockResolvedValue([]);
      mockedStorage.getUserCount = jest.fn().mockResolvedValue({
        totalUsers: 0,
        activeUsers: 0,
      });

      const response = await request(app)
        .get('/users')
        .query({ status: 'active' });

      expect(response.status).toBe(200);
      expect(mockedStorage.getUsers).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: 'active' }),
        0,
        50
      );
    });

    it('should require admin access', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = mockUser; // Regular user
        next();
      });

      const response = await request(app).get('/users');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /users/:id', () => {
    beforeEach(() => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = mockAdmin;
        next();
      });
    });

    it('should return specific user profile', async () => {
      const targetUser = {
        id: 3,
        name: 'Target User',
        email: 'target@example.com',
        organizationId: 1,
        department: 'Sales',
      };

      mockedStorage.getUser = jest.fn().mockResolvedValue(targetUser);

      const response = await request(app).get('/users/3');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(targetUser);
    });

    it('should handle user not found', async () => {
      mockedStorage.getUser = jest.fn().mockResolvedValue(undefined);

      const response = await request(app).get('/users/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should prevent access to users from different organization', async () => {
      const otherOrgUser = {
        id: 3,
        name: 'Other User',
        organizationId: 2, // Different organization
      };

      mockedStorage.getUser = jest.fn().mockResolvedValue(otherOrgUser);

      const response = await request(app).get('/users/3');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied');
    });

    it('should require admin access', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = mockUser; // Regular user
        next();
      });

      const response = await request(app).get('/users/3');

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /users/:id', () => {
    beforeEach(() => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = mockAdmin;
        next();
      });
    });

    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        department: 'Engineering',
        jobTitle: 'Senior Developer',
        status: 'active',
      };

      const existingUser = {
        id: 3,
        organizationId: 1,
        email: 'user@example.com',
      };

      const updatedUser = {
        ...existingUser,
        ...updateData,
      };

      mockedStorage.getUser = jest.fn().mockResolvedValue(existingUser);
      mockedStorage.updateUser = jest.fn().mockResolvedValue(updatedUser);

      const response = await request(app)
        .patch('/users/3')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedUser);
    });

    it('should handle user not found', async () => {
      mockedStorage.getUser = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .patch('/users/999')
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
    });

    it('should prevent updating users from different organization', async () => {
      const otherOrgUser = {
        organizationId: 2, // Different organization
      };

      mockedStorage.getUser = jest.fn().mockResolvedValue(otherOrgUser);

      const response = await request(app)
        .patch('/users/3')
        .send({ name: 'New Name' });

      expect(response.status).toBe(403);
    });

    it('should validate status values', async () => {
      const existingUser = {
        id: 3,
        organizationId: 1,
      };

      mockedStorage.getUser = jest.fn().mockResolvedValue(existingUser);

      const response = await request(app)
        .patch('/users/3')
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /users/departments', () => {
    it('should return unique departments for organization', async () => {
      const mockDepartments = ['Engineering', 'Marketing', 'Sales', 'HR'];

      mockedDb.selectDistinct = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(
            mockDepartments.map(dept => ({ department: dept }))
          ),
        }),
      });

      const response = await request(app).get('/users/departments');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockDepartments);
    });

    it('should filter out null departments', async () => {
      const mockResults = [
        { department: 'Engineering' },
        { department: null },
        { department: 'Marketing' },
        { department: '' },
      ];

      mockedDb.selectDistinct = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockResults),
        }),
      });

      const response = await request(app).get('/users/departments');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(['Engineering', 'Marketing']);
    });
  });

  describe('GET /users/locations', () => {
    it('should return unique locations for organization', async () => {
      const mockLocations = ['New York', 'San Francisco', 'London', 'Tokyo'];

      mockedDb.selectDistinct = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(
            mockLocations.map(loc => ({ location: loc }))
          ),
        }),
      });

      const response = await request(app).get('/users/locations');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLocations);
    });
  });

  describe('GET /users/:id/balance', () => {
    it('should return user balance', async () => {
      mockedStorage.getUserBalance = jest.fn().mockResolvedValue(1250);

      const response = await request(app).get('/users/1/balance');

      expect(response.status).toBe(200);
      expect(response.body.balance).toBe(1250);
    });

    it('should only allow users to check their own balance', async () => {
      const response = await request(app).get('/users/999/balance');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied');
    });

    it('should allow admins to check any user balance', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = mockAdmin;
        next();
      });

      mockedStorage.getUserBalance = jest.fn().mockResolvedValue(750);

      const response = await request(app).get('/users/1/balance');

      expect(response.status).toBe(200);
      expect(response.body.balance).toBe(750);
    });
  });

  describe('GET /users/:id/transactions', () => {
    it('should return user transaction history', async () => {
      const mockTransactions = [
        {
          id: 1,
          amount: 100,
          type: 'recognition',
          description: 'Great work!',
          createdAt: new Date(),
        },
        {
          id: 2,
          amount: -50,
          type: 'purchase',
          description: 'Coffee shop voucher',
          createdAt: new Date(),
        },
      ];

      mockedStorage.getTransactions = jest.fn().mockResolvedValue(mockTransactions);

      const response = await request(app).get('/users/1/transactions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTransactions);
    });

    it('should only allow users to check their own transactions', async () => {
      const response = await request(app).get('/users/999/transactions');

      expect(response.status).toBe(403);
    });

    it('should handle pagination for transactions', async () => {
      mockedStorage.getTransactions = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/users/1/transactions')
        .query({ limit: '25' });

      expect(response.status).toBe(200);
      expect(mockedStorage.getTransactions).toHaveBeenCalledWith(1, 25);
    });
  });

  describe('Authorization', () => {
    it('should require authentication for all routes', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const response = await request(app).get('/users/me');

      expect(response.status).toBe(401);
    });

    it('should handle missing user context', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        // No user attached
        next();
      });

      const response = await request(app).get('/users/me');

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockedStorage.getUser = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const response = await request(app).get('/users/me');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should handle invalid user ID format', async () => {
      const response = await request(app).get('/users/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid user ID format');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .patch('/users/me')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Data Validation', () => {
    it('should sanitize user input', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>John Doe',
        aboutMe: 'Hello <b>world</b>',
      };

      const sanitizedUser = {
        ...mockUser,
        name: 'John Doe', // Script tags removed
        aboutMe: 'Hello world', // HTML tags removed
      };

      mockedStorage.updateUser = jest.fn().mockResolvedValue(sanitizedUser);

      const response = await request(app)
        .patch('/users/me')
        .send(maliciousData);

      expect(response.status).toBe(200);
      expect(response.body.name).not.toContain('<script>');
    });

    it('should validate phone number format', async () => {
      const invalidData = {
        phoneNumber: 'not-a-phone-number',
      };

      const response = await request(app)
        .patch('/users/me')
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it('should enforce maximum length constraints', async () => {
      const tooLongData = {
        aboutMe: 'x'.repeat(1001), // Too long
      };

      const response = await request(app)
        .patch('/users/me')
        .send(tooLongData);

      expect(response.status).toBe(400);
    });
  });
});