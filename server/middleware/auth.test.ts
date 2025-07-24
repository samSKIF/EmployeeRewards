import { generateToken, verifyToken, verifyAdmin } from './auth';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

jest.mock('jsonwebtoken');

const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middleware', () => {
  const mockReq = {} as Request;
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;
  const mockNext = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate JWT token with user data', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        organizationId: 1,
        isAdmin: false,
      };
      
      const mockToken = 'mock.jwt.token';
      mockJwt.sign.mockReturnValue(mockToken as any);
      
      const token = generateToken(user);
      
      expect(mockJwt.sign).toHaveBeenCalledWith(
        user,
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );
      expect(token).toBe(mockToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and attach user to request', () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        organizationId: 1,
      };
      
      const req = {
        headers: {
          authorization: 'Bearer valid.token',
        },
      } as any;
      
      mockJwt.verify.mockImplementation((token, secret, callback: any) => {
        callback(null, mockUser);
      });
      
      verifyToken(req, mockRes, mockNext);
      
      expect(req.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without authorization header', () => {
      const req = {
        headers: {},
      } as any;
      
      verifyToken(req, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'No token provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token format', () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat',
        },
      } as any;
      
      verifyToken(req, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid token format',
      });
    });

    it('should handle JWT verification errors', () => {
      const req = {
        headers: {
          authorization: 'Bearer expired.token',
        },
      } as any;
      
      mockJwt.verify.mockImplementation((token, secret, callback: any) => {
        callback(new Error('Token expired'), null);
      });
      
      verifyToken(req, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid token',
      });
    });
  });

  describe('verifyAdmin', () => {
    it('should allow admin users', () => {
      const req = {
        user: {
          id: 1,
          email: 'admin@example.com',
          isAdmin: true,
        },
      } as any;
      
      verifyAdmin(req, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject non-admin users', () => {
      const req = {
        user: {
          id: 1,
          email: 'user@example.com',
          isAdmin: false,
        },
      } as any;
      
      verifyAdmin(req, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Admin access required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing user object', () => {
      const req = {} as any;
      
      verifyAdmin(req, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});