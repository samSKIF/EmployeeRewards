import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken, verifyAdmin, verifyCorporateAdmin } from './auth';
import { storage } from '../storage';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../storage');

const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedStorage = storage as jest.Mocked<typeof storage>;

interface AuthRequest extends Request {
  user?: any;
}

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should verify valid token and attach user to request', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        organizationId: 1,
        isAdmin: false,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockedJwt.verify = jest.fn().mockReturnValue({ user_id: 1 });
      mockedStorage.getUser = jest.fn().mockResolvedValue(mockUser);

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(mockedStorage.getUser).toHaveBeenCalledWith(1);
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      mockRequest.headers = {};

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Access denied. No token provided.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject malformed authorization header', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Access denied. Invalid token format.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockedJwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Access denied. Invalid token.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };

      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      mockedJwt.verify = jest.fn().mockImplementation(() => {
        throw expiredError;
      });

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Access denied. Token expired.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token for non-existent user', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockedJwt.verify = jest.fn().mockReturnValue({ user_id: 999 });
      mockedStorage.getUser = jest.fn().mockResolvedValue(undefined);

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Access denied. User not found.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockedJwt.verify = jest.fn().mockReturnValue({ user_id: 1 });
      mockedStorage.getUser = jest.fn().mockRejectedValue(new Error('Database error'));

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle JWT secret not configured', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      mockRequest.headers = {
        authorization: 'Bearer token',
      };

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Server configuration error',
      });

      process.env.JWT_SECRET = originalSecret;
    });

    it('should handle bearer token with different casing', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
      };

      mockRequest.headers = {
        authorization: 'bearer valid-token', // lowercase
      };

      mockedJwt.verify = jest.fn().mockReturnValue({ user_id: 1 });
      mockedStorage.getUser = jest.fn().mockResolvedValue(mockUser);

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('verifyAdmin', () => {
    it('should allow access for admin user', () => {
      mockRequest.user = {
        id: 1,
        isAdmin: true,
        email: 'admin@example.com',
      };

      verifyAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for non-admin user', () => {
      mockRequest.user = {
        id: 2,
        isAdmin: false,
        email: 'user@example.com',
      };

      verifyAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Access denied. Admin privileges required.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user not attached to request', () => {
      mockRequest.user = undefined;

      verifyAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Access denied. Authentication required.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle user with null isAdmin property', () => {
      mockRequest.user = {
        id: 3,
        isAdmin: null,
        email: 'user@example.com',
      };

      verifyAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle user with undefined isAdmin property', () => {
      mockRequest.user = {
        id: 3,
        email: 'user@example.com',
        // isAdmin property missing
      };

      verifyAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('verifyCorporateAdmin', () => {
    it('should allow access for corporate admin', () => {
      mockRequest.user = {
        id: 1,
        isAdmin: true,
        adminScope: 'corporate',
        email: 'corporate@example.com',
      };

      verifyCorporateAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for organization admin', () => {
      mockRequest.user = {
        id: 2,
        isAdmin: true,
        adminScope: 'organization',
        email: 'admin@company.com',
      };

      verifyCorporateAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Access denied. Corporate admin privileges required.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access for regular user', () => {
      mockRequest.user = {
        id: 3,
        isAdmin: false,
        email: 'user@example.com',
      };

      verifyCorporateAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user not attached to request', () => {
      mockRequest.user = undefined;

      verifyCorporateAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Access denied. Authentication required.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle admin without adminScope property', () => {
      mockRequest.user = {
        id: 4,
        isAdmin: true,
        email: 'admin@example.com',
        // adminScope property missing
      };

      verifyCorporateAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle super admin scope', () => {
      mockRequest.user = {
        id: 1,
        isAdmin: true,
        adminScope: 'super',
        email: 'super@example.com',
      };

      verifyCorporateAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle case-insensitive admin scope', () => {
      mockRequest.user = {
        id: 1,
        isAdmin: true,
        adminScope: 'CORPORATE',
        email: 'corporate@example.com',
      };

      verifyCorporateAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Middleware Chain Integration', () => {
    it('should work in sequence: token verification then admin check', async () => {
      const mockAdmin = {
        id: 1,
        isAdmin: true,
        email: 'admin@example.com',
      };

      mockRequest.headers = {
        authorization: 'Bearer admin-token',
      };

      mockedJwt.verify = jest.fn().mockReturnValue({ user_id: 1 });
      mockedStorage.getUser = jest.fn().mockResolvedValue(mockAdmin);

      // First middleware: verifyToken
      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);
      expect(mockRequest.user).toEqual(mockAdmin);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Reset mockNext for second middleware
      mockNext.mockClear();

      // Second middleware: verifyAdmin
      verifyAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should stop chain execution on token verification failure', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockedJwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle JWT with no user_id claim', async () => {
      mockRequest.headers = {
        authorization: 'Bearer token-without-userid',
      };

      mockedJwt.verify = jest.fn().mockReturnValue({}); // No user_id

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Access denied. Invalid token.',
      });
    });

    it('should handle JWT with invalid user_id format', async () => {
      mockRequest.headers = {
        authorization: 'Bearer token-with-invalid-userid',
      };

      mockedJwt.verify = jest.fn().mockReturnValue({ user_id: 'not-a-number' });
      mockedStorage.getUser = jest.fn().mockResolvedValue(undefined);

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should handle very long authorization headers', async () => {
      const longToken = 'a'.repeat(10000);
      mockRequest.headers = {
        authorization: `Bearer ${longToken}`,
      };

      mockedJwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Token too long');
      });

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should handle user with deactivated status', async () => {
      const deactivatedUser = {
        id: 1,
        email: 'user@example.com',
        status: 'inactive',
        isAdmin: false,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockedJwt.verify = jest.fn().mockReturnValue({ user_id: 1 });
      mockedStorage.getUser = jest.fn().mockResolvedValue(deactivatedUser);

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Access denied. Account is inactive.',
      });
    });
  });
});