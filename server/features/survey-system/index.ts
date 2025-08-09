// Survey System Vertical Slice
// Entry point for survey management feature module

import surveyRoutes from './api/survey.routes';
import { initializeSurveyEventHandlers } from './events/survey.event-handlers';
import { logger } from '@platform/sdk';

/**
 * Initialize the survey system feature module
 * Sets up routes and event handlers
 */
export const initializeSurveySystem = () => {
  try {
    // Initialize event handlers first
    initializeSurveyEventHandlers();
    
    logger.info('📊 Survey System module initialized successfully', {
      routes: 'configured',
      eventHandlers: 'active',
      domain: 'ready',
      infrastructure: 'ready',
    });
    
    return {
      routes: surveyRoutes,
      prefix: '/api/survey'
    };
  } catch (error: any) {
    logger.error('❌ Failed to initialize Survey System module', {
      error: error?.message || 'unknown_error',
    });
    throw error;
  }
};

// Export routes for external registration
export { default as surveyRoutes } from './api/survey.routes';

// Export controllers for direct use if needed
export { SurveyController } from './api/survey.controller';

// Export domain services for external use
export { SurveyDomain } from './domain/survey.domain';

// Export repository for external use
export { SurveyRepository } from './infrastructure/survey.repository';

// Export event handlers initializer
export { initializeSurveyEventHandlers } from './events/survey.event-handlers';