import { AnalyticsService } from './analyticsService';
import { storage } from '../storage';

jest.mock('../storage');

const mockStorage = storage as jest.Mocked<typeof storage>;

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService = new AnalyticsService(mockStorage);
  });

  describe('getUserEngagementMetrics', () => {
    it('should calculate user engagement metrics', async () => {
      const mockData = {
        loginCount: 25,
        lastLogin: new Date('2025-01-20'),
        postsCreated: 10,
        recognitionsGiven: 5,
        recognitionsReceived: 8,
        pointsEarned: 500,
        pointsSpent: 200,
      };
      
      mockStorage.getUserEngagementData.mockResolvedValue(mockData);

      const result = await analyticsService.getUserEngagementMetrics(1, 30);

      expect(result).toMatchObject({
        loginFrequency: expect.any(Number),
        contentCreationRate: expect.any(Number),
        recognitionActivity: expect.any(Number),
        pointsActivity: expect.any(Number),
        engagementScore: expect.any(Number),
      });
    });
  });

  describe('getOrganizationAnalytics', () => {
    it('should return organization-wide analytics', async () => {
      const mockAnalytics = {
        totalUsers: 100,
        activeUsers: 85,
        totalPosts: 500,
        totalRecognitions: 200,
        totalPointsEarned: 10000,
        avgEngagementRate: 75.5,
        topPerformers: [
          { user_id: 1, name: 'Top User', score: 95 },
        ],
      };
      
      mockStorage.getOrganizationAnalytics.mockResolvedValue(mockAnalytics);

      const result = await analyticsService.getOrganizationAnalytics(1);

      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('generateUserReport', () => {
    it('should generate comprehensive user report', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        department: 'Engineering',
        joinDate: new Date('2024-01-01'),
      };
      
      const mockActivity = {
        posts: 20,
        recognitions: 15,
        pointsEarned: 750,
        leavesTaken: 5,
      };
      
      mockStorage.getUser.mockResolvedValue(mockUser);
      mockStorage.getUserActivitySummary.mockResolvedValue(mockActivity);

      const result = await analyticsService.generateUserReport(1, 'month');

      expect(result).toMatchObject({
        user: mockUser,
        period: 'month',
        metrics: expect.any(Object),
        recommendations: expect.any(Array),
      });
    });
  });

  describe('getDepartmentAnalytics', () => {
    it('should return department-specific analytics', async () => {
      const mockDeptData = {
        department: 'Engineering',
        userCount: 25,
        avgEngagement: 80,
        totalRecognitions: 100,
        leaveUtilization: 65,
      };
      
      mockStorage.getDepartmentAnalytics.mockResolvedValue(mockDeptData);

      const result = await analyticsService.getDepartmentAnalytics(1, 'Engineering');

      expect(result).toEqual(mockDeptData);
    });
  });

  describe('getRecognitionTrends', () => {
    it('should analyze recognition trends', async () => {
      const mockTrends = [
        { date: '2025-01-01', count: 10, totalPoints: 500 },
        { date: '2025-01-02', count: 15, totalPoints: 750 },
        { date: '2025-01-03', count: 12, totalPoints: 600 },
      ];
      
      mockStorage.getRecognitionTrends.mockResolvedValue(mockTrends);

      const result = await analyticsService.getRecognitionTrends(1, 7);

      expect(result).toMatchObject({
        trends: mockTrends,
        averageDaily: expect.any(Number),
        growthRate: expect.any(Number),
      });
    });
  });

  describe('getLeaveAnalytics', () => {
    it('should return leave utilization analytics', async () => {
      const mockLeaveData = {
        totalAllocated: 210,
        totalUsed: 125,
        totalPending: 15,
        byType: [
          { type: 'Annual', allocated: 150, used: 90 },
          { type: 'Sick', allocated: 60, used: 35 },
        ],
      };
      
      mockStorage.getLeaveAnalytics.mockResolvedValue(mockLeaveData);

      const result = await analyticsService.getLeaveAnalytics(1, 2025);

      expect(result).toMatchObject({
        ...mockLeaveData,
        utilizationRate: expect.any(Number),
      });
    });
  });

  describe('exportAnalyticsReport', () => {
    it('should export analytics report in specified format', async () => {
      const mockData = {
        summary: { totalUsers: 100 },
        details: [{ metric: 'engagement', value: 75 }],
      };
      
      mockStorage.getAnalyticsExportData.mockResolvedValue(mockData);

      const result = await analyticsService.exportAnalyticsReport(
        1,
        'monthly',
        'csv'
      );

      expect(result).toMatchObject({
        format: 'csv',
        data: expect.any(String),
        filename: expect.stringContaining('analytics'),
      });
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should return real-time platform metrics', async () => {
      const mockMetrics = {
        activeUsers: 45,
        ongoingRecognitions: 3,
        pendingApprovals: 8,
        recentActivities: [
          { type: 'login', user_id: 1, timestamp: new Date() },
        ],
      };
      
      mockStorage.getRealTimeMetrics.mockResolvedValue(mockMetrics);

      const result = await analyticsService.getRealTimeMetrics(1);

      expect(result).toEqual(mockMetrics);
    });
  });
});