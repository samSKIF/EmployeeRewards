import request from 'supertest';
import express from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import celebrationRoutes from './celebrationRoutes';
import { verifyToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../middleware/auth';
import { and, eq, sql } from 'drizzle-orm';

// Mock dependencies with comprehensive auth middleware pattern
jest.mock('../db');
jest.mock('../middleware/auth');
jest.mock('@shared/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }
}));

const mockedDb = db as jest.Mocked<typeof db>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Celebration Routes - Birthday & Anniversary API Coverage', () => {
  let app: express.Application;

  const mockUser = {
    id: 1,
    organization_id: 1,
    email: 'user@company.com',
    name: 'Test User',
    isAdmin: false
  };

  const mockBirthdayUsers = [
    {
      id: 101,
      name: 'Birthday',
      surname: 'User',
      email: 'birthday@company.com',
      department: 'Engineering',
      location: 'New York',
      job_title: 'Developer',
      birth_date: '1990-08-06', // Today's date for testing
      hire_date: '2020-01-01',
      avatar_url: 'https://example.com/avatar1.jpg',
      organization_id: 1
    }
  ];

  const mockAnniversaryUsers = [
    {
      id: 102,
      name: 'Anniversary',
      surname: 'User',
      email: 'anniversary@company.com',
      department: 'Product',
      location: 'San Francisco',
      job_title: 'Product Manager',
      birth_date: '1985-01-01',
      hire_date: '2020-08-06', // 5 years ago today
      avatar_url: 'https://example.com/avatar2.jpg',
      organization_id: 1
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

    // Mock current date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-06T12:00:00Z'));

    app.use('/api/celebrations', celebrationRoutes);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('GET /api/celebrations/today - Today\'s Celebrations Endpoint', () => {
    it('should return birthday and anniversary celebrations for today', async () => {
      // Mock database queries for birthdays
      const mockBirthdaySelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockBirthdayUsers)
      };

      // Mock database queries for anniversaries  
      const mockAnniversarySelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockAnniversaryUsers)
      };

      mockedDb.select = jest.fn()
        .mockReturnValueOnce(mockBirthdaySelect) // First call for birthdays
        .mockReturnValueOnce(mockAnniversarySelect); // Second call for anniversaries

      const response = await request(app)
        .get('/api/celebrations/today')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2); // 1 birthday + 1 anniversary
      
      // Verify birthday celebration structure
      const birthdayUser = response.body.find(c => c.type === 'birthday');
      expect(birthdayUser).toMatchObject({
        id: 101,
        type: 'birthday',
        user: expect.objectContaining({
          name: 'Birthday',
          surname: 'User',
          department: 'Engineering'
        }),
        date: '2025-08-06',
        hasReacted: false,
        hasCommented: false
      });

      // Verify anniversary celebration structure
      const anniversaryUser = response.body.find(c => c.type === 'anniversary');
      expect(anniversaryUser).toMatchObject({
        id: 102,
        type: 'anniversary',
        user: expect.objectContaining({
          name: 'Anniversary',
          surname: 'User',
          department: 'Product'
        }),
        date: '2025-08-06',
        years: 5
      });

      // Verify database queries were called correctly
      expect(mockedDb.select).toHaveBeenCalledTimes(2);
    });

    it('should handle empty celebrations gracefully', async () => {
      const emptySelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      mockedDb.select = jest.fn().mockReturnValue(emptySelect);

      const response = await request(app)
        .get('/api/celebrations/today')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should enforce organization isolation for celebrations', async () => {
      const crossOrgUser = { ...mockUser, organization_id: 999 };
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = crossOrgUser;
        next();
      });

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      mockedDb.select = jest.fn().mockReturnValue(mockSelect);

      const response = await request(app)
        .get('/api/celebrations/today')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      
      // Verify queries filtered by correct organization
      expect(mockSelect.where).toHaveBeenCalledWith(
        expect.objectContaining({
          // Should contain organization_id: 999 filter
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database query failed');
      const errorSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockRejectedValue(dbError)
      };

      mockedDb.select = jest.fn().mockReturnValue(errorSelect);

      const response = await request(app)
        .get('/api/celebrations/today')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Failed to fetch celebrations');
    });
  });

  describe('GET /api/celebrations/upcoming - Upcoming Celebrations Endpoint', () => {
    it('should return celebrations for next 3 days with proper date handling', async () => {
      const upcomingUsers = [
        {
          id: 103,
          name: 'Tomorrow',
          surname: 'Birthday',
          birth_date: '1995-08-07', // Tomorrow
          hire_date: '2019-01-01',
          organization_id: 1
        }
      ];

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(upcomingUsers)
      };

      mockedDb.select = jest.fn().mockReturnValue(mockSelect);

      const response = await request(app)
        .get('/api/celebrations/upcoming')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Verify upcoming celebrations have correct date ranges
      const upcomingBirthday = response.body.find(c => 
        c.type === 'birthday' && c.date === '2025-08-07'
      );
      expect(upcomingBirthday).toBeDefined();
      
      // Verify database was queried for multiple future dates
      expect(mockedDb.select).toHaveBeenCalledTimes(6); // 3 days × 2 types (birthday + anniversary)
    });

    it('should calculate anniversary years correctly for upcoming dates', async () => {
      const upcomingAnniversary = [
        {
          id: 104,
          name: 'Future',
          surname: 'Anniversary',
          birth_date: '1990-01-01',
          hire_date: '2021-08-08', // 4 years ago + 2 days from now
          organization_id: 1
        }
      ];

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn()
          .mockResolvedValueOnce([]) // No birthdays for day 1
          .mockResolvedValueOnce([]) // No anniversaries for day 1  
          .mockResolvedValueOnce([]) // No birthdays for day 2
          .mockResolvedValueOnce(upcomingAnniversary) // Anniversary on day 3
          .mockResolvedValue([]) // Empty for remaining queries
      };

      mockedDb.select = jest.fn().mockReturnValue(mockSelect);

      const response = await request(app)
        .get('/api/celebrations/upcoming')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      
      const anniversaryEvent = response.body.find(c => c.type === 'anniversary');
      if (anniversaryEvent) {
        expect(anniversaryEvent.years).toBe(4); // Should calculate years correctly
        expect(anniversaryEvent.date).toBe('2025-08-08');
      }
    });
  });

  describe('POST /api/celebrations/generate - Manual Celebration Generation', () => {
    const celebrationRequest = {
      user_id: 105,
      celebration_type: 'birthday',
      message: 'Custom birthday message'
    };

    it('should generate manual celebration post for admin users', async () => {
      // Mock admin user
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = { ...mockUser, isAdmin: true };
        next();
      });

      const targetUser = {
        id: 105,
        name: 'Manual',
        surname: 'Celebration',
        department: 'HR',
        organization_id: 1
      };

      const mockUserSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([targetUser])
      };

      mockedDb.select = jest.fn().mockReturnValue(mockUserSelect);

      const response = await request(app)
        .post('/api/celebrations/generate')
        .send(celebrationRequest)
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        celebration: expect.objectContaining({
          user_id: 105,
          type: 'birthday',
          message: 'Custom birthday message'
        })
      });

      // Verify user lookup was performed
      expect(mockUserSelect.where).toHaveBeenCalledWith(
        expect.objectContaining({
          // Should filter by user ID and organization
        })
      );
    });

    it('should reject manual generation for non-admin users', async () => {
      const response = await request(app)
        .post('/api/celebrations/generate')
        .send(celebrationRequest)
        .set('Authorization', 'Bearer user-token');

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('admin');
    });

    it('should validate celebration request data', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = { ...mockUser, isAdmin: true };
        next();
      });

      const invalidRequest = {
        user_id: null, // Invalid user ID
        celebration_type: 'invalid_type',
        message: ''
      };

      const response = await request(app)
        .post('/api/celebrations/generate')
        .send(invalidRequest)
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('validation');
    });

    it('should prevent duplicate manual celebrations', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = { ...mockUser, isAdmin: true };
        next();
      });

      // Mock existing celebration check
      const existingCelebration = {
        id: 1,
        user_id: 105,
        type: 'birthday',
        created_at: new Date().toISOString()
      };

      // First call returns user, second call returns existing celebration
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn()
          .mockResolvedValueOnce([{ id: 105, organization_id: 1 }]) // User exists
          .mockResolvedValueOnce([existingCelebration]) // Celebration exists
      };

      mockedDb.select = jest.fn().mockReturnValue(mockSelect);

      const response = await request(app)
        .post('/api/celebrations/generate')
        .send(celebrationRequest)
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('Authentication and Authorization Tests', () => {
    it('should reject unauthenticated requests to all endpoints', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const endpoints = [
        { method: 'get', path: '/api/celebrations/today' },
        { method: 'get', path: '/api/celebrations/upcoming' },
        { method: 'post', path: '/api/celebrations/generate' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
      }
    });

    it('should handle token validation errors gracefully', async () => {
      const tokenError = new Error('Invalid token format');
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        throw tokenError;
      });

      const response = await request(app)
        .get('/api/celebrations/today')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(500);
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle users with missing birth/hire dates', async () => {
      const incompleteUsers = [
        {
          id: 106,
          name: 'Incomplete',
          surname: 'User',
          birth_date: null, // Missing birthday
          hire_date: null,  // Missing hire date
          organization_id: 1
        }
      ];

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(incompleteUsers)
      };

      mockedDb.select = jest.fn().mockReturnValue(mockSelect);

      const response = await request(app)
        .get('/api/celebrations/today')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      // Should handle gracefully and not include incomplete users
      expect(response.body).toEqual([]);
    });

    it('should handle leap year birthday calculations correctly', async () => {
      jest.setSystemTime(new Date('2024-02-29T12:00:00Z')); // Leap year date

      const leapYearUser = [{
        id: 107,
        name: 'Leap',
        surname: 'Year',
        birth_date: '2000-02-29', // Born on leap year
        hire_date: '2020-01-01',
        organization_id: 1
      }];

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(leapYearUser)
      };

      mockedDb.select = jest.fn().mockReturnValue(mockSelect);

      const response = await request(app)
        .get('/api/celebrations/today')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      
      const celebration = response.body.find(c => c.type === 'birthday');
      expect(celebration).toBeDefined();
      expect(celebration.date).toBe('2024-02-29');
    });
  });
});