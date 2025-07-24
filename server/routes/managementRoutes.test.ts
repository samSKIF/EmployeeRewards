import request from 'supertest';
import express from 'express';
import managementRoutes from './managementRoutes';
import { storage } from '../storage';
import { verifyToken, verifyAdmin } from '../middleware/auth';

jest.mock('../storage');
jest.mock('../middleware/auth');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockVerifyAdmin = verifyAdmin as jest.MockedFunction<typeof verifyAdmin>;

describe('Management Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    
    // Mock auth middleware - corporate admin
    mockVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = {
        id: 1,
        email: 'admin@corporate.com',
        organizationId: 1,
        isAdmin: true,
        adminScope: 'super',
      };
      next();
    });
    
    mockVerifyAdmin.mockImplementation((req, res, next) => {
      next();
    });
    
    app.use('/api/management', managementRoutes);
  });

  describe('GET /api/management/organizations', () => {
    it('should return all organizations for corporate admin', async () => {
      const mockOrganizations = [
        {
          id: 1,
          name: 'Organization 1',
          type: 'corporate',
          status: 'active',
          subscribedUsers: 100,
          activeUserCount: 85,
        },
        {
          id: 2,
          name: 'Organization 2',
          type: 'client',
          status: 'active',
          subscribedUsers: 50,
          activeUserCount: 45,
        },
      ];
      
      mockStorage.getAllOrganizations.mockResolvedValue(mockOrganizations);

      const response = await request(app)
        .get('/api/management/organizations')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockOrganizations);
    });

    it('should deny access to non-corporate admins', async () => {
      mockVerifyAdmin.mockImplementation((req, res, next) => {
        res.status(403).json({ message: 'Corporate admin access required' });
      });

      const response = await request(app)
        .get('/api/management/organizations')
        .set('Authorization', 'Bearer user-token');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/management/organizations', () => {
    it('should create new organization', async () => {
      const newOrgData = {
        name: 'New Organization',
        type: 'client',
        contactEmail: 'contact@neworg.com',
        contactPhone: '+1234567890',
        superuserEmail: 'admin@neworg.com',
        address: '123 Main St',
        country: 'USA',
      };
      
      const createdOrg = {
        id: 3,
        ...newOrgData,
        status: 'active',
        createdAt: new Date(),
      };
      
      mockStorage.createOrganization.mockResolvedValue(createdOrg);

      const response = await request(app)
        .post('/api/management/organizations')
        .set('Authorization', 'Bearer admin-token')
        .send(newOrgData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdOrg);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/management/organizations')
        .set('Authorization', 'Bearer admin-token')
        .send({
          // Missing required fields
          type: 'client',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/management/organizations/:id', () => {
    it('should update organization details', async () => {
      const updateData = {
        name: 'Updated Organization',
        status: 'inactive',
        contactEmail: 'newcontact@org.com',
      };
      
      const updatedOrg = {
        id: 2,
        ...updateData,
      };
      
      mockStorage.updateOrganization.mockResolvedValue(updatedOrg);

      const response = await request(app)
        .put('/api/management/organizations/2')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedOrg);
    });
  });

  describe('GET /api/management/subscriptions', () => {
    it('should return all subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 1,
          organizationId: 2,
          organizationName: 'Client Org',
          subscribedUsers: 50,
          expirationDate: new Date('2025-12-31'),
          isActive: true,
          subscriptionPeriod: 'year',
        },
      ];
      
      mockStorage.getAllSubscriptions.mockResolvedValue(mockSubscriptions);

      const response = await request(app)
        .get('/api/management/subscriptions')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSubscriptions);
    });
  });

  describe('POST /api/management/subscriptions', () => {
    it('should create new subscription', async () => {
      const subscriptionData = {
        organizationId: 2,
        subscribedUsers: 100,
        subscriptionPeriod: 'year',
        startDate: new Date(),
      };
      
      const createdSubscription = {
        id: 10,
        ...subscriptionData,
        expirationDate: new Date('2026-01-24'),
        isActive: true,
      };
      
      mockStorage.createSubscription.mockResolvedValue(createdSubscription);

      const response = await request(app)
        .post('/api/management/subscriptions')
        .set('Authorization', 'Bearer admin-token')
        .send(subscriptionData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdSubscription);
    });
  });

  describe('PUT /api/management/subscriptions/:id', () => {
    it('should update subscription', async () => {
      const updateData = {
        subscribedUsers: 150,
        expirationDate: new Date('2026-06-30'),
      };
      
      mockStorage.updateSubscription.mockResolvedValue({
        id: 1,
        ...updateData,
      });

      const response = await request(app)
        .put('/api/management/subscriptions/1')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/management/analytics', () => {
    it('should return platform analytics', async () => {
      const mockAnalytics = {
        totalOrganizations: 25,
        activeOrganizations: 22,
        totalUsers: 1500,
        activeUsers: 1350,
        totalRevenue: 250000,
        monthlyGrowth: 5.2,
        userEngagement: {
          dailyActive: 800,
          weeklyActive: 1200,
          monthlyActive: 1350,
        },
      };
      
      mockStorage.getPlatformAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/management/analytics')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAnalytics);
    });
  });

  describe('GET /api/management/users', () => {
    it('should return all users across organizations', async () => {
      const mockUsers = [
        {
          id: 1,
          name: 'User 1',
          organizationId: 1,
          organizationName: 'Org 1',
          status: 'active',
        },
        {
          id: 2,
          name: 'User 2',
          organizationId: 2,
          organizationName: 'Org 2',
          status: 'active',
        },
      ];
      
      mockStorage.getAllUsersAcrossOrgs.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/management/users')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUsers);
    });

    it('should support filtering by organization', async () => {
      mockStorage.getAllUsersAcrossOrgs.mockResolvedValue([]);

      await request(app)
        .get('/api/management/users')
        .query({ organizationId: 2 })
        .set('Authorization', 'Bearer admin-token');

      expect(mockStorage.getAllUsersAcrossOrgs).toHaveBeenCalledWith(2);
    });
  });

  describe('POST /api/management/users/:id/impersonate', () => {
    it('should generate impersonation token for user', async () => {
      const mockUser = {
        id: 10,
        email: 'user@client.com',
        organizationId: 2,
      };
      
      mockStorage.getUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/management/users/10/impersonate')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('impersonationToken');
      expect(response.body).toHaveProperty('user');
    });
  });
});