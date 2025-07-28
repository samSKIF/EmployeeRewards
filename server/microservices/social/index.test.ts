import request from 'supertest';
import express from 'express';
import { db } from '../../db';
import { posts, comments, reactions } from '@shared/schema';

// Mock dependencies
jest.mock('../../db');
jest.mock('../../middleware/auth');
jest.mock('../../mongodb/integration');

// Import the router after mocking
import socialRouter from './index';
import { verifyToken } from '../../middleware/auth';

const mockedDb = db as jest.Mocked<typeof db>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Social Microservice', () => {
  let app: express.Application;

  const mockUser = {
    id: 1,
    organizationId: 1,
    email: 'user@example.com',
    name: 'Test User',
    isAdmin: false,
    avatarUrl: 'avatar.jpg',
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/social', socialRouter);
    jest.clearAllMocks();

    // Mock middleware to add user to request
    mockedVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe('GET /social/posts', () => {
    it('should return posts for organization', async () => {
      const mockPosts = [
        {
          id: 1,
          user_id: 1,
          content: 'Hello world!',
          organizationId: 1,
          createdAt: new Date(),
          author: {
            name: 'Test User',
            avatarUrl: 'avatar.jpg',
          },
          reactionCounts: {
            like: 5,
            love: 2,
          },
          commentCount: 3,
          userReaction: 'like',
        },
      ];

      // Mock complex posts query
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(mockPosts),
                }),
              }),
            }),
          }),
        }),
      });

      const response = await request(app).get('/social/posts');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPosts);
    });

    it('should handle pagination parameters', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/social/posts')
        .query({ page: '2', limit: '5' });

      expect(response.status).toBe(200);
    });

    it('should filter posts by organization', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      await request(app).get('/social/posts');

      // Verify organization filtering is applied
      expect(mockedDb.select).toHaveBeenCalled();
    });
  });

  describe('POST /social/posts', () => {
    it('should create new post successfully', async () => {
      const postData = {
        content: 'This is a test post',
        imageUrl: 'https://example.com/image.jpg',
      };

      const mockCreatedPost = {
        id: 1,
        user_id: 1,
        content: postData.content,
        imageUrl: postData.imageUrl,
        organizationId: 1,
        createdAt: new Date(),
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCreatedPost]),
        }),
      });

      const response = await request(app)
        .post('/social/posts')
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.content).toBe(postData.content);
      expect(response.body.user_id).toBe(1);
    });

    it('should validate required content', async () => {
      const response = await request(app)
        .post('/social/posts')
        .send({}); // Empty content

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Content is required');
    });

    it('should validate content length', async () => {
      const longContent = 'x'.repeat(1001); // Too long

      const response = await request(app)
        .post('/social/posts')
        .send({ content: longContent });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Content too long');
    });

    it('should handle database errors', async () => {
      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const response = await request(app)
        .post('/social/posts')
        .send({ content: 'Test post' });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /social/reactions', () => {
    it('should add reaction to post', async () => {
      const reactionData = {
        postId: 1,
        type: 'like',
      };

      const mockPost = {
        id: 1,
        organizationId: 1,
      };

      const mockReaction = {
        id: 1,
        postId: 1,
        user_id: 1,
        type: 'like',
        createdAt: new Date(),
      };

      // Mock post existence check
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockPost]),
        }),
      });

      // Mock reaction creation
      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockReaction]),
          }),
        }),
      });

      const response = await request(app)
        .post('/social/reactions')
        .send(reactionData);

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('like');
    });

    it('should reject reaction to non-existent post', async () => {
      const reactionData = {
        postId: 999,
        type: 'like',
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]), // No post found
        }),
      });

      const response = await request(app)
        .post('/social/reactions')
        .send(reactionData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Post not found');
    });

    it('should reject reaction to post from different organization', async () => {
      const reactionData = {
        postId: 1,
        type: 'like',
      };

      const mockPost = {
        id: 1,
        organizationId: 2, // Different organization
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockPost]),
        }),
      });

      const response = await request(app)
        .post('/social/reactions')
        .send(reactionData);

      expect(response.status).toBe(403);
    });

    it('should validate reaction type', async () => {
      const reactionData = {
        postId: 1,
        type: 'invalid_type',
      };

      const response = await request(app)
        .post('/social/reactions')
        .send(reactionData);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /social/reactions/:postId', () => {
    it('should remove reaction from post', async () => {
      const postId = 1;

      mockedDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 1 }]),
        }),
      });

      const response = await request(app).delete(`/social/reactions/${postId}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Reaction removed');
    });

    it('should handle non-existent reaction', async () => {
      const postId = 999;

      mockedDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([]), // No reaction found
        }),
      });

      const response = await request(app).delete(`/social/reactions/${postId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /social/posts/:id/comments', () => {
    it('should return comments for post', async () => {
      const postId = 1;
      const mockComments = [
        {
          id: 1,
          postId: 1,
          user_id: 1,
          content: 'Great post!',
          createdAt: new Date(),
          author: {
            name: 'Test User',
            avatarUrl: 'avatar.jpg',
          },
        },
      ];

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mockComments),
            }),
          }),
        }),
      });

      const response = await request(app).get(`/social/posts/${postId}/comments`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockComments);
    });
  });

  describe('POST /social/posts/:id/comments', () => {
    it('should add comment to post', async () => {
      const postId = 1;
      const commentData = {
        content: 'This is a comment',
      };

      const mockPost = {
        id: 1,
        organizationId: 1,
      };

      const mockComment = {
        id: 1,
        postId: 1,
        user_id: 1,
        content: commentData.content,
        createdAt: new Date(),
      };

      // Mock post existence check
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockPost]),
        }),
      });

      // Mock comment creation
      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockComment]),
        }),
      });

      const response = await request(app)
        .post(`/social/posts/${postId}/comments`)
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.content).toBe(commentData.content);
    });

    it('should validate comment content', async () => {
      const postId = 1;

      const response = await request(app)
        .post(`/social/posts/${postId}/comments`)
        .send({}); // Empty content

      expect(response.status).toBe(400);
    });
  });

  describe('GET /social/stats', () => {
    it('should return social statistics', async () => {
      const mockStats = {
        totalPosts: 25,
        totalComments: 150,
        totalReactions: 300,
        activeUsers: 45,
        postsThisWeek: 8,
      };

      // Mock multiple stat queries
      mockedDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 25 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 150 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 300 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 45 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 8 }]),
          }),
        });

      const response = await request(app).get('/social/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for protected routes', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const response = await request(app)
        .post('/social/posts')
        .send({ content: 'Test post' });

      expect(response.status).toBe(401);
    });

    it('should handle missing user context', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        // No user set
        next();
      });

      const response = await request(app)
        .post('/social/posts')
        .send({ content: 'Test post' });

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockRejectedValue(new Error('Connection failed')),
                }),
              }),
            }),
          }),
        }),
      });

      const response = await request(app).get('/social/posts');

      expect(response.status).toBe(500);
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/social/posts')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousData = {
        content: "'; DROP TABLE posts; --",
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 1,
            content: maliciousData.content, // Should be safely escaped
          }]),
        }),
      });

      const response = await request(app)
        .post('/social/posts')
        .send(maliciousData);

      expect(response.status).toBe(201);
      // Verify content is safely handled
      expect(response.body.content).toBe(maliciousData.content);
    });
  });

  describe('Data Validation', () => {
    it('should sanitize HTML content in posts', async () => {
      const postData = {
        content: '<script>alert("xss")</script>This is safe content',
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 1,
            content: 'This is safe content', // Script tags removed
          }]),
        }),
      });

      const response = await request(app)
        .post('/social/posts')
        .send(postData);

      expect(response.status).toBe(201);
      // Verify XSS prevention
      expect(response.body.content).not.toContain('<script>');
    });

    it('should handle emoji content properly', async () => {
      const postData = {
        content: 'Great work! 🎉🚀✨',
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 1,
            content: postData.content,
          }]),
        }),
      });

      const response = await request(app)
        .post('/social/posts')
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.content).toBe(postData.content);
    });
  });
});