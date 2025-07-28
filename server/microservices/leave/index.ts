/**
 * Leave Management Microservice
 * Handles all leave-related operations including leave types, leave requests, and leave balances
 */
import { db, pool } from '../../db';
import express, { Request, Response } from 'express';
import {
  verifyToken,
  verifyAdmin,
  AuthenticatedRequest,
} from '../../middleware/auth';
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

// Define extended interface for authenticated request user
// Extended AuthenticatedRequest type with proper user fields
interface LeaveManagementAuthRequest
  extends Omit<AuthenticatedRequest, 'user'> {
  user: {
    id: number;
    username: string;
    name: string;
    surname: string | null;
    email: string;
    organizationId: number;
    isAdmin: boolean;
    roleType: string;
    phoneNumber?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    [key: string]: any;
  };
}

const router = express.Router();

/**
 * Leave Types API endpoints
 */

// Get all leave types for organization
router.get(
  '/types',
  verifyToken,
  async (req: LeaveManagementAuthRequest, res) => {
    try {
      console.log('Leave microservice: Handling get leave types request');
      const { organizationId } = req.user;
      // Mark request as handled by microservice to prevent duplicate processing
      (req as any)._routeHandledByMicroservice = true;

      const types = await db.query.leaveTypes.findMany({
        where: eq(leaveTypes.organization_id, organizationId),
        orderBy: [leaveTypes.name],
      });

      console.log('Leave microservice: Retrieved', types.length, 'leave types');
      res.json(types);
    } catch (error) {
      console.error('Leave microservice: Error fetching leave types:', error);
      res.status(500).json({ error: 'Failed to fetch leave types' });
    }
  }
);

// Create a new leave type
router.post(
  '/types',
  verifyToken,
  verifyAdmin,
  async (req: LeaveManagementAuthRequest, res) => {
    try {
      console.log('Leave microservice: Handling create leave type request');
      // Mark request as handled by microservice to prevent duplicate processing
      (req as any)._routeHandledByMicroservice = true;

      const { organizationId, id: user_id } = req.user;
      const validatedData = insertLeaveTypeSchema.parse({
        ...req.body,
        organizationId,
        createdBy: user_id,
      });

      const [leaveType] = await db
        .insert(leaveTypes)
        .values(validatedData)
        .returning();

      console.log(
        'Leave microservice: Leave type created successfully:',
        leaveType.id
      );
      res.status(201).json(leaveType);
    } catch (error) {
      console.error('Leave microservice: Error creating leave type:', error);
      res.status(500).json({ error: 'Failed to create leave type' });
    }
  }
);

// Update a leave type
router.patch(
  '/types/:id',
  verifyToken,
  verifyAdmin,
  async (req: LeaveManagementAuthRequest, res) => {
    try {
      console.log('Leave microservice: Handling update leave type request');
      // Mark request as handled by microservice to prevent duplicate processing
      (req as any)._routeHandledByMicroservice = true;

      const { id } = req.params;
      const { organizationId } = req.user;
      const typeId = parseInt(id);

      // Verify the leave type belongs to the user's organization
      const [existingType] = await db
        .select()
        .from(leaveTypes)
        .where(
          and(
            eq(leaveTypes.id, typeId),
            eq(leaveTypes.organization_id, organizationId)
          )
        );

      if (!existingType) {
        return res.status(404).json({ error: 'Leave type not found' });
      }

      const [updatedType] = await db
        .update(leaveTypes)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(leaveTypes.id, typeId))
        .returning();

      console.log(
        'Leave microservice: Leave type updated successfully:',
        updatedType.id
      );
      res.json(updatedType);
    } catch (error) {
      console.error('Leave microservice: Error updating leave type:', error);
      res.status(500).json({ error: 'Failed to update leave type' });
    }
  }
);

// Delete a leave type
router.delete(
  '/types/:id',
  verifyToken,
  verifyAdmin,
  async (req: LeaveManagementAuthRequest, res) => {
    try {
      console.log('Leave microservice: Handling delete leave type request');
      // Mark request as handled by microservice to prevent duplicate processing
      (req as any)._routeHandledByMicroservice = true;

      const { id } = req.params;
      const { organizationId } = req.user;
      const typeId = parseInt(id);

      // Verify the leave type belongs to the user's organization
      const [existingType] = await db
        .select()
        .from(leaveTypes)
        .where(
          and(
            eq(leaveTypes.id, typeId),
            eq(leaveTypes.organization_id, organizationId)
          )
        );

      if (!existingType) {
        return res.status(404).json({ error: 'Leave type not found' });
      }

      // Check if the leave type is in use
      const entitlements = await db
        .select({ count: sql<number>`count(*)` })
        .from(leaveEntitlements)
        .where(eq(leaveEntitlements.leaveTypeId, typeId));

      if (entitlements[0].count > 0) {
        return res
          .status(400)
          .json({ error: 'Leave type is in use and cannot be deleted' });
      }

      await db.delete(leaveTypes).where(eq(leaveTypes.id, typeId));

      console.log(
        'Leave microservice: Leave type deleted successfully:',
        typeId
      );
      res.status(204).send();
    } catch (error) {
      console.error('Leave microservice: Error deleting leave type:', error);
      res.status(500).json({ error: 'Failed to delete leave type' });
    }
  }
);

/**
 * Leave Requests API endpoints
 */

// Get all leave requests for a user
router.get(
  '/requests',
  verifyToken,
  async (req: LeaveManagementAuthRequest, res) => {
    try {
      console.log('Leave microservice: Handling get leave requests request');
      // Mark request as handled by microservice to prevent duplicate processing
      (req as any)._routeHandledByMicroservice = true;

      const { id: user_id } = req.user;

      // Get all leave requests for the user
      const requests = await db.query.leaveRequests.findMany({
        where: eq(leaveRequests.user_id, user_id),
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
        orderBy: [desc(leaveRequests.created_at)],
      });

      console.log(
        'Leave microservice: Retrieved',
        requests.length,
        'leave requests'
      );
      res.json(requests);
    } catch (error) {
      console.error(
        'Leave microservice: Error fetching leave requests:',
        error
      );
      res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
  }
);

// Create a new leave request
router.post(
  '/requests',
  verifyToken,
  async (req: LeaveManagementAuthRequest, res) => {
    try {
      console.log('Leave microservice: Handling create leave request');
      // Mark request as handled by microservice to prevent duplicate processing
      (req as any)._routeHandledByMicroservice = true;

      const { id: user_id, organizationId } = req.user;

      // Validate the request data
      const validatedData = insertLeaveRequestSchema.parse({
        ...req.body,
        user_id,
        status: 'PENDING',
      });

      // Verify the leave type belongs to the user's organization
      const [leaveType] = await db
        .select()
        .from(leaveTypes)
        .where(
          and(
            eq(leaveTypes.id, validatedData.leaveTypeId),
            eq(leaveTypes.organization_id, organizationId)
          )
        );

      if (!leaveType) {
        return res.status(404).json({ error: 'Leave type not found' });
      }

      // Create the leave request
      const [request] = await db
        .insert(leaveRequests)
        .values(validatedData)
        .returning();

      console.log(
        'Leave microservice: Leave request created successfully:',
        request.id
      );

      // Fetch the complete request with relations
      const completeRequest = await db.query.leaveRequests.findFirst({
        where: eq(leaveRequests.id, request.id),
        with: {
          leaveType: true,
          approver: true,
        },
      });

      res.status(201).json(completeRequest);
    } catch (error) {
      console.error('Leave microservice: Error creating leave request:', error);
      res.status(500).json({ error: 'Failed to create leave request' });
    }
  }
);

// Update a leave request status (approve/reject)
router.patch(
  '/requests/:id',
  verifyToken,
  async (req: LeaveManagementAuthRequest, res) => {
    try {
      console.log('Leave microservice: Handling update leave request status');
      // Mark request as handled by microservice to prevent duplicate processing
      (req as any)._routeHandledByMicroservice = true;

      const { id } = req.params;
      const { id: user_id, isAdmin } = req.user;
      const requestId = parseInt(id);

      // Get the request
      const [request] = await db
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.id, requestId));

      if (!request) {
        return res.status(404).json({ error: 'Leave request not found' });
      }

      // Check if user is authorized to update the request
      // (either the approver, an admin, or the requester canceling their own request)
      if (
        request.approverId !== user_id &&
        !isAdmin &&
        !(request.user_id === user_id && req.body.status === 'CANCELLED')
      ) {
        return res
          .status(403)
          .json({ error: 'Not authorized to update this request' });
      }

      // Update the request
      const [updatedRequest] = await db
        .update(leaveRequests)
        .set({
          ...req.body,
          approvedAt:
            req.body.status === 'APPROVED' ? new Date() : request.approvedAt,
        })
        .where(eq(leaveRequests.id, requestId))
        .returning();

      console.log(
        'Leave microservice: Leave request updated successfully:',
        updatedRequest.id
      );

      // Fetch the complete updated request with relations
      const completeRequest = await db.query.leaveRequests.findFirst({
        where: eq(leaveRequests.id, updatedRequest.id),
        with: {
          leaveType: true,
          approver: true,
        },
      });

      res.json(completeRequest);
    } catch (error) {
      console.error('Leave microservice: Error updating leave request:', error);
      res.status(500).json({ error: 'Failed to update leave request' });
    }
  }
);

/**
 * Leave Policies API endpoints
 */

// Get all leave policies for organization
router.get(
  '/policies',
  verifyToken,
  verifyAdmin,
  async (req: LeaveManagementAuthRequest, res) => {
    try {
      console.log('Leave microservice: Handling get leave policies request');
      // Mark request as handled by microservice to prevent duplicate processing
      (req as any)._routeHandledByMicroservice = true;

      const { organizationId } = req.user;

      const policies = await db.query.leavePolicies.findMany({
        where: eq(leavePolicies.organization_id, organizationId),
        orderBy: [desc(leavePolicies.created_at)],
      });

      console.log(
        'Leave microservice: Retrieved',
        policies.length,
        'leave policies'
      );
      res.json(policies);
    } catch (error) {
      console.error(
        'Leave microservice: Error fetching leave policies:',
        error
      );
      res.status(500).json({ error: 'Failed to fetch leave policies' });
    }
  }
);

// Create or update leave policy
router.post(
  '/policies',
  verifyToken,
  verifyAdmin,
  async (req: LeaveManagementAuthRequest, res) => {
    try {
      console.log(
        'Leave microservice: Handling create/update leave policy request'
      );
      // Mark request as handled by microservice to prevent duplicate processing
      (req as any)._routeHandledByMicroservice = true;

      const { organizationId, id: user_id } = req.user;
      const { country } = req.body;

      // Check if policy already exists for this country
      const [existingPolicy] = await db
        .select()
        .from(leavePolicies)
        .where(
          and(
            eq(leavePolicies.organization_id, organizationId),
            eq(leavePolicies.country, country)
          )
        );

      let result;

      // If policy exists, update it
      if (existingPolicy) {
        const [updatedPolicy] = await db
          .update(leavePolicies)
          .set({
            ...req.body,
            updatedAt: new Date(),
            updatedBy: user_id,
          })
          .where(
            and(
              eq(leavePolicies.organization_id, organizationId),
              eq(leavePolicies.country, country)
            )
          )
          .returning();

        result = updatedPolicy;
        console.log(
          'Leave microservice: Leave policy updated successfully:',
          result.id
        );
      }
      // Otherwise, create a new policy
      else {
        const validatedData = insertLeavePolicySchema.parse({
          ...req.body,
          organizationId,
          createdBy: user_id,
        });

        const [newPolicy] = await db
          .insert(leavePolicies)
          .values(validatedData)
          .returning();

        result = newPolicy;
        console.log(
          'Leave microservice: Leave policy created successfully:',
          result.id
        );
      }

      res.status(existingPolicy ? 200 : 201).json(result);
    } catch (error) {
      console.error(
        'Leave microservice: Error creating/updating leave policy:',
        error
      );
      res.status(500).json({ error: 'Failed to create/update leave policy' });
    }
  }
);

/**
 * Holidays API endpoints
 */

// Get holidays for organization and country
router.get(
  '/holidays',
  verifyToken,
  async (req: LeaveManagementAuthRequest, res) => {
    try {
      console.log('Leave microservice: Handling get holidays request');
      // Mark request as handled by microservice to prevent duplicate processing
      (req as any)._routeHandledByMicroservice = true;

      const { organizationId } = req.user;
      const { country, year } = req.query;

      // Build the query
      let queryBuilder = db
        .select()
        .from(holidays)
        .where(eq(holidays.organization_id, organizationId));

      // Add country filter if provided
      if (country) {
        queryBuilder = queryBuilder.where(
          eq(holidays.country, country as string)
        );
      }

      // Add year filter if provided
      if (year) {
        const yearStart = new Date(`${year}-01-01`);
        const yearEnd = new Date(`${year}-12-31`);

        queryBuilder = queryBuilder.where(
          and(gte(holidays.date, yearStart), lte(holidays.date, yearEnd))
        );
      }

      // Execute the query with ordering
      const result = await queryBuilder.orderBy(holidays.date);

      console.log('Leave microservice: Retrieved', result.length, 'holidays');
      res.json(result);
    } catch (error) {
      console.error('Leave microservice: Error fetching holidays:', error);
      res.status(500).json({ error: 'Failed to fetch holidays' });
    }
  }
);

// Create a new holiday
router.post(
  '/holidays',
  verifyToken,
  verifyAdmin,
  async (req: LeaveManagementAuthRequest, res) => {
    try {
      console.log('Leave microservice: Handling create holiday request');
      // Mark request as handled by microservice to prevent duplicate processing
      (req as any)._routeHandledByMicroservice = true;

      const { organizationId, id: user_id } = req.user;

      const validatedData = insertHolidaySchema.parse({
        ...req.body,
        organizationId,
        createdBy: user_id,
      });

      const [holiday] = await db
        .insert(holidays)
        .values(validatedData)
        .returning();

      console.log(
        'Leave microservice: Holiday created successfully:',
        holiday.id
      );
      res.status(201).json(holiday);
    } catch (error) {
      console.error('Leave microservice: Error creating holiday:', error);
      res.status(500).json({ error: 'Failed to create holiday' });
    }
  }
);

export default router;
