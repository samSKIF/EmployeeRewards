import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import subscriptionRoutes from '../subscriptionRoutes';
import { verifyToken, AuthenticatedRequest } from '../../middleware/auth';
import { db } from '../../db';

// Mock the database and middleware
vi.mock('../../db');
vi.mock('../../middleware/auth');
vi.mock('@shared/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }
}));

const mockDb = vi.mocked(db);
const mockVerifyToken = vi.mocked(verifyToken);

const app = express();
app.use(express.json());
app.use('/api/admin/subscription', subscriptionRoutes);

describe('Subscription Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock verifyToken middleware
    mockVerifyToken.mockImplementation((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      req.user = {
        id: 1,
        organization_id: 1,
        email: 'admin@canva.com',
        name: 'Admin User',
        is_admin: true,
        username: 'admin',
        password: 'hashed',
        status: 'active',
        role_type: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      };
      next();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /usage', () => {
    it('should return subscription usage data successfully', async () => {
      // Mock database responses
      const mockOrgData = {
        organization: {
          id: 1,
          name: 'Canva',
          status: 'active'
        },
        subscription: {
          id: 1,
          subscribed_users: 500,
          status: 'active'
        }
      };

      const mockEmployeeCounts = {
        total_employees: 402,
        active_employees: 401,
        pending_employees: 1,
        inactive_employees: 0,
        terminated_employees: 0
      };

      // Mock drizzle select chain
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrgData])
          })
        })
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockEmployeeCounts])
        })
      });

      mockDb.select.mockReturnValueOnce(mockSelect as any);
      mockDb.select.mockReturnValueOnce(mockEmployeeSelect as any);

      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .expect(200);

      expect(response.body).toEqual({
        subscribed_users: 500,
        current_usage: 401,
        active_employees: 401,
        total_employees: 402,
        pending_employees: 1,
        inactive_employees: 0,
        terminated_employees: 0,
        usage_percentage: 80,
        available_slots: 99,
        subscription_status: 'active',
        organization_name: 'Canva'
      });
    });

    it('should handle missing organization', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([])
          })
        })
      });

      mockDb.select.mockReturnValue(mockSelect as any);

      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .expect(404);

      expect(response.body.message).toBe('Organization not found');
    });

    it('should handle user without organization', async () => {
      mockVerifyToken.mockImplementation((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        req.user = {
          id: 1,
          organization_id: null,
          email: 'user@example.com',
          name: 'User',
          is_admin: false,
          username: 'user',
          password: 'hashed',
          status: 'active',
          role_type: 'employee',
          created_at: new Date(),
          updated_at: new Date()
        };
        next();
      });

      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .expect(400);

      expect(response.body.message).toBe('User not associated with an organization');
    });

    it('should handle unauthorized user', async () => {
      mockVerifyToken.mockImplementation((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .expect(401);

      expect(response.body.message).toBe('Unauthorized');
    });

    it('should handle organization without subscription', async () => {
      const mockOrgData = {
        organization: {
          id: 1,
          name: 'Test Org',
          status: 'active'
        },
        subscription: null
      };

      const mockEmployeeCounts = {
        total_employees: 25,
        active_employees: 24,
        pending_employees: 1,
        inactive_employees: 0,
        terminated_employees: 0
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrgData])
          })
        })
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockEmployeeCounts])
        })
      });

      mockDb.select.mockReturnValueOnce(mockSelect as any);
      mockDb.select.mockReturnValueOnce(mockEmployeeSelect as any);

      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .expect(200);

      expect(response.body).toEqual({
        subscribed_users: 500, // Default fallback
        current_usage: 24,
        active_employees: 24,
        total_employees: 25,
        pending_employees: 1,
        inactive_employees: 0,
        terminated_employees: 0,
        usage_percentage: 5, // 24/500 = 4.8%, rounded to 5%
        available_slots: 476,
        subscription_status: 'inactive',
        organization_name: 'Test Org'
      });
    });

    it('should calculate usage percentage correctly for different scenarios', async () => {
      const testCases = [
        { active: 450, limit: 500, expected: 90 },
        { active: 475, limit: 500, expected: 95 },
        { active: 500, limit: 500, expected: 100 },
        { active: 250, limit: 500, expected: 50 },
        { active: 1, limit: 500, expected: 0 }, // Rounds down
      ];

      for (const testCase of testCases) {
        const mockOrgData = {
          organization: { id: 1, name: 'Test', status: 'active' },
          subscription: { subscribed_users: testCase.limit, status: 'active' }
        };

        const mockEmployeeCounts = {
          total_employees: testCase.active,
          active_employees: testCase.active,
          pending_employees: 0,
          inactive_employees: 0,
          terminated_employees: 0
        };

        const mockSelect = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockOrgData])
            })
          })
        });

        const mockEmployeeSelect = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockEmployeeCounts])
          })
        });

        mockDb.select.mockReturnValueOnce(mockSelect as any);
        mockDb.select.mockReturnValueOnce(mockEmployeeSelect as any);

        const response = await request(app)
          .get('/api/admin/subscription/usage')
          .expect(200);

        expect(response.body.usage_percentage).toBe(testCase.expected);
        expect(response.body.available_slots).toBe(testCase.limit - testCase.active);
      }
    });

    it('should handle database errors gracefully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      });

      mockDb.select.mockReturnValue(mockSelect as any);

      const response = await request(app)
        .get('/api/admin/subscription/usage')
        .expect(500);

      expect(response.body.message).toBe('Database connection failed');
    });
  });
});