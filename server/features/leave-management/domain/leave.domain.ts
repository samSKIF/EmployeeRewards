// Leave Management Domain Layer
// Handles all leave management business logic, validation, and domain events

import { z } from 'zod';
import { eventSystem } from '@shared/events';
import {
  createLeaveRequestSubmittedEvent,
  createLeaveRequestApprovedEvent,
  createLeaveRequestRejectedEvent,
  createLeaveRequestCancelledEvent,
  createLeaveTypeCreatedEvent,
  createLeaveEntitlementAdjustedEvent,
} from '@shared/events';
import { logger } from '@shared/logger';

// Leave domain types
export interface LeaveType {
  id: number;
  name: string;
  description?: string;
  organization_id: number;
  color?: string;
  icon?: string;
  is_paid: boolean;
  requires_approval: boolean;
  max_consecutive_days?: number;
  max_days_per_year?: number;
  created_at: Date;
  updated_at: Date;
  created_by: number;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  leave_type_id: number;
  start_date: Date;
  end_date: Date;
  days_requested: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason?: string;
  approver_id?: number;
  approver_comments?: string;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LeaveEntitlement {
  id: number;
  user_id: number;
  leave_type_id: number;
  year: number;
  total_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  carried_forward: number;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LeavePolicy {
  id: number;
  organization_id: number;
  country: string;
  annual_leave_days: number;
  sick_leave_days: number;
  maternity_leave_days: number;
  paternity_leave_days: number;
  carryover_max_days: number;
  carryover_expiry_months: number;
  notice_period_days: number;
  created_at: Date;
  updated_at: Date;
  created_by: number;
}

export interface Holiday {
  id: number;
  organization_id: number;
  name: string;
  date: Date;
  country: string;
  is_recurring: boolean;
  created_at: Date;
  created_by: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  department?: string;
  organization_id: number;
}

// Validation schemas
export const createLeaveTypeSchema = z.object({
  name: z.string().min(1, 'Leave type name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().max(50).optional(),
  is_paid: z.boolean().default(true),
  requires_approval: z.boolean().default(true),
  max_consecutive_days: z.number().positive().optional(),
  max_days_per_year: z.number().positive().max(365).optional(),
});

export const createLeaveRequestSchema = z.object({
  leave_type_id: z.number().positive(),
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid start date format',
  }),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid end date format',
  }),
  reason: z.string().min(1, 'Reason is required').max(1000),
  approver_id: z.number().positive().optional(),
}).refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
  message: 'End date must be after or equal to start date',
  path: ['end_date'],
});

export const updateLeaveRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
  approver_comments: z.string().max(1000).optional(),
});

export const createLeaveEntitlementSchema = z.object({
  user_id: z.number().positive(),
  leave_type_id: z.number().positive(),
  year: z.number().min(2020).max(2050),
  total_days: z.number().nonnegative().max(365),
  carried_forward: z.number().nonnegative().default(0),
  expires_at: z.string().optional(),
});

export const createLeavePolicySchema = z.object({
  country: z.string().length(2, 'Country must be 2-letter ISO code'),
  annual_leave_days: z.number().min(0).max(50),
  sick_leave_days: z.number().min(0).max(50),
  maternity_leave_days: z.number().min(0).max(365),
  paternity_leave_days: z.number().min(0).max(365),
  carryover_max_days: z.number().min(0).max(30),
  carryover_expiry_months: z.number().min(1).max(24),
  notice_period_days: z.number().min(0).max(90),
});

export const createHolidaySchema = z.object({
  name: z.string().min(1, 'Holiday name is required').max(200),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  country: z.string().length(2, 'Country must be 2-letter ISO code'),
  is_recurring: z.boolean().default(true),
});

// Type exports
export type CreateLeaveTypeData = z.infer<typeof createLeaveTypeSchema>;
export type CreateLeaveRequestData = z.infer<typeof createLeaveRequestSchema>;
export type UpdateLeaveRequestData = z.infer<typeof updateLeaveRequestSchema>;
export type CreateLeaveEntitlementData = z.infer<typeof createLeaveEntitlementSchema>;
export type CreateLeavePolicyData = z.infer<typeof createLeavePolicySchema>;
export type CreateHolidayData = z.infer<typeof createHolidaySchema>;

// Dependencies interface for leave domain
export interface LeaveDependencies {
  // Leave Type operations
  persistLeaveType: (data: Partial<LeaveType>) => Promise<LeaveType>;
  updateLeaveType: (id: number, data: Partial<LeaveType>, organizationId: number) => Promise<LeaveType | null>;
  getLeaveTypeById: (id: number, organizationId: number) => Promise<LeaveType | null>;
  getLeaveTypesByOrganization: (organizationId: number) => Promise<LeaveType[]>;
  deleteLeaveType: (id: number, organizationId: number) => Promise<boolean>;
  
  // Leave Request operations
  persistLeaveRequest: (data: Partial<LeaveRequest>) => Promise<LeaveRequest>;
  updateLeaveRequest: (id: number, data: Partial<LeaveRequest>, userId: number, isAdmin: boolean) => Promise<LeaveRequest | null>;
  getLeaveRequestById: (id: number) => Promise<LeaveRequest | null>;
  getLeaveRequestsByUser: (userId: number) => Promise<LeaveRequest[]>;
  getLeaveRequestsByOrganization: (organizationId: number, filters?: any) => Promise<LeaveRequest[]>;
  deleteLeaveRequest: (id: number, userId: number) => Promise<boolean>;
  
  // Leave Entitlement operations
  persistLeaveEntitlement: (data: Partial<LeaveEntitlement>) => Promise<LeaveEntitlement>;
  updateLeaveEntitlement: (id: number, data: Partial<LeaveEntitlement>) => Promise<LeaveEntitlement | null>;
  getLeaveEntitlementsByUser: (userId: number) => Promise<LeaveEntitlement[]>;
  getLeaveEntitlementsByOrganization: (organizationId: number) => Promise<LeaveEntitlement[]>;
  
  // Leave Policy operations
  persistLeavePolicy: (data: Partial<LeavePolicy>) => Promise<LeavePolicy>;
  updateLeavePolicy: (organizationId: number, country: string, data: Partial<LeavePolicy>) => Promise<LeavePolicy>;
  getLeavePolicyByCountry: (organizationId: number, country: string) => Promise<LeavePolicy | null>;
  getLeavePoliciesByOrganization: (organizationId: number) => Promise<LeavePolicy[]>;
  
  // Holiday operations
  persistHoliday: (data: Partial<Holiday>) => Promise<Holiday>;
  getHolidaysByOrganization: (organizationId: number, filters?: { country?: string; year?: number }) => Promise<Holiday[]>;
  deleteHoliday: (id: number, organizationId: number) => Promise<boolean>;
  
  // User operations
  getUserById: (userId: number) => Promise<User | null>;
  getUsersByOrganization: (organizationId: number) => Promise<User[]>;
  
  // Utility operations
  calculateWorkingDays: (startDate: Date, endDate: Date, holidays: Holiday[]) => number;
  validateLeaveAvailability: (userId: number, leaveTypeId: number, daysRequested: number) => Promise<boolean>;
  checkLeaveConflicts: (userId: number, startDate: Date, endDate: Date) => Promise<boolean>;
  updateLeaveBalances: (userId: number, leaveTypeId: number, daysUsed: number) => Promise<void>;
}

/**
 * Leave Management Domain Service
 * Centralizes all leave management business logic and validation
 */
export class LeaveDomain {
  /**
   * Create a new leave type with validation and event publishing
   */
  static async createLeaveType(
    data: CreateLeaveTypeData,
    organizationId: number,
    createdBy: number,
    dependencies: LeaveDependencies
  ): Promise<LeaveType> {
    try {
      // Validate input data
      const validatedData = createLeaveTypeSchema.parse(data);
      
      // Check for duplicate leave type names in organization
      const existingTypes = await dependencies.getLeaveTypesByOrganization(organizationId);
      const isDuplicate = existingTypes.some(
        type => type.name.toLowerCase() === validatedData.name.toLowerCase()
      );
      
      if (isDuplicate) {
        throw new Error('Leave type with this name already exists in the organization');
      }
      
      // Create leave type data
      const leaveTypeData: Partial<LeaveType> = {
        ...validatedData,
        organization_id: organizationId,
        created_by: createdBy,
      };

      const leaveType = await dependencies.persistLeaveType(leaveTypeData);

      // Publish leave type created event
      const createdEvent = createLeaveTypeCreatedEvent(
        {
          leaveType: {
            id: leaveType.id,
            name: leaveType.name,
            organizationId: leaveType.organization_id,
            isPaid: leaveType.is_paid,
            requiresApproval: leaveType.requires_approval,
            createdAt: leaveType.created_at,
          },
          creator: {
            id: createdBy,
          },
          organization: {
            id: organizationId,
          },
        },
        organizationId
      );

      await eventSystem.publish(createdEvent);

      logger.info('✅ Leave type created', {
        leaveTypeId: leaveType.id,
        name: leaveType.name,
        organizationId,
        createdBy,
      });

      return leaveType;
    } catch (error: any) {
      logger.error('❌ Error creating leave type', {
        error: error?.message || 'unknown_error',
        organizationId,
        createdBy,
        data,
      });
      throw error;
    }
  }

  /**
   * Submit a leave request with validation and event publishing
   */
  static async submitLeaveRequest(
    data: CreateLeaveRequestData,
    userId: number,
    organizationId: number,
    dependencies: LeaveDependencies
  ): Promise<LeaveRequest> {
    try {
      // Validate input data
      const validatedData = createLeaveRequestSchema.parse(data);
      
      // Get user information
      const user = await dependencies.getUserById(userId);
      if (!user || user.organization_id !== organizationId) {
        throw new Error('Invalid user or organization mismatch');
      }

      // Verify leave type exists and belongs to organization
      const leaveType = await dependencies.getLeaveTypeById(validatedData.leave_type_id, organizationId);
      if (!leaveType) {
        throw new Error('Leave type not found or not available in your organization');
      }

      // Parse and validate dates
      const startDate = new Date(validatedData.start_date);
      const endDate = new Date(validatedData.end_date);
      
      // Business rule validations
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        throw new Error('Leave start date cannot be in the past');
      }

      // Check for conflicts with existing requests
      const hasConflicts = await dependencies.checkLeaveConflicts(userId, startDate, endDate);
      if (hasConflicts) {
        throw new Error('Leave request conflicts with existing approved or pending requests');
      }

      // Calculate working days (excluding weekends and holidays)
      const holidays = await dependencies.getHolidaysByOrganization(organizationId, {
        year: startDate.getFullYear(),
      });
      const daysRequested = dependencies.calculateWorkingDays(startDate, endDate, holidays);

      // Validate leave availability
      const hasAvailability = await dependencies.validateLeaveAvailability(
        userId, 
        validatedData.leave_type_id, 
        daysRequested
      );
      if (!hasAvailability) {
        throw new Error('Insufficient leave balance for the requested days');
      }

      // Check max consecutive days rule
      if (leaveType.max_consecutive_days && daysRequested > leaveType.max_consecutive_days) {
        throw new Error(`Maximum ${leaveType.max_consecutive_days} consecutive days allowed for ${leaveType.name}`);
      }

      // Create leave request data
      const leaveRequestData: Partial<LeaveRequest> = {
        user_id: userId,
        leave_type_id: validatedData.leave_type_id,
        start_date: startDate,
        end_date: endDate,
        days_requested: daysRequested,
        reason: validatedData.reason,
        status: 'PENDING',
        approver_id: validatedData.approver_id,
      };

      const leaveRequest = await dependencies.persistLeaveRequest(leaveRequestData);

      // Publish leave request submitted event
      const submittedEvent = createLeaveRequestSubmittedEvent(
        {
          request: {
            id: leaveRequest.id,
            userId: leaveRequest.user_id,
            leaveTypeId: leaveRequest.leave_type_id,
            leaveTypeName: leaveType.name,
            startDate: leaveRequest.start_date,
            endDate: leaveRequest.end_date,
            daysRequested: leaveRequest.days_requested,
            reason: leaveRequest.reason,
            approverId: leaveRequest.approver_id,
            submittedAt: leaveRequest.created_at,
          },
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            department: user.department,
          },
          organization: {
            id: organizationId,
          },
        },
        organizationId
      );

      await eventSystem.publish(submittedEvent);

      logger.info('✅ Leave request submitted', {
        requestId: leaveRequest.id,
        userId,
        leaveTypeId: validatedData.leave_type_id,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        daysRequested,
      });

      return leaveRequest;
    } catch (error: any) {
      logger.error('❌ Error submitting leave request', {
        error: error?.message || 'unknown_error',
        userId,
        organizationId,
        data,
      });
      throw error;
    }
  }

  /**
   * Approve or reject a leave request with validation and event publishing
   */
  static async updateLeaveRequestStatus(
    requestId: number,
    data: UpdateLeaveRequestData,
    approverId: number,
    organizationId: number,
    isAdmin: boolean,
    dependencies: LeaveDependencies
  ): Promise<LeaveRequest> {
    try {
      // Validate input data
      const validatedData = updateLeaveRequestSchema.parse(data);
      
      // Get the leave request
      const leaveRequest = await dependencies.getLeaveRequestById(requestId);
      if (!leaveRequest) {
        throw new Error('Leave request not found');
      }

      // Get user and approver information
      const user = await dependencies.getUserById(leaveRequest.user_id);
      const approver = await dependencies.getUserById(approverId);
      
      if (!user || !approver || user.organization_id !== organizationId || approver.organization_id !== organizationId) {
        throw new Error('Invalid user or organization mismatch');
      }

      // Authorization check
      if (!isAdmin && leaveRequest.approver_id !== approverId) {
        // Allow user to cancel their own request
        if (!(leaveRequest.user_id === approverId && validatedData.status === 'CANCELLED')) {
          throw new Error('Not authorized to update this leave request');
        }
      }

      // Business rule validations
      if (leaveRequest.status !== 'PENDING') {
        throw new Error(`Cannot update leave request with status: ${leaveRequest.status}`);
      }

      // Update leave request
      const updateData: Partial<LeaveRequest> = {
        status: validatedData.status,
        approver_comments: validatedData.approver_comments,
        approved_at: validatedData.status === 'APPROVED' ? new Date() : undefined,
      };

      const updatedRequest = await dependencies.updateLeaveRequest(
        requestId, 
        updateData, 
        approverId, 
        isAdmin
      );

      if (!updatedRequest) {
        throw new Error('Failed to update leave request');
      }

      // Update leave balances if approved
      if (validatedData.status === 'APPROVED') {
        await dependencies.updateLeaveBalances(
          updatedRequest.user_id,
          updatedRequest.leave_type_id,
          updatedRequest.days_requested
        );
      }

      // Publish appropriate event based on status
      let event;
      if (validatedData.status === 'APPROVED') {
        event = createLeaveRequestApprovedEvent(
          {
            request: {
              id: updatedRequest.id,
              userId: updatedRequest.user_id,
              leaveTypeId: updatedRequest.leave_type_id,
              startDate: updatedRequest.start_date,
              endDate: updatedRequest.end_date,
              daysRequested: updatedRequest.days_requested,
              approvedAt: updatedRequest.approved_at!,
            },
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
            },
            approver: {
              id: approver.id,
              name: approver.name,
              email: approver.email,
            },
          },
          organizationId
        );
      } else if (validatedData.status === 'REJECTED') {
        event = createLeaveRequestRejectedEvent(
          {
            request: {
              id: updatedRequest.id,
              userId: updatedRequest.user_id,
              leaveTypeId: updatedRequest.leave_type_id,
              startDate: updatedRequest.start_date,
              endDate: updatedRequest.end_date,
              reason: validatedData.approver_comments || 'No reason provided',
            },
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
            },
            approver: {
              id: approver.id,
              name: approver.name,
              email: approver.email,
            },
          },
          organizationId
        );
      } else if (validatedData.status === 'CANCELLED') {
        event = createLeaveRequestCancelledEvent(
          {
            request: {
              id: updatedRequest.id,
              userId: updatedRequest.user_id,
              leaveTypeId: updatedRequest.leave_type_id,
              cancelledBy: approverId,
              reason: validatedData.approver_comments || 'Cancelled by user',
            },
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
            },
          },
          organizationId
        );
      }

      if (event) {
        await eventSystem.publish(event);
      }

      logger.info('✅ Leave request status updated', {
        requestId: updatedRequest.id,
        previousStatus: leaveRequest.status,
        newStatus: updatedRequest.status,
        approverId,
        isAdmin,
      });

      return updatedRequest;
    } catch (error: any) {
      logger.error('❌ Error updating leave request status', {
        error: error?.message || 'unknown_error',
        requestId,
        approverId,
        data,
      });
      throw error;
    }
  }

  /**
   * Create or update leave entitlement with validation and event publishing
   */
  static async createLeaveEntitlement(
    data: CreateLeaveEntitlementData,
    organizationId: number,
    createdBy: number,
    dependencies: LeaveDependencies
  ): Promise<LeaveEntitlement> {
    try {
      // Validate input data
      const validatedData = createLeaveEntitlementSchema.parse(data);
      
      // Verify user and leave type belong to organization
      const user = await dependencies.getUserById(validatedData.user_id);
      const leaveType = await dependencies.getLeaveTypeById(validatedData.leave_type_id, organizationId);
      
      if (!user || user.organization_id !== organizationId) {
        throw new Error('User not found or not in the same organization');
      }
      
      if (!leaveType) {
        throw new Error('Leave type not found in the organization');
      }

      // Create entitlement data
      const entitlementData: Partial<LeaveEntitlement> = {
        user_id: validatedData.user_id,
        leave_type_id: validatedData.leave_type_id,
        year: validatedData.year,
        total_days: validatedData.total_days,
        carried_forward: validatedData.carried_forward,
        used_days: 0,
        pending_days: 0,
        remaining_days: validatedData.total_days + validatedData.carried_forward,
        expires_at: validatedData.expires_at ? new Date(validatedData.expires_at) : undefined,
      };

      const entitlement = await dependencies.persistLeaveEntitlement(entitlementData);

      // Publish leave entitlement adjusted event
      const adjustedEvent = createLeaveEntitlementAdjustedEvent(
        {
          entitlement: {
            id: entitlement.id,
            userId: entitlement.user_id,
            leaveTypeId: entitlement.leave_type_id,
            leaveTypeName: leaveType.name,
            year: entitlement.year,
            totalDays: entitlement.total_days,
            carriedForward: entitlement.carried_forward,
            adjustedBy: createdBy,
          },
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        },
        organizationId
      );

      await eventSystem.publish(adjustedEvent);

      logger.info('✅ Leave entitlement created', {
        entitlementId: entitlement.id,
        userId: validatedData.user_id,
        leaveTypeId: validatedData.leave_type_id,
        totalDays: validatedData.total_days,
        year: validatedData.year,
      });

      return entitlement;
    } catch (error: any) {
      logger.error('❌ Error creating leave entitlement', {
        error: error?.message || 'unknown_error',
        organizationId,
        createdBy,
        data,
      });
      throw error;
    }
  }
}