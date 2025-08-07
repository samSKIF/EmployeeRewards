// Leave Management Domain Events
// Event schemas and factory functions for leave management lifecycle

import { z } from 'zod';
import { createBaseEvent, type BaseEvent } from './base';

// Leave Type Events
export const leaveTypeCreatedSchema = z.object({
  leaveType: z.object({
    id: z.number(),
    name: z.string(),
    organizationId: z.number(),
    isPaid: z.boolean(),
    requiresApproval: z.boolean(),
    createdAt: z.date(),
  }),
  creator: z.object({
    id: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
});

export const leaveTypeUpdatedSchema = z.object({
  leaveType: z.object({
    id: z.number(),
    name: z.string(),
    organizationId: z.number(),
    updatedFields: z.array(z.string()),
    updatedAt: z.date(),
  }),
  updater: z.object({
    id: z.number(),
  }),
});

export const leaveTypeDeletedSchema = z.object({
  leaveType: z.object({
    id: z.number(),
    name: z.string(),
    organizationId: z.number(),
    deletedAt: z.date(),
  }),
  deletedBy: z.object({
    id: z.number(),
  }),
});

// Leave Request Events
export const leaveRequestSubmittedSchema = z.object({
  request: z.object({
    id: z.number(),
    userId: z.number(),
    leaveTypeId: z.number(),
    leaveTypeName: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    daysRequested: z.number(),
    reason: z.string(),
    approverId: z.number().optional(),
    submittedAt: z.date(),
  }),
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    department: z.string().optional(),
  }),
  organization: z.object({
    id: z.number(),
  }),
});

export const leaveRequestApprovedSchema = z.object({
  request: z.object({
    id: z.number(),
    userId: z.number(),
    leaveTypeId: z.number(),
    startDate: z.date(),
    endDate: z.date(),
    daysRequested: z.number(),
    approvedAt: z.date(),
  }),
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }),
  approver: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }),
});

export const leaveRequestRejectedSchema = z.object({
  request: z.object({
    id: z.number(),
    userId: z.number(),
    leaveTypeId: z.number(),
    startDate: z.date(),
    endDate: z.date(),
    reason: z.string(),
  }),
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }),
  approver: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }),
});

export const leaveRequestCancelledSchema = z.object({
  request: z.object({
    id: z.number(),
    userId: z.number(),
    leaveTypeId: z.number(),
    cancelledBy: z.number(),
    reason: z.string(),
  }),
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }),
});

export const leaveRequestModifiedSchema = z.object({
  request: z.object({
    id: z.number(),
    userId: z.number(),
    leaveTypeId: z.number(),
    previousDates: z.object({
      startDate: z.date(),
      endDate: z.date(),
    }),
    newDates: z.object({
      startDate: z.date(),
      endDate: z.date(),
    }),
    modifiedBy: z.number(),
    reason: z.string(),
  }),
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }),
});

// Leave Entitlement Events
export const leaveEntitlementAdjustedSchema = z.object({
  entitlement: z.object({
    id: z.number(),
    userId: z.number(),
    leaveTypeId: z.number(),
    leaveTypeName: z.string(),
    year: z.number(),
    totalDays: z.number(),
    carriedForward: z.number(),
    adjustedBy: z.number(),
  }),
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }),
});

export const leaveBalanceUpdatedSchema = z.object({
  balance: z.object({
    userId: z.number(),
    leaveTypeId: z.number(),
    leaveTypeName: z.string(),
    previousBalance: z.number(),
    newBalance: z.number(),
    daysUsed: z.number(),
    requestId: z.number(),
  }),
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }),
});

// Leave Policy Events
export const leavePolicyCreatedSchema = z.object({
  policy: z.object({
    id: z.number(),
    organizationId: z.number(),
    country: z.string(),
    annualLeaveDays: z.number(),
    sickLeaveDays: z.number(),
    createdBy: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
});

export const leavePolicyUpdatedSchema = z.object({
  policy: z.object({
    id: z.number(),
    organizationId: z.number(),
    country: z.string(),
    updatedFields: z.array(z.string()),
    updatedBy: z.number(),
  }),
});

// Holiday Events
export const holidayCreatedSchema = z.object({
  holiday: z.object({
    id: z.number(),
    organizationId: z.number(),
    name: z.string(),
    date: z.date(),
    country: z.string(),
    isRecurring: z.boolean(),
    createdBy: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
});

// Leave Analytics Events
export const leaveAnalyticsGeneratedSchema = z.object({
  analytics: z.object({
    organizationId: z.number(),
    period: z.string(),
    totalRequests: z.number(),
    approvedRequests: z.number(),
    rejectedRequests: z.number(),
    pendingRequests: z.number(),
    totalDaysRequested: z.number(),
    totalDaysApproved: z.number(),
    departmentBreakdown: z.record(z.string(), z.number()),
    leaveTypeBreakdown: z.record(z.string(), z.number()),
    generatedAt: z.date(),
  }),
});

// Event type definitions
export interface LeaveTypeCreatedEvent extends BaseEvent {
  type: 'leave.leave_type_created';
  data: z.infer<typeof leaveTypeCreatedSchema>;
}

export interface LeaveTypeUpdatedEvent extends BaseEvent {
  type: 'leave.leave_type_updated';
  data: z.infer<typeof leaveTypeUpdatedSchema>;
}

export interface LeaveTypeDeletedEvent extends BaseEvent {
  type: 'leave.leave_type_deleted';
  data: z.infer<typeof leaveTypeDeletedSchema>;
}

export interface LeaveRequestSubmittedEvent extends BaseEvent {
  type: 'leave.request_submitted';
  data: z.infer<typeof leaveRequestSubmittedSchema>;
}

export interface LeaveRequestApprovedEvent extends BaseEvent {
  type: 'leave.request_approved';
  data: z.infer<typeof leaveRequestApprovedSchema>;
}

export interface LeaveRequestRejectedEvent extends BaseEvent {
  type: 'leave.request_rejected';
  data: z.infer<typeof leaveRequestRejectedSchema>;
}

export interface LeaveRequestCancelledEvent extends BaseEvent {
  type: 'leave.request_cancelled';
  data: z.infer<typeof leaveRequestCancelledSchema>;
}

export interface LeaveRequestModifiedEvent extends BaseEvent {
  type: 'leave.request_modified';
  data: z.infer<typeof leaveRequestModifiedSchema>;
}

export interface LeaveEntitlementAdjustedEvent extends BaseEvent {
  type: 'leave.entitlement_adjusted';
  data: z.infer<typeof leaveEntitlementAdjustedSchema>;
}

export interface LeaveBalanceUpdatedEvent extends BaseEvent {
  type: 'leave.balance_updated';
  data: z.infer<typeof leaveBalanceUpdatedSchema>;
}

export interface LeavePolicyCreatedEvent extends BaseEvent {
  type: 'leave.policy_created';
  data: z.infer<typeof leavePolicyCreatedSchema>;
}

export interface LeavePolicyUpdatedEvent extends BaseEvent {
  type: 'leave.policy_updated';
  data: z.infer<typeof leavePolicyUpdatedSchema>;
}

export interface HolidayCreatedEvent extends BaseEvent {
  type: 'leave.holiday_created';
  data: z.infer<typeof holidayCreatedSchema>;
}

export interface LeaveAnalyticsGeneratedEvent extends BaseEvent {
  type: 'leave.analytics_generated';
  data: z.infer<typeof leaveAnalyticsGeneratedSchema>;
}

// Event factory functions
export const createLeaveTypeCreatedEvent = (
  data: z.infer<typeof leaveTypeCreatedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<LeaveTypeCreatedEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.leave_type_created', data, organizationId, metadata);
};

export const createLeaveTypeUpdatedEvent = (
  data: z.infer<typeof leaveTypeUpdatedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<LeaveTypeUpdatedEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.leave_type_updated', data, organizationId, metadata);
};

export const createLeaveTypeDeletedEvent = (
  data: z.infer<typeof leaveTypeDeletedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<LeaveTypeDeletedEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.leave_type_deleted', data, organizationId, metadata);
};

export const createLeaveRequestSubmittedEvent = (
  data: z.infer<typeof leaveRequestSubmittedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<LeaveRequestSubmittedEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.request_submitted', data, organizationId, metadata);
};

export const createLeaveRequestApprovedEvent = (
  data: z.infer<typeof leaveRequestApprovedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<LeaveRequestApprovedEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.request_approved', data, organizationId, metadata);
};

export const createLeaveRequestRejectedEvent = (
  data: z.infer<typeof leaveRequestRejectedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<LeaveRequestRejectedEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.request_rejected', data, organizationId, metadata);
};

export const createLeaveRequestCancelledEvent = (
  data: z.infer<typeof leaveRequestCancelledSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<LeaveRequestCancelledEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.request_cancelled', data, organizationId, metadata);
};

export const createLeaveRequestModifiedEvent = (
  data: z.infer<typeof leaveRequestModifiedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<LeaveRequestModifiedEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.request_modified', data, organizationId, metadata);
};

export const createLeaveEntitlementAdjustedEvent = (
  data: z.infer<typeof leaveEntitlementAdjustedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<LeaveEntitlementAdjustedEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.entitlement_adjusted', data, organizationId, metadata);
};

export const createLeaveBalanceUpdatedEvent = (
  data: z.infer<typeof leaveBalanceUpdatedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<LeaveBalanceUpdatedEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.balance_updated', data, organizationId, metadata);
};

export const createLeavePolicyCreatedEvent = (
  data: z.infer<typeof leavePolicyCreatedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<LeavePolicyCreatedEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.policy_created', data, organizationId, metadata);
};

export const createLeavePolicyUpdatedEvent = (
  data: z.infer<typeof leavePolicyUpdatedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<LeavePolicyUpdatedEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.policy_updated', data, organizationId, metadata);
};

export const createHolidayCreatedEvent = (
  data: z.infer<typeof holidayCreatedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<HolidayCreatedEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.holiday_created', data, organizationId, metadata);
};

export const createLeaveAnalyticsGeneratedEvent = (
  data: z.infer<typeof leaveAnalyticsGeneratedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<LeaveAnalyticsGeneratedEvent, 'id' | 'timestamp'> => {
  return createBaseEvent('leave.analytics_generated', data, organizationId, metadata);
};