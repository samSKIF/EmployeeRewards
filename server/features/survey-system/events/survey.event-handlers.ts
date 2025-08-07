// Survey System Event Handlers
// Processes domain events for survey management features

import { subscribe } from '@shared/events';
import { logger } from '@shared/logger';
import type {
  SurveyCreatedEvent,
  SurveyUpdatedEvent,
  SurveyPublishedEvent,
  SurveyResponseSubmittedEvent,
  SurveyDeletedEvent,
  SurveyAnalyticsGeneratedEvent,
} from '@shared/events/survey-events';

/**
 * Survey Management Event Handler Service
 * Handles survey domain events for cross-cutting concerns
 */
export class SurveyEventHandlers {
  private subscriptionIds: string[] = [];

  /**
   * Initialize all survey management event subscriptions
   */
  initialize(): void {
    // Survey Lifecycle Events
    this.subscriptionIds.push(
      subscribe<SurveyCreatedEvent['data']>(
        'survey.survey_created',
        this.handleSurveyCreated,
        'survey-system-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<SurveyUpdatedEvent['data']>(
        'survey.survey_updated',
        this.handleSurveyUpdated,
        'survey-system-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<SurveyPublishedEvent['data']>(
        'survey.survey_published',
        this.handleSurveyPublished,
        'survey-system-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<SurveyDeletedEvent['data']>(
        'survey.survey_deleted',
        this.handleSurveyDeleted,
        'survey-system-slice',
        { priority: 1 }
      )
    );

    // Survey Response Events
    this.subscriptionIds.push(
      subscribe<SurveyResponseSubmittedEvent['data']>(
        'survey.response_submitted',
        this.handleSurveyResponseSubmitted,
        'survey-system-slice',
        { priority: 1 }
      )
    );

    // Survey Analytics Events
    this.subscriptionIds.push(
      subscribe<SurveyAnalyticsGeneratedEvent['data']>(
        'survey.analytics_generated',
        this.handleSurveyAnalyticsGenerated,
        'survey-system-slice',
        { priority: 1 }
      )
    );

    logger.info('✅ Survey system event handlers initialized', {
      subscriptions: this.subscriptionIds.length,
      handlers: [
        'survey_created',
        'survey_updated',
        'survey_published',
        'survey_deleted',
        'response_submitted',
        'analytics_generated'
      ]
    });
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    // Implementation would depend on the event system's unsubscribe mechanism
    this.subscriptionIds = [];
    logger.info('🧹 Survey system event handlers cleaned up');
  }

  /**
   * Survey Lifecycle Event Handlers
   */

  /**
   * Handle survey created event
   */
  private handleSurveyCreated = async (event: SurveyCreatedEvent): Promise<void> => {
    try {
      const { survey, organization, creator, questionsCount } = event.data;
      
      logger.info('🎯 Processing survey created event', {
        eventId: event.id,
        surveyId: survey.id,
        surveyTitle: survey.title,
        organizationId: organization.id,
        creatorId: creator.id,
        questionsCount,
        isAnonymous: survey.isAnonymous,
        isMandatory: survey.isMandatory,
      });

      // Here you could add additional actions like:
      // - Send notifications to HR team about new survey
      // - Create initial analytics entry
      // - Sync with external systems
      // - Update survey creation metrics
      // - Schedule reminder notifications
      // - Create audit trail entries

      logger.info('✅ Survey created event processed successfully', {
        eventId: event.id,
        surveyId: survey.id,
        surveyTitle: survey.title,
      });
    } catch (error: any) {
      logger.error('❌ Error processing survey created event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle survey updated event
   */
  private handleSurveyUpdated = async (event: SurveyUpdatedEvent): Promise<void> => {
    try {
      const { survey, previousSurvey, updater, organization, updatedFields } = event.data;
      
      logger.info('🎯 Processing survey updated event', {
        eventId: event.id,
        surveyId: survey.id,
        surveyTitle: survey.title,
        previousStatus: previousSurvey.status,
        currentStatus: survey.status,
        updaterId: updater.id,
        organizationId: organization.id,
        updatedFields,
      });

      // Additional actions could include:
      // - Notify participants if survey parameters changed
      // - Update analytics if status changed from/to published
      // - Log audit trail for compliance
      // - Sync changes with external systems
      // - Update survey modification metrics

      logger.info('✅ Survey updated event processed successfully', {
        eventId: event.id,
        surveyId: survey.id,
        updatedFields,
      });
    } catch (error: any) {
      logger.error('❌ Error processing survey updated event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle survey published event
   */
  private handleSurveyPublished = async (event: SurveyPublishedEvent): Promise<void> => {
    try {
      const { survey, publisher, organization, questionsCount } = event.data;
      
      logger.info('🎯 Processing survey published event', {
        eventId: event.id,
        surveyId: survey.id,
        surveyTitle: survey.title,
        publisherId: publisher.id,
        organizationId: organization.id,
        questionsCount,
        isAnonymous: survey.isAnonymous,
        isMandatory: survey.isMandatory,
        startDate: survey.startDate?.toISOString().split('T')[0],
        endDate: survey.endDate?.toISOString().split('T')[0],
      });

      // Actions could include:
      // - Send email notifications to all eligible participants
      // - Create calendar reminders for survey completion
      // - Update dashboard metrics
      // - Send mobile push notifications
      // - Create survey announcement posts
      // - Schedule follow-up reminder notifications
      // - Update analytics tracking
      // - Sync with external HR systems

      logger.info('✅ Survey published event processed successfully', {
        eventId: event.id,
        surveyId: survey.id,
        surveyTitle: survey.title,
      });
    } catch (error: any) {
      logger.error('❌ Error processing survey published event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle survey deleted event
   */
  private handleSurveyDeleted = async (event: SurveyDeletedEvent): Promise<void> => {
    try {
      const { survey, deletedBy, organization } = event.data;
      
      logger.info('🎯 Processing survey deleted event', {
        eventId: event.id,
        surveyId: survey.id,
        surveyTitle: survey.title,
        deletedById: deletedBy.id,
        organizationId: organization.id,
      });

      // Actions could include:
      // - Archive survey data
      // - Clean up scheduled notifications
      // - Update analytics and reports
      // - Notify stakeholders about survey removal
      // - Log deletion for audit purposes
      // - Update survey metrics

      logger.info('✅ Survey deleted event processed successfully', {
        eventId: event.id,
        surveyId: survey.id,
        surveyTitle: survey.title,
      });
    } catch (error: any) {
      logger.error('❌ Error processing survey deleted event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Survey Response Event Handlers
   */

  /**
   * Handle survey response submitted event
   */
  private handleSurveyResponseSubmitted = async (event: SurveyResponseSubmittedEvent): Promise<void> => {
    try {
      const { response, survey, user, organization, answersCount, isAnonymous } = event.data;
      
      logger.info('🎯 Processing survey response submitted event', {
        eventId: event.id,
        responseId: response.id,
        surveyId: survey.id,
        surveyTitle: survey.title,
        userId: user?.id || 'anonymous',
        organizationId: organization?.id,
        answersCount,
        isAnonymous,
        timeToComplete: response.timeToComplete,
      });

      // Actions could include:
      // - Send confirmation email to respondent (if not anonymous)
      // - Update survey response metrics
      // - Award points for survey completion
      // - Send thank you notifications
      // - Update real-time analytics
      // - Trigger completion percentage updates
      // - Check for survey completion milestones
      // - Update participant engagement metrics

      logger.info('✅ Survey response submitted event processed successfully', {
        eventId: event.id,
        responseId: response.id,
        surveyId: survey.id,
        userId: user?.id || 'anonymous',
      });
    } catch (error: any) {
      logger.error('❌ Error processing survey response submitted event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Survey Analytics Event Handlers
   */

  /**
   * Handle survey analytics generated event
   */
  private handleSurveyAnalyticsGenerated = async (event: SurveyAnalyticsGeneratedEvent): Promise<void> => {
    try {
      const { survey, analytics, organization, generatedBy } = event.data;
      
      logger.info('🎯 Processing survey analytics generated event', {
        eventId: event.id,
        surveyId: survey.id,
        surveyTitle: survey.title,
        organizationId: organization.id,
        generatedById: generatedBy.id,
        totalResponses: analytics.totalResponses,
        completionRate: analytics.completionRate,
        averageCompletionTime: analytics.averageCompletionTime,
        lastUpdated: analytics.lastUpdated.toISOString(),
      });

      // Actions could include:
      // - Send analytics reports to stakeholders
      // - Update dashboard visualizations
      // - Create automated insights
      // - Schedule follow-up actions based on response rates
      // - Generate completion rate alerts
      // - Update executive summary reports
      // - Sync analytics with external systems

      logger.info('✅ Survey analytics generated event processed successfully', {
        eventId: event.id,
        surveyId: survey.id,
        totalResponses: analytics.totalResponses,
        completionRate: analytics.completionRate,
      });
    } catch (error: any) {
      logger.error('❌ Error processing survey analytics generated event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };
}

/**
 * Initialize survey system event handlers
 * Legacy function wrapper for backwards compatibility
 */
export const initializeSurveyEventHandlers = () => {
  const handlers = new SurveyEventHandlers();
  handlers.initialize();
  return handlers;
};