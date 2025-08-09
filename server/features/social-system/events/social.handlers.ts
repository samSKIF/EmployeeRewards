// Social System Event Handlers
// Handles cross-cutting concerns and event-driven integrations for social features

import { eventSystem } from '@shared/events';
import type { 
  PostCreatedEvent, 
  CommentAddedEvent, 
  ReactionAddedEvent, 
  PollVoteCastEvent,
  PostDeletedEvent,
  UserMentionedEvent,
  EngagementMilestoneEvent 
} from '@shared/events/social-events';
import { logger } from '@platform/sdk';
import { db } from '../../../db';
import { audit_logs } from '@shared/schema';

/**
 * Social Event Handlers
 * Manages event-driven cross-cutting concerns for social features
 */
export class SocialEventHandlers {
  private initialized = false;

  /**
   * Initialize all social event handlers
   */
  initialize(): void {
    if (this.initialized) {
      logger.warn('⚠️ Social event handlers already initialized');
      return;
    }

    try {
      this.setupPostCreatedHandler();
      this.setupCommentAddedHandler();
      this.setupReactionAddedHandler();
      this.setupPollVoteCastHandler();
      this.setupPostDeletedHandler();
      this.setupUserMentionedHandler();
      this.setupEngagementMilestoneHandler();

      this.initialized = true;
      logger.info('✅ Social system event handlers initialized', {
        handlers: [
          'post_created',
          'comment_added', 
          'reaction_added',
          'poll_vote_cast',
          'post_deleted',
          'user_mentioned',
          'engagement_milestone',
        ],
      });
    } catch (error: any) {
      logger.error('❌ Failed to initialize social event handlers', {
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  }

  /**
   * Handle post created events
   */
  private setupPostCreatedHandler(): void {
    eventSystem.subscribe<PostCreatedEvent['data']>(
      'social.post_created',
      async (event) => {
        try {
          // Log activity
          await this.logActivity({
            userId: event.data.post.authorId,
            organizationId: event.data.post.organizationId,
            action: 'post_created',
            resourceType: 'social_post',
            resourceId: event.data.post.id,
            details: {
              postType: event.data.post.type,
              visibility: event.data.post.visibility,
              content: event.data.post.content.substring(0, 100) + '...',
              tags: event.data.post.tags,
              hasImage: !!event.data.post.imageUrl,
              isPoll: event.data.post.type === 'poll',
              pollOptions: event.data.pollData?.options,
            },
            metadata: {
              eventId: event.id,
              correlationId: event.correlationId,
            },
          });

          // Handle recognition posts
          if (event.data.post.type === 'recognition' && event.data.recognitionData) {
            await this.handleRecognitionPost(event);
          }

          // Handle poll posts
          if (event.data.post.type === 'poll' && event.data.pollData) {
            await this.handlePollPost(event);
          }

          logger.info('✅ Post created event processed', {
            postId: event.data.post.id,
            authorId: event.data.post.authorId,
            type: event.data.post.type,
            correlationId: event.correlationId,
          });
        } catch (error: any) {
          logger.error('❌ Error processing post created event', {
            error: error?.message || 'unknown_error',
            eventId: event.id,
            postId: event.data.post.id,
          });
          throw error;
        }
      },
      'social-event-handlers'
    );
  }

  /**
   * Handle comment added events
   */
  private setupCommentAddedHandler(): void {
    eventSystem.subscribe<CommentAddedEvent['data']>(
      'social.comment_added',
      async (event) => {
        try {
          // Log activity
          await this.logActivity({
            userId: event.data.comment.authorId,
            organizationId: event.data.comment.organizationId,
            action: 'comment_added',
            resourceType: 'comment',
            resourceId: event.data.comment.id,
            details: {
              postId: event.data.comment.postId,
              postAuthorId: event.data.post.authorId,
              content: event.data.comment.content.substring(0, 100) + '...',
              isReply: event.data.isReply,
              parentCommentId: event.data.comment.parentCommentId,
              mentions: event.data.mentions?.map(m => m.userName) || [],
            },
            metadata: {
              eventId: event.id,
              correlationId: event.correlationId,
            },
          });

          // Handle mentions in comments
          if (event.data.mentions && event.data.mentions.length > 0) {
            await this.processMentions(event.data.mentions, event);
          }

          logger.info('✅ Comment added event processed', {
            commentId: event.data.comment.id,
            postId: event.data.comment.postId,
            authorId: event.data.comment.authorId,
            isReply: event.data.isReply,
            correlationId: event.correlationId,
          });
        } catch (error: any) {
          logger.error('❌ Error processing comment added event', {
            error: error?.message || 'unknown_error',
            eventId: event.id,
            commentId: event.data.comment.id,
          });
          throw error;
        }
      },
      'social-event-handlers'
    );
  }

  /**
   * Handle reaction added events
   */
  private setupReactionAddedHandler(): void {
    eventSystem.subscribe<ReactionAddedEvent['data']>(
      'social.reaction_added',
      async (event) => {
        try {
          // Log activity
          await this.logActivity({
            userId: event.data.reaction.userId,
            organizationId: event.data.target.organizationId,
            action: 'reaction_added',
            resourceType: event.data.target.type,
            resourceId: event.data.target.id,
            details: {
              reactionType: event.data.reaction.type,
              targetAuthorId: event.data.target.authorId,
              targetAuthorName: event.data.target.authorName,
              previousReaction: event.data.previousReaction,
              reactorName: event.data.reactor.name,
              reactorDepartment: event.data.reactor.department,
            },
            metadata: {
              eventId: event.id,
              correlationId: event.correlationId,
            },
          });

          logger.info('✅ Reaction added event processed', {
            targetId: event.data.target.id,
            targetType: event.data.target.type,
            userId: event.data.reaction.userId,
            reactionType: event.data.reaction.type,
            correlationId: event.correlationId,
          });
        } catch (error: any) {
          logger.error('❌ Error processing reaction added event', {
            error: error?.message || 'unknown_error',
            eventId: event.id,
            targetId: event.data.target.id,
          });
          throw error;
        }
      },
      'social-event-handlers'
    );
  }

  /**
   * Handle poll vote cast events
   */
  private setupPollVoteCastHandler(): void {
    eventSystem.subscribe<PollVoteCastEvent['data']>(
      'social.poll_vote_cast',
      async (event) => {
        try {
          // Log activity
          await this.logActivity({
            userId: event.data.vote.userId,
            organizationId: event.data.poll.organizationId,
            action: 'poll_vote_cast',
            resourceType: 'poll',
            resourceId: event.data.poll.postId,
            details: {
              option: event.data.vote.option,
              previousOption: event.data.vote.previousOption,
              isFirstVote: event.data.isFirstVote,
              pollQuestion: event.data.poll.question.substring(0, 100) + '...',
              pollAuthorId: event.data.poll.authorId,
              voterName: event.data.voter.name,
              voterDepartment: event.data.voter.department,
            },
            metadata: {
              eventId: event.id,
              correlationId: event.correlationId,
            },
          });

          logger.info('✅ Poll vote cast event processed', {
            postId: event.data.poll.postId,
            userId: event.data.vote.userId,
            option: event.data.vote.option,
            isFirstVote: event.data.isFirstVote,
            correlationId: event.correlationId,
          });
        } catch (error: any) {
          logger.error('❌ Error processing poll vote cast event', {
            error: error?.message || 'unknown_error',
            eventId: event.id,
            postId: event.data.poll.postId,
          });
          throw error;
        }
      },
      'social-event-handlers'
    );
  }

  /**
   * Handle post deleted events
   */
  private setupPostDeletedHandler(): void {
    eventSystem.subscribe<PostDeletedEvent['data']>(
      'social.post_deleted',
      async (event) => {
        try {
          // Log activity
          await this.logActivity({
            userId: event.data.deletedBy.id,
            organizationId: event.data.post.organizationId,
            action: 'post_deleted',
            resourceType: 'social_post',
            resourceId: event.data.post.id,
            details: {
              postType: event.data.post.type,
              postAuthorId: event.data.post.authorId,
              postAuthorName: event.data.post.authorName,
              isAuthor: event.data.deletedBy.isAuthor,
              reason: event.data.reason,
              commentsCount: event.data.post.commentsCount,
              reactionsCount: event.data.post.reactionsCount,
              deletedAt: event.data.post.deletedAt,
            },
            metadata: {
              eventId: event.id,
              correlationId: event.correlationId,
            },
          });

          logger.info('✅ Post deleted event processed', {
            postId: event.data.post.id,
            deletedBy: event.data.deletedBy.id,
            reason: event.data.reason,
            correlationId: event.correlationId,
          });
        } catch (error: any) {
          logger.error('❌ Error processing post deleted event', {
            error: error?.message || 'unknown_error',
            eventId: event.id,
            postId: event.data.post.id,
          });
          throw error;
        }
      },
      'social-event-handlers'
    );
  }

  /**
   * Handle user mentioned events
   */
  private setupUserMentionedHandler(): void {
    eventSystem.subscribe<UserMentionedEvent['data']>(
      'social.user_mentioned',
      async (event) => {
        try {
          // Log activity
          await this.logActivity({
            userId: event.data.mention.mentionedByUserId,
            organizationId: event.data.mention.organizationId,
            action: 'user_mentioned',
            resourceType: event.data.content.type,
            resourceId: event.data.content.id,
            details: {
              mentionedUserId: event.data.mention.mentionedUserId,
              mentionedUserName: event.data.mention.mentionedUserName,
              postId: event.data.context.postId,
              commentId: event.data.context.commentId,
              content: event.data.content.content.substring(0, 100) + '...',
            },
            metadata: {
              eventId: event.id,
              correlationId: event.correlationId,
            },
          });

          logger.info('✅ User mentioned event processed', {
            mentionedUserId: event.data.mention.mentionedUserId,
            mentionedByUserId: event.data.mention.mentionedByUserId,
            contentType: event.data.content.type,
            contentId: event.data.content.id,
            correlationId: event.correlationId,
          });
        } catch (error: any) {
          logger.error('❌ Error processing user mentioned event', {
            error: error?.message || 'unknown_error',
            eventId: event.id,
            contentId: event.data.content.id,
          });
          throw error;
        }
      },
      'social-event-handlers'
    );
  }

  /**
   * Handle engagement milestone events
   */
  private setupEngagementMilestoneHandler(): void {
    eventSystem.subscribe<EngagementMilestoneEvent['data']>(
      'social.engagement_milestone',
      async (event) => {
        try {
          // Log activity
          await this.logActivity({
            userId: 0, // System event
            organizationId: event.data.entity.organizationId,
            action: 'engagement_milestone_reached',
            resourceType: event.data.entity.type,
            resourceId: event.data.entity.id,
            details: {
              milestoneType: event.data.milestone.type,
              threshold: event.data.milestone.threshold,
              actualValue: event.data.milestone.actualValue,
              period: event.data.milestone.period,
              metrics: event.data.metrics,
            },
            metadata: {
              eventId: event.id,
              correlationId: event.correlationId,
            },
          });

          logger.info('✅ Engagement milestone event processed', {
            entityId: event.data.entity.id,
            entityType: event.data.entity.type,
            milestoneType: event.data.milestone.type,
            threshold: event.data.milestone.threshold,
            actualValue: event.data.milestone.actualValue,
            correlationId: event.correlationId,
          });
        } catch (error: any) {
          logger.error('❌ Error processing engagement milestone event', {
            error: error?.message || 'unknown_error',
            eventId: event.id,
            entityId: event.data.entity.id,
          });
          throw error;
        }
      },
      'social-event-handlers'
    );
  }

  /**
   * Helper method to log activities to the database
   */
  private async logActivity(activity: {
    userId: number;
    organizationId: number;
    action: string;
    resourceType: string;
    resourceId: string;
    details: Record<string, any>;
    metadata: Record<string, any>;
  }): Promise<void> {
    try {
      await db.insert(audit_logs).values({
        user_id: activity.userId || null,
        organization_id: activity.organizationId,
        action: activity.action,
        table_name: activity.resourceType,
        record_id: parseInt(activity.resourceId) || null,
        old_values: null, // Social events don't have old values
        new_values: activity.details,
        ip_address: null, // Not available in event context
        user_agent: activity.metadata.userAgent as string || null,
      });
    } catch (error: any) {
      logger.error('❌ Failed to log activity', {
        error: error?.message || 'unknown_error',
        activity,
      });
      // Don't throw here - activity logging should not break the main flow
    }
  }

  /**
   * Helper method to handle recognition posts
   */
  private async handleRecognitionPost(event: PostCreatedEvent): Promise<void> {
    try {
      if (!event.data.recognitionData) return;

      logger.info('🏆 Processing recognition post', {
        postId: event.data.post.id,
        recognizerId: event.data.post.authorId,
        recipientId: event.data.recognitionData.recipientId,
        points: event.data.recognitionData.points,
      });

      // Recognition posts could trigger additional events
      // This could integrate with the recognition system
    } catch (error: any) {
      logger.error('❌ Error handling recognition post', {
        error: error?.message || 'unknown_error',
        postId: event.data.post.id,
      });
    }
  }

  /**
   * Helper method to handle poll posts
   */
  private async handlePollPost(event: PostCreatedEvent): Promise<void> {
    try {
      if (!event.data.pollData) return;

      logger.info('📊 Processing poll post', {
        postId: event.data.post.id,
        authorId: event.data.post.authorId,
        optionsCount: event.data.pollData.options.length,
        expiresAt: event.data.pollData.expiresAt,
      });

      // Poll posts could trigger additional logic like scheduling expiration notifications
    } catch (error: any) {
      logger.error('❌ Error handling poll post', {
        error: error?.message || 'unknown_error',
        postId: event.data.post.id,
      });
    }
  }

  /**
   * Helper method to process mentions
   */
  private async processMentions(mentions: any[], event: CommentAddedEvent): Promise<void> {
    try {
      for (const mention of mentions) {
        logger.info('📢 Processing mention', {
          mentionedUser: mention.userName,
          commentId: event.data.comment.id,
          postId: event.data.comment.postId,
        });

        // Mentions could trigger notification events
        // This could integrate with notification systems
      }
    } catch (error: any) {
      logger.error('❌ Error processing mentions', {
        error: error?.message || 'unknown_error',
        mentions,
      });
    }
  }
}

// Export singleton instance
export const socialEventHandlers = new SocialEventHandlers();