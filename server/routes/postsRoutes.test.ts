import request from 'supertest';
import express from 'express';
import postsRoutes from './postsRoutes';
import { db } from '../db';
import { verifyToken } from '../middleware/auth';

jest.mock('../db');
jest.mock('../middleware/auth');

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
} as any;

// Mock the db module
(db as any) = mockDb;

const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Posts Routes', () => {
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
    
    app.use('/api/posts', postsRoutes);
  });

  describe('POST /api/posts/:id/like', () => {
    it('should like a post', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]), // No existing like
      };
      
      const mockInsert = {
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockResolvedValue({}),
      };
      
      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue({}),
      };

      mockDb.select.mockReturnValue(mockQuery);
      mockDb.insert.mockReturnValue(mockInsert);
      mockDb.update.mockReturnValue(mockUpdate);

      const response = await request(app)
        .post('/api/posts/1/like')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should unlike a post', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 1 }]), // Existing like
      };
      
      const mockDelete = {
        where: jest.fn().mockResolvedValue({}),
      };
      
      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue({}),
      };

      mockDb.select.mockReturnValue(mockQuery);
      mockDb.delete.mockReturnValue(mockDelete);
      mockDb.update.mockReturnValue(mockUpdate);

      const response = await request(app)
        .post('/api/posts/1/like')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('POST /api/posts', () => {
    it('should create new post', async () => {
      const newPostData = {
        content: 'This is a new post!',
      };
      
      const createdPost = {
        id: 10,
        content: 'This is a new post!',
        userId: 1,
        organizationId: 1,
        createdAt: new Date(),
      };
      
      // Mock database insertion for post creation
      const mockInsert = {
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([createdPost]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer test-token')
        .send(newPostData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdPost);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should validate post content', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer test-token')
        .send({
          content: '', // Empty content
        });

      expect(response.status).toBe(400);
    });
  });
});