import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken, verifyAdmin } from './auth';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../db', () => ({
  db: {
    select: jest.fn()
  }
}));
jest.mock('@shared/logger', () => ({
  logger: {
    error: jest.fn()
  }
}));

const mockedJwt = jwt as jest.Mocked<typeof jwt>;

interface AuthRequest extends Request {
  user?: any;
}

describe('Auth Middleware - Fixed Tests', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockDbSelect: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      query: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
    
    // Mock database chain
    const mockFrom = jest.fn();
    const mockWhere = jest.fn();
    mockDbSelect = jest.fn().mockReturnValue({
      from: mockFrom.mockReturnValue({
        where: mockWhere
      })
    });
    
    // Import and mock db after jest setup
    const { db } = require('../db');
    db.select = mockDbSelect;
    
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should verify valid token and attach user to request', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        organization_id: 1,
        is_admin: false,
        password: 'hashed-password'
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockedJwt.verify = jest.fn().mockReturnValue({ id: 1 });
      
      // Mock database query result
      const mockWhere = jest.fn().mockResolvedValue([mockUser]);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      mockDbSelect.mockReturnValue({ from: mockFrom });

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-token', 'rewardhub-secret-key');
      expect(mockRequest.user).toEqual({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        organization_id: 1,
        is_admin: false
      });
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should reject request without authorization header', async () => {
      mockRequest.headers = {};

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Unauthorized: No token provided',
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
        message: 'Unauthorized: Invalid token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token for non-existent user', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockedJwt.verify = jest.fn().mockReturnValue({ id: 999 });
      
      // Mock empty database result
      const mockWhere = jest.fn().mockResolvedValue([]);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      mockDbSelect.mockReturnValue({ from: mockFrom });

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Unauthorized: User not found',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle expired token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };

      mockedJwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Unauthorized: Invalid token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed authorization header', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Unauthorized: No token provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept token from query parameter', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        password: 'hashed-password'
      };

      mockRequest.headers = {};
      mockRequest.query = { token: 'valid-query-token' };

      mockedJwt.verify = jest.fn().mockReturnValue({ id: 1 });
      
      const mockWhere = jest.fn().mockResolvedValue([mockUser]);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      mockDbSelect.mockReturnValue({ from: mockFrom });

      await verifyToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-query-token', 'rewardhub-secret-key');
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyAdmin', () => {
    it('should allow admin user to proceed', () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@example.com',
        is_admin: true,
        role_type: 'admin'
      };

      verifyAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow client admin to proceed', () => {
      mockRequest.user = {
        id: 1,
        email: 'clientadmin@example.com',
        is_admin: true,
        role_type: 'client_admin'
      };

      verifyAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow corporate admin to proceed', () => {
      mockRequest.user = {
        id: 1,
        email: 'corpadmin@example.com',
        is_admin: true,
        role_type: 'corporate_admin'
      };

      verifyAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request without user', () => {
      mockRequest.user = undefined;

      verifyAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Unauthorized',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject non-admin user', () => {
      mockRequest.user = {
        id: 1,
        email: 'user@example.com',
        is_admin: false,
        role_type: 'employee'
      };

      verifyAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Forbidden: Admin access required',
        debug: {
          is_admin: false,
          role_type: 'employee',
          computed_admin: false
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject user with admin flag but no admin role', () => {
      mockRequest.user = {
        id: 1,
        email: 'user@example.com',
        is_admin: true,
        role_type: 'employee'
      };

      verifyAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});