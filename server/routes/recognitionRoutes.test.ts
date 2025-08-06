import request from 'supertest';
import express from 'express';
import { storage } from '../storage';
import recognitionRoutes from './recognitionRoutes';
import { verifyToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../middleware/auth';

// Mock dependencies with comprehensive auth middleware pattern
jest.mock('../storage');
jest.mock('../middleware/auth');
jest.mock('@shared/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }
}));

const mockedStorage = storage as jest.Mocked<typeof storage>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Recognition Routes - Peer Recognition API Coverage', () => {
  let app: express.Application;

  const mockUser = {
    id: 1,
    organization_id: 1,
    email: 'user@company.com',
    name: 'Test User',
    isAdmin: false
  };

  const mockRecipient = {
    id: 2,
    organization_id: 1,
    email: 'recipient@company.com',
    name: 'Recipient User',
    department: 'Engineering'
  };

  const mockRecognitions = [
    {
      id: 101,
      giver_id: 1,
      recipient_id: 2,
      category: 'teamwork',
      message: 'Great collaboration on the project',
      points: 50,
      created_at: '2025-08-06T10:00:00Z',
      giver: mockUser,
      recipient: mockRecipient
    },
    {
      id: 102,
      giver_id: 3,
      recipient_id: 1,
      category: 'innovation',
      message: 'Excellent problem solving',
      points: 75,
      created_at: '2025-08-05T14:30:00Z',
      giver: { id: 3, name: 'Another User' },
      recipient: mockUser
    }
  ];

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();

    // Mock auth middleware
    mockedVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = mockUser;
      next();
    });

    app.use('/api/recognition', recognitionRoutes);
  });

  describe('POST /api/recognition/give - Give Recognition Endpoint', () => {
    const recognitionData = {
      recipient_id: 2,
      category: 'teamwork',
      message: 'Outstanding teamwork on the Q3 project',
      points: 50
    };

    it('should create recognition and award points with comprehensive validation', async () => {
      const newRecognition = {
        id: 103,
        giver_id: mockUser.id,
        recipient_id: recognitionData.recipient_id,
        category: recognitionData.category,
        message: recognitionData.message,
        points: recognitionData.points,
        created_at: new Date(),
        organization_id: mockUser.organization_id
      };

      const pointsTransaction = {
        id: 201,
        user_id: recognitionData.recipient_id,
        amount: recognitionData.points,
        type: 'recognition',
        description: recognitionData.message,
        created_at: new Date()
      };

      mockedStorage.getUserById = jest.fn().mockResolvedValue(mockRecipient);
      mockedStorage.createRecognition = jest.fn().mockResolvedValue(newRecognition);
      mockedStorage.earnPoints = jest.fn().mockResolvedValue(pointsTransaction);

      const response = await request(app)
        .post('/api/recognition/give')
        .send(recognitionData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        recognition: expect.objectContaining({
          id: newRecognition.id,
          giver_id: mockUser.id,
          recipient_id: recognitionData.recipient_id,
          category: recognitionData.category,
          message: recognitionData.message,
          points: recognitionData.points
        }),
        points_awarded: recognitionData.points,
        recipient: expect.objectContaining({
          id: mockRecipient.id,
          name: mockRecipient.name
        })
      });

      // Verify recognition creation
      expect(mockedStorage.createRecognition).toHaveBeenCalledWith(
        expect.objectContaining({
          giver_id: mockUser.id,
          recipient_id: recognitionData.recipient_id,
          category: recognitionData.category,
          message: recognitionData.message,
          points: recognitionData.points,
          organization_id: mockUser.organization_id
        })
      );

      // Verify points were awarded
      expect(mockedStorage.earnPoints).toHaveBeenCalledWith(
        recognitionData.recipient_id,
        recognitionData.points,
        'recognition',
        recognitionData.message,
        mockUser.id
      );
    });

    it('should prevent self-recognition', async () => {
      const selfRecognition = {
        ...recognitionData,
        recipient_id: mockUser.id // Same as giver
      };

      const response = await request(app)
        .post('/api/recognition/give')
        .send(selfRecognition)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('cannot recognize yourself');
      
      // Verify no recognition was created
      expect(mockedStorage.createRecognition).not.toHaveBeenCalled();
      expect(mockedStorage.earnPoints).not.toHaveBeenCalled();
    });

    it('should enforce organization isolation for recognition recipients', async () => {
      const crossOrgRecipient = { ...mockRecipient, organization_id: 999 };
      mockedStorage.getUserById = jest.fn().mockResolvedValue(crossOrgRecipient);

      const response = await request(app)
        .post('/api/recognition/give')
        .send(recognitionData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('organization');
      
      // Verify no cross-organization recognition
      expect(mockedStorage.createRecognition).not.toHaveBeenCalled();
    });

    it('should validate recognition points limits', async () => {
      const highPointsRecognition = {
        ...recognitionData,
        points: 1000 // Exceeds daily limit
      };

      mockedStorage.getUserById = jest.fn().mockResolvedValue(mockRecipient);
      mockedStorage.checkDailyRecognitionLimit = jest.fn().mockResolvedValue({
        given_today: 150,
        daily_limit: 200,
        remaining: 50
      });

      const response = await request(app)
        .post('/api/recognition/give')
        .send(highPointsRecognition)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('exceeds daily limit');
      
      // Verify limit check was performed
      expect(mockedStorage.checkDailyRecognitionLimit).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle non-existent recipient gracefully', async () => {
      mockedStorage.getUserById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/recognition/give')
        .send(recognitionData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Recipient not found');
    });

    it('should validate recognition categories', async () => {
      const invalidCategoryRecognition = {
        ...recognitionData,
        category: 'invalid_category'
      };

      mockedStorage.getUserById = jest.fn().mockResolvedValue(mockRecipient);

      const response = await request(app)
        .post('/api/recognition/give')
        .send(invalidCategoryRecognition)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid recognition category');
    });
  });

  describe('GET /api/recognition/sent - Sent Recognitions Endpoint', () => {
    it('should return recognitions given by authenticated user with pagination', async () => {
      const sentRecognitions = mockRecognitions.filter(r => r.giver_id === mockUser.id);
      
      mockedStorage.getRecognitionsByGiver = jest.fn().mockResolvedValue({
        recognitions: sentRecognitions,
        total: sentRecognitions.length,
        has_more: false
      });

      const response = await request(app)
        .get('/api/recognition/sent')
        .query({ limit: 10, offset: 0 })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        recognitions: expect.arrayContaining([
          expect.objectContaining({
            id: 101,
            giver_id: mockUser.id,
            recipient_id: 2,
            category: 'teamwork',
            points: 50
          })
        ]),
        pagination: expect.objectContaining({
          total: sentRecognitions.length,
          limit: 10,
          offset: 0,
          has_more: false
        })
      });

      // Verify correct user filter
      expect(mockedStorage.getRecognitionsByGiver).toHaveBeenCalledWith(
        mockUser.id,
        { limit: 10, offset: 0 }
      );
    });

    it('should handle empty sent recognitions list', async () => {
      mockedStorage.getRecognitionsByGiver = jest.fn().mockResolvedValue({
        recognitions: [],
        total: 0,
        has_more: false
      });

      const response = await request(app)
        .get('/api/recognition/sent')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.recognitions).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });
  });

  describe('GET /api/recognition/received - Received Recognitions Endpoint', () => {
    it('should return recognitions received by authenticated user', async () => {
      const receivedRecognitions = mockRecognitions.filter(r => r.recipient_id === mockUser.id);
      
      mockedStorage.getRecognitionsByRecipient = jest.fn().mockResolvedValue({
        recognitions: receivedRecognitions,
        total: receivedRecognitions.length,
        has_more: false
      });

      const response = await request(app)
        .get('/api/recognition/received')
        .query({ limit: 10, offset: 0 })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.recognitions).toHaveLength(1);
      expect(response.body.recognitions[0]).toMatchObject({
        id: 102,
        recipient_id: mockUser.id,
        category: 'innovation',
        points: 75
      });

      // Verify correct recipient filter
      expect(mockedStorage.getRecognitionsByRecipient).toHaveBeenCalledWith(
        mockUser.id,
        { limit: 10, offset: 0 }
      );
    });
  });

  describe('GET /api/recognition/leaderboard - Recognition Leaderboard Endpoint', () => {
    const mockLeaderboard = [
      {
        user_id: 2,
        user: mockRecipient,
        total_points: 125,
        recognition_count: 3,
        categories: ['teamwork', 'innovation']
      },
      {
        user_id: 1,
        user: mockUser,
        total_points: 75,
        recognition_count: 1,
        categories: ['innovation']
      }
    ];

    it('should return recognition leaderboard for organization with filtering', async () => {
      mockedStorage.getRecognitionLeaderboard = jest.fn().mockResolvedValue({
        leaderboard: mockLeaderboard,
        period: 'month',
        organization_id: mockUser.organization_id
      });

      const response = await request(app)
        .get('/api/recognition/leaderboard')
        .query({ period: 'month', limit: 10 })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.leaderboard).toEqual(mockLeaderboard);
      expect(response.body.period).toBe('month');
      
      // Verify organization filter
      expect(mockedStorage.getRecognitionLeaderboard).toHaveBeenCalledWith(
        mockUser.organization_id,
        { period: 'month', limit: 10 }
      );
    });

    it('should support different time periods for leaderboard', async () => {
      const weeklyLeaderboard = mockLeaderboard.slice(0, 1); // Fewer entries for weekly
      
      mockedStorage.getRecognitionLeaderboard = jest.fn().mockResolvedValue({
        leaderboard: weeklyLeaderboard,
        period: 'week',
        organization_id: mockUser.organization_id
      });

      const response = await request(app)
        .get('/api/recognition/leaderboard')
        .query({ period: 'week' })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.leaderboard).toEqual(weeklyLeaderboard);
      expect(response.body.period).toBe('week');
    });
  });

  describe('GET /api/recognition/stats - Recognition Statistics Endpoint', () => {
    const mockStats = {
      user_stats: {
        given_count: 5,
        received_count: 3,
        total_points_given: 250,
        total_points_received: 150,
        favorite_category: 'teamwork'
      },
      organization_stats: {
        total_recognitions: 150,
        active_recognizers: 45,
        average_points_per_recognition: 60,
        top_categories: ['teamwork', 'innovation', 'leadership']
      },
      recent_activity: [
        {
          type: 'given',
          recognition: mockRecognitions[0],
          timestamp: '2025-08-06T10:00:00Z'
        }
      ]
    };

    it('should return comprehensive recognition statistics', async () => {
      mockedStorage.getRecognitionStats = jest.fn().mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/recognition/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(mockStats);
      
      // Verify stats were fetched for correct user and organization
      expect(mockedStorage.getRecognitionStats).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.organization_id
      );
    });
  });

  describe('Authentication and Authorization Tests', () => {
    it('should reject unauthenticated requests to all endpoints', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const endpoints = [
        { method: 'post', path: '/api/recognition/give' },
        { method: 'get', path: '/api/recognition/sent' },
        { method: 'get', path: '/api/recognition/received' },
        { method: 'get', path: '/api/recognition/leaderboard' },
        { method: 'get', path: '/api/recognition/stats' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockedStorage.getUserById = jest.fn().mockRejectedValue(dbError);

      const response = await request(app)
        .post('/api/recognition/give')
        .send({
          recipient_id: 2,
          category: 'teamwork',
          message: 'Great work',
          points: 50
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to create recognition');
    });

    it('should validate request data formats', async () => {
      const invalidData = {
        recipient_id: 'not-a-number',
        category: '', // Empty category
        message: 'A'.repeat(1001), // Too long message
        points: -50 // Negative points
      };

      const response = await request(app)
        .post('/api/recognition/give')
        .send(invalidData)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('validation');
    });

    it('should handle concurrent recognition creation', async () => {
      mockedStorage.getUserById = jest.fn().mockResolvedValue(mockRecipient);
      
      // Simulate race condition
      const raceError = new Error('Concurrent modification detected');
      mockedStorage.createRecognition = jest.fn().mockRejectedValue(raceError);

      const response = await request(app)
        .post('/api/recognition/give')
        .send({
          recipient_id: 2,
          category: 'teamwork',
          message: 'Excellent collaboration',
          points: 50
        })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('conflict');
    });
  });
});