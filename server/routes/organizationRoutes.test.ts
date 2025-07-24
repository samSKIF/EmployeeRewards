import request from 'supertest';
import express from 'express';
import { db } from '../db';
import { organizations, subscriptions, users } from '@shared/schema';

// Mock dependencies
jest.mock('../db');
jest.mock('../middleware/auth');

// Import the router after mocking
import organizationRouter from './organizationRoutes';
import { verifyToken, verifyCorporateAdmin } from '../middleware/auth';

const mockedDb = db as jest.Mocked<typeof db>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockedVerifyCorporateAdmin = verifyCorporateAdmin as jest.MockedFunction<typeof verifyCorporateAdmin>;

describe('Organization Routes', () => {
  let app: express.Application;

  const mockCorporateAdmin = {
    id: 1,
    email: 'corporate@example.com',
    name: 'Corporate Admin',
    isAdmin: true,
    adminScope: 'corporate',
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/organizations', organizationRouter);
    jest.clearAllMocks();

    // Mock middleware
    mockedVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = mockCorporateAdmin;
      next();
    });

    mockedVerifyCorporateAdmin.mockImplementation((req: any, res, next) => {
      if (req.user?.adminScope === 'corporate') {
        next();
      } else {
        res.status(403).json({ message: 'Corporate admin access required' });
      }
    });
  });

  describe('GET /organizations', () => {
    it('should return all organizations for corporate admin', async () => {
      const mockOrganizations = [
        {
          id: 1,
          name: 'Acme Corp',
          status: 'active',
          contactEmail: 'admin@acme.com',
          contactPhone: '+1-555-0123',
          address: '123 Main St',
          city: 'New York',
          country: 'United States',
          industry: 'Technology',
          logoUrl: 'https://example.com/logo.png',
          createdAt: new Date(),
          currentSubscriptionId: 1,
          subscription: {
            id: 1,
            planName: 'Business',
            subscribedUsers: 50,
            isActive: true,
            expirationDate: new Date(Date.now() + 86400000),
          },
        },
      ];

      mockedDb.query = {
        organizations: {
          findMany: jest.fn().mockResolvedValue(mockOrganizations),
        },
      } as any;

      const response = await request(app).get('/organizations');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockOrganizations);
    });

    it('should handle pagination parameters', async () => {
      mockedDb.query = {
        organizations: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as any;

      const response = await request(app)
        .get('/organizations')
        .query({ page: '2', limit: '10' });

      expect(response.status).toBe(200);
      expect(mockedDb.query.organizations.findMany).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockedDb.query = {
        organizations: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as any;

      const response = await request(app)
        .get('/organizations')
        .query({ status: 'active' });

      expect(response.status).toBe(200);
    });

    it('should search by name', async () => {
      mockedDb.query = {
        organizations: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as any;

      const response = await request(app)
        .get('/organizations')
        .query({ search: 'Acme' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /organizations/:id', () => {
    it('should return specific organization details', async () => {
      const mockOrganization = {
        id: 1,
        name: 'Acme Corp',
        status: 'active',
        contactEmail: 'admin@acme.com',
        industry: 'Technology',
        subscription: {
          planName: 'Business',
          subscribedUsers: 50,
          isActive: true,
        },
        userCount: 35,
        activeUsers: 30,
      };

      mockedDb.query = {
        organizations: {
          findFirst: jest.fn().mockResolvedValue(mockOrganization),
        },
      } as any;

      // Mock user count query
      mockedDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 35 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 30 }]),
          }),
        });

      const response = await request(app).get('/organizations/1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.userCount).toBe(35);
      expect(response.body.activeUsers).toBe(30);
    });

    it('should handle non-existent organization', async () => {
      mockedDb.query = {
        organizations: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as any;

      const response = await request(app).get('/organizations/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Organization not found');
    });
  });

  describe('POST /organizations', () => {
    it('should create new organization successfully', async () => {
      const organizationData = {
        name: 'New Company',
        contactEmail: 'admin@newcompany.com',
        contactPhone: '+1-555-0199',
        address: '456 Oak Ave',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        country: 'United States',
        industry: 'Finance',
        website: 'https://newcompany.com',
      };

      const mockCreatedOrganization = {
        id: 2,
        ...organizationData,
        status: 'active',
        createdAt: new Date(),
        createdBy: 1,
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCreatedOrganization]),
        }),
      });

      const response = await request(app)
        .post('/organizations')
        .send(organizationData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(organizationData.name);
      expect(response.body.status).toBe('active');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        name: 'Test Company',
        // Missing required fields
      };

      const response = await request(app)
        .post('/organizations')
        .send(incompleteData);

      expect(response.status).toBe(400);
    });

    it('should handle duplicate organization names', async () => {
      const organizationData = {
        name: 'Existing Company',
        contactEmail: 'admin@existing.com',
        country: 'United States',
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(
            new Error('UNIQUE constraint failed: organizations.name')
          ),
        }),
      });

      const response = await request(app)
        .post('/organizations')
        .send(organizationData);

      expect(response.status).toBe(500);
    });
  });

  describe('PATCH /organizations/:id', () => {
    it('should update organization successfully', async () => {
      const updateData = {
        name: 'Updated Company Name',
        contactEmail: 'newemail@company.com',
        status: 'inactive',
      };

      const mockUpdatedOrganization = {
        id: 1,
        ...updateData,
        updatedAt: new Date(),
      };

      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUpdatedOrganization]),
          }),
        }),
      });

      const response = await request(app)
        .patch('/organizations/1')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
    });

    it('should handle non-existent organization update', async () => {
      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const response = await request(app)
        .patch('/organizations/999')
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Organization not found');
    });

    it('should validate status transitions', async () => {
      const updateData = {
        status: 'invalid_status',
      };

      const response = await request(app)
        .patch('/organizations/1')
        .send(updateData);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /organizations/:id', () => {
    it('should deactivate organization successfully', async () => {
      const mockDeactivatedOrg = {
        id: 1,
        name: 'Test Company',
        status: 'inactive',
        deactivatedAt: new Date(),
      };

      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockDeactivatedOrg]),
          }),
        }),
      });

      const response = await request(app).delete('/organizations/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Organization deactivated successfully');
    });

    it('should handle organization with active users', async () => {
      // Mock active users count
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const response = await request(app).delete('/organizations/1');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('active users');
    });
  });

  describe('GET /organizations/:id/users', () => {
    it('should return organization users', async () => {
      const mockUsers = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@company.com',
          status: 'active',
          jobTitle: 'Developer',
          department: 'Engineering',
          hireDate: new Date(),
        },
      ];

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue(mockUsers),
              }),
            }),
          }),
        }),
      });

      const response = await request(app).get('/organizations/1/users');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUsers);
    });

    it('should filter users by status', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/organizations/1/users')
        .query({ status: 'active' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /organizations/stats', () => {
    it('should return organization statistics', async () => {
      const mockStats = {
        totalOrganizations: 25,
        activeOrganizations: 22,
        totalUsers: 1250,
        organizationsThisMonth: 3,
        averageUsersPerOrg: 50,
      };

      // Mock multiple stat queries
      mockedDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockResolvedValue([{ count: 25 }]),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 22 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockResolvedValue([{ count: 1250 }]),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 3 }]),
          }),
        });

      const response = await request(app).get('/organizations/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
    });
  });

  describe('Authorization', () => {
    it('should require corporate admin access', async () => {
      mockedVerifyCorporateAdmin.mockImplementation((req: any, res, next) => {
        res.status(403).json({ message: 'Corporate admin access required' });
      });

      const response = await request(app).get('/organizations');

      expect(response.status).toBe(403);
    });

    it('should reject regular admin access', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = {
          id: 2,
          isAdmin: true,
          adminScope: 'organization', // Not corporate
        };
        next();
      });

      mockedVerifyCorporateAdmin.mockImplementation((req: any, res, next) => {
        res.status(403).json({ message: 'Corporate admin access required' });
      });

      const response = await request(app).get('/organizations');

      expect(response.status).toBe(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockedDb.query = {
        organizations: {
          findMany: jest.fn().mockRejectedValue(new Error('Connection failed')),
        },
      } as any;

      const response = await request(app).get('/organizations');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/organizations')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should validate email format', async () => {
      const invalidData = {
        name: 'Test Company',
        contactEmail: 'invalid-email-format',
        country: 'United States',
      };

      const response = await request(app)
        .post('/organizations')
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it('should handle large organization names', async () => {
      const invalidData = {
        name: 'x'.repeat(256), // Too long
        contactEmail: 'admin@test.com',
        country: 'United States',
      };

      const response = await request(app)
        .post('/organizations')
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe('Data Validation', () => {
    it('should normalize country names', async () => {
      const orgData = {
        name: 'Test Corp',
        contactEmail: 'admin@test.com',
        country: 'usa', // Should be normalized
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            ...orgData,
            country: 'United States', // Normalized
          }]),
        }),
      });

      const response = await request(app)
        .post('/organizations')
        .send(orgData);

      expect(response.status).toBe(201);
      expect(response.body.country).toBe('United States');
    });

    it('should validate website URLs', async () => {
      const invalidData = {
        name: 'Test Corp',
        contactEmail: 'admin@test.com',
        country: 'United States',
        website: 'not-a-valid-url',
      };

      const response = await request(app)
        .post('/organizations')
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });
});