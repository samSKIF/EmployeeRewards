import { Router } from 'express';
import { db } from '../db';
import {
  leaveTypes,
  leaveEntitlements,
  leaveRequests,
  leaveAdjustments,
  holidays,
  leavePolicies,
  users,
  insertLeaveTypeSchema,
  insertLeaveEntitlementSchema,
  insertLeaveRequestSchema,
  insertLeaveAdjustmentSchema,
  insertHolidaySchema,
  insertLeavePolicySchema,
} from '@shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import {
  verifyToken,
  verifyAdmin,
  AuthenticatedRequest,
} from '../middleware/auth';

const router = Router();

// Leave Types API endpoints
// Get all leave types for organization
router.get('/types', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { organizationId } = req.user;
    const types = await db.query.leaveTypes.findMany({
      where: eq(leaveTypes.organizationId, organizationId),
      orderBy: [leaveTypes.name],
    });
    res.json(types);
  } catch (error) {
    console.error('Error fetching leave types:', error);
    res.status(500).json({ error: 'Failed to fetch leave types' });
  }
});

// Create a new leave type
router.post(
  '/types',
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { organizationId, id: userId } = req.user;
      const validatedData = insertLeaveTypeSchema.parse({
        ...req.body,
        organizationId,
        createdBy: userId,
      });

      const [leaveType] = await db
        .insert(leaveTypes)
        .values(validatedData)
        .returning();
      res.status(201).json(leaveType);
    } catch (error) {
      console.error('Error creating leave type:', error);
      res.status(500).json({ error: 'Failed to create leave type' });
    }
  }
);

// Update a leave type
router.patch(
  '/types/:id',
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { organizationId } = req.user;

      // First check if leave type exists and belongs to user's organization
      const existingType = await db.query.leaveTypes.findFirst({
        where: and(
          eq(leaveTypes.id, parseInt(id)),
          eq(leaveTypes.organizationId, organizationId)
        ),
      });

      if (!existingType) {
        return res.status(404).json({ error: 'Leave type not found' });
      }

      // Update the leave type
      const [updatedType] = await db
        .update(leaveTypes)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(leaveTypes.id, parseInt(id)))
        .returning();

      res.json(updatedType);
    } catch (error) {
      console.error('Error updating leave type:', error);
      res.status(500).json({ error: 'Failed to update leave type' });
    }
  }
);

// Leave Entitlements API endpoints
// Get all leave entitlements for a user
router.get(
  '/entitlements',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id: userId } = req.user;

      const entitlements = await db.query.leaveEntitlements.findMany({
        where: eq(leaveEntitlements.userId, userId),
        with: {
          leaveType: true,
        },
      });

      res.json(entitlements);
    } catch (error) {
      console.error('Error fetching leave entitlements:', error);
      res.status(500).json({ error: 'Failed to fetch leave entitlements' });
    }
  }
);

// Create a new leave entitlement
router.post(
  '/entitlements',
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id: adminId } = req.user;
      const validatedData = insertLeaveEntitlementSchema.parse({
        ...req.body,
        createdBy: adminId,
      });

      const [entitlement] = await db
        .insert(leaveEntitlements)
        .values(validatedData)
        .returning();
      res.status(201).json(entitlement);
    } catch (error) {
      console.error('Error creating leave entitlement:', error);
      res.status(500).json({ error: 'Failed to create leave entitlement' });
    }
  }
);

// Leave Requests API endpoints
// Get all leave requests for a user
router.get('/requests', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id: userId } = req.user;

    const requests = await db.query.leaveRequests.findMany({
      where: eq(leaveRequests.userId, userId),
      with: {
        leaveType: true,
        approver: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [desc(leaveRequests.createdAt)],
    });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// Get leave requests for approval (for managers)
router.get(
  '/requests/pending-approval',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id: managerId } = req.user;

      const pendingRequests = await db.query.leaveRequests.findMany({
        where: and(
          eq(leaveRequests.approverId, managerId),
          eq(leaveRequests.status, 'PENDING')
        ),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          leaveType: true,
        },
        orderBy: [desc(leaveRequests.createdAt)],
      });

      res.json(pendingRequests);
    } catch (error) {
      console.error('Error fetching pending leave requests:', error);
      res.status(500).json({ error: 'Failed to fetch pending leave requests' });
    }
  }
);

// Submit a new leave request
router.post(
  '/requests',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id: userId } = req.user;

      // Calculate total days based on start and end date
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);

      // Simple day calculation (will be refined with business days logic later)
      const timeDiff = endDate.getTime() - startDate.getTime();
      const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      // Apply half day adjustments
      let totalDays = dayDiff;
      if (req.body.startHalfDay) totalDays -= 0.5;
      if (req.body.endHalfDay) totalDays -= 0.5;

      const validatedData = insertLeaveRequestSchema.parse({
        ...req.body,
        userId,
        totalDays,
        status: 'PENDING',
        createdAt: new Date(),
      });

      const [leaveRequest] = await db
        .insert(leaveRequests)
        .values(validatedData)
        .returning();

      res.status(201).json(leaveRequest);
    } catch (error) {
      console.error('Error creating leave request:', error);
      res.status(500).json({ error: 'Failed to create leave request' });
    }
  }
);

// Approve or reject a leave request
router.patch(
  '/requests/:id/status',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { id: approverId } = req.user;
      const { status, rejectionReason } = req.body;

      if (status !== 'APPROVED' && status !== 'REJECTED') {
        return res
          .status(400)
          .json({ error: "Invalid status. Must be 'APPROVED' or 'REJECTED'" });
      }

      // Check if the request exists and user is the designated approver
      const leaveRequest = await db.query.leaveRequests.findFirst({
        where: and(
          eq(leaveRequests.id, parseInt(id)),
          eq(leaveRequests.approverId, approverId)
        ),
      });

      if (!leaveRequest) {
        return res
          .status(404)
          .json({
            error:
              "Leave request not found or you're not authorized to approve it",
          });
      }

      // Update request status
      const [updatedRequest] = await db
        .update(leaveRequests)
        .set({
          status,
          approvedAt: status === 'APPROVED' ? new Date() : null,
          rejectionReason: status === 'REJECTED' ? rejectionReason : null,
          updatedAt: new Date(),
        })
        .where(eq(leaveRequests.id, parseInt(id)))
        .returning();

      // If approved, update the leave entitlement balance
      if (status === 'APPROVED') {
        const entitlement = await db.query.leaveEntitlements.findFirst({
          where: and(
            eq(leaveEntitlements.userId, leaveRequest.userId),
            eq(leaveEntitlements.leaveTypeId, leaveRequest.leaveTypeId)
          ),
        });

        if (entitlement) {
          await db
            .update(leaveEntitlements)
            .set({
              usedDays: entitlement.usedDays + leaveRequest.totalDays,
            })
            .where(eq(leaveEntitlements.id, entitlement.id));
        }
      }

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error updating leave request status:', error);
      res.status(500).json({ error: 'Failed to update leave request status' });
    }
  }
);

// Cancel a leave request
router.patch(
  '/requests/:id/cancel',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;
      const { cancellationReason } = req.body;

      // Check if the request exists and belongs to the user
      const leaveRequest = await db.query.leaveRequests.findFirst({
        where: and(
          eq(leaveRequests.id, parseInt(id)),
          eq(leaveRequests.userId, userId)
        ),
      });

      if (!leaveRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }

      // Only pending or approved requests can be cancelled
      if (
        leaveRequest.status !== 'PENDING' &&
        leaveRequest.status !== 'APPROVED'
      ) {
        return res
          .status(400)
          .json({
            error: 'Only pending or approved requests can be cancelled',
          });
      }

      // If it was approved, restore the leave entitlement balance
      if (leaveRequest.status === 'APPROVED') {
        const entitlement = await db.query.leaveEntitlements.findFirst({
          where: and(
            eq(leaveEntitlements.userId, userId),
            eq(leaveEntitlements.leaveTypeId, leaveRequest.leaveTypeId)
          ),
        });

        if (entitlement) {
          await db
            .update(leaveEntitlements)
            .set({
              usedDays: entitlement.usedDays - leaveRequest.totalDays,
            })
            .where(eq(leaveEntitlements.id, entitlement.id));
        }
      }

      // Update request status to CANCELLED
      const [updatedRequest] = await db
        .update(leaveRequests)
        .set({
          status: 'CANCELLED',
          cancellationReason,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leaveRequests.id, parseInt(id)))
        .returning();

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      res.status(500).json({ error: 'Failed to cancel leave request' });
    }
  }
);

// Holidays API endpoints
// Get all holidays for an organization
router.get('/holidays', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { organizationId } = req.user;
    const { country } = req.query;

    let query = eq(holidays.organizationId, organizationId);

    // If country is specified, filter by that country or global holidays
    if (country) {
      query = and(
        eq(holidays.organizationId, organizationId),
        sql`(${holidays.country} = ${country as string} OR ${holidays.country} = 'Global')`
      );
    }

    const allHolidays = await db.query.holidays.findMany({
      where: query,
      orderBy: [holidays.date],
    });

    res.json(allHolidays);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// Create a new holiday
router.post(
  '/holidays',
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { organizationId, id: userId } = req.user;
      const validatedData = insertHolidaySchema.parse({
        ...req.body,
        organizationId,
        createdBy: userId,
      });

      const [holiday] = await db
        .insert(holidays)
        .values(validatedData)
        .returning();
      res.status(201).json(holiday);
    } catch (error) {
      console.error('Error creating holiday:', error);
      res.status(500).json({ error: 'Failed to create holiday' });
    }
  }
);

// Leave Adjustments API endpoints
// Create a leave adjustment
router.post(
  '/adjustments',
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id: performerId } = req.user;
      const validatedData = insertLeaveAdjustmentSchema.parse({
        ...req.body,
        performedBy: performerId,
      });

      // Create the adjustment
      const [adjustment] = await db
        .insert(leaveAdjustments)
        .values(validatedData)
        .returning();

      // Update the leave entitlement balance
      const entitlement = await db.query.leaveEntitlements.findFirst({
        where: eq(leaveEntitlements.id, validatedData.entitlementId),
      });

      if (entitlement) {
        // Add the adjustment (can be positive or negative)
        const newAdjustedDays =
          (entitlement.adjustedDays || 0) + validatedData.adjustmentDays;

        await db
          .update(leaveEntitlements)
          .set({
            adjustedDays: newAdjustedDays,
            // Update remaining days
            remainingDays:
              entitlement.totalDays - entitlement.usedDays + newAdjustedDays,
          })
          .where(eq(leaveEntitlements.id, entitlement.id));
      }

      res.status(201).json(adjustment);
    } catch (error) {
      console.error('Error creating leave adjustment:', error);
      res.status(500).json({ error: 'Failed to create leave adjustment' });
    }
  }
);

// Leave Policies API endpoints
// Get all leave policies for an organization
router.get('/policies', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { organizationId } = req.user;

    const policies = await db.query.leavePolicies.findMany({
      where: and(
        eq(leavePolicies.organizationId, organizationId),
        eq(leavePolicies.isActive, true)
      ),
      orderBy: [leavePolicies.name],
    });

    res.json(policies);
  } catch (error) {
    console.error('Error fetching leave policies:', error);
    res.status(500).json({ error: 'Failed to fetch leave policies' });
  }
});

// Create a new leave policy
router.post(
  '/policies',
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { organizationId, id: userId } = req.user;
      const validatedData = insertLeavePolicySchema.parse({
        ...req.body,
        organizationId,
        createdBy: userId,
      });

      const [policy] = await db
        .insert(leavePolicies)
        .values(validatedData)
        .returning();
      res.status(201).json(policy);
    } catch (error) {
      console.error('Error creating leave policy:', error);
      res.status(500).json({ error: 'Failed to create leave policy' });
    }
  }
);

// Reports and Analytics endpoints
// Get leave balance report for all employees (admin only)
router.get(
  '/reports/balances',
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { organizationId } = req.user;

      // Get all users in the organization
      const allUsers = await db.query.users.findMany({
        where: eq(users.organizationId, organizationId),
        columns: {
          id: true,
          name: true,
          email: true,
        },
      });

      // Get all leave types
      const allLeaveTypes = await db.query.leaveTypes.findMany({
        where: eq(leaveTypes.organizationId, organizationId),
      });

      // For each user, get their leave entitlements
      const report = await Promise.all(
        allUsers.map(async (user) => {
          const entitlements = await db.query.leaveEntitlements.findMany({
            where: eq(leaveEntitlements.userId, user.id),
            with: {
              leaveType: true,
            },
          });

          // Map leave types to balances
          const leaveBalances = allLeaveTypes.map((type) => {
            const entitlement = entitlements.find(
              (e) => e.leaveTypeId === type.id
            );
            return {
              leaveTypeId: type.id,
              leaveTypeName: type.name,
              totalDays: entitlement?.totalDays || 0,
              usedDays: entitlement?.usedDays || 0,
              adjustedDays: entitlement?.adjustedDays || 0,
              remainingDays: entitlement?.remainingDays || 0,
            };
          });

          return {
            userId: user.id,
            name: user.name,
            email: user.email,
            leaveBalances,
          };
        })
      );

      res.json(report);
    } catch (error) {
      console.error('Error generating leave balance report:', error);
      res
        .status(500)
        .json({ error: 'Failed to generate leave balance report' });
    }
  }
);

// Get leave calendar (all approved leave requests for a date range)
router.get('/calendar', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { organizationId } = req.user;
    const { startDate, endDate, country } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: 'Start date and end date are required' });
    }

    // Get all approved leave requests in the date range
    const leaveEvents = await db.query.leaveRequests.findMany({
      where: and(
        eq(leaveRequests.status, 'APPROVED'),
        sql`${leaveRequests.startDate} >= ${startDate as string}`,
        sql`${leaveRequests.endDate} <= ${endDate as string}`
      ),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            organizationId: true,
          },
        },
        leaveType: true,
      },
    });

    // Filter to only include users from the same organization
    const filteredEvents = leaveEvents.filter(
      (event) => event.user?.organizationId === organizationId
    );

    // Build base holiday query conditions
    const holidayConditions = [
      eq(holidays.organizationId, organizationId),
      sql`${holidays.date} >= ${startDate as string}`,
      sql`${holidays.date} <= ${endDate as string}`,
    ];

    // If country is specified, filter by that country or include global holidays
    if (country) {
      holidayConditions.push(
        sql`(${holidays.country} = ${country as string} OR ${holidays.country} = 'Global')`
      );
    }

    // Get holidays in the date range
    const holidayEvents = await db.query.holidays.findMany({
      where: and(...holidayConditions),
    });

    // Combine leave requests and holidays into a single calendar
    const calendar = [
      ...filteredEvents.map((event) => ({
        type: 'LEAVE',
        id: event.id,
        title: `${event.user?.name || 'Unknown'} - ${event.leaveType?.name || 'Leave'}`,
        start: event.startDate,
        end: event.endDate,
        userId: event.userId,
        leaveTypeId: event.leaveTypeId,
        color: event.leaveType?.color || '#2196F3',
      })),
      ...holidayEvents.map((holiday) => ({
        type: 'HOLIDAY',
        id: holiday.id,
        title: holiday.name,
        start: holiday.date,
        end: holiday.date,
        description: holiday.description,
        country: holiday.country,
        color: '#FF9800', // Default holiday color
      })),
    ];

    res.json(calendar);
  } catch (error) {
    console.error('Error fetching leave calendar:', error);
    res.status(500).json({ error: 'Failed to fetch leave calendar' });
  }
});

export default router;
