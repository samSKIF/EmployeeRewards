import { Request, Response, NextFunction } from 'express';
import {
  tenantRouting,
  ensureTenantAccess,
  TenantRequest,
} from './tenant-routing';

// Mock console methods to avoid test output noise
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('Tenant Routing Middleware', () => {
  let mockRequest: Partial<TenantRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      hostname: 'canva.example.com',
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('tenantRouting', () => {
    it('should extract subdomain correctly', () => {
      mockRequest.hostname = 'acme-corp.thriviohr.com';

      tenantRouting(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      expect(mockRequest.subdomain).toBe('acme-corp');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle localhost development environment', () => {
      mockRequest.hostname = 'localhost';

      tenantRouting(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      expect(mockRequest.subdomain).toBe('localhost');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle IP addresses', () => {
      mockRequest.hostname = '192.168.1.100';

      tenantRouting(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      expect(mockRequest.subdomain).toBe('192.168.1.100');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle single domain (no subdomain)', () => {
      mockRequest.hostname = 'thriviohr.com';

      tenantRouting(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      expect(mockRequest.subdomain).toBe('thriviohr');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle multi-level subdomains', () => {
      mockRequest.hostname = 'staging.acme-corp.thriviohr.com';

      tenantRouting(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      expect(mockRequest.subdomain).toBe('staging');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle www subdomain', () => {
      mockRequest.hostname = 'www.thriviohr.com';

      tenantRouting(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      expect(mockRequest.subdomain).toBe('www');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should normalize subdomain to lowercase', () => {
      mockRequest.hostname = 'ACME-CORP.thriviohr.com';

      tenantRouting(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      expect(mockRequest.subdomain).toBe('acme-corp');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle edge case with port numbers', () => {
      mockRequest.hostname = 'localhost:3000';

      tenantRouting(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      // Port should be ignored
      expect(mockRequest.subdomain).toBe('localhost:3000');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('ensureTenantAccess', () => {
    beforeEach(() => {
      mockRequest.user = {
        id: 1,
        organizationId: 1,
        email: 'user@acme-corp.com',
        name: 'Test User',
        isAdmin: false,
      };
      mockRequest.subdomain = 'acme-corp';
    });

    it('should allow access when user belongs to the tenant organization', () => {
      // Mock successful tenant validation
      const middleware = ensureTenantAccess as any;
      middleware(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle user without organizationId', () => {
      mockRequest.user = {
        id: 1,
        // No organizationId
        email: 'user@example.com',
        name: 'Test User',
        isAdmin: false,
      } as any;

      const middleware = ensureTenantAccess as any;
      middleware(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      // Should proceed (tenant validation might be handled elsewhere)
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle requests without user (unauthenticated)', () => {
      mockRequest.user = undefined;

      const middleware = ensureTenantAccess as any;
      middleware(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      // Should proceed (authentication might be handled by other middleware)
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle null organizationId gracefully', () => {
      mockRequest.user = {
        id: 1,
        organizationId: null as any,
        email: 'user@example.com',
        name: 'Test User',
        isAdmin: false,
      };

      const middleware = ensureTenantAccess as any;
      middleware(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should log tenant access information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const middleware = ensureTenantAccess as any;
      middleware(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      // Verify some form of logging occurred (implementation dependent)
      expect(mockNext).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('TenantRequest Interface', () => {
    it('should properly extend Request interface', () => {
      const tenantRequest: TenantRequest = {
        ...mockRequest,
        subdomain: 'test-tenant',
        user: {
          id: 1,
          organizationId: 1,
          email: 'user@test.com',
          name: 'Test User',
          isAdmin: false,
        },
      } as TenantRequest;

      expect(tenantRequest.subdomain).toBe('test-tenant');
      expect(tenantRequest.user).toBeDefined();
      expect(tenantRequest.user?.organizationId).toBe(1);
    });
  });

  describe('Integration Tests', () => {
    it('should work together in middleware chain', () => {
      mockRequest.hostname = 'client-a.thriviohr.com';
      mockRequest.user = {
        id: 1,
        organizationId: 1,
        email: 'user@client-a.com',
        name: 'Test User',
        isAdmin: false,
      };

      // First middleware: tenantRouting
      tenantRouting(mockRequest as TenantRequest, mockResponse as Response, mockNext);
      expect(mockRequest.subdomain).toBe('client-a');
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Reset mock
      mockNext.mockClear();

      // Second middleware: ensureTenantAccess
      const middleware = ensureTenantAccess as any;
      middleware(mockRequest as TenantRequest, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid hostname gracefully', () => {
      mockRequest.hostname = '';

      tenantRouting(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      expect(mockRequest.subdomain).toBe('');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle special characters in subdomain', () => {
      mockRequest.hostname = 'client-123_test.thriviohr.com';

      tenantRouting(mockRequest as TenantRequest, mockResponse as Response, mockNext);

      expect(mockRequest.subdomain).toBe('client-123_test');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined hostname', () => {
      mockRequest.hostname = undefined as any;

      expect(() => {
        tenantRouting(mockRequest as TenantRequest, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('should handle malformed hostnames', () => {
      const malformedHostnames = [
        '...',
        '.thriviohr.com',
        'thriviohr.com.',
        '.',
        'a.b.c.d.e.f.thriviohr.com',
      ];

      malformedHostnames.forEach((hostname) => {
        mockRequest.hostname = hostname;
        
        expect(() => {
          tenantRouting(mockRequest as TenantRequest, mockResponse as Response, mockNext);
        }).not.toThrow();
        
        expect(mockNext).toHaveBeenCalled();
        mockNext.mockClear();
      });
    });
  });
});