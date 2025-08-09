// Employee Event Handlers
// Handles employee domain events for cross-cutting concerns

import { subscribe, type EmployeeCreatedEvent, type EmployeeUpdatedEvent, type EmployeeDeactivatedEvent } from '@shared/events';
import { logger } from '@platform/sdk';

/**
 * Employee Event Handler Service
 * Subscribes to employee domain events and handles cross-cutting concerns
 */
export class EmployeeEventHandlers {
  private subscriptionIds: string[] = [];

  /**
   * Initialize all employee event subscriptions
   */
  initialize(): void {
    this.subscriptionIds.push(
      subscribe<EmployeeCreatedEvent['data']>(
        'employee.created',
        this.handleEmployeeCreated,
        'employee-management-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<EmployeeUpdatedEvent['data']>(
        'employee.updated',
        this.handleEmployeeUpdated,
        'employee-management-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<EmployeeDeactivatedEvent['data']>(
        'employee.deactivated',
        this.handleEmployeeDeactivated,
        'employee-management-slice',
        { priority: 1 }
      )
    );

    logger.info('✅ Employee event handlers initialized', {
      subscriptions: this.subscriptionIds.length
    });
  }

  /**
   * Clean up event subscriptions
   */
  destroy(): void {
    // Unsubscribe would be called here if available
    this.subscriptionIds = [];
    logger.info('🗑️ Employee event handlers destroyed');
  }

  /**
   * Handle employee created events
   */
  private handleEmployeeCreated = async (event: EmployeeCreatedEvent): Promise<void> => {
    try {
      logger.info('🎉 Employee created event received', {
        employeeId: event.data.employee.id,
        organizationId: event.organizationId,
        createdBy: event.data.createdBy,
      });

      // Handle cross-cutting concerns:
      // 1. Send welcome email (if enabled)
      // 2. Create user workspace/directories
      // 3. Update organization user count cache
      // 4. Trigger onboarding workflow
      // 5. Notify managers/admins

      // Example: Log for analytics/audit
      logger.info('📊 Employee creation analytics', {
        eventId: event.id,
        timestamp: event.timestamp,
        department: event.data.employee.department,
        role: event.data.employee.role_type,
        organizationId: event.organizationId,
      });

    } catch (error: any) {
      logger.error('❌ Error handling employee created event', {
        error: error?.message || 'unknown_error',
        eventId: event.id,
      });
    }
  };

  /**
   * Handle employee updated events
   */
  private handleEmployeeUpdated = async (event: EmployeeUpdatedEvent): Promise<void> => {
    try {
      logger.info('📝 Employee updated event received', {
        employeeId: event.data.employee.id,
        updatedBy: event.data.updatedBy,
        updatedFields: event.data.updatedFields,
      });

      // Handle cross-cutting concerns:
      // 1. Update search indexes
      // 2. Refresh user permissions if role changed
      // 3. Update organization directory cache
      // 4. Notify relevant stakeholders of changes

      // Check for significant changes
      const significantChanges = event.data.updatedFields.filter(field =>
        ['role_type', 'department', 'status'].includes(field)
      );

      if (significantChanges.length > 0) {
        logger.info('🔄 Significant employee changes detected', {
          employeeId: event.data.employee.id,
          significantChanges,
        });
        
        // Trigger additional processes for role/department changes
      }

    } catch (error: any) {
      logger.error('❌ Error handling employee updated event', {
        error: error?.message || 'unknown_error',
        eventId: event.id,
      });
    }
  };

  /**
   * Handle employee deactivated events
   */
  private handleEmployeeDeactivated = async (event: EmployeeDeactivatedEvent): Promise<void> => {
    try {
      logger.info('🚫 Employee deactivated event received', {
        employeeId: event.data.employeeId,
        deactivatedBy: event.data.deactivatedBy,
        reason: event.data.reason,
      });

      // Handle cross-cutting concerns:
      // 1. Revoke system access/permissions
      // 2. Archive user data
      // 3. Update organization user count
      // 4. Reassign pending tasks/responsibilities
      // 5. Notify managers and HR

      // Check for offboarding tasks
      if (event.data.offboardingTasks.length > 0) {
        logger.info('📋 Offboarding tasks identified', {
          employeeId: event.data.employeeId,
          taskCount: event.data.offboardingTasks.length,
        });
        
        // Trigger offboarding workflow
      }

    } catch (error: any) {
      logger.error('❌ Error handling employee deactivated event', {
        error: error?.message || 'unknown_error',
        eventId: event.id,
      });
    }
  };
}

// Export singleton instance
export const employeeEventHandlers = new EmployeeEventHandlers();