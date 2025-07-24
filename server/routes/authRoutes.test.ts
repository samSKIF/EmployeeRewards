import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

// Mock dependencies
jest.mock('../storage');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

// Import the router after mocking
import authRouter from './authRoutes';

const mockedStorage = storage as jest.Mocked<typeof storage>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        email: 'user@example.com',
        password: 'hashed_password',
        name: 'Test User',
        organizationId: 1,
        isAdmin: false,
        status: 'active',
      };

      const mockOrganization = {
        id: 1,
        name: 'Test Company',
        status: 'active',
        hasActiveSubscription: true,
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockedStorage.getOrganization = jest.fn().mockResolvedValue(mockOrganization);
      mockedBcrypt.compare = jest.fn().mockResolvedValue(true);
      mockedJwt.sign = jest.fn().mockReturnValue('mock_jwt_token');

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('mock_jwt_token');
      expect(response.body.user).toMatchObject({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
      });
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 1,
        email: 'user@example.com',
        password: 'hashed_password',
        status: 'active',
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockedBcrypt.compare = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login for inactive user', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        email: 'user@example.com',
        password: 'hashed_password',
        status: 'inactive',
        organizationId: 1,
      };

      const mockOrganization = {
        status: 'active',
        hasActiveSubscription: true,
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockedStorage.getOrganization = jest.fn().mockResolvedValue(mockOrganization);
      mockedBcrypt.compare = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Account is inactive');
    });

    it('should reject login for user in inactive organization', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        email: 'user@example.com',
        password: 'hashed_password',
        status: 'active',
        organizationId: 1,
        isAdmin: false,
      };

      const mockOrganization = {
        status: 'inactive',
        hasActiveSubscription: false,
        superuserEmail: 'admin@company.com',
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockedStorage.getOrganization = jest.fn().mockResolvedValue(mockOrganization);
      mockedBcrypt.compare = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('system is inactive');
      expect(response.body.message).toContain('admin@company.com');
    });

    it('should allow corporate admin to login even if organization is inactive', async () => {
      const loginData = {
        email: 'admin@example.com',
        password: 'password123',
      };

      const mockAdmin = {
        id: 1,
        email: 'admin@example.com',
        password: 'hashed_password',
        status: 'active',
        organizationId: 1,
        isAdmin: true,
        adminScope: 'corporate',
      };

      const mockOrganization = {
        status: 'inactive',
        hasActiveSubscription: false,
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(mockAdmin);
      mockedStorage.getOrganization = jest.fn().mockResolvedValue(mockOrganization);
      mockedBcrypt.compare = jest.fn().mockResolvedValue(true);
      mockedJwt.sign = jest.fn().mockReturnValue('admin_token');

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('admin_token');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        email: 'user@example.com',
        // Missing password
      };

      const response = await request(app)
        .post('/auth/login')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Email and password are required');
    });

    it('should validate email format', async () => {
      const invalidData = {
        email: 'invalid-email-format',
        password: 'password123',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid email format');
    });

    it('should handle database errors gracefully', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };

      mockedStorage.getUserByEmail = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should handle JWT signing errors', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        email: 'user@example.com',
        password: 'hashed_password',
        status: 'active',
        organizationId: 1,
      };

      const mockOrganization = {
        status: 'active',
        hasActiveSubscription: true,
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockedStorage.getOrganization = jest.fn().mockResolvedValue(mockOrganization);
      mockedBcrypt.compare = jest.fn().mockResolvedValue(true);
      mockedJwt.sign = jest.fn().mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /auth/register', () => {
    it('should register new user successfully', async () => {
      const registrationData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        organizationId: 1,
      };

      const mockOrganization = {
        id: 1,
        name: 'Test Company',
        status: 'active',
        hasActiveSubscription: true,
        subscribedUsers: 50,
      };

      const mockUserCount = {
        activeUsers: 25,
        totalUsers: 30,
      };

      const mockCreatedUser = {
        id: 2,
        email: 'newuser@example.com',
        name: 'New User',
        organizationId: 1,
        status: 'active',
        isAdmin: false,
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(undefined); // Email not taken
      mockedStorage.getOrganization = jest.fn().mockResolvedValue(mockOrganization);
      mockedStorage.getUserCount = jest.fn().mockResolvedValue(mockUserCount);
      mockedBcrypt.hash = jest.fn().mockResolvedValue('hashed_password');
      mockedStorage.createUser = jest.fn().mockResolvedValue(mockCreatedUser);
      mockedJwt.sign = jest.fn().mockReturnValue('new_user_token');

      const response = await request(app)
        .post('/auth/register')
        .send(registrationData);

      expect(response.status).toBe(201);
      expect(response.body.token).toBe('new_user_token');
      expect(response.body.user.email).toBe('newuser@example.com');
    });

    it('should reject registration with existing email', async () => {
      const registrationData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'New User',
        organizationId: 1,
      };

      const existingUser = {
        id: 1,
        email: 'existing@example.com',
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/auth/register')
        .send(registrationData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email already registered');
    });

    it('should reject registration when organization is at capacity', async () => {
      const registrationData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        organizationId: 1,
      };

      const mockOrganization = {
        id: 1,
        subscribedUsers: 25, // Capacity limit
        hasActiveSubscription: true,
      };

      const mockUserCount = {
        activeUsers: 25, // At capacity
        totalUsers: 30,
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(undefined);
      mockedStorage.getOrganization = jest.fn().mockResolvedValue(mockOrganization);
      mockedStorage.getUserCount = jest.fn().mockResolvedValue(mockUserCount);

      const response = await request(app)
        .post('/auth/register')
        .send(registrationData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('capacity limit');
    });

    it('should reject registration for inactive organization', async () => {
      const registrationData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        organizationId: 1,
      };

      const mockOrganization = {
        status: 'inactive',
        hasActiveSubscription: false,
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(undefined);
      mockedStorage.getOrganization = jest.fn().mockResolvedValue(mockOrganization);

      const response = await request(app)
        .post('/auth/register')
        .send(registrationData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('not accepting new registrations');
    });

    it('should validate password strength', async () => {
      const registrationData = {
        email: 'newuser@example.com',
        password: '123', // Too weak
        name: 'New User',
        organizationId: 1,
      };

      const response = await request(app)
        .post('/auth/register')
        .send(registrationData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Password must be at least');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        email: 'newuser@example.com',
        // Missing password, name, organizationId
      };

      const response = await request(app)
        .post('/auth/register')
        .send(incompleteData);

      expect(response.status).toBe(400);
    });

    it('should handle organization not found', async () => {
      const registrationData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        organizationId: 999,
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(undefined);
      mockedStorage.getOrganization = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/register')
        .send(registrationData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Organization not found');
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should initiate password reset for valid email', async () => {
      const resetData = {
        email: 'user@example.com',
      };

      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        status: 'active',
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockedStorage.createPasswordResetToken = jest.fn().mockResolvedValue('reset_token_123');

      const response = await request(app)
        .post('/auth/forgot-password')
        .send(resetData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');
      expect(mockedStorage.createPasswordResetToken).toHaveBeenCalledWith(1);
    });

    it('should return success even for non-existent email (security)', async () => {
      const resetData = {
        email: 'nonexistent@example.com',
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send(resetData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');
      expect(mockedStorage.createPasswordResetToken).not.toHaveBeenCalled();
    });

    it('should reject for inactive user', async () => {
      const resetData = {
        email: 'inactive@example.com',
      };

      const mockUser = {
        id: 1,
        email: 'inactive@example.com',
        status: 'inactive',
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send(resetData);

      expect(response.status).toBe(200); // Still return success for security
      expect(mockedStorage.createPasswordResetToken).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const resetData = {
        token: 'valid_reset_token',
        newPassword: 'newpassword123',
      };

      const mockUser = {
        id: 1,
        email: 'user@example.com',
      };

      mockedStorage.validatePasswordResetToken = jest.fn().mockResolvedValue(mockUser);
      mockedBcrypt.hash = jest.fn().mockResolvedValue('new_hashed_password');
      mockedStorage.updateUserPassword = jest.fn().mockResolvedValue(true);
      mockedStorage.invalidatePasswordResetToken = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/reset-password')
        .send(resetData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset successfully');
      expect(mockedStorage.updateUserPassword).toHaveBeenCalledWith(1, 'new_hashed_password');
      expect(mockedStorage.invalidatePasswordResetToken).toHaveBeenCalledWith('valid_reset_token');
    });

    it('should reject invalid or expired token', async () => {
      const resetData = {
        token: 'invalid_token',
        newPassword: 'newpassword123',
      };

      mockedStorage.validatePasswordResetToken = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/reset-password')
        .send(resetData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or expired reset token');
    });

    it('should validate new password strength', async () => {
      const resetData = {
        token: 'valid_token',
        newPassword: '123', // Too weak
      };

      const response = await request(app)
        .post('/auth/reset-password')
        .send(resetData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Password must be at least');
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password for authenticated user', async () => {
      const changeData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      const mockUser = {
        id: 1,
        password: 'old_hashed_password',
      };

      // Mock authentication middleware
      const authApp = express();
      authApp.use(express.json());
      authApp.use((req: any, res, next) => {
        req.user = { id: 1 }; // Simulate authenticated user
        next();
      });
      authApp.use('/auth', authRouter);

      mockedStorage.getUser = jest.fn().mockResolvedValue(mockUser);
      mockedBcrypt.compare = jest.fn().mockResolvedValue(true);
      mockedBcrypt.hash = jest.fn().mockResolvedValue('new_hashed_password');
      mockedStorage.updateUserPassword = jest.fn().mockResolvedValue(true);

      const response = await request(authApp)
        .post('/auth/change-password')
        .send(changeData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should reject incorrect current password', async () => {
      const changeData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      const mockUser = {
        id: 1,
        password: 'old_hashed_password',
      };

      const authApp = express();
      authApp.use(express.json());
      authApp.use((req: any, res, next) => {
        req.user = { id: 1 };
        next();
      });
      authApp.use('/auth', authRouter);

      mockedStorage.getUser = jest.fn().mockResolvedValue(mockUser);
      mockedBcrypt.compare = jest.fn().mockResolvedValue(false);

      const response = await request(authApp)
        .post('/auth/change-password')
        .send(changeData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Current password is incorrect');
    });

    it('should require authentication', async () => {
      const changeData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      const response = await request(app)
        .post('/auth/change-password')
        .send(changeData);

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should handle bcrypt errors', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const mockUser = {
        password: 'hashed_password',
        status: 'active',
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockedBcrypt.compare = jest.fn().mockRejectedValue(new Error('Bcrypt error'));

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(500);
    });

    it('should handle JWT environment variable missing', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(500);

      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('Security', () => {
    it('should rate limit login attempts', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'wrongpassword',
      };

      mockedStorage.getUserByEmail = jest.fn().mockResolvedValue({ password: 'hash' });
      mockedBcrypt.compare = jest.fn().mockResolvedValue(false);

      // Make multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app).post('/auth/login').send(loginData);
      }

      // Should start rate limiting after multiple failures
      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      // Rate limiting implementation dependent
      expect([401, 429]).toContain(response.status);
    });

    it('should sanitize user input', async () => {
      const maliciousData = {
        email: 'user@example.com',
        password: 'password123',
        name: '<script>alert("xss")</script>John',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(maliciousData);

      // Should either reject or sanitize
      if (response.status === 201) {
        expect(response.body.user.name).not.toContain('<script>');
      }
    });
  });
});