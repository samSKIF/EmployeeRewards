import request from 'supertest';
import express from 'express';
import { db } from '../db';
import {
  leaveTypes,
  leaveEntitlements,
  leaveRequests,
  holidays,
  leavePolicies,
} from '@shared/schema';

// Mock dependencies
jest.mock('../db');
jest.mock('../middleware/auth');

// Import the router after mocking
import leaveRouter from './leave-management';
import { verifyToken, verifyAdmin } from '../middleware/auth';

const mockedDb = db as jest.Mocked<typeof db>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockedVerifyAdmin = verifyAdmin as jest.MockedFunction<typeof verifyAdmin>;

describe('Leave Management API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/leave', leaveRouter);
    jest.clearAllMocks();

    // Mock middleware to add user to request
    mockedVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = {
        id: 1,
        organizationId: 1,
        isAdmin: true,
        email: 'admin@example.com',
      };
      next();
    });

    mockedVerifyAdmin.mockImplementation((req: any, res, next) => {
      if (req.user.isAdmin) {
        next();
      } else {
        res.status(403).json({ message: 'Admin access required' });
      }
    });
  });

  describe('Leave Types', () => {
    const mockLeaveTypes = [
      {
        id: 1,
        name: 'Annual Leave',
        organizationId: 1,
        defaultDays: 25,
        carryOver: true,
        maxCarryOver: 5,
      },
      {
        id: 2,
        name: 'Sick Leave',
        organizationId: 1,
        defaultDays: 10,
        carryOver: false,
        maxCarryOver: 0,
      },
    ];

    describe('GET /leave/types', () => {
      it('should return leave types for organization', async () => {
        mockedDb.query = {
          leaveTypes: {
            findMany: jest.fn().mockResolvedValue(mockLeaveTypes),
          },
        } as any;

        const response = await request(app).get('/leave/types');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockLeaveTypes);
      });

      it('should handle database errors', async () => {
        mockedDb.query = {
          leaveTypes: {
            findMany: jest.fn().mockRejectedValue(new Error('Database error')),
          },
        } as any;

        const response = await request(app).get('/leave/types');

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Failed to fetch leave types');
      });
    });

    describe('POST /leave/types', () => {
      it('should create new leave type successfully', async () => {
        const newLeaveType = {
          name: 'Maternity Leave',
          defaultDays: 90,
          carryOver: false,
          maxCarryOver: 0,
        };

        mockedDb.insert = jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 3,
              ...newLeaveType,
              organizationId: 1,
              createdBy: 1,
            }]),
          }),
        });

        const response = await request(app)
          .post('/leave/types')
          .send(newLeaveType);

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(newLeaveType.name);
      });

      it('should validate input data', async () => {
        const invalidData = {
          name: '', // Empty name should fail validation
          defaultDays: -5, // Negative days should fail
        };

        const response = await request(app)
          .post('/leave/types')
          .send(invalidData);

        expect(response.status).toBe(500); // Zod validation error
      });
    });

    describe('PATCH /leave/types/:id', () => {
      it('should update leave type successfully', async () => {
        const updateData = { name: 'Updated Annual Leave', defaultDays: 30 };

        mockedDb.update = jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{
                id: 1,
                ...updateData,
                organizationId: 1,
              }]),
            }),
          }),
        });

        const response = await request(app)
          .patch('/leave/types/1')
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.name).toBe(updateData.name);
      });

      it('should handle non-existent leave type', async () => {
        mockedDb.update = jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

        const response = await request(app)
          .patch('/leave/types/999')
          .send({ name: 'Updated Name' });

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /leave/types/:id', () => {
      it('should delete leave type successfully', async () => {
        mockedDb.delete = jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 1 }]),
          }),
        });

        const response = await request(app).delete('/leave/types/1');

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Leave type deleted successfully');
      });
    });
  });

  describe('Leave Requests', () => {
    const mockLeaveRequests = [
      {
        id: 1,
        userId: 2,
        leaveTypeId: 1,
        startDate: '2025-08-01',
        endDate: '2025-08-05',
        reason: 'Family vacation',
        status: 'pending',
        organizationId: 1,
      },
    ];

    describe('GET /leave/requests', () => {
      it('should return leave requests for organization', async () => {
        mockedDb.query = {
          leaveRequests: {
            findMany: jest.fn().mockResolvedValue(mockLeaveRequests),
          },
        } as any;

        const response = await request(app).get('/leave/requests');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockLeaveRequests);
      });
    });

    describe('POST /leave/requests', () => {
      it('should create leave request successfully', async () => {
        const newRequest = {
          leaveTypeId: 1,
          startDate: '2025-09-01',
          endDate: '2025-09-03',
          reason: 'Personal leave',
        };

        mockedDb.insert = jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 2,
              ...newRequest,
              userId: 1,
              organizationId: 1,
              status: 'pending',
            }]),
          }),
        });

        const response = await request(app)
          .post('/leave/requests')
          .send(newRequest);

        expect(response.status).toBe(201);
        expect(response.body.reason).toBe(newRequest.reason);
      });
    });

    describe('PATCH /leave/requests/:id/status', () => {
      it('should approve leave request', async () => {
        mockedDb.update = jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{
                id: 1,
                status: 'approved',
                approvedBy: 1,
                approvedAt: new Date(),
              }]),
            }),
          }),
        });

        const response = await request(app)
          .patch('/leave/requests/1/status')
          .send({ status: 'approved' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('approved');
      });

      it('should reject leave request', async () => {
        mockedDb.update = jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{
                id: 1,
                status: 'rejected',
                rejectedBy: 1,
                rejectedAt: new Date(),
                rejectionReason: 'Insufficient leave balance',
              }]),
            }),
          }),
        });

        const response = await request(app)
          .patch('/leave/requests/1/status')
          .send({
            status: 'rejected',
            rejectionReason: 'Insufficient leave balance',
          });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('rejected');
      });
    });
  });

  describe('Holidays', () => {
    const mockHolidays = [
      {
        id: 1,
        name: 'New Year Day',
        date: '2025-01-01',
        organizationId: 1,
        isRecurring: true,
      },
      {
        id: 2,
        name: 'Christmas Day',
        date: '2025-12-25',
        organizationId: 1,
        isRecurring: true,
      },
    ];

    describe('GET /leave/holidays', () => {
      it('should return holidays for organization', async () => {
        mockedDb.query = {
          holidays: {
            findMany: jest.fn().mockResolvedValue(mockHolidays),
          },
        } as any;

        const response = await request(app).get('/leave/holidays');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockHolidays);
      });
    });

    describe('POST /leave/holidays', () => {
      it('should create holiday successfully', async () => {
        const newHoliday = {
          name: 'Independence Day',
          date: '2025-07-04',
          isRecurring: true,
        };

        mockedDb.insert = jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 3,
              ...newHoliday,
              organizationId: 1,
              createdBy: 1,
            }]),
          }),
        });

        const response = await request(app)
          .post('/leave/holidays')
          .send(newHoliday);

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(newHoliday.name);
      });
    });
  });

  describe('Leave Entitlements', () => {
    describe('GET /leave/entitlements', () => {
      it('should return user leave entitlements', async () => {
        const mockEntitlements = [
          {
            id: 1,
            userId: 1,
            leaveTypeId: 1,
            entitledDays: 25,
            usedDays: 5,
            remainingDays: 20,
            year: 2025,
          },
        ];

        mockedDb.query = {
          leaveEntitlements: {
            findMany: jest.fn().mockResolvedValue(mockEntitlements),
          },
        } as any;

        const response = await request(app).get('/leave/entitlements');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockEntitlements);
      });
    });
  });

  describe('Admin Access Control', () => {
    it('should deny non-admin access to admin endpoints', async () => {
      mockedVerifyAdmin.mockImplementation((req: any, res, next) => {
        res.status(403).json({ message: 'Admin access required' });
      });

      const response = await request(app)
        .post('/leave/types')
        .send({ name: 'Test Leave' });

      expect(response.status).toBe(403);
    });
  });
});