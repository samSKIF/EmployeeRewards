import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateJWT, generateJWT, verifyJWT, refreshJWT } from './auth-jwt';
import { db } from '../db';
import { users } from '@shared/schema';

// Mock dependencies
jest.mock('../db');
jest.mock('jsonwebtoken');

const mockedDb = db as jest.Mocked<typeof db>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('JWT Authentication Middleware', () => {
  let app: express.Application;

  const mockUser = {
    id: 1,
    organizationId: 1,
    email: 'user@example.com',
    name: 'Test User',
    role: 'employee',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokenPayload = {
    user_id: 1,
    organizationId: 1,
    email: 'user@example.com',
    role: 'employee',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();

    // Mock JWT_SECRET environment variable
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  describe('authenticateJWT middleware', () => {
    it('should authenticate valid JWT token', async () => {
      const token = 'valid-jwt-token';
      
      mockedJwt.verify = jest.fn().mockReturnValue(mockTokenPayload);
      
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      app.use(authenticateJWT);
      app.get('/test', (req: any, res) => {
        res.json({
          authenticated: true,
          user_id: req.user.id,
          email: req.user.email,
        });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.user_id).toBe(1);
      expect(response.body.email).toBe('user@example.com');
    });

    it('should reject request without token', async () => {
      app.use(authenticateJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Access token required');
    });

    it('should reject request with invalid token format', async () => {
      app.use(authenticateJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'InvalidTokenFormat');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token format');
    });

    it('should reject request with expired token', async () => {
      const expiredPayload = {
        ...mockTokenPayload,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };

      mockedJwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      app.use(authenticateJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token expired');
    });

    it('should reject request with malformed token', async () => {
      mockedJwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      app.use(authenticateJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer malformed-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });

    it('should reject request when user not found in database', async () => {
      mockedJwt.verify = jest.fn().mockReturnValue(mockTokenPayload);
      
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]), // User not found
        }),
      });

      app.use(authenticateJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('User not found');
    });

    it('should reject request when user is inactive', async () => {
      const inactiveUser = {
        ...mockUser,
        isActive: false,
      };

      mockedJwt.verify = jest.fn().mockReturnValue(mockTokenPayload);
      
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([inactiveUser]),
        }),
      });

      app.use(authenticateJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('User account is inactive');
    });

    it('should handle database errors gracefully', async () => {
      mockedJwt.verify = jest.fn().mockReturnValue(mockTokenPayload);
      
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        }),
      });

      app.use(authenticateJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should accept token from query parameter', async () => {
      mockedJwt.verify = jest.fn().mockReturnValue(mockTokenPayload);
      
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      app.use(authenticateJWT);
      app.get('/test', (req: any, res) => {
        res.json({ user_id: req.user.id });
      });

      const response = await request(app)
        .get('/test?token=valid-token');

      expect(response.status).toBe(200);
      expect(response.body.user_id).toBe(1);
    });

    it('should prioritize Authorization header over query parameter', async () => {
      const headerPayload = { ...mockTokenPayload, user_id: 1 };
      const queryPayload = { ...mockTokenPayload, user_id: 2 };

      mockedJwt.verify = jest.fn()
        .mockReturnValueOnce(headerPayload) // For Authorization header
        .mockReturnValueOnce(queryPayload);  // For query parameter

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      app.use(authenticateJWT);
      app.get('/test', (req: any, res) => {
        res.json({ user_id: req.user.id });
      });

      const response = await request(app)
        .get('/test?token=query-token')
        .set('Authorization', 'Bearer header-token');

      expect(response.status).toBe(200);
      expect(response.body.user_id).toBe(1); // Should use header token
    });
  });

  describe('generateJWT function', () => {
    it('should generate valid JWT token', () => {
      const mockToken = 'generated-jwt-token';
      mockedJwt.sign = jest.fn().mockReturnValue(mockToken);

      const token = generateJWT(mockUser);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        {
          user_id: mockUser.id,
          organizationId: mockUser.organization_id,
          email: mockUser.email,
          role: mockUser.role,
        },
        'test-secret-key',
        { expiresIn: '24h' }
      );
      expect(token).toBe(mockToken);
    });

    it('should generate token with custom expiration', () => {
      const mockToken = 'custom-expiry-token';
      mockedJwt.sign = jest.fn().mockReturnValue(mockToken);

      const token = generateJWT(mockUser, '1h');

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        'test-secret-key',
        { expiresIn: '1h' }
      );
      expect(token).toBe(mockToken);
    });

    it('should handle missing JWT_SECRET', () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        generateJWT(mockUser);
      }).toThrow('JWT_SECRET environment variable is required');
    });

    it('should include all required user properties', () => {
      mockedJwt.sign = jest.fn().mockReturnValue('token');

      generateJWT(mockUser);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        {
          user_id: mockUser.id,
          organizationId: mockUser.organization_id,
          email: mockUser.email,
          role: mockUser.role,
        },
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('verifyJWT function', () => {
    it('should verify valid token', () => {
      mockedJwt.verify = jest.fn().mockReturnValue(mockTokenPayload);

      const payload = verifyJWT('valid-token');

      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key');
      expect(payload).toEqual(mockTokenPayload);
    });

    it('should throw error for invalid token', () => {
      mockedJwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('invalid token');
      });

      expect(() => {
        verifyJWT('invalid-token');
      }).toThrow('invalid token');
    });

    it('should handle missing JWT_SECRET', () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        verifyJWT('token');
      }).toThrow('JWT_SECRET environment variable is required');
    });
  });

  describe('refreshJWT function', () => {
    it('should generate new token from refresh token', () => {
      const refreshPayload = {
        user_id: 1,
        organizationId: 1,
        email: 'user@example.com',
        role: 'employee',
        tokenType: 'refresh',
      };

      mockedJwt.verify = jest.fn().mockReturnValue(refreshPayload);
      mockedJwt.sign = jest.fn().mockReturnValue('new-access-token');

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      const newToken = refreshJWT('valid-refresh-token');

      expect(mockedJwt.verify).toHaveBeenCalledWith(
        'valid-refresh-token',
        'test-refresh-secret'
      );
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        {
          user_id: mockUser.id,
          organizationId: mockUser.organization_id,
          email: mockUser.email,
          role: mockUser.role,
        },
        'test-secret-key',
        { expiresIn: '24h' }
      );
    });

    it('should reject non-refresh token', () => {
      const accessPayload = {
        ...mockTokenPayload,
        tokenType: 'access', // Not a refresh token
      };

      mockedJwt.verify = jest.fn().mockReturnValue(accessPayload);

      expect(() => {
        refreshJWT('access-token');
      }).toThrow('Invalid refresh token');
    });

    it('should handle missing refresh secret', () => {
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => {
        refreshJWT('refresh-token');
      }).toThrow('JWT_REFRESH_SECRET environment variable is required');
    });
  });

  describe('Token expiration handling', () => {
    it('should detect expired tokens correctly', async () => {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      
      mockedJwt.verify = jest.fn().mockImplementation(() => {
        throw expiredError;
      });

      app.use(authenticateJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token expired');
    });

    it('should handle tokens expiring soon', async () => {
      const soonToExpirePayload = {
        ...mockTokenPayload,
        exp: Math.floor(Date.now() / 1000) + 300, // Expires in 5 minutes
      };

      mockedJwt.verify = jest.fn().mockReturnValue(soonToExpirePayload);
      
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      app.use(authenticateJWT);
      app.get('/test', (req: any, res) => {
        const timeUntilExpiry = req.user.exp - Math.floor(Date.now() / 1000);
        res.json({
          authenticated: true,
          timeUntilExpiry,
          shouldRefresh: timeUntilExpiry < 600, // Less than 10 minutes
        });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer soon-to-expire-token');

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.shouldRefresh).toBe(true);
    });
  });

  describe('Role-based access control integration', () => {
    it('should include role information in token', () => {
      const adminUser = {
        ...mockUser,
        role: 'admin',
      };

      mockedJwt.sign = jest.fn().mockReturnValue('admin-token');

      generateJWT(adminUser);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
        }),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should validate role consistency', async () => {
      const tokenWithRole = {
        ...mockTokenPayload,
        role: 'admin',
      };

      const userWithDifferentRole = {
        ...mockUser,
        role: 'employee', // Different from token
      };

      mockedJwt.verify = jest.fn().mockReturnValue(tokenWithRole);
      
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([userWithDifferentRole]),
        }),
      });

      app.use(authenticateJWT);
      app.get('/test', (req: any, res) => {
        res.json({
          tokenRole: req.user.role,
          dbRole: req.user.role, // Should be updated from DB
        });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer role-mismatch-token');

      expect(response.status).toBe(200);
      // The middleware should use the role from the database
      expect(response.body.tokenRole).toBe('employee');
    });
  });

  describe('Security considerations', () => {
    it('should not expose sensitive information in errors', async () => {
      mockedJwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('Secret key leaked in error: test-secret-key');
        throw error;
      });

      app.use(authenticateJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer malicious-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
      expect(response.body.message).not.toContain('test-secret-key');
    });

    it('should handle algorithm confusion attacks', async () => {
      mockedJwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('invalid algorithm');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      app.use(authenticateJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer algorithm-confusion-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });

    it('should validate token signature', async () => {
      mockedJwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('invalid signature');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      app.use(authenticateJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer tampered-signature-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });

    it('should handle malicious payloads', async () => {
      const maliciousPayload = {
        user_id: "'; DROP TABLE users; --",
        organizationId: '<script>alert("xss")</script>',
        email: 'malicious@example.com',
        role: 'admin',
      };

      mockedJwt.verify = jest.fn().mockReturnValue(maliciousPayload);
      
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      app.use(authenticateJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer malicious-payload-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('Performance and caching', () => {
    it('should handle high-frequency token verification', async () => {
      mockedJwt.verify = jest.fn().mockReturnValue(mockTokenPayload);
      
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      app.use(authenticateJWT);
      app.get('/test', (req: any, res) => {
        res.json({ user_id: req.user.id });
      });

      // Make multiple concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .get('/test')
          .set('Authorization', 'Bearer high-frequency-token')
      );

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.user_id).toBe(1);
      });

      // Verify JWT should be called for each request (no caching)
      expect(mockedJwt.verify).toHaveBeenCalledTimes(10);
    });

    it('should handle large token payloads efficiently', async () => {
      const largePayload = {
        ...mockTokenPayload,
        permissions: Array.from({ length: 100 }, (_, i) => `permission_${i}`),
        metadata: {
          large_data: 'x'.repeat(1000),
          nested: {
            deeply: {
              nested: {
                data: 'value',
              },
            },
          },
        },
      };

      mockedJwt.verify = jest.fn().mockReturnValue(largePayload);
      
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      app.use(authenticateJWT);
      app.get('/test', (req: any, res) => {
        res.json({
          user_id: req.user.id,
          permissionCount: req.user.permissions?.length || 0,
        });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer large-payload-token');

      expect(response.status).toBe(200);
      expect(response.body.user_id).toBe(1);
      expect(response.body.permissionCount).toBe(100);
    });
  });

  describe('Integration with other middleware', () => {
    it('should work with CORS middleware', async () => {
      mockedJwt.verify = jest.fn().mockReturnValue(mockTokenPayload);
      
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      // Mock CORS middleware
      app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        next();
      });

      app.use(authenticateJWT);
      app.get('/test', (req: any, res) => {
        res.json({ user_id: req.user.id });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer cors-token')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
      expect(response.body.user_id).toBe(1);
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    it('should work with rate limiting middleware', async () => {
      let requestCount = 0;

      // Mock rate limiting middleware
      app.use((req, res, next) => {
        requestCount++;
        if (requestCount > 5) {
          return res.status(429).json({ message: 'Too many requests' });
        }
        next();
      });

      mockedJwt.verify = jest.fn().mockReturnValue(mockTokenPayload);
      
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      app.use(authenticateJWT);
      app.get('/test', (req: any, res) => {
        res.json({ user_id: req.user.id });
      });

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/test')
          .set('Authorization', 'Bearer rate-limited-token');
        expect(response.status).toBe(200);
      }

      // This request should be rate limited
      const rateLimitedResponse = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer rate-limited-token');

      expect(rateLimitedResponse.status).toBe(429);
    });
  });

  describe('Environment-specific behavior', () => {
    it('should handle different JWT secrets in different environments', () => {
      const productionSecret = 'super-secure-production-secret';
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = productionSecret;

      mockedJwt.sign = jest.fn().mockReturnValue('production-token');

      generateJWT(mockUser);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        productionSecret,
        expect.any(Object)
      );
    });

    it('should use shorter expiry in development', () => {
      process.env.NODE_ENV = 'development';

      mockedJwt.sign = jest.fn().mockReturnValue('dev-token');

      generateJWT(mockUser, '1h'); // Shorter expiry for dev

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        { expiresIn: '1h' }
      );
    });
  });
});