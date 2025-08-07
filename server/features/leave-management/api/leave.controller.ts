// Leave Management API Controller
// Handles HTTP requests and responses for leave management operations

import { Request, Response } from 'express';
import { LeaveDomain } from '../domain/leave.domain';
import { LeaveRepository } from '../infrastructure/leave.repository';
import { AuthenticatedRequest } from '../../../middleware/auth';
import { logger } from '@shared/logger';
import type {
  CreateLeaveTypeData,
  CreateLeaveRequestData,
  UpdateLeaveRequestData,
  CreateLeaveEntitlementData,
  CreateLeavePolicyData,
  CreateHolidayData,
} from '../domain/leave.domain';

// Initialize repository
const leaveRepository = new LeaveRepository();

/**
 * Leave Types Controller
 */
export class LeaveTypesController {
  /**
   * Get all leave types for organization
   */
  static async getLeaveTypes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organization_id } = req.user!;
      if (!organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }
      
      const leaveTypes = await leaveRepository.getLeaveTypesByOrganization(organization_id);
      
      logger.info('✅ Leave types retrieved', {
        organization_id,
        count: leaveTypes.length,
        userId: req.user!.id,
      });

      res.json({
        success: true,
        data: leaveTypes,
        message: `Retrieved ${leaveTypes.length} leave types`,
      });
    } catch (error: any) {
      logger.error('❌ Error retrieving leave types', {
        error: error?.message || 'unknown_error',
        organization_id: req.user!.organization_id,
        userId: req.user!.id,
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve leave types',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * Create a new leave type
   */
  static async createLeaveType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organization_id, id: createdBy } = req.user!;
      if (!organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }
      const data: CreateLeaveTypeData = req.body;

      const leaveType = await LeaveDomain.createLeaveType(
        data,
        organization_id,
        createdBy,
        leaveRepository
      );

      logger.info('✅ Leave type created via controller', {
        leaveTypeId: leaveType.id,
        name: leaveType.name,
        organization_id,
        createdBy,
      });

      res.status(201).json({
        success: true,
        data: leaveType,
        message: 'Leave type created successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error creating leave type via controller', {
        error: error?.message || 'unknown_error',
        organization_id: req.user!.organization_id,
        createdBy: req.user!.id,
        data: req.body,
      });

      res.status(400).json({
        success: false,
        error: 'Failed to create leave type',
        message: error?.message || 'Validation failed',
      });
    }
  }

  /**
   * Update a leave type
   */
  static async updateLeaveType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organization_id } = req.user!;
      if (!organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }
      const { id } = req.params;
      const leaveTypeId = parseInt(id);
      const updateData = req.body;

      if (isNaN(leaveTypeId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid leave type ID',
          message: 'Leave type ID must be a valid number',
        });
        return;
      }

      const updatedLeaveType = await leaveRepository.updateLeaveType(
        leaveTypeId,
        updateData,
        organization_id
      );

      if (!updatedLeaveType) {
        res.status(404).json({
          success: false,
          error: 'Leave type not found',
          message: 'Leave type not found or not accessible in your organization',
        });
        return;
      }

      logger.info('✅ Leave type updated via controller', {
        leaveTypeId: updatedLeaveType.id,
        organization_id,
        userId: req.user!.id,
      });

      res.json({
        success: true,
        data: updatedLeaveType,
        message: 'Leave type updated successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error updating leave type via controller', {
        error: error?.message || 'unknown_error',
        leaveTypeId: req.params.id,
        organization_id: req.user!.organization_id,
        userId: req.user!.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update leave type',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * Delete a leave type
   */
  static async deleteLeaveType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organization_id } = req.user!;
      if (!organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }
      const { id } = req.params;
      const leaveTypeId = parseInt(id);

      if (isNaN(leaveTypeId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid leave type ID',
          message: 'Leave type ID must be a valid number',
        });
        return;
      }

      const deleted = await leaveRepository.deleteLeaveType(leaveTypeId, organization_id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Leave type not found or cannot be deleted',
          message: 'Leave type may be in use or not found in your organization',
        });
        return;
      }

      logger.info('✅ Leave type deleted via controller', {
        leaveTypeId,
        organization_id,
        userId: req.user!.id,
      });

      res.status(204).send();
    } catch (error: any) {
      logger.error('❌ Error deleting leave type via controller', {
        error: error?.message || 'unknown_error',
        leaveTypeId: req.params.id,
        organization_id: req.user!.organization_id,
        userId: req.user!.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to delete leave type',
        message: error?.message || 'Internal server error',
      });
    }
  }
}

/**
 * Leave Requests Controller
 */
export class LeaveRequestsController {
  /**
   * Get user's leave requests
   */
  static async getUserLeaveRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId } = req.user!;
      
      const requests = await leaveRepository.getLeaveRequestsByUser(userId);
      
      logger.info('✅ User leave requests retrieved', {
        userId,
        count: requests.length,
      });

      res.json({
        success: true,
        data: requests,
        message: `Retrieved ${requests.length} leave requests`,
      });
    } catch (error: any) {
      logger.error('❌ Error retrieving user leave requests', {
        error: error?.message || 'unknown_error',
        userId: req.user!.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve leave requests',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * Get organization leave requests (admin only)
   */
  static async getOrganizationLeaveRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organization_id } = req.user!;
      if (!organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }
      const filters = req.query;
      
      const requests = await leaveRepository.getLeaveRequestsByOrganization(organization_id, filters);
      
      logger.info('✅ Organization leave requests retrieved', {
        organization_id,
        count: requests.length,
        filters,
        userId: req.user!.id,
      });

      res.json({
        success: true,
        data: requests,
        message: `Retrieved ${requests.length} leave requests`,
      });
    } catch (error: any) {
      logger.error('❌ Error retrieving organization leave requests', {
        error: error?.message || 'unknown_error',
        organization_id: req.user!.organization_id,
        filters: req.query,
        userId: req.user!.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve leave requests',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * Submit a new leave request
   */
  static async submitLeaveRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId, organization_id } = req.user!;
      if (!organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }
      const data: CreateLeaveRequestData = req.body;

      const leaveRequest = await LeaveDomain.submitLeaveRequest(
        data,
        userId,
        organization_id,
        leaveRepository
      );

      logger.info('✅ Leave request submitted via controller', {
        requestId: leaveRequest.id,
        userId,
        organization_id,
        leaveTypeId: leaveRequest.leave_type_id,
        startDate: leaveRequest.start_date.toISOString().split('T')[0],
        endDate: leaveRequest.end_date.toISOString().split('T')[0],
      });

      res.status(201).json({
        success: true,
        data: leaveRequest,
        message: 'Leave request submitted successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error submitting leave request via controller', {
        error: error?.message || 'unknown_error',
        userId: req.user!.id,
        organization_id: req.user!.organization_id,
        data: req.body,
      });

      res.status(400).json({
        success: false,
        error: 'Failed to submit leave request',
        message: error?.message || 'Validation failed',
      });
    }
  }

  /**
   * Update leave request status (approve/reject/cancel)
   */
  static async updateLeaveRequestStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: approverId, organization_id, role_type } = req.user!;
      if (!organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }
      const isAdmin = role_type === 'SUPER_ADMIN' || role_type === 'CORPORATE_ADMIN';
      const { id } = req.params;
      const requestId = parseInt(id);
      const data: UpdateLeaveRequestData = req.body;

      if (isNaN(requestId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid leave request ID',
          message: 'Leave request ID must be a valid number',
        });
        return;
      }

      const updatedRequest = await LeaveDomain.updateLeaveRequestStatus(
        requestId,
        data,
        approverId,
        organization_id,
        isAdmin,
        leaveRepository
      );

      logger.info('✅ Leave request status updated via controller', {
        requestId: updatedRequest.id,
        previousStatus: 'PENDING', // This could be enhanced to track previous status
        newStatus: updatedRequest.status,
        approverId,
        organization_id,
      });

      res.json({
        success: true,
        data: updatedRequest,
        message: 'Leave request status updated successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error updating leave request status via controller', {
        error: error?.message || 'unknown_error',
        requestId: req.params.id,
        approverId: req.user!.id,
        organization_id: req.user!.organization_id,
        data: req.body,
      });

      const statusCode = error?.message?.includes('not found') ? 404 :
                        error?.message?.includes('authorized') ? 403 : 400;

      res.status(statusCode).json({
        success: false,
        error: 'Failed to update leave request status',
        message: error?.message || 'Validation failed',
      });
    }
  }
}

/**
 * Leave Entitlements Controller
 */
export class LeaveEntitlementsController {
  /**
   * Get user's leave entitlements
   */
  static async getUserLeaveEntitlements(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId } = req.user!;
      
      const entitlements = await leaveRepository.getLeaveEntitlementsByUser(userId);
      
      logger.info('✅ User leave entitlements retrieved', {
        userId,
        count: entitlements.length,
      });

      res.json({
        success: true,
        data: entitlements,
        message: `Retrieved ${entitlements.length} leave entitlements`,
      });
    } catch (error: any) {
      logger.error('❌ Error retrieving user leave entitlements', {
        error: error?.message || 'unknown_error',
        userId: req.user!.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve leave entitlements',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * Create leave entitlement (admin only)
   */
  static async createLeaveEntitlement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organization_id, id: createdBy } = req.user!;
      if (!organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }
      const data: CreateLeaveEntitlementData = req.body;

      const entitlement = await LeaveDomain.createLeaveEntitlement(
        data,
        organization_id,
        createdBy,
        leaveRepository
      );

      logger.info('✅ Leave entitlement created via controller', {
        entitlementId: entitlement.id,
        userId: data.user_id,
        leaveTypeId: data.leave_type_id,
        totalDays: data.total_days,
        organization_id,
        createdBy,
      });

      res.status(201).json({
        success: true,
        data: entitlement,
        message: 'Leave entitlement created successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error creating leave entitlement via controller', {
        error: error?.message || 'unknown_error',
        organization_id: req.user!.organization_id,
        createdBy: req.user!.id,
        data: req.body,
      });

      res.status(400).json({
        success: false,
        error: 'Failed to create leave entitlement',
        message: error?.message || 'Validation failed',
      });
    }
  }
}

/**
 * Leave Policies Controller
 */
export class LeavePoliciesController {
  /**
   * Get organization leave policies
   */
  static async getLeavePolicies(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organization_id } = req.user!;
      if (!organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }
      
      const policies = await leaveRepository.getLeavePoliciesByOrganization(organization_id);
      
      logger.info('✅ Leave policies retrieved', {
        organization_id,
        count: policies.length,
        userId: req.user!.id,
      });

      res.json({
        success: true,
        data: policies,
        message: `Retrieved ${policies.length} leave policies`,
      });
    } catch (error: any) {
      logger.error('❌ Error retrieving leave policies', {
        error: error?.message || 'unknown_error',
        organization_id: req.user!.organization_id,
        userId: req.user!.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve leave policies',
        message: error?.message || 'Internal server error',
      });
    }
  }
}

/**
 * Holidays Controller
 */
export class HolidaysController {
  /**
   * Get organization holidays
   */
  static async getHolidays(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organization_id } = req.user!;
      if (!organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }
      const filters = req.query;
      
      const holidays = await leaveRepository.getHolidaysByOrganization(organization_id, filters);
      
      logger.info('✅ Holidays retrieved', {
        organization_id,
        count: holidays.length,
        filters,
        userId: req.user!.id,
      });

      res.json({
        success: true,
        data: holidays,
        message: `Retrieved ${holidays.length} holidays`,
      });
    } catch (error: any) {
      logger.error('❌ Error retrieving holidays', {
        error: error?.message || 'unknown_error',
        organization_id: req.user!.organization_id,
        filters: req.query,
        userId: req.user!.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve holidays',
        message: error?.message || 'Internal server error',
      });
    }
  }
}