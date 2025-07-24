import request from 'supertest';
import express from 'express';
import authRoutes from './authRoutes';
import { storage } from '../storage';
import { generateToken } from '../middleware/auth';

// Mock dependencies
jest.mock('../storage');
jest.mock('../middleware/auth');
jest.mock('../db');
jest.mock('../services/subscriptionService');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockGenerateToken = generateToken as jest.MockedFunction<typeof generateToken>;

describe('Auth Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'hashedpassword',
        name: 'Test User',
        isAdmin: false,
        organizationId: 1,
        status: 'active',
      };
      
      const mockOrganization = {
        id: 1,
        name: 'Test Org',
        status: 'active',
      };
      
      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockStorage.verifyPassword.mockResolvedValue(true);
      mockStorage.getOrganization.mockResolvedValue(mockOrganization);
      mockStorage.checkSubscriptionStatus.mockResolvedValue(true);
      mockGenerateToken.mockReturnValue('test-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        token: 'test-token',
        user: {
          id: 1,
          email: 'test@test.com',
          name: 'Test User',
        },
      });
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject login with invalid email', async () => {
      mockStorage.getUserByEmail.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'hashedpassword',
      };
      
      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockStorage.verifyPassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login for inactive user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'hashedpassword',
        status: 'inactive',
      };
      
      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockStorage.verifyPassword.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('inactive');
    });

    it('should reject login for organization without active subscription', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'hashedpassword',
        organizationId: 1,
        status: 'active',
        isAdmin: false, // Not corporate admin
      };
      
      const mockOrganization = {
        id: 1,
        name: 'Test Org',
        status: 'inactive',
        superuserEmail: 'admin@org.com',
      };
      
      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockStorage.verifyPassword.mockResolvedValue(true);
      mockStorage.getOrganization.mockResolvedValue(mockOrganization);
      mockStorage.checkSubscriptionStatus.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('inactive');
      expect(response.body.message).toContain('admin@org.com');
    });

    it('should allow corporate admin to login even without subscription', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@test.com',
        password: 'hashedpassword',
        organizationId: 1,
        status: 'active',
        isAdmin: true,
        adminScope: 'super',
      };
      
      mockStorage.getUserByEmail.mockResolvedValue(mockUser);
      mockStorage.verifyPassword.mockResolvedValue(true);
      mockGenerateToken.mockReturnValue('admin-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('admin-token');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          // Missing password
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new user with valid data', async () => {
      const newUserData = {
        email: 'newuser@test.com',
        password: 'password123',
        name: 'New',
        surname: 'User',
        organizationId: 1,
      };
      
      const mockOrganization = {
        id: 1,
        status: 'active',
      };
      
      const createdUser = {
        id: 2,
        ...newUserData,
        username: 'new.user',
        password: 'hashedpassword',
      };
      
      mockStorage.checkDuplicateUser.mockResolvedValue({
        emailExists: false,
        nameExists: false,
      });
      mockStorage.getOrganization.mockResolvedValue(mockOrganization);
      mockStorage.getUserCount.mockResolvedValue(10); // Under limit
      mockStorage.getActiveSubscriptionLimit.mockResolvedValue(50);
      mockStorage.createUser.mockResolvedValue(createdUser);
      mockGenerateToken.mockReturnValue('new-token');

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUserData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        token: 'new-token',
        user: {
          id: 2,
          email: 'newuser@test.com',
          name: 'New',
        },
      });
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject registration with duplicate email', async () => {
      mockStorage.checkDuplicateUser.mockResolvedValue({
        emailExists: true,
        nameExists: false,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@test.com',
          password: 'password123',
          name: 'New',
          surname: 'User',
          organizationId: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should reject registration when organization at user limit', async () => {
      mockStorage.checkDuplicateUser.mockResolvedValue({
        emailExists: false,
        nameExists: false,
      });
      mockStorage.getOrganization.mockResolvedValue({ id: 1, status: 'active' });
      mockStorage.getUserCount.mockResolvedValue(50); // At limit
      mockStorage.getActiveSubscriptionLimit.mockResolvedValue(50);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New',
          surname: 'User',
          organizationId: 1,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('user limit');
    });

    it('should only count active users for limit', async () => {
      mockStorage.checkDuplicateUser.mockResolvedValue({
        emailExists: false,
        nameExists: false,
      });
      mockStorage.getOrganization.mockResolvedValue({ id: 1, status: 'active' });
      mockStorage.getUserCount.mockResolvedValue(45); // Active users under limit
      mockStorage.getActiveSubscriptionLimit.mockResolvedValue(50);
      mockStorage.createUser.mockResolvedValue({
        id: 2,
        email: 'newuser@test.com',
      });
      mockGenerateToken.mockReturnValue('token');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New',
          surname: 'User',
          organizationId: 1,
        });

      expect(response.status).toBe(201);
      expect(mockStorage.getUserCount).toHaveBeenCalledWith(1, 'active');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'New',
          surname: 'User',
          organizationId: 1,
        });

      expect(response.status).toBe(400);
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: '123', // Too short
          name: 'New',
          surname: 'User',
          organizationId: 1,
        });

      expect(response.status).toBe(400);
    });
  });
});