// Leave Management API Routes
// Defines all HTTP routes for leave management operations

import { Router } from 'express';
import { verifyToken, verifyAdmin } from '../../../middleware/auth';
import {
  LeaveTypesController,
  LeaveRequestsController,
  LeaveEntitlementsController,
  LeavePoliciesController,
  HolidaysController,
} from './leave.controller';

const router = Router();

/**
 * Leave Types Routes
 * /api/leave/types/*
 */

// Get all leave types for organization
router.get('/types', verifyToken, LeaveTypesController.getLeaveTypes);

// Create new leave type (admin only)
router.post('/types', verifyToken, verifyAdmin, LeaveTypesController.createLeaveType);

// Update leave type (admin only)
router.patch('/types/:id', verifyToken, verifyAdmin, LeaveTypesController.updateLeaveType);

// Delete leave type (admin only)
router.delete('/types/:id', verifyToken, verifyAdmin, LeaveTypesController.deleteLeaveType);

/**
 * Leave Requests Routes
 * /api/leave/requests/*
 */

// Get user's leave requests
router.get('/requests/my', verifyToken, LeaveRequestsController.getUserLeaveRequests);

// Get all leave requests for organization (admin only)
router.get('/requests/organization', verifyToken, verifyAdmin, LeaveRequestsController.getOrganizationLeaveRequests);

// Submit new leave request
router.post('/requests', verifyToken, LeaveRequestsController.submitLeaveRequest);

// Update leave request status (approve/reject/cancel)
router.patch('/requests/:id/status', verifyToken, LeaveRequestsController.updateLeaveRequestStatus);

/**
 * Leave Entitlements Routes
 * /api/leave/entitlements/*
 */

// Get user's leave entitlements
router.get('/entitlements/my', verifyToken, LeaveEntitlementsController.getUserLeaveEntitlements);

// Create leave entitlement (admin only)
router.post('/entitlements', verifyToken, verifyAdmin, LeaveEntitlementsController.createLeaveEntitlement);

/**
 * Leave Policies Routes
 * /api/leave/policies/*
 */

// Get organization leave policies
router.get('/policies', verifyToken, LeavePoliciesController.getLeavePolicies);

/**
 * Holidays Routes
 * /api/leave/holidays/*
 */

// Get organization holidays
router.get('/holidays', verifyToken, HolidaysController.getHolidays);

export default router;