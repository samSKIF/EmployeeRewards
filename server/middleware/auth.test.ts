import { generateToken, verifyToken, verifyAdmin } from './auth';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { logger } from '@shared/logger';

jest.mock('jsonwebtoken');
jest.mock('../db');
jest.mock('@shared/logger');

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockDb = db as jest.Mocked<typeof db>;

describe('Auth Middleware', () => {
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
        name: 'Test User',
        username: 'testuser',
        status: 'active' as const,
        createdAt: new Date(),
      };
      
      const mockToken = 'mock.jwt.token';
      mockJwt.sign.mockReturnValue(mockToken as any);
      
      const token = generateToken(user);
      
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { id: user.id, email: user.email, isAdmin: user.isAdmin },
        process.env.JWT_SECRET || 'rewardhub-secret-key',
        { expiresIn: '1d' }
      );
      expect(token).toBe(mockToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and attach user to request', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        organizationId: 1,
        isAdmin: false,
        name: 'Test User',
        username: 'testuser',
        password: 'hashed_password',
        status: 'active' as const,
        createdAt: new Date(),
      };
      
      const req = {
        headers: {
          authorization: 'Bearer valid.token',
        },
        query: {},
      } as any;
      
      mockJwt.verify.mockReturnValue({ id: 1, email: 'test@example.com' });
      
      // Mock the database query
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockUser]),
      };
      mockDb.select.mockReturnValue(mockQuery);
      
      await verifyToken(req, mockRes, mockNext);
      
      expect(req.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        organizationId: mockUser.organizationId,
        isAdmin: mockUser.isAdmin,
        name: mockUser.name,
        username: mockUser.username,
        status: mockUser.status,
        createdAt: mockUser.createdAt,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      const req = {
        headers: {},
        query: {},
      } as any;
      
      await verifyToken(req, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized: No token provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept token from query parameter', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed',
        isAdmin: false,
        organizationId: 1,
        name: 'Test',
        username: 'test',
        status: 'active' as const,
        createdAt: new Date(),
      };
      
      const req = {
        headers: {},
        query: {
          token: 'valid.token',
        },
      } as any;
      
      mockJwt.verify.mockReturnValue({ id: 1 });
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockUser]),
      };
      mockDb.select.mockReturnValue(mockSelect as any);
      
      await verifyToken(req, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle JWT verification errors', async () => {
      const req = {
        headers: {
          authorization: 'Bearer expired.token',
        },
        query: {},
      } as any;
      
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });
      
      await verifyToken(req, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized: Invalid token',
      });
    });

    it('should reject if user not found in database', async () => {
      const req = {
        headers: {
          authorization: 'Bearer valid.token',
        },
        query: {},
      } as any;
      
      mockJwt.verify.mockReturnValue({ id: 999 });
      
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]), // No user found
      };
      mockDb.select.mockReturnValue(mockSelect as any);
      
      await verifyToken(req, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized: User not found',
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