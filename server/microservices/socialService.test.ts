import request from 'supertest';
import express from 'express';
import { createSocialServiceApp } from './socialService';
import { getPostsCollection, getReactionsCollection } from '../mongodb/collections';

jest.mock('../mongodb/collections');

const mockPostsCollection = {
  find: jest.fn(),
  findOne: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  aggregate: jest.fn(),
};

const mockReactionsCollection = {
  findOne: jest.fn(),
  insertOne: jest.fn(),
  deleteOne: jest.fn(),
  countDocuments: jest.fn(),
};

(getPostsCollection as jest.Mock).mockReturnValue(mockPostsCollection);
(getReactionsCollection as jest.Mock).mockReturnValue(mockReactionsCollection);

describe('Social Microservice', () => {
  let app: express.Application;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = createSocialServiceApp();
  });

  describe('POST /posts', () => {
    it('should create social post', async () => {
      const postData = {
        userId: 1,
        content: 'Test post content',
        type: 'text',
        companyId: 1,
        visibility: 'company',
      };
      
      mockPostsCollection.insertOne.mockResolvedValue({
        insertedId: 'post123',
        acknowledged: true,
      });

      const response = await request(app)
        .post('/posts')
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('post123');
      expect(mockPostsCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          content: postData.content,
          userId: postData.userId,
        })
      );
    });

    it('should validate post content', async () => {
      const response = await request(app)
        .post('/posts')
        .send({
          userId: 1,
          content: '', // Empty content
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /posts', () => {
    it('should return posts for company', async () => {
      const mockPosts = [
        {
          _id: 'post1',
          content: 'Post 1',
          userId: 1,
          createdAt: new Date(),
          reactions: { like: 5, love: 2 },
        },
        {
          _id: 'post2',
          content: 'Post 2',
          userId: 2,
          createdAt: new Date(),
          reactions: { like: 3 },
        },
      ];
      
      const mockCursor = {
        toArray: jest.fn().mockResolvedValue(mockPosts),
      };
      
      mockPostsCollection.aggregate.mockReturnValue(mockCursor);

      const response = await request(app)
        .get('/posts')
        .query({ companyId: 1, limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        id: 'post1',
        content: 'Post 1',
      });
    });
  });

  describe('PUT /posts/:id', () => {
    it('should update post', async () => {
      const postId = 'post123';
      const updateData = {
        content: 'Updated content',
        userId: 1,
      };
      
      mockPostsCollection.findOne.mockResolvedValue({
        _id: postId,
        userId: 1,
        content: 'Original content',
      });
      
      mockPostsCollection.updateOne.mockResolvedValue({
        modifiedCount: 1,
      });

      const response = await request(app)
        .put(`/posts/${postId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(mockPostsCollection.updateOne).toHaveBeenCalledWith(
        { _id: postId },
        expect.objectContaining({
          $set: expect.objectContaining({
            content: updateData.content,
          }),
        })
      );
    });

    it('should prevent updating other users posts', async () => {
      mockPostsCollection.findOne.mockResolvedValue({
        _id: 'post123',
        userId: 2, // Different user
      });

      const response = await request(app)
        .put('/posts/post123')
        .send({
          content: 'Updated',
          userId: 1,
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /posts/:id', () => {
    it('should delete post', async () => {
      mockPostsCollection.findOne.mockResolvedValue({
        _id: 'post123',
        userId: 1,
      });
      
      mockPostsCollection.deleteOne.mockResolvedValue({
        deletedCount: 1,
      });

      const response = await request(app)
        .delete('/posts/post123')
        .send({ userId: 1 });

      expect(response.status).toBe(200);
      expect(mockPostsCollection.deleteOne).toHaveBeenCalledWith({
        _id: 'post123',
      });
    });
  });

  describe('POST /posts/:id/react', () => {
    it('should add reaction to post', async () => {
      const postId = 'post123';
      const reactionData = {
        userId: 1,
        reaction: 'like',
      };
      
      mockReactionsCollection.findOne.mockResolvedValue(null); // No existing reaction
      mockReactionsCollection.insertOne.mockResolvedValue({
        insertedId: 'reaction123',
      });

      const response = await request(app)
        .post(`/posts/${postId}/react`)
        .send(reactionData);

      expect(response.status).toBe(200);
      expect(mockReactionsCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          postId,
          userId: reactionData.userId,
          type: reactionData.reaction,
        })
      );
    });

    it('should update existing reaction', async () => {
      mockReactionsCollection.findOne.mockResolvedValue({
        _id: 'reaction123',
        type: 'like',
      });
      
      mockReactionsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockReactionsCollection.insertOne.mockResolvedValue({ insertedId: 'new123' });

      const response = await request(app)
        .post('/posts/post123/react')
        .send({
          userId: 1,
          reaction: 'love',
        });

      expect(response.status).toBe(200);
      expect(mockReactionsCollection.deleteOne).toHaveBeenCalled();
    });
  });

  describe('DELETE /posts/:id/react', () => {
    it('should remove reaction from post', async () => {
      mockReactionsCollection.deleteOne.mockResolvedValue({
        deletedCount: 1,
      });

      const response = await request(app)
        .delete('/posts/post123/react')
        .send({ userId: 1 });

      expect(response.status).toBe(200);
      expect(mockReactionsCollection.deleteOne).toHaveBeenCalledWith({
        postId: 'post123',
        userId: 1,
      });
    });
  });

  describe('GET /stats', () => {
    it('should return social stats for company', async () => {
      const mockStats = {
        totalPosts: 150,
        activeUsers: 45,
        totalReactions: 500,
        topPosters: [
          { userId: 1, postCount: 25 },
          { userId: 2, postCount: 20 },
        ],
      };
      
      // Mock aggregation pipeline results
      mockPostsCollection.aggregate.mockImplementation(() => ({
        toArray: jest.fn().mockResolvedValue([mockStats]),
      }));

      const response = await request(app)
        .get('/stats')
        .query({ companyId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(mockStats);
    });
  });
});