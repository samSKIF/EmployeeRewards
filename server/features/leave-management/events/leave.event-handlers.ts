// Leave Management Event Handlers
// Processes domain events for leave management features

import { subscribe } from '@shared/events';
import { logger } from '@platform/sdk';
import type {
  LeaveTypeCreatedEvent,
  LeaveTypeUpdatedEvent,
  LeaveTypeDeletedEvent,
  LeaveRequestSubmittedEvent,
  LeaveRequestApprovedEvent,
  LeaveRequestRejectedEvent,
  LeaveRequestCancelledEvent,
  LeaveEntitlementAdjustedEvent,
  LeaveBalanceUpdatedEvent,
  LeavePolicyCreatedEvent,
  HolidayCreatedEvent,
} from '@shared/events/leave-events';

/**
 * Leave Management Event Handler Service
 * Handles leave domain events for cross-cutting concerns
 */
export class LeaveEventHandlers {
  private subscriptionIds: string[] = [];

  /**
   * Initialize all leave management event subscriptions
   */
  initialize(): void {
    // Leave Type Events
    this.subscriptionIds.push(
      subscribe<LeaveTypeCreatedEvent['data']>(
        'leave.leave_type_created',
        this.handleLeaveTypeCreated,
        'leave-management-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<LeaveTypeUpdatedEvent['data']>(
        'leave.leave_type_updated',
        this.handleLeaveTypeUpdated,
        'leave-management-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<LeaveTypeDeletedEvent['data']>(
        'leave.leave_type_deleted',
        this.handleLeaveTypeDeleted,
        'leave-management-slice',
        { priority: 1 }
      )
    );

    // Leave Request Events
    this.subscriptionIds.push(
      subscribe<LeaveRequestSubmittedEvent['data']>(
        'leave.request_submitted',
        this.handleLeaveRequestSubmitted,
        'leave-management-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<LeaveRequestApprovedEvent['data']>(
        'leave.request_approved',
        this.handleLeaveRequestApproved,
        'leave-management-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<LeaveRequestRejectedEvent['data']>(
        'leave.request_rejected',
        this.handleLeaveRequestRejected,
        'leave-management-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<LeaveRequestCancelledEvent['data']>(
        'leave.request_cancelled',
        this.handleLeaveRequestCancelled,
        'leave-management-slice',
        { priority: 1 }
      )
    );

    // Leave Entitlement Events
    this.subscriptionIds.push(
      subscribe<LeaveEntitlementAdjustedEvent['data']>(
        'leave.entitlement_adjusted',
        this.handleLeaveEntitlementAdjusted,
        'leave-management-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<LeaveBalanceUpdatedEvent['data']>(
        'leave.balance_updated',
        this.handleLeaveBalanceUpdated,
        'leave-management-slice',
        { priority: 1 }
      )
    );

    // Leave Policy Events
    this.subscriptionIds.push(
      subscribe<LeavePolicyCreatedEvent['data']>(
        'leave.policy_created',
        this.handleLeavePolicyCreated,
        'leave-management-slice',
        { priority: 1 }
      )
    );

    // Holiday Events
    this.subscriptionIds.push(
      subscribe<HolidayCreatedEvent['data']>(
        'leave.holiday_created',
        this.handleHolidayCreated,
        'leave-management-slice',
        { priority: 1 }
      )
    );

    logger.info('✅ Leave management event handlers initialized', {
      subscriptions: this.subscriptionIds.length,
      handlers: [
        'leave_type_created',
        'leave_type_updated', 
        'leave_type_deleted',
        'request_submitted',
        'request_approved',
        'request_rejected',
        'request_cancelled',
        'entitlement_adjusted',
        'balance_updated',
        'policy_created',
        'holiday_created'
      ]
    });
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    // Implementation would depend on the event system's unsubscribe mechanism
    this.subscriptionIds = [];
    logger.info('🧹 Leave management event handlers cleaned up');
  }

  /**
   * Leave Type Event Handlers
   */

  /**
   * Handle leave type created event
   */
  private handleLeaveTypeCreated = async (event: LeaveTypeCreatedEvent): Promise<void> => {
    try {
      const { leaveType, creator, organization } = event.data;
      
      logger.info('🎯 Processing leave type created event', {
        eventId: event.id,
        leaveTypeId: leaveType.id,
        leaveTypeName: leaveType.name,
        organizationId: organization.id,
        creatorId: creator.id,
      });

      // Here you could add additional actions like:
      // - Send notifications to HR team
      // - Update leave type analytics
      // - Sync with external systems
      // - Create audit trail entries

      logger.info('✅ Leave type created event processed successfully', {
        eventId: event.id,
        leaveTypeId: leaveType.id,
      });
    } catch (error: any) {
      logger.error('❌ Error processing leave type created event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle leave type updated event
   */
  private handleLeaveTypeUpdated = async (event: LeaveTypeUpdatedEvent): Promise<void> => {
    try {
      const { leaveType, updater } = event.data;
      
      logger.info('🎯 Processing leave type updated event', {
        eventId: event.id,
        leaveTypeId: leaveType.id,
        leaveTypeName: leaveType.name,
        updatedFields: leaveType.updatedFields,
        updaterId: updater.id,
      });

      // Additional actions could include:
      // - Notify affected users about policy changes
      // - Update related leave requests if policies changed
      // - Log audit trail for compliance

      logger.info('✅ Leave type updated event processed successfully', {
        eventId: event.id,
        leaveTypeId: leaveType.id,
      });
    } catch (error: any) {
      logger.error('❌ Error processing leave type updated event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle leave type deleted event
   */
  private handleLeaveTypeDeleted = async (event: LeaveTypeDeletedEvent): Promise<void> => {
    try {
      const { leaveType, deletedBy } = event.data;
      
      logger.info('🎯 Processing leave type deleted event', {
        eventId: event.id,
        leaveTypeId: leaveType.id,
        leaveTypeName: leaveType.name,
        deletedById: deletedBy.id,
      });

      // Actions could include:
      // - Archive related data
      // - Notify users about discontinued leave type
      // - Update analytics and reports

      logger.info('✅ Leave type deleted event processed successfully', {
        eventId: event.id,
        leaveTypeId: leaveType.id,
      });
    } catch (error: any) {
      logger.error('❌ Error processing leave type deleted event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Leave Request Event Handlers
   */

  /**
   * Handle leave request submitted event
   */
  private handleLeaveRequestSubmitted = async (event: LeaveRequestSubmittedEvent): Promise<void> => {
    try {
      const { request, user, organization } = event.data;
      
      logger.info('🎯 Processing leave request submitted event', {
        eventId: event.id,
        requestId: request.id,
        userId: user.id,
        userName: user.name,
        leaveTypeId: request.leaveTypeId,
        leaveTypeName: request.leaveTypeName,
        startDate: request.startDate.toISOString().split('T')[0],
        endDate: request.endDate.toISOString().split('T')[0],
        daysRequested: request.daysRequested,
        organizationId: organization.id,
      });

      // Actions could include:
      // - Send email notification to approver
      // - Update user's pending leave balance
      // - Create calendar placeholder
      // - Send mobile push notification
      // - Update team dashboard

      logger.info('✅ Leave request submitted event processed successfully', {
        eventId: event.id,
        requestId: request.id,
        userId: user.id,
      });
    } catch (error: any) {
      logger.error('❌ Error processing leave request submitted event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle leave request approved event
   */
  private handleLeaveRequestApproved = async (event: LeaveRequestApprovedEvent): Promise<void> => {
    try {
      const { request, user, approver } = event.data;
      
      logger.info('🎯 Processing leave request approved event', {
        eventId: event.id,
        requestId: request.id,
        userId: user.id,
        userName: user.name,
        approverId: approver.id,
        approverName: approver.name,
        startDate: request.startDate.toISOString().split('T')[0],
        endDate: request.endDate.toISOString().split('T')[0],
        daysRequested: request.daysRequested,
      });

      // Actions could include:
      // - Send approval notification to user
      // - Update leave balance from pending to used
      // - Create/confirm calendar entries
      // - Notify team members about upcoming absence
      // - Update resource planning systems

      logger.info('✅ Leave request approved event processed successfully', {
        eventId: event.id,
        requestId: request.id,
        userId: user.id,
      });
    } catch (error: any) {
      logger.error('❌ Error processing leave request approved event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle leave request rejected event
   */
  private handleLeaveRequestRejected = async (event: LeaveRequestRejectedEvent): Promise<void> => {
    try {
      const { request, user, approver } = event.data;
      
      logger.info('🎯 Processing leave request rejected event', {
        eventId: event.id,
        requestId: request.id,
        userId: user.id,
        userName: user.name,
        approverId: approver.id,
        approverName: approver.name,
        rejectionReason: request.reason,
      });

      // Actions could include:
      // - Send rejection notification to user
      // - Restore leave balance from pending
      // - Remove calendar placeholders
      // - Log rejection reason for analytics

      logger.info('✅ Leave request rejected event processed successfully', {
        eventId: event.id,
        requestId: request.id,
        userId: user.id,
      });
    } catch (error: any) {
      logger.error('❌ Error processing leave request rejected event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle leave request cancelled event
   */
  private handleLeaveRequestCancelled = async (event: LeaveRequestCancelledEvent): Promise<void> => {
    try {
      const { request, user } = event.data;
      
      logger.info('🎯 Processing leave request cancelled event', {
        eventId: event.id,
        requestId: request.id,
        userId: user.id,
        userName: user.name,
        cancelledBy: request.cancelledBy,
        reason: request.reason,
      });

      // Actions could include:
      // - Send cancellation notification
      // - Restore leave balance if it was a cancellation of approved leave
      // - Remove calendar entries
      // - Notify team about availability change

      logger.info('✅ Leave request cancelled event processed successfully', {
        eventId: event.id,
        requestId: request.id,
        userId: user.id,
      });
    } catch (error: any) {
      logger.error('❌ Error processing leave request cancelled event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Leave Entitlement Event Handlers
   */

  /**
   * Handle leave entitlement adjusted event
   */
  private handleLeaveEntitlementAdjusted = async (event: LeaveEntitlementAdjustedEvent): Promise<void> => {
    try {
      const { entitlement, user } = event.data;
      
      logger.info('🎯 Processing leave entitlement adjusted event', {
        eventId: event.id,
        entitlementId: entitlement.id,
        userId: user.id,
        userName: user.name,
        leaveTypeId: entitlement.leaveTypeId,
        leaveTypeName: entitlement.leaveTypeName,
        year: entitlement.year,
        totalDays: entitlement.totalDays,
        carriedForward: entitlement.carriedForward,
        adjustedBy: entitlement.adjustedBy,
      });

      // Actions could include:
      // - Notify user about entitlement change
      // - Update leave planning tools
      // - Sync with payroll systems
      // - Log adjustment for audit purposes

      logger.info('✅ Leave entitlement adjusted event processed successfully', {
        eventId: event.id,
        entitlementId: entitlement.id,
        userId: user.id,
      });
    } catch (error: any) {
      logger.error('❌ Error processing leave entitlement adjusted event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle leave balance updated event
   */
  private handleLeaveBalanceUpdated = async (event: LeaveBalanceUpdatedEvent): Promise<void> => {
    try {
      const { balance, user } = event.data;
      
      logger.info('🎯 Processing leave balance updated event', {
        eventId: event.id,
        userId: user.id,
        userName: user.name,
        leaveTypeId: balance.leaveTypeId,
        leaveTypeName: balance.leaveTypeName,
        previousBalance: balance.previousBalance,
        newBalance: balance.newBalance,
        daysUsed: balance.daysUsed,
        requestId: balance.requestId,
      });

      // Actions could include:
      // - Update user dashboard
      // - Send balance alerts if running low
      // - Update analytics and reporting data
      // - Sync with external HR systems

      logger.info('✅ Leave balance updated event processed successfully', {
        eventId: event.id,
        userId: user.id,
        leaveTypeId: balance.leaveTypeId,
      });
    } catch (error: any) {
      logger.error('❌ Error processing leave balance updated event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Leave Policy Event Handlers
   */

  /**
   * Handle leave policy created event
   */
  private handleLeavePolicyCreated = async (event: LeavePolicyCreatedEvent): Promise<void> => {
    try {
      const { policy, organization } = event.data;
      
      logger.info('🎯 Processing leave policy created event', {
        eventId: event.id,
        policyId: policy.id,
        organizationId: organization.id,
        country: policy.country,
        annualLeaveDays: policy.annualLeaveDays,
        sickLeaveDays: policy.sickLeaveDays,
        createdBy: policy.createdBy,
      });

      // Actions could include:
      // - Notify HR team about new policy
      // - Update entitlements for affected users
      // - Sync with legal compliance systems
      // - Update policy documents

      logger.info('✅ Leave policy created event processed successfully', {
        eventId: event.id,
        policyId: policy.id,
        organizationId: organization.id,
      });
    } catch (error: any) {
      logger.error('❌ Error processing leave policy created event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle holiday created event
   */
  private handleHolidayCreated = async (event: HolidayCreatedEvent): Promise<void> => {
    try {
      const { holiday, organization } = event.data;
      
      logger.info('🎯 Processing holiday created event', {
        eventId: event.id,
        holidayId: holiday.id,
        organizationId: organization.id,
        holidayName: holiday.name,
        date: holiday.date.toISOString().split('T')[0],
        country: holiday.country,
        isRecurring: holiday.isRecurring,
        createdBy: holiday.createdBy,
      });

      // Actions could include:
      // - Update company calendar
      // - Notify employees about new holiday
      // - Update leave calculations for affected periods
      // - Sync with payroll systems

      logger.info('✅ Holiday created event processed successfully', {
        eventId: event.id,
        holidayId: holiday.id,
        organizationId: organization.id,
      });
    } catch (error: any) {
      logger.error('❌ Error processing holiday created event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };
}

/**
 * Initialize leave management event handlers
 * Legacy function wrapper for backwards compatibility
 */
export const initializeLeaveEventHandlers = () => {
  const handlers = new LeaveEventHandlers();
  handlers.initialize();
  return handlers;
};