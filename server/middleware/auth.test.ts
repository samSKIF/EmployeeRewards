import { verifyToken, verifyAdmin, generateToken } from './auth';
import type { AuthenticatedRequest } from './auth';

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { verify: jest.fn(), sign: jest.fn() }
}));
import jwt from 'jsonwebtoken';
const mockedVerify = (jwt as any).verify as jest.Mock;

jest.mock('../db', () => ({
  db: { select: jest.fn() }
}));
import { db } from '../db';
const mockedSelect = db.select as jest.Mock;
let mockedWhere: jest.Mock;
let mockedFrom: jest.Mock;

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedWhere = jest.fn();
    mockedFrom = jest.fn().mockReturnValue({ where: mockedWhere });
    mockedSelect.mockReturnValue({ from: mockedFrom });
  });

  describe('verifyToken', () => {
    it('returns 401 if no token provided', async () => {
      const req = { headers: {}, query: {} } as unknown as AuthenticatedRequest;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('extracts token from query parameter if not in headers', async () => {
      const token = 'query-token';
      const user: any = { id: 1, email: 'test@test.com', isAdmin: false };
      mockedVerify.mockReturnValue({ id: user.id });
      mockedWhere.mockResolvedValue([user]);

      const req = { headers: {}, query: { token } } as unknown as AuthenticatedRequest;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(mockedVerify).toHaveBeenCalledWith(token, expect.anything());
      expect(req.user).toEqual({ id: user.id, email: user.email, isAdmin: user.isAdmin });
      expect(next).toHaveBeenCalled();
    });

    it('returns 401 for invalid token', async () => {
      mockedVerify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      const token = 'invalid-token';
      const req = { headers: { authorization: `Bearer ${token}` }, query: {} } as unknown as AuthenticatedRequest;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for expired token', async () => {
      const expiredError = new Error('jwt expired');
      (expiredError as any).name = 'TokenExpiredError';
      mockedVerify.mockImplementation(() => {
        throw expiredError;
      });

      const token = 'expired-token';
      const req = { headers: { authorization: `Bearer ${token}` }, query: {} } as unknown as AuthenticatedRequest;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 if user not found in database', async () => {
      mockedVerify.mockReturnValue({ id: 999 });
      mockedWhere.mockResolvedValue([]);

      const token = 'valid-token';
      const req = { headers: { authorization: `Bearer ${token}` }, query: {} } as unknown as AuthenticatedRequest;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: User not found' });
      expect(next).not.toHaveBeenCalled();
    });

    it('attaches user with organizationId and calls next for valid token', async () => {
      const user: any = { 
        id: 1, 
        email: 'test@test.com', 
        isAdmin: false,
        organizationId: 123,
        role: 'employee' 
      };
      mockedVerify.mockReturnValue({ id: user.id });
      mockedWhere.mockResolvedValue([user]);

      const token = 'valid-token';
      const req = { headers: { authorization: `Bearer ${token}` }, query: {} } as unknown as AuthenticatedRequest;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(mockedVerify).toHaveBeenCalledWith(token, expect.anything());
      expect(req.user).toEqual({ 
        id: user.id, 
        email: user.email, 
        isAdmin: user.isAdmin,
        organizationId: user.organizationId,
        role: user.role
      });
      expect(next).toHaveBeenCalled();
    });

    it('handles database errors gracefully', async () => {
      mockedVerify.mockReturnValue({ id: 1 });
      mockedWhere.mockRejectedValue(new Error('Database connection failed'));

      const token = 'valid-token';
      const req = { headers: { authorization: `Bearer ${token}` }, query: {} } as unknown as AuthenticatedRequest;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized: Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('verifyAdmin', () => {
    it('allows access for admin user', () => {
      const req = { user: { id: 1, email: 'admin@test.com', isAdmin: true } } as unknown as AuthenticatedRequest;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      verifyAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('denies access for non-admin user', () => {
      const req = { user: { id: 1, email: 'user@test.com', isAdmin: false } } as unknown as AuthenticatedRequest;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      verifyAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Admin access required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 if no user in request', () => {
      const req = {} as unknown as AuthenticatedRequest;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      verifyAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('generates a token with user information', () => {
      const user = { 
        id: 1, 
        email: 'test@test.com', 
        isAdmin: false,
        name: 'Test User',
        organizationId: 123
      };
      
      const mockedSign = (jwt as any).sign as jest.Mock;
      mockedSign.mockReturnValue('test-token');

      const token = generateToken(user);

      expect(mockedSign).toHaveBeenCalledWith(
        { id: user.id, email: user.email, isAdmin: user.isAdmin },
        expect.anything(),
        { expiresIn: '1d' }
      );
      expect(token).toBe('test-token');
    });
  });
});