import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from './test-utils/app-setup';
import { IStorage } from './storage';

// Mock the storage with complete interface
const mockStorage = {
  getOrganizationById: jest.fn(),
  getSubscriptionByOrganizationId: jest.fn(),
  createSubscription: jest.fn(),
  renewSubscription: jest.fn(),
  deactivateSubscription: jest.fn(),
  getOrganizationFeatures: jest.fn(),
  // Add other required IStorage methods as mocks
  getUsers: jest.fn(),
  getUserCount: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
} as jest.Mocked<IStorage>;

describe('Subscription Management Tests', () => {
  let app: Express;
  let authToken: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await createTestApp(mockStorage);
    
    // Mock authentication token
    authToken = 'mock-valid-token';
  });

  describe('Collapsible Subscription Section Logic', () => {
    it('should return subscription data for UI state management', async () => {
      const mockSubscription = {
        id: 1,
        organization_id: 6,
        is_active: true,
        subscribed_users: 150,
        total_monthly_amount: 1125,
        subscription_period: 'quarter',
        last_payment_date: '2025-07-26',
        expiration_date: '2026-07-26',
      };

      mockStorage.getSubscriptionByOrganizationId.mockResolvedValue(mockSubscription);

      const response = await request(app)
        .get('/api/management/organizations/6/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        hasSubscription: true,
        subscription: expect.objectContaining({
          isActive: true,
          subscribedUsers: 150,
          totalMonthlyAmount: 1125,
        }),
      });

      // Verify this data supports UI collapse logic
      expect(response.body.hasSubscription && response.body.subscription.isActive).toBe(true);
    });

    it('should handle subscription renewal with proper validation', async () => {
      const renewalData = {
        lastPaymentDate: '2025-07-27',
        subscriptionPeriod: 'quarter',
        subscribedUsers: 200,
        pricePerUserPerMonth: 8.0,
        totalMonthlyAmount: 1600,
      };

      const mockRenewedSubscription = {
        id: 1,
        organization_id: 6,
        is_active: true,
        ...renewalData,
        expiration_date: '2026-01-27',
      };

      mockStorage.renewSubscription.mockResolvedValue(mockRenewedSubscription);

      const response = await request(app)
        .post('/api/management/organizations/6/subscription/renew')
        .set('Authorization', `Bearer ${authToken}`)
        .send(renewalData)
        .expect(200);

      expect(mockStorage.renewSubscription).toHaveBeenCalledWith(6, expect.objectContaining({
        lastPaymentDate: renewalData.lastPaymentDate,
        subscriptionPeriod: renewalData.subscriptionPeriod,
      }));

      expect(response.body).toEqual(expect.objectContaining({
        isActive: true,
        subscribedUsers: 200,
        totalMonthlyAmount: 1600,
      }));
    });

    it('should show non-collapsed form for inactive subscriptions', async () => {
      const mockInactiveSubscription = {
        id: 1,
        organization_id: 6,
        is_active: false,
        subscribed_users: 50,
        total_monthly_amount: 500,
      };

      mockStorage.getSubscriptionByOrganizationId?.mockResolvedValue(mockInactiveSubscription);

      const response = await request(app)
        .get('/api/management/organizations/6/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // For inactive subscriptions, UI should not collapse by default
      expect(response.body.subscription.isActive).toBe(false);
      expect(response.body.hasSubscription).toBe(true);
    });

    it('should show non-collapsed form for organizations without subscriptions', async () => {
      mockStorage.getSubscriptionByOrganizationId?.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/management/organizations/6/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        hasSubscription: false,
        subscription: null,
      });
    });
  });

  describe('Subscription State Transitions', () => {
    it('should handle active to renewal transition properly', async () => {
      // First get active subscription
      const activeSubscription = {
        id: 1,
        organization_id: 6,
        is_active: true,
        subscribed_users: 150,
        expiration_date: '2025-08-01', // Soon to expire
      };

      mockStorage.getSubscriptionByOrganizationId?.mockResolvedValue(activeSubscription);

      const statusResponse = await request(app)
        .get('/api/management/organizations/6/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.subscription.isActive).toBe(true);

      // Then renew subscription
      const renewalData = {
        lastPaymentDate: '2025-07-27',
        subscriptionPeriod: 'year',
        subscribedUsers: 200,
      };

      const renewedSubscription = {
        ...activeSubscription,
        ...renewalData,
        expiration_date: '2026-07-27',
      };

      mockStorage.renewSubscription?.mockResolvedValue(renewedSubscription);

      const renewResponse = await request(app)
        .post('/api/management/organizations/6/subscription/renew')
        .set('Authorization', `Bearer ${authToken}`)
        .send(renewalData)
        .expect(200);

      expect(renewResponse.body.subscribedUsers).toBe(200);
      expect(renewResponse.body.isActive).toBe(true);
    });

    it('should handle subscription deactivation properly', async () => {
      const activeSubscription = {
        id: 1,
        organization_id: 6,
        is_active: true,
      };

      const deactivatedSubscription = {
        ...activeSubscription,
        is_active: false,
      };

      mockStorage.getSubscriptionByOrganizationId?.mockResolvedValue(activeSubscription);
      mockStorage.deactivateSubscription?.mockResolvedValue(deactivatedSubscription);

      const response = await request(app)
        .post('/api/management/organizations/6/subscription/deactivate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockStorage.deactivateSubscription).toHaveBeenCalledWith(6);
      expect(response.body.isActive).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockStorage.getSubscriptionByOrganizationId?.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/management/organizations/6/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch subscription data',
      });
    });

    it('should validate renewal data properly', async () => {
      const invalidRenewalData = {
        lastPaymentDate: 'invalid-date',
        subscriptionPeriod: 'invalid-period',
      };

      const response = await request(app)
        .post('/api/management/organizations/6/subscription/renew')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRenewalData)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });
  });

  describe('Integration with Organization Features', () => {
    it('should maintain feature states during subscription renewal', async () => {
      const mockFeatures = [
        { feature_key: 'recognition', is_enabled: true },
        { feature_key: 'social', is_enabled: true },
      ];

      mockStorage.getOrganizationFeatures?.mockResolvedValue(mockFeatures);

      const featuresResponse = await request(app)
        .get('/api/management/organizations/6/features')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(featuresResponse.body).toHaveLength(2);
      expect(featuresResponse.body[0].feature_key).toBe('recognition');
      expect(featuresResponse.body[0].is_enabled).toBe(true);

      // Features should persist through subscription renewal
      const renewalData = {
        lastPaymentDate: '2025-07-27',
        subscriptionPeriod: 'quarter',
      };

      mockStorage.renewSubscription?.mockResolvedValue({
        id: 1,
        organization_id: 6,
        is_active: true,
      });

      await request(app)
        .post('/api/management/organizations/6/subscription/renew')
        .set('Authorization', `Bearer ${authToken}`)
        .send(renewalData)
        .expect(200);

      // Verify features still exist after renewal
      const postRenewalFeatures = await request(app)
        .get('/api/management/organizations/6/features')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(postRenewalFeatures.body).toHaveLength(2);
    });
  });
});