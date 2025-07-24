import request from 'supertest';
import express from 'express';
import userRoutes from './userRoutes';
import { storage } from '../storage';
import { verifyToken } from '../middleware/auth';
import { upload } from '../file-upload';

jest.mock('../storage');
jest.mock('../middleware/auth');
jest.mock('../file-upload');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('User Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    mockVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = {
        id: 1,
        email: 'test@test.com',
        organizationId: 1,
        isAdmin: false,
      };
      next();
    });
    
    app.use('/api/users', userRoutes);
  });

  describe('GET /api/users/me', () => {
    it('should return current user data', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        organizationId: 1,
        balance: 100,
      };
      
      mockStorage.getUser.mockResolvedValue(mockUser);
      mockStorage.getUserBalance.mockResolvedValue(100);

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...mockUser,
        balance: 100,
      });
    });

    it('should return 404 if user not found', async () => {
      mockStorage.getUser.mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update current user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        phoneNumber: '+1234567890',
        department: 'Engineering',
      };
      
      const updatedUser = {
        id: 1,
        ...updateData,
      };
      
      mockStorage.updateUser.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/api/users/me')
        .set('Authorization', 'Bearer test-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedUser);
      expect(mockStorage.updateUser).toHaveBeenCalledWith(1, updateData);
    });

    it('should not allow updating sensitive fields', async () => {
      const updateData = {
        name: 'Updated Name',
        isAdmin: true, // Should be filtered out
        organizationId: 2, // Should be filtered out
      };
      
      mockStorage.updateUser.mockResolvedValue({ id: 1 });

      await request(app)
        .put('/api/users/me')
        .set('Authorization', 'Bearer test-token')
        .send(updateData);

      expect(mockStorage.updateUser).toHaveBeenCalledWith(1, {
        name: 'Updated Name',
      });
    });
  });

  describe('GET /api/users', () => {
    it('should return users for organization', async () => {
      const mockUsers = [
        { id: 1, name: 'User 1', organizationId: 1 },
        { id: 2, name: 'User 2', organizationId: 1 },
      ];
      
      mockStorage.getUsers.mockResolvedValue(mockUsers);
      mockStorage.getUserCount.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUsers);
      expect(mockStorage.getUsers).toHaveBeenCalledWith(1, 10, 0);
    });

    it('should support pagination', async () => {
      mockStorage.getUsers.mockResolvedValue([]);
      mockStorage.getUserCount.mockResolvedValue(0);

      await request(app)
        .get('/api/users')
        .query({ limit: 20, offset: 40 })
        .set('Authorization', 'Bearer test-token');

      expect(mockStorage.getUsers).toHaveBeenCalledWith(1, 20, 40);
    });

    it('should filter active users only when requested', async () => {
      mockStorage.getUsers.mockResolvedValue([]);
      mockStorage.getUserCount.mockResolvedValue(0);

      await request(app)
        .get('/api/users')
        .query({ status: 'active' })
        .set('Authorization', 'Bearer test-token');

      expect(mockStorage.getUsers).toHaveBeenCalledWith(1, 10, 0, 'active');
      expect(mockStorage.getUserCount).toHaveBeenCalledWith(1, 'active');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 5,
        name: 'Other User',
        organizationId: 1,
        balance: 200,
      };
      
      mockStorage.getUser.mockResolvedValue(mockUser);
      mockStorage.getUserBalance.mockResolvedValue(200);

      const response = await request(app)
        .get('/api/users/5')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...mockUser,
        balance: 200,
      });
    });

    it('should prevent accessing users from other organizations', async () => {
      const mockUser = {
        id: 5,
        organizationId: 2, // Different org
      };
      
      mockStorage.getUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/5')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/users/me/avatar', () => {
    it('should upload avatar successfully', async () => {
      const mockFile = {
        filename: 'avatar.jpg',
        path: '/uploads/avatar.jpg',
      };
      
      // Mock multer upload
      (upload.single as jest.Mock) = jest.fn(() => (req: any, res: any, next: any) => {
        req.file = mockFile;
        next();
      });
      
      mockStorage.updateUser.mockResolvedValue({
        id: 1,
        avatarUrl: '/uploads/avatar.jpg',
      });

      const response = await request(app)
        .post('/api/users/me/avatar')
        .set('Authorization', 'Bearer test-token')
        .attach('avatar', Buffer.from('fake-image'), 'avatar.jpg');

      expect(response.status).toBe(200);
      expect(response.body.avatarUrl).toBe('/uploads/avatar.jpg');
    });
  });

  describe('GET /api/users/departments', () => {
    it('should return unique departments', async () => {
      const mockDepartments = ['Engineering', 'Marketing', 'Sales'];
      
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
    it('should return unique locations', async () => {
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

  describe('POST /api/users/change-password', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: 1,
        password: 'old_hashed_password',
      };
      
      mockStorage.getUser.mockResolvedValue(mockUser);
      mockStorage.validatePassword.mockResolvedValue(true); // Old password valid
      mockStorage.updateUserPassword.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', 'Bearer test-token')
        .send({
          currentPassword: 'oldpass123',
          newPassword: 'newpass123',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password updated successfully');
    });

    it('should reject incorrect current password', async () => {
      mockStorage.getUser.mockResolvedValue({ id: 1 });
      mockStorage.validatePassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', 'Bearer test-token')
        .send({
          currentPassword: 'wrongpass',
          newPassword: 'newpass123',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Current password is incorrect');
    });
  });

  describe('GET /api/users/search', () => {
    it('should search users by query', async () => {
      const searchResults = [
        { id: 2, name: 'John Doe', department: 'Engineering' },
        { id: 3, name: 'John Smith', department: 'Sales' },
      ];
      
      mockStorage.searchUsers.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'John' })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(searchResults);
      expect(mockStorage.searchUsers).toHaveBeenCalledWith(1, 'John');
    });
  });
});