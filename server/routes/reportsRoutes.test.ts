import request from 'supertest';
import express from 'express';
import reportsRoutes from './reportsRoutes';
import { storage } from '../storage';
import { verifyToken, verifyAdmin } from '../middleware/auth';
import { AnalyticsService } from '../services/analyticsService';

jest.mock('../storage');
jest.mock('../middleware/auth');
jest.mock('../services/analyticsService');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockVerifyAdmin = verifyAdmin as jest.MockedFunction<typeof verifyAdmin>;

describe('Reports Routes', () => {
  let app: express.Application;
  let mockAnalyticsService: jest.Mocked<AnalyticsService>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    
    // Mock auth middleware - admin user
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
    
    mockAnalyticsService = new AnalyticsService(mockStorage) as jest.Mocked<AnalyticsService>;
    
    app.use('/api/reports', reportsRoutes);
  });

  describe('GET /api/reports/engagement', () => {
    it('should return engagement report', async () => {
      const mockReport = {
        period: 'month',
        totalUsers: 100,
        activeUsers: 85,
        engagementRate: 85,
        topEngagedUsers: [
          { user_id: 1, name: 'User 1', score: 95 },
        ],
        departmentBreakdown: [
          { department: 'Engineering', rate: 90 },
          { department: 'Sales', rate: 80 },
        ],
      };
      
      mockStorage.getEngagementReport.mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/reports/engagement')
        .query({ period: 'month' })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockReport);
    });
  });

  describe('GET /api/reports/recognition', () => {
    it('should return recognition analytics report', async () => {
      const mockReport = {
        period: 'quarter',
        totalRecognitions: 500,
        totalPointsAwarded: 25000,
        topRecognizers: [
          { user_id: 1, name: 'Manager 1', count: 50 },
        ],
        topRecipients: [
          { user_id: 2, name: 'Employee 1', count: 30 },
        ],
        categoryBreakdown: [
          { category: 'teamwork', count: 150, percentage: 30 },
          { category: 'innovation', count: 100, percentage: 20 },
        ],
      };
      
      mockStorage.getRecognitionReport.mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/reports/recognition')
        .query({ period: 'quarter' })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockReport);
    });
  });

  describe('GET /api/reports/leave', () => {
    it('should return leave utilization report', async () => {
      const mockReport = {
        year: 2025,
        totalAllocated: 2100,
        totalUsed: 1250,
        utilizationRate: 59.5,
        byDepartment: [
          {
            department: 'Engineering',
            allocated: 500,
            used: 300,
            rate: 60,
          },
        ],
        byType: [
          {
            type: 'Annual',
            allocated: 1500,
            used: 900,
            rate: 60,
          },
        ],
      };
      
      mockStorage.getLeaveReport.mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/reports/leave')
        .query({ year: 2025 })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockReport);
    });
  });

  describe('GET /api/reports/points', () => {
    it('should return points economy report', async () => {
      const mockReport = {
        period: 'month',
        totalEarned: 50000,
        totalRedeemed: 30000,
        netFlow: 20000,
        averageBalance: 250,
        topEarners: [
          { user_id: 1, name: 'Top Performer', points: 2000 },
        ],
        redemptionBreakdown: [
          { category: 'food', amount: 10000, percentage: 33.3 },
          { category: 'fitness', amount: 8000, percentage: 26.7 },
        ],
      };
      
      mockStorage.getPointsReport.mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/reports/points')
        .query({ period: 'month' })
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockReport);
    });
  });

  describe('POST /api/reports/generate', () => {
    it('should generate custom report', async () => {
      const reportParams = {
        type: 'custom',
        metrics: ['engagement', 'recognition', 'points'],
        period: 'quarter',
        format: 'pdf',
      };
      
      mockAnalyticsService.generateCustomReport.mockResolvedValue({
        reportId: 'report-123',
        url: '/reports/report-123.pdf',
        generatedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', 'Bearer admin-token')
        .send(reportParams);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        reportId: 'report-123',
        url: expect.any(String),
      });
    });
  });

  describe('GET /api/reports/dashboard', () => {
    it('should return executive dashboard data', async () => {
      const mockDashboard = {
        kpis: {
          userGrowth: 5.2,
          engagementTrend: 'up',
          recognitionActivity: 85,
          pointsCirculation: 75000,
        },
        charts: {
          engagementOverTime: [],
          recognitionTrends: [],
          departmentComparison: [],
        },
        alerts: [
          { type: 'info', message: 'Q4 engagement up 10%' },
        ],
      };
      
      mockStorage.getExecutiveDashboard.mockResolvedValue(mockDashboard);

      const response = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockDashboard);
    });
  });

  describe('Access Control', () => {
    it('should deny access to non-admin users', async () => {
      mockVerifyAdmin.mockImplementation((req, res, next) => {
        res.status(403).json({ message: 'Admin access required' });
      });

      const response = await request(app)
        .get('/api/reports/engagement')
        .set('Authorization', 'Bearer user-token');

      expect(response.status).toBe(403);
    });
  });
});