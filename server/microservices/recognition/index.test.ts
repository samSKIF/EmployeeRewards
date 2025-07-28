import request from 'supertest';
import express from 'express';
import { db } from '../../db';
import { recognitions, users, accounts, transactions } from '@shared/schema';

// Mock dependencies
jest.mock('../../db');
jest.mock('../../middleware/auth');

// Import the router after mocking
import recognitionRouter from './index';
import { verifyToken } from '../../middleware/auth';

const mockedDb = db as jest.Mocked<typeof db>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Recognition Microservice', () => {
  let app: express.Application;

  const mockUser = {
    id: 1,
    organizationId: 1,
    email: 'user@example.com',
    name: 'Test User',
    isAdmin: false,
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/recognition', recognitionRouter);
    jest.clearAllMocks();

    // Mock middleware to add user to request
    mockedVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe('POST /recognition/send', () => {
    it('should send recognition successfully', async () => {
      const recognitionData = {
        recipientId: 2,
        message: 'Great work on the project!',
        points: 100,
        category: 'teamwork',
      };

      const mockRecipient = {
        id: 2,
        name: 'Recipient User',
        organizationId: 1,
      };

      const mockRecognition = {
        id: 1,
        fromUserId: 1,
        toUserId: 2,
        message: recognitionData.message,
        points: recognitionData.points,
        category: recognitionData.category,
        organizationId: 1,
        createdAt: new Date(),
      };

      // Mock recipient lookup
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockRecipient]),
        }),
      });

      // Mock recognition creation
      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockRecognition]),
        }),
      });

      // Mock transaction recording
      mockedDb.transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(db);
      });

      const response = await request(app)
        .post('/recognition/send')
        .send(recognitionData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Recognition sent successfully');
      expect(response.body.recognition).toMatchObject({
        fromUserId: 1,
        toUserId: 2,
        points: 100,
        category: 'teamwork',
      });
    });

    it('should reject recognition to non-existent user', async () => {
      const recognitionData = {
        recipientId: 999,
        message: 'Great work!',
        points: 50,
        category: 'teamwork',
      };

      // Mock empty result for recipient lookup
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const response = await request(app)
        .post('/recognition/send')
        .send(recognitionData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Recipient not found');
    });

    it('should reject recognition to user from different organization', async () => {
      const recognitionData = {
        recipientId: 2,
        message: 'Great work!',
        points: 50,
        category: 'teamwork',
      };

      const mockRecipient = {
        id: 2,
        name: 'Other User',
        organizationId: 2, // Different organization
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockRecipient]),
        }),
      });

      const response = await request(app)
        .post('/recognition/send')
        .send(recognitionData);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Cannot send recognition to user from different organization');
    });

    it('should reject self-recognition', async () => {
      const recognitionData = {
        recipientId: 1, // Same as sender
        message: 'Great work!',
        points: 50,
        category: 'teamwork',
      };

      const response = await request(app)
        .post('/recognition/send')
        .send(recognitionData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Cannot send recognition to yourself');
    });

    it('should validate points within allowed range', async () => {
      const recognitionData = {
        recipientId: 2,
        message: 'Great work!',
        points: 1000, // Too high
        category: 'teamwork',
      };

      const response = await request(app)
        .post('/recognition/send')
        .send(recognitionData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Points must be between');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        recipientId: 2,
        // Missing message, points, category
      };

      const response = await request(app)
        .post('/recognition/send')
        .send(incompleteData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /recognition/received', () => {
    it('should return recognitions received by user', async () => {
      const mockRecognitions = [
        {
          id: 1,
          fromUserId: 2,
          toUserId: 1,
          message: 'Great job!',
          points: 50,
          category: 'teamwork',
          createdAt: new Date(),
          fromUser: { name: 'Sender User', avatarUrl: 'avatar.jpg' },
        },
      ];

      mockedDb.query = {
        recognitions: {
          findMany: jest.fn().mockResolvedValue(mockRecognitions),
        },
      } as any;

      const response = await request(app).get('/recognition/received');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecognitions);
    });

    it('should handle pagination', async () => {
      mockedDb.query = {
        recognitions: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as any;

      const response = await request(app)
        .get('/recognition/received')
        .query({ page: '2', limit: '10' });

      expect(response.status).toBe(200);
      expect(mockedDb.query.recognitions.findMany).toHaveBeenCalled();
    });
  });

  describe('GET /recognition/sent', () => {
    it('should return recognitions sent by user', async () => {
      const mockRecognitions = [
        {
          id: 1,
          fromUserId: 1,
          toUserId: 2,
          message: 'Well done!',
          points: 75,
          category: 'innovation',
          createdAt: new Date(),
          toUser: { name: 'Recipient User', avatarUrl: 'avatar.jpg' },
        },
      ];

      mockedDb.query = {
        recognitions: {
          findMany: jest.fn().mockResolvedValue(mockRecognitions),
        },
      } as any;

      const response = await request(app).get('/recognition/sent');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecognitions);
    });
  });

  describe('GET /recognition/leaderboard', () => {
    it('should return points leaderboard for organization', async () => {
      const mockLeaderboard = [
        {
          user_id: 1,
          name: 'Top User',
          totalPoints: 500,
          recognitionCount: 10,
          avatarUrl: 'avatar1.jpg',
        },
        {
          user_id: 2,
          name: 'Second User',
          totalPoints: 350,
          recognitionCount: 7,
          avatarUrl: 'avatar2.jpg',
        },
      ];

      // Mock the complex leaderboard query
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              groupBy: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue(mockLeaderboard),
                }),
              }),
            }),
          }),
        }),
      });

      const response = await request(app).get('/recognition/leaderboard');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLeaderboard);
    });

    it('should handle empty leaderboard', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              groupBy: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      const response = await request(app).get('/recognition/leaderboard');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /recognition/stats', () => {
    it('should return recognition statistics', async () => {
      const mockStats = {
        totalSent: 15,
        totalReceived: 12,
        totalPoints: 750,
        thisMonthSent: 3,
        thisMonthReceived: 4,
      };

      // Mock multiple queries for stats
      mockedDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 15 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 12 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ sum: 750 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 3 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 4 }]),
          }),
        });

      const response = await request(app).get('/recognition/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
    });
  });

  describe('GET /recognition/categories', () => {
    it('should return available recognition categories', async () => {
      const expectedCategories = [
        'teamwork',
        'innovation',
        'leadership',
        'customer-focus',
        'quality',
        'initiative',
      ];

      const response = await request(app).get('/recognition/categories');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expectedCategories);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const response = await request(app)
        .post('/recognition/send')
        .send({
          recipientId: 2,
          message: 'Test',
          points: 50,
          category: 'teamwork',
        });

      expect(response.status).toBe(401);
    });

    it('should handle missing user context', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        // No user set
        next();
      });

      const response = await request(app)
        .post('/recognition/send')
        .send({
          recipientId: 2,
          message: 'Test',
          points: 50,
          category: 'teamwork',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const recognitionData = {
        recipientId: 2,
        message: 'Test message',
        points: 50,
        category: 'teamwork',
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        }),
      });

      const response = await request(app)
        .post('/recognition/send')
        .send(recognitionData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should handle transaction failures', async () => {
      const recognitionData = {
        recipientId: 2,
        message: 'Test message',
        points: 50,
        category: 'teamwork',
      };

      const mockRecipient = {
        id: 2,
        name: 'Recipient',
        organizationId: 1,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockRecipient]),
        }),
      });

      mockedDb.transaction = jest.fn().mockRejectedValue(new Error('Transaction failed'));

      const response = await request(app)
        .post('/recognition/send')
        .send(recognitionData);

      expect(response.status).toBe(500);
    });
  });
});