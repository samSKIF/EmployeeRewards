import { tenantRouting, ensureTenantAccess, TenantRequest } from './tenant-routing';
import { Response, NextFunction } from 'express';

describe('Tenant Routing Middleware', () => {
  let mockReq: Partial<TenantRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 1,
        email: 'test@test.com',
        organizationId: 1,
        isAdmin: false,
      },
      tenantId: undefined,
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    mockNext = jest.fn();
  });

  describe('tenantRouting', () => {
    it('should set tenantId from authenticated user', () => {
      tenantRouting(mockReq as TenantRequest, mockRes as Response, mockNext);

      expect(mockReq.tenantId).toBe(1);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next without setting tenantId if no user', () => {
      mockReq.user = undefined;

      tenantRouting(mockReq as TenantRequest, mockRes as Response, mockNext);

      expect(mockReq.tenantId).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle user without organizationId', () => {
      mockReq.user = {
        id: 1,
        email: 'test@test.com',
        // No organizationId
      } as any;

      tenantRouting(mockReq as TenantRequest, mockRes as Response, mockNext);

      expect(mockReq.tenantId).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('ensureTenantAccess', () => {
    it('should allow access when tenantId matches targetOrgId', () => {
      mockReq.tenantId = 1;

      ensureTenantAccess(mockReq as TenantRequest, mockRes as Response, mockNext, 1);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should deny access when tenantId does not match targetOrgId', () => {
      mockReq.tenantId = 1;

      ensureTenantAccess(mockReq as TenantRequest, mockRes as Response, mockNext, 2);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Access denied: You can only access data from your organization',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when no tenantId', () => {
      mockReq.tenantId = undefined;

      ensureTenantAccess(mockReq as TenantRequest, mockRes as Response, mockNext, 1);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Access denied: Organization context required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow corporate admin to access any organization', () => {
      mockReq.user = {
        id: 1,
        email: 'admin@test.com',
        organizationId: 1,
        isAdmin: true,
        adminScope: 'super',
      };
      mockReq.tenantId = 1;

      ensureTenantAccess(mockReq as TenantRequest, mockRes as Response, mockNext, 2);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should enforce tenant access for client admin', () => {
      mockReq.user = {
        id: 1,
        email: 'admin@test.com',
        organizationId: 1,
        isAdmin: true,
        adminScope: 'site', // Client admin, not corporate
      };
      mockReq.tenantId = 1;

      ensureTenantAccess(mockReq as TenantRequest, mockRes as Response, mockNext, 2);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Multi-tenant isolation scenarios', () => {
    it('should prevent cross-tenant data access', () => {
      // User from org 1
      mockReq.tenantId = 1;
      
      // Trying to access org 2 data
      ensureTenantAccess(mockReq as TenantRequest, mockRes as Response, mockNext, 2);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow same-tenant data access', () => {
      // User from org 1
      mockReq.tenantId = 1;
      
      // Accessing org 1 data
      ensureTenantAccess(mockReq as TenantRequest, mockRes as Response, mockNext, 1);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle null organizationId gracefully', () => {
      mockReq.tenantId = 1;
      
      ensureTenantAccess(mockReq as TenantRequest, mockRes as Response, mockNext, null as any);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});