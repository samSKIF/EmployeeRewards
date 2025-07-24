import request from 'supertest';
import express from 'express';
import { router as leaveRouter } from './leave-management';
import { storage } from '../storage';
import { verifyToken } from '../middleware/auth';

jest.mock('../storage');
jest.mock('../middleware/auth');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Leave Management API', () => {
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
    
    app.use('/api/leave', leaveRouter);
  });

  describe('GET /api/leave/types', () => {
    it('should return leave types for organization', async () => {
      const mockLeaveTypes = [
        { id: 1, name: 'Annual Leave', days: 21 },
        { id: 2, name: 'Sick Leave', days: 10 },
        { id: 3, name: 'Personal Leave', days: 5 },
      ];
      
      mockStorage.getLeaveTypes.mockResolvedValue(mockLeaveTypes);

      const response = await request(app)
        .get('/api/leave/types')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLeaveTypes);
      expect(mockStorage.getLeaveTypes).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /api/leave/request', () => {
    it('should create leave request', async () => {
      const leaveRequestData = {
        leaveTypeId: 1,
        startDate: '2025-08-01',
        endDate: '2025-08-05',
        reason: 'Family vacation',
      };
      
      const createdRequest = {
        id: 100,
        ...leaveRequestData,
        userId: 1,
        status: 'pending',
        createdAt: new Date(),
      };
      
      mockStorage.createLeaveRequest.mockResolvedValue(createdRequest);

      const response = await request(app)
        .post('/api/leave/request')
        .set('Authorization', 'Bearer test-token')
        .send(leaveRequestData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdRequest);
      expect(mockStorage.createLeaveRequest).toHaveBeenCalledWith({
        ...leaveRequestData,
        userId: 1,
        organizationId: 1,
      });
    });

    it('should validate date range', async () => {
      const invalidRequest = {
        leaveTypeId: 1,
        startDate: '2025-08-05',
        endDate: '2025-08-01', // End before start
        reason: 'Invalid dates',
      };

      const response = await request(app)
        .post('/api/leave/request')
        .set('Authorization', 'Bearer test-token')
        .send(invalidRequest);

      expect(response.status).toBe(400);
    });

    it('should check leave balance', async () => {
      mockStorage.getUserLeaveBalance.mockResolvedValue(2); // Only 2 days left
      
      const leaveRequest = {
        leaveTypeId: 1,
        startDate: '2025-08-01',
        endDate: '2025-08-10', // 10 days
        reason: 'Long vacation',
      };

      const response = await request(app)
        .post('/api/leave/request')
        .set('Authorization', 'Bearer test-token')
        .send(leaveRequest);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Insufficient leave balance');
    });
  });

  describe('GET /api/leave/requests', () => {
    it('should return user leave requests', async () => {
      const mockRequests = [
        {
          id: 1,
          userId: 1,
          leaveType: 'Annual Leave',
          startDate: '2025-08-01',
          endDate: '2025-08-05',
          status: 'approved',
        },
      ];
      
      mockStorage.getUserLeaveRequests.mockResolvedValue(mockRequests);

      const response = await request(app)
        .get('/api/leave/requests')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRequests);
      expect(mockStorage.getUserLeaveRequests).toHaveBeenCalledWith(1);
    });
  });

  describe('PUT /api/leave/request/:id/approve', () => {
    beforeEach(() => {
      // Set manager user
      mockVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = {
          id: 2,
          email: 'manager@test.com',
          organizationId: 1,
          isManager: true,
        };
        next();
      });
    });

    it('should approve leave request', async () => {
      const leaveRequest = {
        id: 100,
        userId: 5,
        managerId: 2,
        status: 'pending',
      };
      
      mockStorage.getLeaveRequest.mockResolvedValue(leaveRequest);
      mockStorage.updateLeaveRequestStatus.mockResolvedValue({
        ...leaveRequest,
        status: 'approved',
        approvedBy: 2,
      });

      const response = await request(app)
        .put('/api/leave/request/100/approve')
        .set('Authorization', 'Bearer manager-token');

      expect(response.status).toBe(200);
      expect(mockStorage.updateLeaveRequestStatus).toHaveBeenCalledWith(
        100,
        'approved',
        2
      );
    });

    it('should prevent non-managers from approving', async () => {
      mockVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = {
          id: 1,
          isManager: false,
        };
        next();
      });

      const response = await request(app)
        .put('/api/leave/request/100/approve')
        .set('Authorization', 'Bearer user-token');

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/leave/request/:id/reject', () => {
    beforeEach(() => {
      // Set manager user
      mockVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = {
          id: 2,
          isManager: true,
          organizationId: 1,
        };
        next();
      });
    });

    it('should reject leave request with reason', async () => {
      const leaveRequest = {
        id: 100,
        userId: 5,
        status: 'pending',
      };
      
      mockStorage.getLeaveRequest.mockResolvedValue(leaveRequest);
      mockStorage.updateLeaveRequestStatus.mockResolvedValue({
        ...leaveRequest,
        status: 'rejected',
        rejectionReason: 'Busy period',
      });

      const response = await request(app)
        .put('/api/leave/request/100/reject')
        .set('Authorization', 'Bearer manager-token')
        .send({ reason: 'Busy period' });

      expect(response.status).toBe(200);
      expect(mockStorage.updateLeaveRequestStatus).toHaveBeenCalledWith(
        100,
        'rejected',
        2,
        'Busy period'
      );
    });
  });

  describe('DELETE /api/leave/request/:id', () => {
    it('should allow canceling own pending request', async () => {
      const leaveRequest = {
        id: 100,
        userId: 1, // Same as auth user
        status: 'pending',
      };
      
      mockStorage.getLeaveRequest.mockResolvedValue(leaveRequest);
      mockStorage.deleteLeaveRequest.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/leave/request/100')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(mockStorage.deleteLeaveRequest).toHaveBeenCalledWith(100);
    });

    it('should not allow canceling approved request', async () => {
      const leaveRequest = {
        id: 100,
        userId: 1,
        status: 'approved',
      };
      
      mockStorage.getLeaveRequest.mockResolvedValue(leaveRequest);

      const response = await request(app)
        .delete('/api/leave/request/100')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Cannot cancel approved');
    });
  });

  describe('GET /api/leave/balance', () => {
    it('should return leave balances for user', async () => {
      const mockBalances = [
        { leaveTypeId: 1, leaveType: 'Annual Leave', total: 21, used: 5, remaining: 16 },
        { leaveTypeId: 2, leaveType: 'Sick Leave', total: 10, used: 2, remaining: 8 },
      ];
      
      mockStorage.getUserLeaveBalances.mockResolvedValue(mockBalances);

      const response = await request(app)
        .get('/api/leave/balance')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBalances);
      expect(mockStorage.getUserLeaveBalances).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /api/leave/calendar', () => {
    it('should return team leave calendar', async () => {
      const mockCalendar = [
        {
          userId: 3,
          userName: 'John Doe',
          startDate: '2025-08-01',
          endDate: '2025-08-05',
          leaveType: 'Annual Leave',
        },
      ];
      
      mockStorage.getTeamLeaveCalendar.mockResolvedValue(mockCalendar);

      const response = await request(app)
        .get('/api/leave/calendar')
        .query({ month: 8, year: 2025 })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCalendar);
      expect(mockStorage.getTeamLeaveCalendar).toHaveBeenCalledWith(
        1,
        1, // User's department
        8,
        2025
      );
    });
  });
});