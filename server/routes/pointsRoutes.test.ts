import request from 'supertest';
import express from 'express';
import pointsRoutes from './pointsRoutes';
import { storage } from '../storage';
import { verifyToken } from '../middleware/auth';

// Mock dependencies
jest.mock('../storage');
jest.mock('../middleware/auth');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Points Routes', () => {
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
        isAdmin: false,
      };
      next();
    });
    
    app.use('/api/points', pointsRoutes);
  });

  describe('GET /api/points/balance', () => {
    it('should return user balance and statistics', async () => {
      mockStorage.getUserBalance.mockResolvedValue(500);
      mockStorage.getWeeklyPointsEarned.mockResolvedValue(75);
      mockStorage.getTotalPointsEarned.mockResolvedValue(1250);
      mockStorage.getPointsSpent.mockResolvedValue(750);

      const response = await request(app)
        .get('/api/points/balance')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        balance: 500,
        weeklyPoints: 75,
        totalEarned: 1250,
        totalSpent: 750,
      });
    });

    it('should return 401 without auth', async () => {
      mockVerifyToken.mockImplementation((req, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const response = await request(app).get('/api/points/balance');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/points/transfer', () => {
    beforeEach(() => {
      // Set admin user for transfer tests
      mockVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = {
          id: 1,
          email: 'admin@test.com',
          organizationId: 1,
          isAdmin: true,
        };
        next();
      });
    });

    it('should transfer points between users', async () => {
      const transferData = {
        fromUserId: 2,
        toUserId: 3,
        amount: 100,
        reason: 'reward',
        description: 'Good work bonus',
      };
      
      // Mock sender has sufficient balance
      mockStorage.getUserBalance.mockResolvedValue(500);
      
      // Mock transaction creation
      const mockTransaction = {
        id: 1,
        type: 'transfer',
        amount: 100,
        reason: 'reward',
      };
      mockStorage.transferPoints.mockResolvedValue(mockTransaction);

      const response = await request(app)
        .post('/api/points/transfer')
        .set('Authorization', 'Bearer admin-token')
        .send(transferData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        transaction: mockTransaction,
      });
    });

    it('should reject transfer with insufficient balance', async () => {
      mockStorage.getUserBalance.mockResolvedValue(50); // Not enough

      const response = await request(app)
        .post('/api/points/transfer')
        .set('Authorization', 'Bearer admin-token')
        .send({
          fromUserId: 2,
          toUserId: 3,
          amount: 100,
          reason: 'reward',
          description: 'Transfer',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Insufficient balance');
    });

    it('should reject transfer from non-admin', async () => {
      // Set non-admin user
      mockVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = {
          id: 1,
          isAdmin: false,
        };
        next();
      });

      const response = await request(app)
        .post('/api/points/transfer')
        .set('Authorization', 'Bearer user-token')
        .send({
          fromUserId: 2,
          toUserId: 3,
          amount: 100,
          reason: 'reward',
          description: 'Transfer',
        });

      expect(response.status).toBe(403);
    });

    it('should validate transfer amount', async () => {
      const response = await request(app)
        .post('/api/points/transfer')
        .set('Authorization', 'Bearer admin-token')
        .send({
          fromUserId: 2,
          toUserId: 3,
          amount: -100, // Invalid negative amount
          reason: 'reward',
          description: 'Transfer',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/points/transactions', () => {
    it('should return user transactions', async () => {
      const mockTransactions = [
        {
          id: 1,
          type: 'earn',
          amount: 50,
          reason: 'achievement',
          description: 'Weekly goal',
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 2,
          type: 'redeem',
          amount: -30,
          reason: 'product',
          description: 'Coffee voucher',
          createdAt: new Date('2025-01-02'),
        },
      ];
      
      mockStorage.getUserTransactions.mockResolvedValue(mockTransactions);

      const response = await request(app)
        .get('/api/points/transactions')
        .set('Authorization', 'Bearer test-token')
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTransactions);
      expect(mockStorage.getUserTransactions).toHaveBeenCalledWith(1, 10, 0);
    });

    it('should paginate transactions', async () => {
      mockStorage.getUserTransactions.mockResolvedValue([]);

      await request(app)
        .get('/api/points/transactions')
        .set('Authorization', 'Bearer test-token')
        .query({ limit: 20, offset: 40 });

      expect(mockStorage.getUserTransactions).toHaveBeenCalledWith(1, 20, 40);
    });
  });

  describe('POST /api/points/award', () => {
    beforeEach(() => {
      // Set admin user
      mockVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = {
          id: 1,
          isAdmin: true,
          organizationId: 1,
        };
        next();
      });
    });

    it('should award points to user', async () => {
      const mockTransaction = {
        id: 1,
        type: 'earn',
        amount: 100,
      };
      
      mockStorage.earnPoints.mockResolvedValue(mockTransaction);

      const response = await request(app)
        .post('/api/points/award')
        .set('Authorization', 'Bearer admin-token')
        .send({
          user_id: 5,
          amount: 100,
          reason: 'performance',
          description: 'Q1 performance bonus',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        transaction: mockTransaction,
      });
      expect(mockStorage.earnPoints).toHaveBeenCalledWith(
        5,
        100,
        'performance',
        'Q1 performance bonus',
        1 // Admin ID
      );
    });

    it('should reject award from non-admin', async () => {
      mockVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = { id: 1, isAdmin: false };
        next();
      });

      const response = await request(app)
        .post('/api/points/award')
        .set('Authorization', 'Bearer user-token')
        .send({
          user_id: 5,
          amount: 100,
          reason: 'performance',
          description: 'Bonus',
        });

      expect(response.status).toBe(403);
    });

    it('should validate award amount is positive', async () => {
      const response = await request(app)
        .post('/api/points/award')
        .set('Authorization', 'Bearer admin-token')
        .send({
          user_id: 5,
          amount: 0,
          reason: 'performance',
          description: 'Bonus',
        });

      expect(response.status).toBe(400);
    });
  });
});