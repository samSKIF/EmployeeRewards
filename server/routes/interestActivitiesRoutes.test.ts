import request from 'supertest';
import express from 'express';
import interestActivitiesRoutes from './interestActivitiesRoutes';
import { storage } from '../storage';
import { verifyToken } from '../middleware/auth';

jest.mock('../storage');
jest.mock('../middleware/auth');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Interest Activities Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    mockVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = {
        id: 1,
        email: 'test@test.com',
        organizationId: 1,
      };
      next();
    });
    
    app.use('/api/interest-activities', interestActivitiesRoutes);
  });

  describe('GET /api/interest-activities', () => {
    it('should return all interest activities', async () => {
      const mockActivities = [
        {
          id: 1,
          name: 'Book Club',
          description: 'Monthly book discussions',
          category: 'learning',
          memberCount: 15,
        },
        {
          id: 2,
          name: 'Running Group',
          description: 'Weekly morning runs',
          category: 'fitness',
          memberCount: 8,
        },
      ];
      
      mockStorage.getInterestActivities.mockResolvedValue(mockActivities);

      const response = await request(app)
        .get('/api/interest-activities')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockActivities);
      expect(mockStorage.getInterestActivities).toHaveBeenCalledWith(1);
    });

    it('should filter by category', async () => {
      mockStorage.getInterestActivities.mockResolvedValue([]);

      await request(app)
        .get('/api/interest-activities')
        .query({ category: 'fitness' })
        .set('Authorization', 'Bearer test-token');

      expect(mockStorage.getInterestActivities).toHaveBeenCalledWith(1, 'fitness');
    });
  });

  describe('POST /api/interest-activities', () => {
    it('should create new interest activity', async () => {
      const activityData = {
        name: 'Photography Club',
        description: 'Share and discuss photography',
        category: 'creative',
        maxMembers: 20,
      };
      
      const createdActivity = {
        id: 3,
        ...activityData,
        createdBy: 1,
        organizationId: 1,
        memberCount: 1,
      };
      
      mockStorage.createInterestActivity.mockResolvedValue(createdActivity);

      const response = await request(app)
        .post('/api/interest-activities')
        .set('Authorization', 'Bearer test-token')
        .send(activityData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdActivity);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/interest-activities')
        .set('Authorization', 'Bearer test-token')
        .send({
          // Missing name
          description: 'Test activity',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/interest-activities/:id/join', () => {
    it('should allow joining activity', async () => {
      const mockActivity = {
        id: 1,
        organizationId: 1,
        maxMembers: 20,
        memberCount: 10,
      };
      
      mockStorage.getInterestActivity.mockResolvedValue(mockActivity);
      mockStorage.joinInterestActivity.mockResolvedValue({
        activityId: 1,
        user_id: 1,
        joinedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/interest-activities/1/join')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent joining full activity', async () => {
      const mockActivity = {
        id: 1,
        organizationId: 1,
        maxMembers: 10,
        memberCount: 10, // Full
      };
      
      mockStorage.getInterestActivity.mockResolvedValue(mockActivity);

      const response = await request(app)
        .post('/api/interest-activities/1/join')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('full');
    });
  });

  describe('POST /api/interest-activities/:id/leave', () => {
    it('should allow leaving activity', async () => {
      mockStorage.leaveInterestActivity.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/interest-activities/1/leave')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/interest-activities/:id/members', () => {
    it('should return activity members', async () => {
      const mockMembers = [
        { id: 1, name: 'User 1', joinedAt: new Date() },
        { id: 2, name: 'User 2', joinedAt: new Date() },
      ];
      
      mockStorage.getInterestActivityMembers.mockResolvedValue(mockMembers);

      const response = await request(app)
        .get('/api/interest-activities/1/members')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMembers);
    });
  });

  describe('GET /api/interest-activities/my', () => {
    it('should return user\'s activities', async () => {
      const mockActivities = [
        {
          id: 1,
          name: 'Book Club',
          role: 'member',
          joinedAt: new Date(),
        },
        {
          id: 3,
          name: 'Photography Club',
          role: 'creator',
          joinedAt: new Date(),
        },
      ];
      
      mockStorage.getUserInterestActivities.mockResolvedValue(mockActivities);

      const response = await request(app)
        .get('/api/interest-activities/my')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockActivities);
    });
  });

  describe('GET /api/interest-activities/categories', () => {
    it('should return available categories', async () => {
      const mockCategories = [
        { id: 'fitness', name: 'Fitness & Sports', icon: '🏃' },
        { id: 'learning', name: 'Learning & Development', icon: '📚' },
        { id: 'creative', name: 'Creative Arts', icon: '🎨' },
        { id: 'social', name: 'Social & Networking', icon: '👥' },
      ];
      
      mockStorage.getInterestActivityCategories.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/interest-activities/categories')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCategories);
    });
  });
});