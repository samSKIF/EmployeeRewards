// Leave Management Vertical Slice
// Entry point for leave management feature module

import leaveRoutes from './api/leave.routes';
import { initializeLeaveEventHandlers } from './events/leave.event-handlers';
import { logger } from '@platform/sdk';

/**
 * Initialize the leave management feature module
 * Sets up routes and event handlers
 */
export const initializeLeaveManagement = () => {
  try {
    // Initialize event handlers first
    initializeLeaveEventHandlers();
    
    logger.info('🏖️ Leave Management module initialized successfully', {
      routes: 'configured',
      eventHandlers: 'active',
      domain: 'ready',
      infrastructure: 'ready',
    });
    
    return {
      routes: leaveRoutes,
      prefix: '/api/leave'
    };
  } catch (error: any) {
    logger.error('❌ Failed to initialize Leave Management module', {
      error: error?.message || 'unknown_error',
    });
    throw error;
  }
};

// Export routes for external registration
export { default as leaveRoutes } from './api/leave.routes';

// Export controllers for direct use if needed
export {
  LeaveTypesController,
  LeaveRequestsController,
  LeaveEntitlementsController,
  LeavePoliciesController,
  HolidaysController,
} from './api/leave.controller';

// Export domain services for external use
export { LeaveDomain } from './domain/leave.domain';

// Export repository for external use
export { LeaveRepository } from './infrastructure/leave.repository';

// Export event handlers initializer
export { initializeLeaveEventHandlers } from './events/leave.event-handlers';