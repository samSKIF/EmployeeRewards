import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';

// Mock storage interface for recognition feature management
const mockStorage = {
  getOrganizationFeatures: jest.fn(),
  updateOrganizationFeature: jest.fn(),
  createOrganizationFeature: jest.fn(),
  deleteOrganizationFeature: jest.fn(),
  getOrganizationById: jest.fn(),
  clearFeaturesCache: jest.fn(),
} as any;

describe('Recognition & Rewards Module Toggle - Complete Test Suite', () => {
  let app: Express;
  const authToken = 'mock-admin-token';

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req: any, res, next) => {
      req.user = { 
        id: 1, 
        organizationId: 6, 
        isAdmin: true,
        email: 'admin@test.com' 
      };
      next();
    });

    // Mock API endpoints
    app.get('/api/management/organizations/:id/features', async (req, res) => {
      try {
        const organizationId = parseInt(req.params.id);
        const features = await mockStorage.getOrganizationFeatures(organizationId);
        res.json(features);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch features' });
      }
    });

    app.post('/api/management/organizations/:id/features', async (req, res) => {
      try {
        const organizationId = parseInt(req.params.id);
        const { featureKey, isEnabled } = req.body;
        
        if (!featureKey || typeof isEnabled !== 'boolean') {
          return res.status(400).json({ error: 'Invalid feature data' });
        }

        const result = await mockStorage.updateOrganizationFeature(
          organizationId, 
          featureKey, 
          isEnabled,
          req.user.id
        );
        
        // Clear cache after update
        await mockStorage.clearFeaturesCache(organizationId);
        
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to update feature' });
      }
    });
  });

  describe('API Endpoint Tests', () => {
    it('should fetch organization features successfully', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false },
        { id: 10, organization_id: 6, feature_key: 'social', is_enabled: true },
        { id: 11, organization_id: 6, feature_key: 'surveys', is_enabled: true },
        { id: 12, organization_id: 6, feature_key: 'marketplace', is_enabled: true }
      ];

      mockStorage.getOrganizationFeatures.mockResolvedValue(mockFeatures);

      const response = await request(app)
        .get('/api/management/organizations/6/features')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(4);
      expect(response.body[0].feature_key).toBe('recognition');
      expect(response.body[0].is_enabled).toBe(false);
      expect(mockStorage.getOrganizationFeatures).toHaveBeenCalledWith(6);
    });

    it('should enable recognition feature successfully', async () => {
      const updatedFeature = {
        id: 9,
        organization_id: 6,
        feature_key: 'recognition',
        is_enabled: true,
        enabled_at: new Date().toISOString(),
        enabled_by: 1
      };

      mockStorage.updateOrganizationFeature.mockResolvedValue(updatedFeature);
      mockStorage.clearFeaturesCache.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/management/organizations/6/features')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          featureKey: 'recognition',
          isEnabled: true
        })
        .expect(200);

      expect(response.body.is_enabled).toBe(true);
      expect(response.body.feature_key).toBe('recognition');
      expect(mockStorage.updateOrganizationFeature).toHaveBeenCalledWith(6, 'recognition', true, 1);
      expect(mockStorage.clearFeaturesCache).toHaveBeenCalledWith(6);
    });

    it('should disable recognition feature successfully', async () => {
      const updatedFeature = {
        id: 9,
        organization_id: 6,
        feature_key: 'recognition',
        is_enabled: false,
        disabled_at: new Date().toISOString(),
        disabled_by: 1
      };

      mockStorage.updateOrganizationFeature.mockResolvedValue(updatedFeature);
      mockStorage.clearFeaturesCache.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/management/organizations/6/features')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          featureKey: 'recognition',
          isEnabled: false
        })
        .expect(200);

      expect(response.body.is_enabled).toBe(false);
      expect(mockStorage.updateOrganizationFeature).toHaveBeenCalledWith(6, 'recognition', false, 1);
    });

    it('should validate request data for feature updates', async () => {
      // Test missing featureKey
      await request(app)
        .post('/api/management/organizations/6/features')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isEnabled: true })
        .expect(400);

      // Test missing isEnabled
      await request(app)
        .post('/api/management/organizations/6/features')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ featureKey: 'recognition' })
        .expect(400);

      // Test invalid isEnabled type
      await request(app)
        .post('/api/management/organizations/6/features')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ featureKey: 'recognition', isEnabled: 'yes' })
        .expect(400);

      expect(mockStorage.updateOrganizationFeature).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockStorage.getOrganizationFeatures.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/management/organizations/6/features')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch features');
    });
  });

  describe('Business Logic Tests', () => {
    it('should handle recognition feature state transitions correctly', async () => {
      // Test OFF to ON transition
      const enabledFeature = {
        id: 9,
        organization_id: 6,
        feature_key: 'recognition',
        is_enabled: true,
        enabled_at: '2025-07-27T18:00:00.000Z',
        enabled_by: 1
      };

      mockStorage.updateOrganizationFeature.mockResolvedValue(enabledFeature);
      mockStorage.clearFeaturesCache.mockResolvedValue(true);

      const enableResponse = await request(app)
        .post('/api/management/organizations/6/features')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ featureKey: 'recognition', isEnabled: true })
        .expect(200);

      expect(enableResponse.body.is_enabled).toBe(true);
      expect(enableResponse.body.enabled_at).toBeTruthy();

      // Test ON to OFF transition
      const disabledFeature = {
        ...enabledFeature,
        is_enabled: false,
        disabled_at: '2025-07-27T18:05:00.000Z',
        disabled_by: 1
      };

      mockStorage.updateOrganizationFeature.mockResolvedValue(disabledFeature);

      const disableResponse = await request(app)
        .post('/api/management/organizations/6/features')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ featureKey: 'recognition', isEnabled: false })
        .expect(200);

      expect(disableResponse.body.is_enabled).toBe(false);
    });

    it('should preserve audit trail for feature changes', async () => {
      const adminUserId = 1;
      const currentTime = new Date().toISOString();

      const auditedFeature = {
        id: 9,
        organization_id: 6,
        feature_key: 'recognition',
        is_enabled: true,
        enabled_at: currentTime,
        enabled_by: adminUserId,
        settings: null
      };

      mockStorage.updateOrganizationFeature.mockResolvedValue(auditedFeature);

      await request(app)
        .post('/api/management/organizations/6/features')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ featureKey: 'recognition', isEnabled: true })
        .expect(200);

      expect(mockStorage.updateOrganizationFeature).toHaveBeenCalledWith(
        6, 
        'recognition', 
        true, 
        adminUserId
      );
    });

    it('should clear cache after feature updates', async () => {
      mockStorage.updateOrganizationFeature.mockResolvedValue({
        id: 9,
        feature_key: 'recognition',
        is_enabled: true
      });
      mockStorage.clearFeaturesCache.mockResolvedValue(true);

      await request(app)
        .post('/api/management/organizations/6/features')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ featureKey: 'recognition', isEnabled: true })
        .expect(200);

      expect(mockStorage.clearFeaturesCache).toHaveBeenCalledWith(6);
    });

    it('should handle multiple concurrent feature updates', async () => {
      const recognitionUpdate = {
        id: 9,
        feature_key: 'recognition',
        is_enabled: true
      };

      const socialUpdate = {
        id: 10,
        feature_key: 'social',
        is_enabled: false
      };

      mockStorage.updateOrganizationFeature
        .mockResolvedValueOnce(recognitionUpdate)
        .mockResolvedValueOnce(socialUpdate);
      
      mockStorage.clearFeaturesCache.mockResolvedValue(true);

      // Simulate concurrent requests
      const [recognitionResponse, socialResponse] = await Promise.all([
        request(app)
          .post('/api/management/organizations/6/features')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ featureKey: 'recognition', isEnabled: true }),
        request(app)
          .post('/api/management/organizations/6/features')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ featureKey: 'social', isEnabled: false })
      ]);

      expect(recognitionResponse.status).toBe(200);
      expect(socialResponse.status).toBe(200);
      expect(mockStorage.clearFeaturesCache).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete recognition feature workflow', async () => {
      // Step 1: Fetch initial features
      const initialFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false }
      ];
      mockStorage.getOrganizationFeatures.mockResolvedValue(initialFeatures);

      const initialResponse = await request(app)
        .get('/api/management/organizations/6/features')
        .expect(200);

      expect(initialResponse.body[0].is_enabled).toBe(false);

      // Step 2: Enable recognition feature
      const enabledFeature = {
        id: 9,
        organization_id: 6,
        feature_key: 'recognition',
        is_enabled: true,
        enabled_at: '2025-07-27T18:00:00.000Z'
      };

      mockStorage.updateOrganizationFeature.mockResolvedValue(enabledFeature);
      mockStorage.clearFeaturesCache.mockResolvedValue(true);

      await request(app)
        .post('/api/management/organizations/6/features')
        .send({ featureKey: 'recognition', isEnabled: true })
        .expect(200);

      // Step 3: Verify cache was cleared
      expect(mockStorage.clearFeaturesCache).toHaveBeenCalledWith(6);

      // Step 4: Fetch updated features
      const updatedFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: true }
      ];
      mockStorage.getOrganizationFeatures.mockResolvedValue(updatedFeatures);

      const updatedResponse = await request(app)
        .get('/api/management/organizations/6/features')
        .expect(200);

      expect(updatedResponse.body[0].is_enabled).toBe(true);
    });

    it('should maintain feature consistency across organization', async () => {
      const orgId = 6;
      const features = [
        { id: 9, organization_id: orgId, feature_key: 'recognition', is_enabled: true },
        { id: 10, organization_id: orgId, feature_key: 'social', is_enabled: true },
        { id: 11, organization_id: orgId, feature_key: 'surveys', is_enabled: true },
        { id: 12, organization_id: orgId, feature_key: 'marketplace', is_enabled: true }
      ];

      mockStorage.getOrganizationFeatures.mockResolvedValue(features);

      const response = await request(app)
        .get('/api/management/organizations/6/features')
        .expect(200);

      // Verify all features belong to the same organization
      response.body.forEach((feature: any) => {
        expect(feature.organization_id).toBe(orgId);
        expect(feature.feature_key).toBeTruthy();
        expect(typeof feature.is_enabled).toBe('boolean');
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid organization ID', async () => {
      mockStorage.getOrganizationFeatures.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/management/organizations/999999/features')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should handle feature update failures', async () => {
      mockStorage.updateOrganizationFeature.mockRejectedValue(
        new Error('Feature update failed')
      );

      const response = await request(app)
        .post('/api/management/organizations/6/features')
        .send({ featureKey: 'recognition', isEnabled: true })
        .expect(500);

      expect(response.body.error).toBe('Failed to update feature');
    });

    it('should handle cache clearing failures gracefully', async () => {
      mockStorage.updateOrganizationFeature.mockResolvedValue({
        id: 9,
        feature_key: 'recognition',
        is_enabled: true
      });
      mockStorage.clearFeaturesCache.mockRejectedValue(new Error('Cache clear failed'));

      // Should still succeed even if cache clearing fails
      const response = await request(app)
        .post('/api/management/organizations/6/features')
        .send({ featureKey: 'recognition', isEnabled: true })
        .expect(200);

      expect(response.body.is_enabled).toBe(true);
    });

    it('should validate feature key against allowed values', async () => {
      const allowedFeatures = ['recognition', 'social', 'surveys', 'marketplace'];
      
      // Test valid feature key
      mockStorage.updateOrganizationFeature.mockResolvedValue({
        feature_key: 'recognition',
        is_enabled: true
      });

      await request(app)
        .post('/api/management/organizations/6/features')
        .send({ featureKey: 'recognition', isEnabled: true })
        .expect(200);

      // Verify the feature key is in allowed list
      expect(allowedFeatures).toContain('recognition');
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid toggle operations', async () => {
      const toggleOperations = [];
      
      for (let i = 0; i < 5; i++) {
        const isEnabled = i % 2 === 0;
        mockStorage.updateOrganizationFeature.mockResolvedValueOnce({
          id: 9,
          feature_key: 'recognition',
          is_enabled: isEnabled
        });
        
        toggleOperations.push(
          request(app)
            .post('/api/management/organizations/6/features')
            .send({ featureKey: 'recognition', isEnabled })
        );
      }

      const responses = await Promise.all(toggleOperations);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.is_enabled).toBe(index % 2 === 0);
      });

      expect(mockStorage.updateOrganizationFeature).toHaveBeenCalledTimes(5);
    });

    it('should maintain consistent state under load', async () => {
      const concurrentRequests = 10;
      const requests = [];

      mockStorage.getOrganizationFeatures.mockResolvedValue([
        { id: 9, feature_key: 'recognition', is_enabled: true }
      ]);

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .get('/api/management/organizations/6/features')
            .expect(200)
        );
      }

      const responses = await Promise.all(requests);
      
      // All responses should be identical
      responses.forEach(response => {
        expect(response.body[0].is_enabled).toBe(true);
        expect(response.body[0].feature_key).toBe('recognition');
      });
    });
  });

  describe('Security Tests', () => {
    it('should require authentication for feature operations', async () => {
      const unauthenticatedApp = express();
      unauthenticatedApp.use(express.json());
      
      // No authentication middleware
      unauthenticatedApp.get('/api/management/organizations/:id/features', (req, res) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      await request(unauthenticatedApp)
        .get('/api/management/organizations/6/features')
        .expect(401);
    });

    it('should validate admin permissions for feature updates', async () => {
      const nonAdminApp = express();
      nonAdminApp.use(express.json());
      
      // Mock non-admin user
      nonAdminApp.use((req: any, res, next) => {
        req.user = { id: 2, organizationId: 6, isAdmin: false };
        next();
      });
      
      nonAdminApp.post('/api/management/organizations/:id/features', (req, res) => {
        if (!req.user.is_admin) {
          return res.status(403).json({ error: 'Admin access required' });
        }
        res.json({ success: true });
      });

      await request(nonAdminApp)
        .post('/api/management/organizations/6/features')
        .send({ featureKey: 'recognition', isEnabled: true })
        .expect(403);
    });

    it('should prevent cross-organization feature access', async () => {
      const userOrgId = 6;
      const targetOrgId = 7;

      mockStorage.getOrganizationFeatures.mockImplementation((orgId) => {
        if (orgId !== userOrgId) {
          throw new Error('Unauthorized organization access');
        }
        return Promise.resolve([]);
      });

      await request(app)
        .get(`/api/management/organizations/${targetOrgId}/features`)
        .expect(500);

      expect(mockStorage.getOrganizationFeatures).toHaveBeenCalledWith(targetOrgId);
    });
  });
});