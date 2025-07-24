import request from 'supertest';
import express from 'express';
import celebrationRoutes from './celebrationRoutes';
import { storage } from '../storage';
import { verifyToken } from '../middleware/auth';

jest.mock('../storage');
jest.mock('../middleware/auth');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Celebration Routes', () => {
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
    
    app.use('/api/celebrations', celebrationRoutes);
  });

  describe('GET /api/celebrations/today', () => {
    it('should return today\'s celebrations', async () => {
      const mockCelebrations = [
        {
          id: 'birthday-1-2025-01-24',
          type: 'birthday',
          user: { id: 1, name: 'John Doe' },
          date: '2025-01-24',
        },
        {
          id: 'anniversary-2-2025-01-24',
          type: 'anniversary',
          user: { id: 2, name: 'Jane Smith' },
          date: '2025-01-24',
          yearsOfService: 3,
        },
      ];
      
      mockStorage.getTodaysCelebrations.mockResolvedValue(mockCelebrations);

      const response = await request(app)
        .get('/api/celebrations/today')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCelebrations);
      expect(mockStorage.getTodaysCelebrations).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /api/celebrations/upcoming', () => {
    it('should return upcoming celebrations', async () => {
      const mockUpcoming = [
        {
          id: 'birthday-3-2025-01-25',
          type: 'birthday',
          user: { id: 3, name: 'Bob Johnson' },
          date: '2025-01-25',
          daysUntil: 1,
        },
      ];
      
      mockStorage.getUpcomingCelebrations.mockResolvedValue(mockUpcoming);

      const response = await request(app)
        .get('/api/celebrations/upcoming')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpcoming);
      expect(mockStorage.getUpcomingCelebrations).toHaveBeenCalledWith(1, 7);
    });

    it('should accept custom days parameter', async () => {
      mockStorage.getUpcomingCelebrations.mockResolvedValue([]);

      await request(app)
        .get('/api/celebrations/upcoming')
        .query({ days: 14 })
        .set('Authorization', 'Bearer test-token');

      expect(mockStorage.getUpcomingCelebrations).toHaveBeenCalledWith(1, 14);
    });
  });

  describe('GET /api/celebrations/extended', () => {
    it('should return extended celebration range', async () => {
      const mockExtended = {
        earlier: [
          {
            id: 'birthday-4-2025-01-21',
            type: 'birthday',
            user: { id: 4, name: 'Alice Brown' },
            date: '2025-01-21',
          },
        ],
        today: [],
        upcoming: [
          {
            id: 'anniversary-5-2025-01-27',
            type: 'anniversary',
            user: { id: 5, name: 'Charlie Davis' },
            date: '2025-01-27',
          },
        ],
      };
      
      mockStorage.getExtendedCelebrations.mockResolvedValue(mockExtended);

      const response = await request(app)
        .get('/api/celebrations/extended')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockExtended);
      expect(mockStorage.getExtendedCelebrations).toHaveBeenCalledWith(1, 3);
    });
  });

  describe('POST /api/celebrations/post', () => {
    it('should create celebration post', async () => {
      const celebrationData = {
        userId: 10,
        type: 'birthday',
        message: 'Happy Birthday!',
      };
      
      const mockPost = {
        id: 100,
        content: 'Happy Birthday to @User!',
        isCelebration: true,
      };
      
      mockStorage.createCelebrationPost.mockResolvedValue(mockPost);

      const response = await request(app)
        .post('/api/celebrations/post')
        .set('Authorization', 'Bearer test-token')
        .send(celebrationData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        post: mockPost,
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/celebrations/post')
        .set('Authorization', 'Bearer test-token')
        .send({
          userId: 10,
          // Missing type
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Multi-tenant celebration isolation', () => {
    it('should only return celebrations from user\'s organization', async () => {
      const mockCelebrations = [
        { id: 'birthday-1', organizationId: 1 },
        { id: 'birthday-2', organizationId: 1 },
      ];
      
      mockStorage.getTodaysCelebrations.mockResolvedValue(mockCelebrations);

      await request(app)
        .get('/api/celebrations/today')
        .set('Authorization', 'Bearer test-token');

      expect(mockStorage.getTodaysCelebrations).toHaveBeenCalledWith(1);
    });
  });
});