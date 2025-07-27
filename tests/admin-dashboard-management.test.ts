import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { storage } from '../server/storage';

// Mock storage
jest.mock('../server/storage');
const mockStorage = storage as jest.Mocked<typeof storage>;

// Admin Dashboard Management Test Suite
// Tests for management dashboard subscription data and organization features
describe('Admin Dashboard Management Features', () => {
  let app: express.Application;
  let authToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = 'valid-admin-token';
  });

  describe('Organization Management', () => {
    describe('GET /api/management/organizations - Organizations List', () => {
      it('should return organizations with subscription data', async () => {
        const mockOrganizations = [
          {
            id: 1,
            name: 'Canva',
            status: 'active',
            userCount: 403,
            contactEmail: 'admin@canva.com',
            industry: 'technology',
            subscription: {
              id: 6,
              subscribedUsers: 500,
              totalMonthlyAmount: 4000,
              expirationDate: '2026-07-26T00:00:00.000Z',
              isActive: true,
              subscriptionPeriod: 'year',
              pricePerUserPerMonth: 8,
              lastPaymentDate: '2025-07-26T00:00:00.000Z'
            }
          },
          {
            id: 6,
            name: 'Loylogic',
            status: 'active',
            userCount: 1,
            contactEmail: 'skif.samir@gmail.com',
            industry: 'consulting',
            subscription: {
              id: 3,
              subscribedUsers: 150,
              totalMonthlyAmount: 1125,
              expirationDate: '2026-07-26T00:00:00.000Z',
              isActive: true,
              subscriptionPeriod: 'quarter',
              pricePerUserPerMonth: 7.5,
              lastPaymentDate: '2025-07-26T00:00:00.000Z'
            }
          }
        ];

        mockStorage.getOrganizationsWithSubscriptions.mockResolvedValue(mockOrganizations);

        const response = await request(app)
          .get('/api/management/organizations')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(response.body[0]).toHaveProperty('subscription');
        expect(response.body[0].subscription.subscribedUsers).toBe(500);
        expect(response.body[1].subscription.totalMonthlyAmount).toBe(1125);
      });

      it('should handle organizations without subscriptions', async () => {
        const mockOrganizations = [
          {
            id: 2,
            name: 'No Subscription Org',
            status: 'inactive',
            userCount: 0,
            contactEmail: 'contact@nosub.com',
            subscription: null
          }
        ];

        mockStorage.getOrganizationsWithSubscriptions.mockResolvedValue(mockOrganizations);

        const response = await request(app)
          .get('/api/management/organizations')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].subscription).toBeNull();
      });
    });

    describe('GET /api/management/organizations/:id - Individual Organization', () => {
      it('should return complete organization details with nested subscription', async () => {
        const mockOrganization = {
          id: 1,
          name: 'Canva',
          status: 'active',
          maxUsers: 500,
          contactName: 'Samir Skif',
          contactEmail: 'skif.samir@gmail.com',
          contactPhone: '0544328869',
          superuserEmail: 'admin@canva.com',
          industry: 'technology',
          address: {
            street: '19 Lukens Dr STE 300ID6885941',
            city: 'New York',
            state: 'DE',
            country: 'US',
            zipCode: ''
          },
          createdAt: '2025-04-28T16:37:25.184Z',
          userCount: 403
        };

        mockStorage.getOrganizationById.mockResolvedValue(mockOrganization);

        const response = await request(app)
          .get('/api/management/organizations/1')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.id).toBe(1);
        expect(response.body.name).toBe('Canva');
        expect(response.body.address).toHaveProperty('street');
        expect(response.body.address).toHaveProperty('city');
        expect(response.body.contactName).toBe('Samir Skif');
      });

      it('should handle snake_case to camelCase field mapping correctly', async () => {
        const dbOrganization = {
          id: 1,
          name: 'Test Org',
          contact_name: 'John Doe',
          contact_email: 'john@test.com',
          contact_phone: '+1234567890',
          superuser_email: 'admin@test.com',
          created_at: '2025-01-01T00:00:00.000Z',
          user_count: 25
        };

        mockStorage.getOrganizationById.mockResolvedValue(dbOrganization);

        const response = await request(app)
          .get('/api/management/organizations/1')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Verify camelCase conversion in response
        expect(response.body.contactName).toBe('John Doe');
        expect(response.body.contactEmail).toBe('john@test.com');
        expect(response.body.contactPhone).toBe('+1234567890');
        expect(response.body.superuserEmail).toBe('admin@test.com');
        expect(response.body.userCount).toBe(25);
      });
    });

    describe('PUT /api/management/organizations/:id - Update Organization', () => {
      it('should update organization with proper field mapping', async () => {
        const updateData = {
          name: 'Updated Organization',
          contactName: 'Jane Smith',
          contactEmail: 'jane@updated.com',
          industry: 'finance',
          address: {
            street: '123 Updated St',
            city: 'Updated City',
            state: 'CA',
            country: 'US',
            zipCode: '90210'
          }
        };

        const expectedDbFields = {
          name: 'Updated Organization',
          contact_name: 'Jane Smith',
          contact_email: 'jane@updated.com',
          industry: 'finance',
          address: {
            street: '123 Updated St',
            city: 'Updated City',
            state: 'CA',
            country: 'US',
            zipCode: '90210'
          }
        };

        mockStorage.updateOrganization.mockResolvedValue({
          id: 1,
          ...updateData
        });

        const response = await request(app)
          .put('/api/management/organizations/1')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.name).toBe('Updated Organization');
        expect(mockStorage.updateOrganization).toHaveBeenCalledWith(1, expectedDbFields);
      });
    });
  });

  describe('Subscription Management', () => {
    describe('GET /api/management/organizations/:id/subscription - Subscription Details', () => {
      it('should return subscription data with proper nested structure', async () => {
        const mockSubscriptionData = {
          hasSubscription: true,
          subscription: {
            id: 6,
            organizationId: 1,
            lastPaymentDate: '2025-07-26T00:00:00.000Z',
            subscriptionPeriod: 'year',
            customDurationDays: null,
            expirationDate: '2026-07-26T00:00:00.000Z',
            isActive: true,
            subscribedUsers: 500,
            pricePerUserPerMonth: 8,
            totalMonthlyAmount: 4000,
            createdAt: '2025-07-26T23:47:04.180Z'
          }
        };

        mockStorage.getOrganizationSubscription.mockResolvedValue(mockSubscriptionData);

        const response = await request(app)
          .get('/api/management/organizations/1/subscription')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.hasSubscription).toBe(true);
        expect(response.body.subscription).toHaveProperty('id');
        expect(response.body.subscription.subscribedUsers).toBe(500);
        expect(response.body.subscription.totalMonthlyAmount).toBe(4000);
        expect(response.body.subscription.subscriptionPeriod).toBe('year');
      });

      it('should handle organizations without subscriptions', async () => {
        const mockSubscriptionData = {
          hasSubscription: false,
          subscription: null
        };

        mockStorage.getOrganizationSubscription.mockResolvedValue(mockSubscriptionData);

        const response = await request(app)
          .get('/api/management/organizations/2/subscription')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.hasSubscription).toBe(false);
        expect(response.body.subscription).toBeNull();
      });
    });

    describe('POST /api/management/organizations/:id/subscription - Create Subscription', () => {
      it('should create new subscription with proper validation', async () => {
        const subscriptionData = {
          lastPaymentDate: '2025-07-27',
          subscriptionPeriod: 'quarter',
          subscribedUsers: 100,
          pricePerUserPerMonth: 10,
          totalMonthlyAmount: 1000
        };

        const createdSubscription = {
          id: 7,
          organizationId: 1,
          ...subscriptionData,
          isActive: true,
          createdAt: '2025-07-27T16:00:00.000Z'
        };

        mockStorage.createSubscription.mockResolvedValue(createdSubscription);

        const response = await request(app)
          .post('/api/management/organizations/1/subscription')
          .set('Authorization', `Bearer ${authToken}`)
          .send(subscriptionData)
          .expect(201);

        expect(response.body.id).toBe(7);
        expect(response.body.subscribedUsers).toBe(100);
        expect(response.body.isActive).toBe(true);
      });

      it('should calculate proper expiration dates based on period', async () => {
        const quarterSubscription = {
          lastPaymentDate: '2025-07-27',
          subscriptionPeriod: 'quarter',
          subscribedUsers: 50,
          pricePerUserPerMonth: 8
        };

        mockStorage.createSubscription.mockResolvedValue({
          id: 8,
          organizationId: 2,
          ...quarterSubscription,
          expirationDate: '2025-10-27T00:00:00.000Z', // 3 months later
          isActive: true
        });

        const response = await request(app)
          .post('/api/management/organizations/2/subscription')
          .set('Authorization', `Bearer ${authToken}`)
          .send(quarterSubscription)
          .expect(201);

        expect(response.body.subscriptionPeriod).toBe('quarter');
        expect(new Date(response.body.expirationDate).getMonth()).toBe(9); // October (0-indexed)
      });
    });

    describe('POST /api/management/organizations/:id/subscription/renew - Renew Subscription', () => {
      it('should renew existing subscription with updated expiration', async () => {
        const renewalData = {
          lastPaymentDate: '2025-07-27',
          subscriptionPeriod: 'year'
        };

        const renewedSubscription = {
          id: 6,
          organizationId: 1,
          ...renewalData,
          expirationDate: '2026-07-27T00:00:00.000Z', // 1 year later
          isActive: true,
          subscribedUsers: 500,
          pricePerUserPerMonth: 8,
          totalMonthlyAmount: 4000
        };

        mockStorage.renewSubscription.mockResolvedValue(renewedSubscription);

        const response = await request(app)
          .post('/api/management/organizations/1/subscription/renew')
          .set('Authorization', `Bearer ${authToken}`)
          .send(renewalData)
          .expect(200);

        expect(response.body.isActive).toBe(true);
        expect(new Date(response.body.expirationDate).getFullYear()).toBe(2026);
      });
    });
  });

  describe('Organization Features Management', () => {
    describe('GET /api/management/organizations/:id/features - Get Features', () => {
      it('should return organization features with snake_case field names', async () => {
        const mockFeatures = [
          {
            id: 5,
            organization_id: 1,
            feature_key: 'recognition',
            is_enabled: true,
            enabled_at: '2025-07-24T16:20:07.954Z',
            enabled_by: 1682,
            settings: null
          },
          {
            id: 6,
            organization_id: 1,
            feature_key: 'social',
            is_enabled: true,
            enabled_at: '2025-07-24T16:20:07.954Z',
            enabled_by: 1682,
            settings: null
          }
        ];

        mockStorage.getOrganizationFeatures.mockResolvedValue(mockFeatures);

        const response = await request(app)
          .get('/api/management/organizations/1/features')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(response.body[0].feature_key).toBe('recognition');
        expect(response.body[0].is_enabled).toBe(true);
        expect(response.body[1].feature_key).toBe('social');
      });

      it('should handle organizations with no features', async () => {
        mockStorage.getOrganizationFeatures.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/management/organizations/3/features')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveLength(0);
      });
    });

    describe('PUT /api/management/organizations/:id/features/:featureKey - Toggle Feature', () => {
      it('should enable a feature for organization', async () => {
        const updatedFeature = {
          id: 5,
          organization_id: 1,
          feature_key: 'recognition',
          is_enabled: true,
          enabled_at: '2025-07-27T16:00:00.000Z',
          enabled_by: 1682
        };

        mockStorage.updateOrganizationFeature.mockResolvedValue(updatedFeature);

        const response = await request(app)
          .put('/api/management/organizations/1/features/recognition')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isEnabled: true })
          .expect(200);

        expect(response.body.is_enabled).toBe(true);
        expect(response.body.feature_key).toBe('recognition');
        expect(mockStorage.updateOrganizationFeature).toHaveBeenCalledWith(
          1,
          'recognition',
          true
        );
      });

      it('should disable a feature for organization', async () => {
        const updatedFeature = {
          id: 5,
          organization_id: 1,
          feature_key: 'recognition',
          is_enabled: false,
          enabled_at: '2025-07-24T16:20:07.954Z',
          enabled_by: 1682
        };

        mockStorage.updateOrganizationFeature.mockResolvedValue(updatedFeature);

        const response = await request(app)
          .put('/api/management/organizations/1/features/recognition')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isEnabled: false })
          .expect(200);

        expect(response.body.is_enabled).toBe(false);
        expect(mockStorage.updateOrganizationFeature).toHaveBeenCalledWith(
          1,
          'recognition',
          false
        );
      });
    });
  });

  describe('Database Column Naming Consistency', () => {
    it('should handle snake_case database fields consistently', async () => {
      // Test that all database interactions use proper snake_case naming
      const testFields = {
        organization_id: 1,
        contact_name: 'Test Contact',
        contact_email: 'test@example.com',
        contact_phone: '+1234567890',
        superuser_email: 'admin@example.com',
        created_at: '2025-07-27T16:00:00.000Z',
        user_count: 100,
        max_users: 200,
        is_active: true,
        feature_key: 'recognition',
        is_enabled: true,
        enabled_at: '2025-07-27T16:00:00.000Z',
        subscription_period: 'year',
        subscribed_users: 500,
        price_per_user_per_month: 8,
        total_monthly_amount: 4000,
        last_payment_date: '2025-07-27T00:00:00.000Z',
        expiration_date: '2026-07-27T00:00:00.000Z'
      };

      // Verify all storage methods use snake_case consistently
      mockStorage.createOrganization.mockResolvedValue({ id: 1, ...testFields });

      const response = await request(app)
        .post('/api/management/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: 1,
          contactName: 'Test Contact',
          contactEmail: 'test@example.com',
          contactPhone: '+1234567890',
          superuserEmail: 'admin@example.com'
        })
        .expect(201);

      // Verify storage was called with snake_case fields
      expect(mockStorage.createOrganization).toHaveBeenCalledWith(
        expect.objectContaining({
          contact_name: 'Test Contact',
          contact_email: 'test@example.com',
          contact_phone: '+1234567890',
          superuser_email: 'admin@example.com'
        })
      );
    });
  });

  describe('API Response Structure Validation', () => {
    it('should return properly structured organization list response', async () => {
      const mockOrgs = [
        {
          id: 1,
          name: 'Test Org',
          status: 'active',
          subscription: {
            subscribedUsers: 100,
            totalMonthlyAmount: 800,
            isActive: true
          }
        }
      ];

      mockStorage.getOrganizationsWithSubscriptions.mockResolvedValue(mockOrgs);

      const response = await request(app)
        .get('/api/management/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate response structure
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('subscription');
      expect(response.body[0].subscription).toHaveProperty('subscribedUsers');
      expect(response.body[0].subscription).toHaveProperty('totalMonthlyAmount');
    });

    it('should return properly structured subscription response', async () => {
      const mockSubscription = {
        hasSubscription: true,
        subscription: {
          id: 1,
          organizationId: 1,
          subscribedUsers: 100,
          totalMonthlyAmount: 800,
          subscriptionPeriod: 'quarter',
          isActive: true,
          expirationDate: '2026-01-01T00:00:00.000Z',
          lastPaymentDate: '2025-07-01T00:00:00.000Z'
        }
      };

      mockStorage.getOrganizationSubscription.mockResolvedValue(mockSubscription);

      const response = await request(app)
        .get('/api/management/organizations/1/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate nested subscription structure
      expect(response.body).toHaveProperty('hasSubscription');
      expect(response.body).toHaveProperty('subscription');
      expect(response.body.subscription).toHaveProperty('id');
      expect(response.body.subscription).toHaveProperty('organizationId');
      expect(response.body.subscription).toHaveProperty('subscribedUsers');
      expect(response.body.subscription).toHaveProperty('totalMonthlyAmount');
      expect(response.body.subscription).toHaveProperty('subscriptionPeriod');
    });
  });

  describe('Management Authentication', () => {
    it('should authenticate management login with correct credentials', async () => {
      const loginData = {
        username: 'admin@thriviohr.com',
        password: 'admin123'
      };

      const mockAdmin = {
        id: 1682,
        email: 'admin@thriviohr.com',
        isAdmin: true,
        roleType: 'corporate_admin'
      };

      mockStorage.authenticateAdmin.mockResolvedValue(mockAdmin);

      const response = await request(app)
        .post('/management/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('admin');
      expect(response.body.admin.email).toBe('admin@thriviohr.com');
    });

    it('should reject invalid management credentials', async () => {
      const loginData = {
        username: 'wrong@email.com',
        password: 'wrongpass'
      };

      mockStorage.authenticateAdmin.mockResolvedValue(null);

      const response = await request(app)
        .post('/management/login')
        .send(loginData)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });
  });
});