import request from 'supertest';
import express from 'express';
import authRoutes from './authRoutes';
import { storage } from '../storage';
import { generateToken } from '../middleware/auth';
import { checkSubscriptionStatus } from '../services/subscriptionService';

jest.mock('../storage');
jest.mock('../middleware/auth');
jest.mock('../services/subscriptionService');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockGenerateToken = generateToken as jest.MockedFunction<typeof generateToken>;
const mockCheckSubscriptionStatus = checkSubscriptionStatus as jest.MockedFunction<typeof checkSubscriptionStatus>;

describe('Auth Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  describe('POST /api/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
        organizationId: 1,
        isAdmin: false,
        status: 'active',
      };
      
      const mockOrg = {
        id: 1,
        name: 'Test Org',
        status: 'active',
      };
      
      mockStorage.validateUser.mockResolvedValue(mockUser);
      mockStorage.getOrganization.mockResolvedValue(mockOrg);
      mockCheckSubscriptionStatus.mockResolvedValue(true);
      mockGenerateToken.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        user: mockUser,
        token: 'mock-jwt-token',
      });
      expect(mockStorage.updateLastSeenAt).toHaveBeenCalledWith(1);
    });

    it('should reject invalid credentials', async () => {
      mockStorage.validateUser.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'wronguser',
          password: 'wrongpass',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject inactive user', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        status: 'inactive',
        organizationId: 1,
      };
      
      mockStorage.validateUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('account is not active');
    });

    it('should handle inactive organization with subscription popup', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        organizationId: 1,
        isAdmin: false,
        status: 'active',
      };
      
      const mockOrg = {
        id: 1,
        name: 'Test Org',
        status: 'inactive',
        superuserEmail: 'admin@org.com',
      };
      
      mockStorage.validateUser.mockResolvedValue(mockUser);
      mockStorage.getOrganization.mockResolvedValue(mockOrg);
      mockCheckSubscriptionStatus.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('The system is inactive');
      expect(response.body.message).toContain('admin@org.com');
      expect(response.body.showSubscriptionPopup).toBe(true);
    });

    it('should allow corporate admin to bypass subscription check', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        organizationId: 1,
        isAdmin: true,
        adminScope: 'super',
        status: 'active',
      };
      
      const mockOrg = {
        id: 1,
        status: 'active',
      };
      
      mockStorage.validateUser.mockResolvedValue(mockUser);
      mockStorage.getOrganization.mockResolvedValue(mockOrg);
      mockGenerateToken.mockReturnValue('admin-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'adminpass',
        });

      expect(response.status).toBe(200);
      expect(mockCheckSubscriptionStatus).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new user with active subscription check', async () => {
      const userData = {
        username: 'newuser',
        password: 'password123',
        name: 'New User',
        email: 'new@test.com',
        organizationId: 1,
      };
      
      const mockOrg = {
        id: 1,
        name: 'Test Org',
        status: 'active',
      };
      
      const mockSubscription = {
        id: 1,
        subscribedUsers: 100,
        isActive: true,
      };
      
      const createdUser = {
        id: 100,
        ...userData,
      };
      
      mockStorage.checkDuplicateUser.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });
      mockStorage.getOrganization.mockResolvedValue(mockOrg);
      mockStorage.getActiveSubscriptionForOrg.mockResolvedValue(mockSubscription);
      mockStorage.getUserCount.mockResolvedValue(50); // Under limit
      mockStorage.createUser.mockResolvedValue(createdUser);
      mockGenerateToken.mockReturnValue('new-user-token');

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        user: createdUser,
        token: 'new-user-token',
      });
    });

    it('should reject registration if subscription limit exceeded', async () => {
      const userData = {
        username: 'newuser',
        password: 'password123',
        name: 'New User',
        email: 'new@test.com',
        organizationId: 1,
      };
      
      const mockOrg = {
        id: 1,
        status: 'active',
      };
      
      const mockSubscription = {
        id: 1,
        subscribedUsers: 50,
        isActive: true,
      };
      
      mockStorage.checkDuplicateUser.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });
      mockStorage.getOrganization.mockResolvedValue(mockOrg);
      mockStorage.getActiveSubscriptionForOrg.mockResolvedValue(mockSubscription);
      mockStorage.getUserCount.mockResolvedValue(50); // At limit

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('exceeded user limit');
    });

    it('should count only active employees for capacity', async () => {
      mockStorage.getUserCount.mockResolvedValue(45); // Active users count
      
      // Mock subscription with limit
      mockStorage.getActiveSubscriptionForOrg.mockResolvedValue({
        subscribedUsers: 50,
        isActive: true,
      });
      
      // Other mocks for successful registration
      mockStorage.checkDuplicateUser.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });
      mockStorage.getOrganization.mockResolvedValue({
        id: 1,
        status: 'active',
      });
      mockStorage.createUser.mockResolvedValue({ id: 100 });
      mockGenerateToken.mockReturnValue('token');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: 'pass123',
          name: 'New',
          email: 'new@test.com',
          organizationId: 1,
        });

      expect(response.status).toBe(201);
      expect(mockStorage.getUserCount).toHaveBeenCalledWith(1, 'active');
    });

    it('should reject duplicate username', async () => {
      mockStorage.checkDuplicateUser.mockResolvedValue({
        usernameExists: true,
        emailExists: false,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existinguser',
          password: 'pass123',
          name: 'Test',
          email: 'test@test.com',
          organizationId: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Username already exists');
    });

    it('should reject duplicate email', async () => {
      mockStorage.checkDuplicateUser.mockResolvedValue({
        usernameExists: false,
        emailExists: true,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: 'pass123',
          name: 'Test',
          email: 'existing@test.com',
          organizationId: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Email already exists');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
      };
      
      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockStorage.createPasswordResetToken.mockResolvedValue('reset-token-123');

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Password reset email sent');
      expect(mockStorage.createPasswordResetToken).toHaveBeenCalledWith(1);
    });

    it('should not reveal if email exists', async () => {
      mockStorage.getUserByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('If your email exists');
    });
  });
});