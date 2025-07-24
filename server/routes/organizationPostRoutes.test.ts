import request from 'supertest';
import express from 'express';
import organizationPostRoutes from './organizationPostRoutes';
import { storage } from '../storage';
import { verifyToken, verifyAdmin } from '../middleware/auth';

jest.mock('../storage');
jest.mock('../middleware/auth');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockVerifyAdmin = verifyAdmin as jest.MockedFunction<typeof verifyAdmin>;

describe('Organization Post Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    mockVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = {
        id: 1,
        email: 'admin@test.com',
        organizationId: 1,
        isAdmin: true,
      };
      next();
    });
    
    mockVerifyAdmin.mockImplementation((req, res, next) => {
      next();
    });
    
    app.use('/api/organization-posts', organizationPostRoutes);
  });

  describe('GET /api/organization-posts', () => {
    it('should return organization-wide posts', async () => {
      const mockPosts = [
        {
          id: 1,
          title: 'Company Update',
          content: 'Important announcement',
          authorId: 1,
          author: { name: 'CEO' },
          createdAt: new Date(),
          isPinned: true,
        },
      ];
      
      mockStorage.getOrganizationPosts.mockResolvedValue(mockPosts);

      const response = await request(app)
        .get('/api/organization-posts')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPosts);
      expect(mockStorage.getOrganizationPosts).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /api/organization-posts', () => {
    it('should create organization post (admin only)', async () => {
      const postData = {
        title: 'New Policy',
        content: 'Updated workplace policy details',
        isPinned: false,
        category: 'policy',
      };
      
      const createdPost = {
        id: 10,
        ...postData,
        authorId: 1,
        organizationId: 1,
        createdAt: new Date(),
      };
      
      mockStorage.createOrganizationPost.mockResolvedValue(createdPost);

      const response = await request(app)
        .post('/api/organization-posts')
        .set('Authorization', 'Bearer admin-token')
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdPost);
    });

    it('should deny non-admin users', async () => {
      mockVerifyAdmin.mockImplementation((req, res, next) => {
        res.status(403).json({ message: 'Admin access required' });
      });

      const response = await request(app)
        .post('/api/organization-posts')
        .set('Authorization', 'Bearer user-token')
        .send({
          title: 'Test',
          content: 'Test content',
        });

      expect(response.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/organization-posts')
        .set('Authorization', 'Bearer admin-token')
        .send({
          // Missing title
          content: 'Test content',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/organization-posts/:id', () => {
    it('should update organization post', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        isPinned: true,
      };
      
      const updatedPost = {
        id: 1,
        ...updateData,
        updatedAt: new Date(),
      };
      
      mockStorage.updateOrganizationPost.mockResolvedValue(updatedPost);

      const response = await request(app)
        .put('/api/organization-posts/1')
        .set('Authorization', 'Bearer admin-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedPost);
    });
  });

  describe('DELETE /api/organization-posts/:id', () => {
    it('should delete organization post', async () => {
      mockStorage.deleteOrganizationPost.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/organization-posts/1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/organization-posts/:id/pin', () => {
    it('should pin organization post', async () => {
      mockStorage.pinOrganizationPost.mockResolvedValue({
        id: 1,
        isPinned: true,
      });

      const response = await request(app)
        .post('/api/organization-posts/1/pin')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/organization-posts/:id/pin', () => {
    it('should unpin organization post', async () => {
      mockStorage.unpinOrganizationPost.mockResolvedValue({
        id: 1,
        isPinned: false,
      });

      const response = await request(app)
        .delete('/api/organization-posts/1/pin')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/organization-posts/categories', () => {
    it('should return post categories', async () => {
      const mockCategories = [
        { id: 'announcement', name: 'Announcements', icon: '📢' },
        { id: 'policy', name: 'Policies', icon: '📋' },
        { id: 'event', name: 'Events', icon: '🎉' },
      ];
      
      mockStorage.getOrganizationPostCategories.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/organization-posts/categories')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCategories);
    });
  });
});