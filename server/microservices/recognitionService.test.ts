import request from 'supertest';
import express from 'express';
import { createRecognitionServiceApp } from './recognitionService';
import { storage } from '../storage';

jest.mock('../storage');

const mockStorage = storage as jest.Mocked<typeof storage>;

describe('Recognition Microservice', () => {
  let app: express.Application;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = createRecognitionServiceApp();
  });

  describe('POST /recognize', () => {
    it('should process recognition request', async () => {
      const recognitionData = {
        giverId: 1,
        recipientId: 5,
        message: 'Great teamwork!',
        category: 'teamwork',
        points: 50,
        organizationId: 1,
      };
      
      const mockRecognition = {
        id: 100,
        ...recognitionData,
        createdAt: new Date(),
      };
      
      mockStorage.createRecognition.mockResolvedValue(mockRecognition);
      mockStorage.earnPoints.mockResolvedValue({
        transaction: { id: 200, amount: 50 },
        newBalance: 150,
      });

      const response = await request(app)
        .post('/recognize')
        .send(recognitionData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        recognition: mockRecognition,
        pointsAwarded: 50,
      });
    });

    it('should validate recognition data', async () => {
      const response = await request(app)
        .post('/recognize')
        .send({
          // Missing required fields
          message: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /leaderboard/:organizationId', () => {
    it('should return recognition leaderboard', async () => {
      const mockLeaderboard = [
        { user_id: 1, name: 'Top User', points: 500, rank: 1 },
        { user_id: 2, name: 'Second User', points: 450, rank: 2 },
      ];
      
      mockStorage.getRecognitionLeaderboard.mockResolvedValue(mockLeaderboard);

      const response = await request(app)
        .get('/leaderboard/1')
        .query({ period: 'month' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLeaderboard);
    });
  });

  describe('GET /stats/:user_id', () => {
    it('should return user recognition stats', async () => {
      const mockStats = {
        totalGiven: 10,
        totalReceived: 15,
        pointsEarned: 750,
        streak: 5,
        topCategory: 'innovation',
      };
      
      mockStorage.getUserRecognitionStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/stats/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
    });
  });

  describe('POST /batch', () => {
    it('should process batch recognitions', async () => {
      const batchData = {
        giverId: 1,
        recognitions: [
          { recipientId: 2, message: 'Great job!', points: 50 },
          { recipientId: 3, message: 'Well done!', points: 50 },
        ],
        organizationId: 1,
      };
      
      mockStorage.createRecognition.mockResolvedValue({ id: 100 });
      mockStorage.earnPoints.mockResolvedValue({
        transaction: { id: 200 },
        newBalance: 100,
      });

      const response = await request(app)
        .post('/batch')
        .send(batchData);

      expect(response.status).toBe(200);
      expect(response.body.processed).toBe(2);
      expect(mockStorage.createRecognition).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /trending/:organizationId', () => {
    it('should return trending recognition categories', async () => {
      const mockTrending = [
        { category: 'innovation', count: 25, trend: 'up' },
        { category: 'teamwork', count: 20, trend: 'stable' },
        { category: 'leadership', count: 15, trend: 'down' },
      ];
      
      mockStorage.getTrendingCategories.mockResolvedValue(mockTrending);

      const response = await request(app)
        .get('/trending/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTrending);
    });
  });
});