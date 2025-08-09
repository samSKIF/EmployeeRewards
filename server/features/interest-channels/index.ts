// Interest Channels System Vertical Slice
// Entry point for interest channels management feature module

import interestChannelsRoutes from './api/interest-channels.routes';
import { initializeInterestChannelsEventHandlers } from './events/interest-channels.event-handlers';
import { logger } from '@platform/sdk';

/**
 * Initialize the interest channels system feature module
 * Sets up routes and event handlers
 */
export const initializeInterestChannelsSystem = () => {
  try {
    // Initialize event handlers first
    initializeInterestChannelsEventHandlers();
    
    logger.info('🔗 Interest Channels System module initialized successfully', {
      routes: 'configured',
      eventHandlers: 'active',
      domain: 'ready',
      infrastructure: 'ready',
    });
    
    return {
      routes: interestChannelsRoutes,
      prefix: '/api/interest-channels'
    };
  } catch (error: any) {
    logger.error('❌ Failed to initialize Interest Channels System module', {
      error: error?.message || 'unknown_error',
    });
    throw error;
  }
};

// Export routes for external registration
export { default as interestChannelsRoutes } from './api/interest-channels.routes';

// Export controllers for direct use if needed
export { InterestChannelsController } from './api/interest-channels.controller';

// Export domain services for external use
export { InterestChannelsDomain } from './domain/interest-channels.domain';

// Export repository for external use
export { InterestChannelsRepository } from './infrastructure/interest-channels.repository';

// Export event handlers initializer
export { initializeInterestChannelsEventHandlers } from './events/interest-channels.event-handlers';