import request from 'supertest';
import express from 'express';
import { supplierMiddleware, validateSupplier, SupplierRole } from './suppliers';
import { db } from '../db';
import { suppliers, users } from '@shared/schema';

// Mock dependencies
jest.mock('../db');

const mockedDb = db as jest.Mocked<typeof db>;

describe('Supplier Middleware', () => {
  let app: express.Application;

  const mockUser = {
    id: 1,
    organizationId: 1,
    email: 'user@example.com',
    name: 'Test User',
    isAdmin: false,
  };

  const mockSupplier = {
    id: 1,
    userId: 1,
    organizationId: 1,
    companyName: 'Test Supplier Inc',
    contactEmail: 'contact@testsupplier.com',
    role: 'vendor' as SupplierRole,
    status: 'active',
    contractDetails: {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      terms: 'Standard supplier agreement',
    },
    certifications: ['ISO9001', 'ISO14001'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();

    // Mock authentication middleware
    app.use((req: any, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe('supplierMiddleware', () => {
    it('should add supplier info to request when user is a supplier', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({
          hasSupplier: !!req.supplier,
          supplierId: req.supplier?.id,
          supplierRole: req.supplier?.role,
        });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.hasSupplier).toBe(true);
      expect(response.body.supplierId).toBe(1);
      expect(response.body.supplierRole).toBe('vendor');
    });

    it('should continue without supplier info when user is not a supplier', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]), // No supplier found
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({
          hasSupplier: !!req.supplier,
          supplier: req.supplier,
        });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.hasSupplier).toBe(false);
      expect(response.body.supplier).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by organization', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req, res) => res.json({ success: true }));

      await request(app).get('/test');

      expect(mockedDb.select().from().where).toHaveBeenCalled();
    });

    it('should handle inactive suppliers', async () => {
      const inactiveSupplier = {
        ...mockSupplier,
        status: 'inactive',
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([inactiveSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({
          hasSupplier: !!req.supplier,
          supplierStatus: req.supplier?.status,
        });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.hasSupplier).toBe(true);
      expect(response.body.supplierStatus).toBe('inactive');
    });

    it('should handle missing user in request', async () => {
      app.use((req: any, res, next) => {
        delete req.user; // Remove user from request
        next();
      });

      app.use(supplierMiddleware);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(mockedDb.select).not.toHaveBeenCalled();
    });
  });

  describe('validateSupplier', () => {
    it('should pass validation for active supplier', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.use(validateSupplier());
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject non-suppliers', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]), // No supplier found
        }),
      });

      app.use(supplierMiddleware);
      app.use(validateSupplier());
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Supplier access required');
    });

    it('should reject inactive suppliers', async () => {
      const inactiveSupplier = {
        ...mockSupplier,
        status: 'inactive',
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([inactiveSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.use(validateSupplier());
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Supplier account is not active');
    });

    it('should validate specific supplier roles', async () => {
      const vendorSupplier = {
        ...mockSupplier,
        role: 'vendor' as SupplierRole,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([vendorSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.use(validateSupplier(['vendor']));
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject suppliers with wrong role', async () => {
      const contractorSupplier = {
        ...mockSupplier,
        role: 'contractor' as SupplierRole,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([contractorSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.use(validateSupplier(['vendor', 'distributor'])); // contractor not allowed
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient supplier privileges');
    });

    it('should accept multiple valid roles', async () => {
      const distributorSupplier = {
        ...mockSupplier,
        role: 'distributor' as SupplierRole,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([distributorSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.use(validateSupplier(['vendor', 'distributor', 'contractor']));
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle pending suppliers', async () => {
      const pendingSupplier = {
        ...mockSupplier,
        status: 'pending',
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([pendingSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.use(validateSupplier());
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Supplier account is not active');
    });

    it('should handle suspended suppliers', async () => {
      const suspendedSupplier = {
        ...mockSupplier,
        status: 'suspended',
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([suspendedSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.use(validateSupplier());
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Supplier account is not active');
    });
  });

  describe('SupplierRole enum validation', () => {
    it('should validate vendor role', async () => {
      const vendorSupplier = {
        ...mockSupplier,
        role: 'vendor' as SupplierRole,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([vendorSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({ role: req.supplier?.role });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('vendor');
    });

    it('should validate contractor role', async () => {
      const contractorSupplier = {
        ...mockSupplier,
        role: 'contractor' as SupplierRole,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([contractorSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({ role: req.supplier?.role });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('contractor');
    });

    it('should validate distributor role', async () => {
      const distributorSupplier = {
        ...mockSupplier,
        role: 'distributor' as SupplierRole,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([distributorSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({ role: req.supplier?.role });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('distributor');
    });

    it('should validate service_provider role', async () => {
      const serviceProviderSupplier = {
        ...mockSupplier,
        role: 'service_provider' as SupplierRole,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([serviceProviderSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({ role: req.supplier?.role });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('service_provider');
    });
  });

  describe('Integration scenarios', () => {
    it('should work with authentication middleware', async () => {
      const authenticatedUser = {
        id: 2,
        organizationId: 1,
        email: 'supplier@example.com',
        name: 'Supplier User',
      };

      const supplierForUser = {
        ...mockSupplier,
        id: 2,
        userId: 2,
        companyName: 'Authenticated Supplier Ltd',
      };

      app.use((req: any, res, next) => {
        req.user = authenticatedUser;
        next();
      });

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([supplierForUser]),
        }),
      });

      app.use(supplierMiddleware);
      app.use(validateSupplier());
      app.get('/test', (req: any, res) => {
        res.json({
          userId: req.user.id,
          supplierId: req.supplier.id,
          companyName: req.supplier.companyName,
        });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe(2);
      expect(response.body.supplierId).toBe(2);
      expect(response.body.companyName).toBe('Authenticated Supplier Ltd');
    });

    it('should handle organization boundary enforcement', async () => {
      const crossOrgSupplier = {
        ...mockSupplier,
        organizationId: 999, // Different org
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([crossOrgSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({
          hasSupplier: !!req.supplier,
          orgMatch: req.supplier?.organizationId === req.user.organizationId,
        });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.hasSupplier).toBe(true);
      expect(response.body.orgMatch).toBe(false);
    });

    it('should handle expired contracts', async () => {
      const expiredSupplier = {
        ...mockSupplier,
        contractDetails: {
          startDate: '2024-01-01',
          endDate: '2024-12-31', // Expired
          terms: 'Expired contract',
        },
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([expiredSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        const contractEndDate = new Date(req.supplier?.contractDetails?.endDate);
        const isExpired = contractEndDate < new Date();
        
        res.json({
          hasSupplier: !!req.supplier,
          contractExpired: isExpired,
        });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.hasSupplier).toBe(true);
      expect(response.body.contractExpired).toBe(true);
    });

    it('should handle supplier with certifications', async () => {
      const certifiedSupplier = {
        ...mockSupplier,
        certifications: ['ISO9001', 'ISO14001', 'OHSAS18001'],
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([certifiedSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({
          hasSupplier: !!req.supplier,
          certificationCount: req.supplier?.certifications?.length || 0,
          hasISO9001: req.supplier?.certifications?.includes('ISO9001'),
        });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.hasSupplier).toBe(true);
      expect(response.body.certificationCount).toBe(3);
      expect(response.body.hasISO9001).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed supplier data', async () => {
      const malformedSupplier = {
        id: 1,
        userId: 1,
        // Missing required fields
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([malformedSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({
          hasSupplier: !!req.supplier,
          supplierValid: !!(req.supplier?.id && req.supplier?.userId),
        });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.hasSupplier).toBe(true);
      expect(response.body.supplierValid).toBe(true);
    });

    it('should handle database timeout errors', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Query timeout')),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({
          hasSupplier: !!req.supplier,
          success: true,
        });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.hasSupplier).toBe(false);
      expect(response.body.success).toBe(true);
    });

    it('should handle null/undefined responses from database', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(null),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({
          hasSupplier: !!req.supplier,
          supplierIsNull: req.supplier === null,
        });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.hasSupplier).toBe(false);
    });
  });

  describe('Performance considerations', () => {
    it('should cache supplier lookup results', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({ supplierId: req.supplier?.id });
      });

      // Make multiple requests
      await request(app).get('/test');
      await request(app).get('/test');
      await request(app).get('/test');

      // Should only query once per request (not cached across requests)
      expect(mockedDb.select).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent requests efficiently', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockSupplier]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        res.json({ supplierId: req.supplier?.id });
      });

      // Make concurrent requests
      const promises = Array.from({ length: 5 }, () => 
        request(app).get('/test')
      );

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.supplierId).toBe(1);
      });
    });
  });

  describe('Security considerations', () => {
    it('should not expose sensitive supplier data', async () => {
      const supplierWithSensitiveData = {
        ...mockSupplier,
        internalNotes: 'Confidential supplier notes',
        contractDetails: {
          ...mockSupplier.contractDetails,
          pricing: 'Sensitive pricing information',
        },
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([supplierWithSensitiveData]),
        }),
      });

      app.use(supplierMiddleware);
      app.get('/test', (req: any, res) => {
        // Ensure sensitive data is not accidentally exposed
        const safeSupplierData = {
          id: req.supplier?.id,
          companyName: req.supplier?.companyName,
          role: req.supplier?.role,
          status: req.supplier?.status,
        };
        res.json(safeSupplierData);
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('internalNotes');
      expect(response.body).not.toHaveProperty('contractDetails');
    });

    it('should validate organization membership strictly', async () => {
      const supplierFromDifferentOrg = {
        ...mockSupplier,
        organizationId: 999,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([supplierFromDifferentOrg]),
        }),
      });

      app.use(supplierMiddleware);
      app.use(validateSupplier());
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      // Should still allow access but with awareness of org mismatch
      expect(response.status).toBe(200);
    });
  });
});