import request from 'supertest';
import express from 'express';
import postsRoutes from './postsRoutes';
import { storage } from '../storage';
import { verifyToken } from '../middleware/auth';

jest.mock('../storage');
jest.mock('../middleware/auth');

const mockStorage = storage as jest.Mocked<typeof storage>;
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

  describe('GET /api/posts', () => {
    it('should return posts for organization', async () => {
      const mockPosts = [
        {
          id: 1,
          content: 'Test post',
          userId: 1,
          createdAt: new Date(),
          user: { id: 1, name: 'Test User' },
          likes: 5,
          comments: 2,
        },
      ];
      
      mockStorage.getPostsForOrganization.mockResolvedValue(mockPosts);

      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPosts);
      expect(mockStorage.getPostsForOrganization).toHaveBeenCalledWith(
        1,
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should handle pagination', async () => {
      mockStorage.getPostsForOrganization.mockResolvedValue([]);

      await request(app)
        .get('/api/posts')
        .query({ limit: 20, offset: 40 })
        .set('Authorization', 'Bearer test-token');

      expect(mockStorage.getPostsForOrganization).toHaveBeenCalledWith(1, 20, 40);
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
      
      mockStorage.createPost.mockResolvedValue(createdPost);

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer test-token')
        .send(newPostData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdPost);
      expect(mockStorage.createPost).toHaveBeenCalledWith({
        content: 'This is a new post!',
        userId: 1,
        organizationId: 1,
      });
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

    it('should handle polls in posts', async () => {
      const postWithPoll = {
        content: 'What\'s your favorite color?',
        poll: {
          question: 'What\'s your favorite color?',
          options: ['Red', 'Blue', 'Green'],
          multipleChoice: false,
        },
      };
      
      mockStorage.createPost.mockResolvedValue({
        id: 11,
        ...postWithPoll,
        pollId: 5,
      });

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer test-token')
        .send(postWithPoll);

      expect(response.status).toBe(201);
      expect(mockStorage.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          content: postWithPoll.content,
          poll: postWithPoll.poll,
        })
      );
    });
  });

  describe('PUT /api/posts/:id', () => {
    it('should update own post', async () => {
      const updatedContent = 'Updated post content';
      
      mockStorage.getPost.mockResolvedValue({
        id: 1,
        userId: 1, // Same as auth user
        content: 'Original content',
      });
      
      mockStorage.updatePost.mockResolvedValue({
        id: 1,
        userId: 1,
        content: updatedContent,
      });

      const response = await request(app)
        .put('/api/posts/1')
        .set('Authorization', 'Bearer test-token')
        .send({ content: updatedContent });

      expect(response.status).toBe(200);
      expect(mockStorage.updatePost).toHaveBeenCalledWith(1, {
        content: updatedContent,
      });
    });

    it('should not allow updating other user\'s post', async () => {
      mockStorage.getPost.mockResolvedValue({
        id: 1,
        userId: 2, // Different user
        content: 'Original content',
      });

      const response = await request(app)
        .put('/api/posts/1')
        .set('Authorization', 'Bearer test-token')
        .send({ content: 'Trying to update' });

      expect(response.status).toBe(403);
      expect(mockStorage.updatePost).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should delete own post', async () => {
      mockStorage.getPost.mockResolvedValue({
        id: 1,
        userId: 1, // Same as auth user
      });
      
      mockStorage.deletePost.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/posts/1')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(mockStorage.deletePost).toHaveBeenCalledWith(1);
    });

    it('should allow admin to delete any post', async () => {
      // Set admin user
      mockVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = {
          id: 1,
          isAdmin: true,
          organizationId: 1,
        };
        next();
      });
      
      mockStorage.getPost.mockResolvedValue({
        id: 1,
        userId: 2, // Different user
        organizationId: 1,
      });
      
      mockStorage.deletePost.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/posts/1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(mockStorage.deletePost).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /api/posts/:id/like', () => {
    it('should like a post', async () => {
      mockStorage.likePost.mockResolvedValue({
        postId: 1,
        userId: 1,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/posts/1/like')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockStorage.likePost).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('DELETE /api/posts/:id/like', () => {
    it('should unlike a post', async () => {
      mockStorage.unlikePost.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/posts/1/like')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockStorage.unlikePost).toHaveBeenCalledWith(1, 1);
    });
  });
});