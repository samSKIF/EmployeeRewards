import request from 'supertest';
import express from 'express';
import recognitionRoutes from './recognitionRoutes';
import { storage } from '../storage';
import { verifyToken } from '../middleware/auth';

jest.mock('../storage');
jest.mock('../middleware/auth');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Recognition Routes', () => {
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
    
    app.use('/api/recognition', recognitionRoutes);
  });

  describe('POST /api/recognition/give', () => {
    it('should create recognition and award points', async () => {
      const recognitionData = {
        recipientId: 5,
        message: 'Great job on the presentation!',
        category: 'presentation',
        points: 50,
      };
      
      const mockRecipient = {
        id: 5,
        name: 'John Doe',
        email: 'john@test.com',
        organizationId: 1,
      };
      
      const mockRecognition = {
        id: 100,
        ...recognitionData,
        giverId: 1,
        createdAt: new Date(),
      };
      
      mockStorage.getUser.mockResolvedValue(mockRecipient);
      mockStorage.createRecognition.mockResolvedValue(mockRecognition);
      mockStorage.earnPoints.mockResolvedValue({
        id: 200,
        amount: 50,
      });

      const response = await request(app)
        .post('/api/recognition/give')
        .set('Authorization', 'Bearer test-token')
        .send(recognitionData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        recognition: mockRecognition,
        pointsAwarded: 50,
      });
      expect(mockStorage.earnPoints).toHaveBeenCalledWith(
        5,
        50,
        'recognition',
        'Great job on the presentation!',
        1
      );
    });

    it('should prevent self-recognition', async () => {
      const response = await request(app)
        .post('/api/recognition/give')
        .set('Authorization', 'Bearer test-token')
        .send({
          recipientId: 1, // Same as auth user
          message: 'Great job me!',
          category: 'achievement',
          points: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('cannot recognize yourself');
    });

    it('should validate points limit', async () => {
      const response = await request(app)
        .post('/api/recognition/give')
        .set('Authorization', 'Bearer test-token')
        .send({
          recipientId: 5,
          message: 'Amazing work!',
          category: 'achievement',
          points: 1000, // Too many points
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('points limit');
    });

    it('should prevent cross-organization recognition', async () => {
      const mockRecipient = {
        id: 5,
        organizationId: 2, // Different org
      };
      
      mockStorage.getUser.mockResolvedValue(mockRecipient);

      const response = await request(app)
        .post('/api/recognition/give')
        .set('Authorization', 'Bearer test-token')
        .send({
          recipientId: 5,
          message: 'Great work!',
          category: 'teamwork',
          points: 50,
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/recognition/received', () => {
    it('should return recognitions received by user', async () => {
      const mockRecognitions = [
        {
          id: 1,
          message: 'Excellent teamwork!',
          points: 50,
          giverId: 2,
          giver: { name: 'Jane Smith' },
          createdAt: new Date(),
        },
      ];
      
      mockStorage.getRecognitionsReceived.mockResolvedValue(mockRecognitions);

      const response = await request(app)
        .get('/api/recognition/received')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecognitions);
      expect(mockStorage.getRecognitionsReceived).toHaveBeenCalledWith(1);
    });

    it('should support pagination', async () => {
      mockStorage.getRecognitionsReceived.mockResolvedValue([]);

      await request(app)
        .get('/api/recognition/received')
        .query({ limit: 20, offset: 40 })
        .set('Authorization', 'Bearer test-token');

      expect(mockStorage.getRecognitionsReceived).toHaveBeenCalledWith(1, 20, 40);
    });
  });

  describe('GET /api/recognition/given', () => {
    it('should return recognitions given by user', async () => {
      const mockRecognitions = [
        {
          id: 2,
          message: 'Great presentation!',
          points: 75,
          recipientId: 5,
          recipient: { name: 'John Doe' },
          createdAt: new Date(),
        },
      ];
      
      mockStorage.getRecognitionsGiven.mockResolvedValue(mockRecognitions);

      const response = await request(app)
        .get('/api/recognition/given')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecognitions);
      expect(mockStorage.getRecognitionsGiven).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /api/recognition/leaderboard', () => {
    it('should return recognition leaderboard', async () => {
      const mockLeaderboard = [
        {
          user_id: 5,
          name: 'John Doe',
          totalPoints: 500,
          recognitionCount: 10,
          rank: 1,
        },
        {
          user_id: 3,
          name: 'Jane Smith',
          totalPoints: 450,
          recognitionCount: 8,
          rank: 2,
        },
      ];
      
      mockStorage.getRecognitionLeaderboard.mockResolvedValue(mockLeaderboard);

      const response = await request(app)
        .get('/api/recognition/leaderboard')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLeaderboard);
      expect(mockStorage.getRecognitionLeaderboard).toHaveBeenCalledWith(
        1,
        'month',
        10
      );
    });

    it('should support different time periods', async () => {
      mockStorage.getRecognitionLeaderboard.mockResolvedValue([]);

      await request(app)
        .get('/api/recognition/leaderboard')
        .query({ period: 'week', limit: 20 })
        .set('Authorization', 'Bearer test-token');

      expect(mockStorage.getRecognitionLeaderboard).toHaveBeenCalledWith(1, 'week', 20);
    });
  });

  describe('GET /api/recognition/categories', () => {
    it('should return available recognition categories', async () => {
      const mockCategories = [
        { id: 'teamwork', name: 'Teamwork', icon: '🤝', points: 50 },
        { id: 'innovation', name: 'Innovation', icon: '💡', points: 75 },
        { id: 'leadership', name: 'Leadership', icon: '👨‍💼', points: 100 },
      ];
      
      mockStorage.getRecognitionCategories.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/recognition/categories')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCategories);
    });
  });

  describe('GET /api/recognition/stats', () => {
    it('should return recognition statistics', async () => {
      const mockStats = {
        totalGiven: 15,
        totalReceived: 12,
        pointsGiven: 750,
        pointsReceived: 600,
        mostRecognizedCategory: 'teamwork',
        recognitionStreak: 5,
      };
      
      mockStorage.getUserRecognitionStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/recognition/stats')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
    });
  });

  describe('POST /api/recognition/:id/react', () => {
    it('should add reaction to recognition', async () => {
      const mockRecognition = {
        id: 100,
        organizationId: 1,
      };
      
      mockStorage.getRecognition.mockResolvedValue(mockRecognition);
      mockStorage.addRecognitionReaction.mockResolvedValue({
        recognition_id: 100,
        user_id: 1,
        reaction: '👏',
      });

      const response = await request(app)
        .post('/api/recognition/100/react')
        .set('Authorization', 'Bearer test-token')
        .send({ reaction: '👏' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});