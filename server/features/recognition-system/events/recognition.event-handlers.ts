// Recognition Event Handlers
// Handles recognition domain events for cross-cutting concerns

import { subscribe, type RecognitionCreatedEvent, type RecognitionApprovedEvent, type PointsAwardedEvent, type RecognitionRejectedEvent, type ManagerBudgetUpdatedEvent } from '@shared/events';
import { logger } from '@shared/logger';

/**
 * Recognition Event Handler Service
 * Subscribes to recognition domain events and handles cross-cutting concerns
 */
export class RecognitionEventHandlers {
  private subscriptionIds: string[] = [];

  /**
   * Initialize all recognition event subscriptions
   */
  initialize(): void {
    this.subscriptionIds.push(
      subscribe<RecognitionCreatedEvent['data']>(
        'recognition.created',
        this.handleRecognitionCreated,
        'recognition-system-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<RecognitionApprovedEvent['data']>(
        'recognition.approved',
        this.handleRecognitionApproved,
        'recognition-system-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<PointsAwardedEvent['data']>(
        'points.awarded',
        this.handlePointsAwarded,
        'recognition-system-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<RecognitionRejectedEvent['data']>(
        'recognition.rejected',
        this.handleRecognitionRejected,
        'recognition-system-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<ManagerBudgetUpdatedEvent['data']>(
        'manager.budget_updated',
        this.handleManagerBudgetUpdated,
        'recognition-system-slice',
        { priority: 1 }
      )
    );

    logger.info('✅ Recognition event handlers initialized', {
      subscriptions: this.subscriptionIds.length
    });
  }

  /**
   * Clean up event subscriptions
   */
  destroy(): void {
    // Unsubscribe would be called here if available
    this.subscriptionIds = [];
    logger.info('🗑️ Recognition event handlers destroyed');
  }

  /**
   * Handle recognition created events
   */
  private handleRecognitionCreated = async (event: RecognitionCreatedEvent): Promise<void> => {
    try {
      logger.info('🎉 Recognition created event received', {
        recognitionId: event.data.recognition.id,
        recognizer: event.data.recognizer.name,
        recipient: event.data.recipient.name,
        badgeType: event.data.recognition.badgeType,
        points: event.data.recognition.points,
        status: event.data.recognition.status,
        organizationId: event.organizationId,
      });

      // Handle cross-cutting concerns:
      // 1. Send notification to recipient about new recognition
      // 2. Update recognition analytics/metrics
      // 3. Trigger social post creation (if auto-approved)
      // 4. Send real-time updates via WebSocket
      // 5. Update leaderboards/rankings

      // Example: Log for analytics tracking
      logger.info('📊 Recognition analytics event', {
        eventId: event.id,
        timestamp: event.timestamp,
        recognitionType: event.data.recognition.badgeType,
        recognizerDepartment: event.data.recognizer.department,
        recipientDepartment: event.data.recipient.department,
        organizationId: event.organizationId,
        autoApproved: event.metadata?.autoApproved || false,
      });

      // If auto-approved, trigger additional workflows
      if (event.data.recognition.status === 'approved') {
        logger.info('⚡ Auto-approved recognition, triggering additional workflows', {
          recognitionId: event.data.recognition.id,
        });
      }

      // Example: Trigger social features (could publish another event)
      if (event.data.recognition.status === 'approved') {
        // Could publish a social.post_created event here
        logger.info('📱 Triggering social post creation', {
          recognitionId: event.data.recognition.id,
          recipientId: event.data.recipient.id,
        });
      }

    } catch (error: any) {
      logger.error('❌ Error handling recognition created event', {
        error: error?.message || 'unknown_error',
        eventId: event.id,
        recognitionId: event.data.recognition.id,
      });
    }
  };

  /**
   * Handle recognition approved events
   */
  private handleRecognitionApproved = async (event: RecognitionApprovedEvent): Promise<void> => {
    try {
      logger.info('✅ Recognition approved event received', {
        recognitionId: event.data.recognition.id,
        recipientId: event.data.recognition.recipientId,
        points: event.data.recognition.points,
        approvedBy: event.data.approvedBy,
        transactionId: event.data.transaction.id,
      });

      // Handle cross-cutting concerns:
      // 1. Send approval notification to recipient
      // 2. Update recognition metrics and analytics
      // 3. Create social post about the recognition
      // 4. Update recipient's activity stream
      // 5. Send real-time notifications via WebSocket
      // 6. Update organization engagement metrics

      // Example: Update user engagement metrics
      logger.info('📈 Updating recipient engagement metrics', {
        recipientId: event.data.recognition.recipientId,
        newBalance: event.data.newBalance,
        pointsEarned: event.data.recognition.points,
      });

      // Example: Social integration
      logger.info('📱 Creating social post for approved recognition', {
        recognitionId: event.data.recognition.id,
        badgeType: event.data.recognition.badgeType,
      });

      // Example: Real-time notification
      logger.info('🔔 Sending real-time approval notification', {
        recipientId: event.data.recognition.recipientId,
        recognizerId: event.data.recognition.recognizerId,
      });

    } catch (error: any) {
      logger.error('❌ Error handling recognition approved event', {
        error: error?.message || 'unknown_error',
        eventId: event.id,
        recognitionId: event.data.recognition.id,
      });
    }
  };

  /**
   * Handle points awarded events
   */
  private handlePointsAwarded = async (event: PointsAwardedEvent): Promise<void> => {
    try {
      logger.info('💰 Points awarded event received', {
        userId: event.data.user.id,
        userName: event.data.user.name,
        amount: event.data.transaction.amount,
        reason: event.data.transaction.reason,
        source: event.data.context.source,
        newBalance: event.data.newBalance,
      });

      // Handle cross-cutting concerns:
      // 1. Update user points balance in cache
      // 2. Send points notification to user
      // 3. Update leaderboards and rankings
      // 4. Check for achievement unlocks
      // 5. Update organization points statistics
      // 6. Send real-time balance update

      // Example: Check for achievements or milestones
      if (event.data.newBalance >= 1000 && event.data.previousBalance < 1000) {
        logger.info('🏆 User reached 1000 points milestone', {
          userId: event.data.user.id,
          userName: event.data.user.name,
          newBalance: event.data.newBalance,
        });
        // Could trigger achievement.unlocked event
      }

      // Example: Update rankings (could be async job)
      logger.info('📊 Updating user rankings after points award', {
        userId: event.data.user.id,
        department: event.data.user.department,
        pointsChange: event.data.transaction.amount,
      });

      // Example: Real-time balance notification
      logger.info('🔄 Sending real-time balance update', {
        userId: event.data.user.id,
        newBalance: event.data.newBalance,
      });

    } catch (error: any) {
      logger.error('❌ Error handling points awarded event', {
        error: error?.message || 'unknown_error',
        eventId: event.id,
        userId: event.data.user.id,
      });
    }
  };

  /**
   * Handle recognition rejected events
   */
  private handleRecognitionRejected = async (event: RecognitionRejectedEvent): Promise<void> => {
    try {
      logger.info('❌ Recognition rejected event received', {
        recognitionId: event.data.recognition.id,
        recognizerId: event.data.recognition.recognizerId,
        recipientId: event.data.recognition.recipientId,
        rejectedBy: event.data.rejectedBy,
        reason: event.data.reason,
      });

      // Handle cross-cutting concerns:
      // 1. Send rejection notification to recognizer
      // 2. Log rejection for analytics and improvement
      // 3. Update recognition metrics
      // 4. Send feedback to recognition system for learning
      // 5. Notify admins if pattern of rejections

      // Example: Analytics tracking for rejection reasons
      logger.info('📈 Recording rejection analytics', {
        recognitionId: event.data.recognition.id,
        badgeType: event.data.recognition.badgeType,
        rejectionReason: event.data.reason,
        rejectedBy: event.data.rejectedBy,
      });

      // Example: Feedback notification to recognizer
      logger.info('📧 Sending rejection feedback to recognizer', {
        recognizerId: event.data.recognition.recognizerId,
        recognitionId: event.data.recognition.id,
        feedback: 'constructive',
      });

    } catch (error: any) {
      logger.error('❌ Error handling recognition rejected event', {
        error: error?.message || 'unknown_error',
        eventId: event.id,
        recognitionId: event.data.recognition.id,
      });
    }
  };

  /**
   * Handle manager budget updated events
   */
  private handleManagerBudgetUpdated = async (event: ManagerBudgetUpdatedEvent): Promise<void> => {
    try {
      logger.info('💼 Manager budget updated event received', {
        managerId: event.data.manager.id,
        managerName: event.data.manager.name,
        totalPoints: event.data.budget.totalPoints,
        remainingPoints: event.data.budget.remainingPoints,
        month: event.data.budget.month,
        year: event.data.budget.year,
        updatedBy: event.data.updatedBy,
      });

      // Handle cross-cutting concerns:
      // 1. Notify manager about budget update
      // 2. Update budget analytics and forecasting
      // 3. Send alerts if budget is running low
      // 4. Update organization budget summaries
      // 5. Notify finance team of budget changes

      // Example: Budget utilization check
      const utilizationRate = (event.data.budget.totalPoints - event.data.budget.remainingPoints) / event.data.budget.totalPoints;
      if (utilizationRate > 0.8) {
        logger.warn('⚠️ Manager budget utilization high', {
          managerId: event.data.manager.id,
          utilizationRate: Math.round(utilizationRate * 100),
          remainingPoints: event.data.budget.remainingPoints,
        });
      }

      // Example: Monthly budget analytics
      logger.info('📊 Recording budget analytics', {
        managerId: event.data.manager.id,
        department: event.data.manager.department,
        budgetChange: event.data.newBudget - (event.data.previousBudget || 0),
        period: `${event.data.budget.year}-${String(event.data.budget.month).padStart(2, '0')}`,
      });

    } catch (error: any) {
      logger.error('❌ Error handling manager budget updated event', {
        error: error?.message || 'unknown_error',
        eventId: event.id,
        managerId: event.data.manager.id,
      });
    }
  };
}

// Export singleton instance
export const recognitionEventHandlers = new RecognitionEventHandlers();