import request from 'supertest';
import express from 'express';
import adminRoutes from './adminRoutes';
import { storage } from '../storage';
import { verifyToken, verifyAdmin } from '../middleware/auth';

// Mock dependencies
jest.mock('../storage');
jest.mock('../middleware/auth');
jest.mock('../db');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockVerifyAdmin = verifyAdmin as jest.MockedFunction<typeof verifyAdmin>;

describe('Admin Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    
    // Mock auth middleware to pass with admin user
    mockVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = {
        id: 1,
        email: 'admin@test.com',
        organizationId: 1,
        isAdmin: true,
        adminScope: 'super',
      };
      next();
    });
    
    mockVerifyAdmin.mockImplementation((req, res, next) => {
      next();
    });
    
    app.use('/api/admin', adminRoutes);
  });

  describe('GET /api/admin/users', () => {
    it('should return all users for admin', async () => {
      const mockUsers = [
        { id: 1, name: 'User 1', organizationId: 1, status: 'active' },
        { id: 2, name: 'User 2', organizationId: 1, status: 'inactive' },
      ];
      
      mockStorage.getUsers.mockResolvedValue(mockUsers);
      mockStorage.getUserCount.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUsers);
    });

    it('should return 403 for non-admin', async () => {
      mockVerifyAdmin.mockImplementation((req, res, next) => {
        res.status(403).json({ message: 'Admin access required' });
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer user-token');

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('should update user data with field mapping', async () => {
      const updateData = {
        name: 'Updated Name',
        birthDate: '1990-01-01', // Frontend camelCase
        phoneNumber: '+1234567890',
        jobTitle: 'Senior Developer',
        hireDate: '2020-01-01',
        avatarUrl: 'https://example.com/avatar.jpg',
        managerEmail: 'manager@test.com',
      };
      
      const mockUpdatedUser = {
        id: 2,
        ...updateData,
        organizationId: 1,
      };
      
      mockStorage.updateUser.mockResolvedValue(mockUpdatedUser);

      const response = await request(app)
        .put('/api/admin/users/2')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'User updated successfully',
        user: mockUpdatedUser,
      });
      
      // Verify field mapping from camelCase to snake_case
      expect(mockStorage.updateUser).toHaveBeenCalledWith(2, {
        name: 'Updated Name',
        birth_date: '1990-01-01', // Mapped to snake_case
        phone_number: '+1234567890',
        job_title: 'Senior Developer',
        hire_date: '2020-01-01',
        avatar_url: 'https://example.com/avatar.jpg',
        manager_email: 'manager@test.com',
      });
    });

    it('should handle status updates', async () => {
      const updateData = { status: 'inactive' };
      
      mockStorage.updateUser.mockResolvedValue({
        id: 2,
        status: 'inactive',
      });

      const response = await request(app)
        .put('/api/admin/users/2')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(mockStorage.updateUser).toHaveBeenCalledWith(2, { status: 'inactive' });
    });

    it('should return 404 if user not found', async () => {
      mockStorage.updateUser.mockRejectedValue(new Error('User not found'));

      const response = await request(app)
        .put('/api/admin/users/999')
        .set('Authorization', 'Bearer admin-token')
        .send({ name: 'Test' });

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete user', async () => {
      mockStorage.deleteUser.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/admin/users/2')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');
    });

    it('should prevent deleting self', async () => {
      const response = await request(app)
        .delete('/api/admin/users/1') // Same as admin's ID
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('cannot delete yourself');
    });
  });

  describe('POST /api/admin/users', () => {
    it('should create new user with auto-generated username', async () => {
      const newUserData = {
        email: 'newuser@test.com',
        name: 'New',
        surname: 'User',
        department: 'Engineering',
        jobTitle: 'Developer',
        organizationId: 1,
      };
      
      const createdUser = {
        id: 3,
        ...newUserData,
        username: 'new.user',
        password: 'hashedpassword',
      };
      
      mockStorage.checkDuplicateUser.mockResolvedValue({
        emailExists: false,
        nameExists: false,
      });
      mockStorage.createUser.mockResolvedValue(createdUser);

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', 'Bearer admin-token')
        .send(newUserData);

      expect(response.status).toBe(201);
      expect(response.body.user).toMatchObject({
        email: 'newuser@test.com',
        name: 'New',
        surname: 'User',
      });
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      mockStorage.checkDuplicateUser.mockResolvedValue({
        emailExists: true,
        nameExists: false,
      });

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', 'Bearer admin-token')
        .send({
          email: 'existing@test.com',
          name: 'Test',
          surname: 'User',
          organizationId: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('Multi-tenant admin access', () => {
    it('should allow corporate admin to manage users across organizations', async () => {
      mockStorage.getUsers.mockResolvedValue([
        { id: 1, organizationId: 1 },
        { id: 2, organizationId: 2 }, // Different org
      ]);

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer admin-token')
        .query({ organizationId: 2 });

      expect(response.status).toBe(200);
    });

    it('should restrict client admin to their organization', async () => {
      // Set client admin (not corporate)
      mockVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = {
          id: 1,
          organizationId: 1,
          isAdmin: true,
          adminScope: 'site', // Client admin
        };
        next();
      });

      mockStorage.getUsers.mockResolvedValue([]);

      await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer admin-token');

      // Should only query their own organization
      expect(mockStorage.getUsers).toHaveBeenCalledWith(
        1, // Their organization ID
        expect.any(Number),
        expect.any(Number),
        undefined
      );
    });
  });

  describe('Bulk operations', () => {
    it('should update multiple users status', async () => {
      mockStorage.updateUserStatus.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/admin/users/bulk-status')
        .set('Authorization', 'Bearer admin-token')
        .send({
          userIds: [2, 3, 4],
          status: 'inactive',
        });

      expect(response.status).toBe(200);
      expect(mockStorage.updateUserStatus).toHaveBeenCalledTimes(3);
    });

    it('should validate bulk operation data', async () => {
      const response = await request(app)
        .post('/api/admin/users/bulk-status')
        .set('Authorization', 'Bearer admin-token')
        .send({
          userIds: [], // Empty array
          status: 'inactive',
        });

      expect(response.status).toBe(400);
    });
  });
});