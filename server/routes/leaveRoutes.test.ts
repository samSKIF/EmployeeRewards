import request from 'supertest';
import express from 'express';
import { db } from '../db';
import { leaveRequests, users } from '@shared/schema';

// Mock dependencies
jest.mock('../db');
jest.mock('../middleware/auth');
jest.mock('../storage');

// Import the router after mocking
import leaveRouter from './leaveRoutes';
import { verifyToken, verifyAdmin } from '../middleware/auth';
import { storage } from '../storage';

const mockedDb = db as jest.Mocked<typeof db>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockedVerifyAdmin = verifyAdmin as jest.MockedFunction<typeof verifyAdmin>;
const mockedStorage = storage as jest.Mocked<typeof storage>;

describe('Leave Routes', () => {
  let app: express.Application;

  const mockUser = {
    id: 1,
    organizationId: 1,
    email: 'user@example.com',
    name: 'Test User',
    isAdmin: false,
    department: 'Engineering',
    managerId: 2,
  };

  const mockManager = {
    id: 2,
    organizationId: 1,
    email: 'manager@example.com',
    name: 'Manager User',
    isAdmin: true,
    department: 'Engineering',
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/leave', leaveRouter);
    jest.clearAllMocks();

    // Default auth middleware behavior
    mockedVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = mockUser;
      next();
    });

    mockedVerifyAdmin.mockImplementation((req: any, res, next) => {
      if (req.user?.isAdmin) {
        next();
      } else {
        res.status(403).json({ message: 'Admin access required' });
      }
    });
  });

  describe('POST /leave/requests', () => {
    it('should create leave request successfully', async () => {
      const leaveData = {
        type: 'vacation',
        startDate: '2025-08-01',
        endDate: '2025-08-05',
        reason: 'Family vacation',
        description: 'Annual family trip to the mountains',
      };

      const mockCreatedRequest = {
        id: 1,
        userId: 1,
        type: 'vacation',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-05'),
        reason: 'Family vacation',
        description: 'Annual family trip to the mountains',
        status: 'pending',
        organizationId: 1,
        createdAt: new Date(),
        daysRequested: 5,
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCreatedRequest]),
        }),
      });

      const response = await request(app)
        .post('/leave/requests')
        .send(leaveData);

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('vacation');
      expect(response.body.status).toBe('pending');
      expect(response.body.daysRequested).toBe(5);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        type: 'vacation',
        // Missing startDate, endDate, reason
      };

      const response = await request(app)
        .post('/leave/requests')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should validate date range', async () => {
      const invalidData = {
        type: 'vacation',
        startDate: '2025-08-05',
        endDate: '2025-08-01', // End before start
        reason: 'Invalid dates',
      };

      const response = await request(app)
        .post('/leave/requests')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('End date must be after start date');
    });

    it('should validate leave type', async () => {
      const invalidData = {
        type: 'invalid_type',
        startDate: '2025-08-01',
        endDate: '2025-08-05',
        reason: 'Test',
      };

      const response = await request(app)
        .post('/leave/requests')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid leave type');
    });

    it('should prevent backdated leave requests', async () => {
      const pastData = {
        type: 'vacation',
        startDate: '2024-01-01', // Past date
        endDate: '2024-01-05',
        reason: 'Past vacation',
      };

      const response = await request(app)
        .post('/leave/requests')
        .send(pastData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('cannot be in the past');
    });

    it('should check for overlapping leave requests', async () => {
      const overlappingData = {
        type: 'vacation',
        startDate: '2025-08-01',
        endDate: '2025-08-05',
        reason: 'Overlapping vacation',
      };

      const existingRequest = {
        id: 2,
        startDate: new Date('2025-08-03'),
        endDate: new Date('2025-08-07'),
        status: 'approved',
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([existingRequest]),
        }),
      });

      const response = await request(app)
        .post('/leave/requests')
        .send(overlappingData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('overlapping');
    });

    it('should calculate business days correctly', async () => {
      const leaveData = {
        type: 'vacation',
        startDate: '2025-08-01', // Friday
        endDate: '2025-08-05', // Tuesday (including weekend)
        reason: 'Weekend vacation',
      };

      const mockCreatedRequest = {
        id: 1,
        daysRequested: 3, // Should exclude weekend
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCreatedRequest]),
        }),
      });

      const response = await request(app)
        .post('/leave/requests')
        .send(leaveData);

      expect(response.status).toBe(201);
      expect(response.body.daysRequested).toBe(3);
    });
  });

  describe('GET /leave/requests', () => {
    it('should return user leave requests', async () => {
      const mockRequests = [
        {
          id: 1,
          type: 'vacation',
          startDate: new Date('2025-08-01'),
          endDate: new Date('2025-08-05'),
          status: 'approved',
          daysRequested: 5,
          createdAt: new Date(),
        },
        {
          id: 2,
          type: 'sick',
          startDate: new Date('2025-07-15'),
          endDate: new Date('2025-07-16'),
          status: 'pending',
          daysRequested: 2,
          createdAt: new Date(),
        },
      ];

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockRequests),
          }),
        }),
      });

      const response = await request(app).get('/leave/requests');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].type).toBe('vacation');
      expect(response.body[1].type).toBe('sick');
    });

    it('should filter by status', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const response = await request(app)
        .get('/leave/requests')
        .query({ status: 'approved' });

      expect(response.status).toBe(200);
    });

    it('should filter by date range', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const response = await request(app)
        .get('/leave/requests')
        .query({ 
          startDate: '2025-07-01',
          endDate: '2025-07-31'
        });

      expect(response.status).toBe(200);
    });

    it('should handle pagination', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/leave/requests')
        .query({ page: '2', limit: '10' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /leave/requests/:id', () => {
    it('should return specific leave request', async () => {
      const mockRequest = {
        id: 1,
        userId: 1,
        type: 'vacation',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-05'),
        status: 'pending',
        reason: 'Family vacation',
        organizationId: 1,
        user: {
          name: 'Test User',
          email: 'user@example.com',
        },
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([mockRequest]),
          }),
        }),
      });

      const response = await request(app).get('/leave/requests/1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.type).toBe('vacation');
    });

    it('should handle request not found', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const response = await request(app).get('/leave/requests/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Leave request not found');
    });

    it('should prevent access to other users requests', async () => {
      const otherUserRequest = {
        id: 1,
        userId: 999, // Different user
        organizationId: 1,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([otherUserRequest]),
          }),
        }),
      });

      const response = await request(app).get('/leave/requests/1');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied');
    });

    it('should allow managers to view team requests', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = mockManager; // Manager user
        next();
      });

      const teamMemberRequest = {
        id: 1,
        userId: 1, // Team member
        organizationId: 1,
        user: {
          managerId: 2, // Reports to manager
        },
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([teamMemberRequest]),
          }),
        }),
      });

      const response = await request(app).get('/leave/requests/1');

      expect(response.status).toBe(200);
    });
  });

  describe('PATCH /leave/requests/:id/status', () => {
    beforeEach(() => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = mockManager; // Manager for approval
        next();
      });
    });

    it('should approve leave request', async () => {
      const statusUpdate = {
        status: 'approved',
        managerComments: 'Approved for vacation time',
      };

      const existingRequest = {
        id: 1,
        userId: 1,
        status: 'pending',
        organizationId: 1,
        user: {
          managerId: 2, // Reports to current user
        },
      };

      const updatedRequest = {
        ...existingRequest,
        status: 'approved',
        managerComments: 'Approved for vacation time',
        reviewedAt: new Date(),
        reviewedBy: 2,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([existingRequest]),
          }),
        }),
      });

      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedRequest]),
          }),
        }),
      });

      const response = await request(app)
        .patch('/leave/requests/1/status')
        .send(statusUpdate);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('approved');
      expect(response.body.managerComments).toBe('Approved for vacation time');
    });

    it('should reject leave request', async () => {
      const statusUpdate = {
        status: 'rejected',
        managerComments: 'Insufficient coverage during requested period',
      };

      const existingRequest = {
        id: 1,
        userId: 1,
        status: 'pending',
        organizationId: 1,
        user: {
          managerId: 2,
        },
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([existingRequest]),
          }),
        }),
      });

      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              ...existingRequest,
              status: 'rejected',
              managerComments: statusUpdate.managerComments,
            }]),
          }),
        }),
      });

      const response = await request(app)
        .patch('/leave/requests/1/status')
        .send(statusUpdate);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('rejected');
    });

    it('should validate status values', async () => {
      const invalidUpdate = {
        status: 'invalid_status',
      };

      const response = await request(app)
        .patch('/leave/requests/1/status')
        .send(invalidUpdate);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid status');
    });

    it('should prevent non-managers from updating status', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = mockUser; // Regular user, not manager
        next();
      });

      const statusUpdate = {
        status: 'approved',
      };

      const response = await request(app)
        .patch('/leave/requests/1/status')
        .send(statusUpdate);

      expect(response.status).toBe(403);
    });

    it('should prevent updating already processed requests', async () => {
      const existingRequest = {
        id: 1,
        status: 'approved', // Already processed
        organizationId: 1,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([existingRequest]),
          }),
        }),
      });

      const statusUpdate = {
        status: 'rejected',
      };

      const response = await request(app)
        .patch('/leave/requests/1/status')
        .send(statusUpdate);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already been processed');
    });

    it('should require manager comments for rejection', async () => {
      const existingRequest = {
        id: 1,
        userId: 1,
        status: 'pending',
        organizationId: 1,
        user: {
          managerId: 2,
        },
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([existingRequest]),
          }),
        }),
      });

      const statusUpdate = {
        status: 'rejected',
        // Missing managerComments
      };

      const response = await request(app)
        .patch('/leave/requests/1/status')
        .send(statusUpdate);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Manager comments required for rejection');
    });
  });

  describe('DELETE /leave/requests/:id', () => {
    it('should cancel pending leave request', async () => {
      const existingRequest = {
        id: 1,
        userId: 1,
        status: 'pending',
        organizationId: 1,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([existingRequest]),
        }),
      });

      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              ...existingRequest,
              status: 'cancelled',
            }]),
          }),
        }),
      });

      const response = await request(app).delete('/leave/requests/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Leave request cancelled successfully');
    });

    it('should prevent cancelling approved requests', async () => {
      const existingRequest = {
        id: 1,
        userId: 1,
        status: 'approved',
        organizationId: 1,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([existingRequest]),
        }),
      });

      const response = await request(app).delete('/leave/requests/1');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Cannot cancel approved requests');
    });

    it('should prevent cancelling other users requests', async () => {
      const otherUserRequest = {
        id: 1,
        userId: 999, // Different user
        status: 'pending',
        organizationId: 1,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([otherUserRequest]),
        }),
      });

      const response = await request(app).delete('/leave/requests/1');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /leave/balance', () => {
    it('should return user leave balance', async () => {
      const mockBalance = {
        userId: 1,
        vacation: 15,
        sick: 10,
        personal: 5,
        totalUsed: 8,
        totalRemaining: 22,
      };

      mockedStorage.getLeaveBalance = jest.fn().mockResolvedValue(mockBalance);

      const response = await request(app).get('/leave/balance');

      expect(response.status).toBe(200);
      expect(response.body.vacation).toBe(15);
      expect(response.body.totalRemaining).toBe(22);
    });

    it('should handle user not found', async () => {
      mockedStorage.getLeaveBalance = jest.fn().mockResolvedValue(undefined);

      const response = await request(app).get('/leave/balance');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Leave balance not found');
    });
  });

  describe('GET /leave/calendar', () => {
    it('should return team leave calendar', async () => {
      const mockCalendarData = [
        {
          date: '2025-08-01',
          users: [
            {
              id: 1,
              name: 'John Doe',
              type: 'vacation',
              status: 'approved',
            },
          ],
        },
        {
          date: '2025-08-02',
          users: [
            {
              id: 2,
              name: 'Jane Smith',
              type: 'sick',
              status: 'approved',
            },
          ],
        },
      ];

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mockCalendarData),
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/leave/calendar')
        .query({ 
          month: '2025-08',
          department: 'Engineering'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should filter by department', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/leave/calendar')
        .query({ department: 'Marketing' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /leave/stats', () => {
    beforeEach(() => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = mockManager; // Admin access
        next();
      });
    });

    it('should return leave statistics', async () => {
      const mockStats = {
        totalRequests: 150,
        pendingRequests: 12,
        approvedRequests: 120,
        rejectedRequests: 18,
        averageProcessingTime: 2.5,
        topLeaveTypes: [
          { type: 'vacation', count: 80 },
          { type: 'sick', count: 45 },
          { type: 'personal', count: 25 },
        ],
      };

      // Mock multiple stat queries
      mockedDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 150 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 12 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 120 }]),
          }),
        });

      const response = await request(app).get('/leave/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalRequests');
      expect(response.body).toHaveProperty('pendingRequests');
    });

    it('should require admin access', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        req.user = mockUser; // Regular user
        next();
      });

      const response = await request(app).get('/leave/stats');

      expect(response.status).toBe(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const response = await request(app).get('/leave/requests');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should validate request ID format', async () => {
      const response = await request(app).get('/leave/requests/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid request ID format');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/leave/requests')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Authorization', () => {
    it('should require authentication for all routes', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const response = await request(app).get('/leave/requests');

      expect(response.status).toBe(401);
    });

    it('should enforce organization boundaries', async () => {
      const crossOrgRequest = {
        id: 1,
        organizationId: 2, // Different organization
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([crossOrgRequest]),
          }),
        }),
      });

      const response = await request(app).get('/leave/requests/1');

      expect(response.status).toBe(403);
    });
  });

  describe('Data Validation', () => {
    it('should sanitize input data', async () => {
      const maliciousData = {
        type: 'vacation',
        startDate: '2025-08-01',
        endDate: '2025-08-05',
        reason: '<script>alert("xss")</script>Vacation',
        description: 'Clean description',
      };

      const sanitizedRequest = {
        reason: 'Vacation', // Script tags removed
        description: 'Clean description',
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([sanitizedRequest]),
        }),
      });

      const response = await request(app)
        .post('/leave/requests')
        .send(maliciousData);

      expect(response.status).toBe(201);
      expect(response.body.reason).not.toContain('<script>');
    });

    it('should validate date formats', async () => {
      const invalidData = {
        type: 'vacation',
        startDate: 'invalid-date',
        endDate: '2025-08-05',
        reason: 'Test',
      };

      const response = await request(app)
        .post('/leave/requests')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid date format');
    });

    it('should enforce maximum description length', async () => {
      const longData = {
        type: 'vacation',
        startDate: '2025-08-01',
        endDate: '2025-08-05',
        reason: 'Test',
        description: 'x'.repeat(1001), // Too long
      };

      const response = await request(app)
        .post('/leave/requests')
        .send(longData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Description too long');
    });
  });
});