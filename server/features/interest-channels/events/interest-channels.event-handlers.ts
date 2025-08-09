// Interest Channels Event Handlers
// Processes domain events for interest channels features

import { subscribe } from '@shared/events';
import { logger } from '@platform/sdk';
import type {
  InterestChannelCreatedEvent,
  InterestChannelUpdatedEvent,
  ChannelPostCreatedEvent,
  MemberJoinedChannelEvent,
  MemberLeftChannelEvent,
  JoinRequestCreatedEvent,
  JoinRequestApprovedEvent,
  JoinRequestRejectedEvent,
  PostPinnedEvent,
  PostUnpinnedEvent,
} from '@shared/events/interest-channels-events';

/**
 * Interest Channels Event Handler Service
 * Handles interest channels domain events for cross-cutting concerns
 */
export class InterestChannelsEventHandlers {
  private subscriptionIds: string[] = [];

  /**
   * Initialize all interest channels event subscriptions
   */
  initialize(): void {
    // Channel Lifecycle Events
    this.subscriptionIds.push(
      subscribe<InterestChannelCreatedEvent['data']>(
        'interest_channels.channel_created',
        this.handleChannelCreated,
        'interest-channels-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<InterestChannelUpdatedEvent['data']>(
        'interest_channels.channel_updated',
        this.handleChannelUpdated,
        'interest-channels-slice',
        { priority: 1 }
      )
    );

    // Channel Content Events
    this.subscriptionIds.push(
      subscribe<ChannelPostCreatedEvent['data']>(
        'interest_channels.post_created',
        this.handlePostCreated,
        'interest-channels-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<PostPinnedEvent['data']>(
        'interest_channels.post_pinned',
        this.handlePostPinned,
        'interest-channels-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<PostUnpinnedEvent['data']>(
        'interest_channels.post_unpinned',
        this.handlePostUnpinned,
        'interest-channels-slice',
        { priority: 1 }
      )
    );

    // Membership Events
    this.subscriptionIds.push(
      subscribe<MemberJoinedChannelEvent['data']>(
        'interest_channels.member_joined',
        this.handleMemberJoined,
        'interest-channels-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<MemberLeftChannelEvent['data']>(
        'interest_channels.member_left',
        this.handleMemberLeft,
        'interest-channels-slice',
        { priority: 1 }
      )
    );

    // Join Request Events
    this.subscriptionIds.push(
      subscribe<JoinRequestCreatedEvent['data']>(
        'interest_channels.join_request_created',
        this.handleJoinRequestCreated,
        'interest-channels-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<JoinRequestApprovedEvent['data']>(
        'interest_channels.join_request_approved',
        this.handleJoinRequestApproved,
        'interest-channels-slice',
        { priority: 1 }
      )
    );

    this.subscriptionIds.push(
      subscribe<JoinRequestRejectedEvent['data']>(
        'interest_channels.join_request_rejected',
        this.handleJoinRequestRejected,
        'interest-channels-slice',
        { priority: 1 }
      )
    );

    logger.info('✅ Interest channels event handlers initialized', {
      subscriptions: this.subscriptionIds.length,
      handlers: [
        'channel_created',
        'channel_updated',
        'post_created',
        'post_pinned',
        'post_unpinned',
        'member_joined',
        'member_left',
        'join_request_created',
        'join_request_approved',
        'join_request_rejected'
      ]
    });
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    // Implementation would depend on the event system's unsubscribe mechanism
    this.subscriptionIds = [];
    logger.info('🧹 Interest channels event handlers cleaned up');
  }

  /**
   * Channel Lifecycle Event Handlers
   */

  /**
   * Handle interest channel created event
   */
  private handleChannelCreated = async (event: InterestChannelCreatedEvent): Promise<void> => {
    try {
      const { channel, interest, organization, creator, isAutoCreated, memberCount } = event.data;
      
      logger.info('🎯 Processing interest channel created event', {
        eventId: event.id,
        channelId: channel.id,
        channelName: channel.name,
        interestId: interest.id,
        interestName: interest.name,
        organizationId: organization.id,
        creatorId: creator.id,
        isAutoCreated,
        memberCount,
        isPrivate: channel.isPrivate,
        channelType: channel.channelType,
      });

      // Here you could add additional actions like:
      // - Send notifications to users with the same interest
      // - Create welcome post for the channel
      // - Auto-invite users based on interest matching
      // - Update interest analytics
      // - Create initial channel guidelines post
      // - Sync with external community systems
      // - Award points for channel creation
      // - Update user engagement metrics

      logger.info('✅ Interest channel created event processed successfully', {
        eventId: event.id,
        channelId: channel.id,
        channelName: channel.name,
      });
    } catch (error: any) {
      logger.error('❌ Error processing interest channel created event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle interest channel updated event
   */
  private handleChannelUpdated = async (event: InterestChannelUpdatedEvent): Promise<void> => {
    try {
      const { channel, previousChannel, updater, organization, updatedFields } = event.data;
      
      logger.info('🎯 Processing interest channel updated event', {
        eventId: event.id,
        channelId: channel.id,
        channelName: channel.name,
        previousName: previousChannel.name,
        updaterId: updater.id,
        organizationId: organization.id,
        updatedFields,
      });

      // Additional actions could include:
      // - Notify channel members about significant changes
      // - Log audit trail for compliance
      // - Update search indexes if name changed
      // - Sync changes with external systems
      // - Update channel analytics
      // - Send notifications for privacy changes

      logger.info('✅ Interest channel updated event processed successfully', {
        eventId: event.id,
        channelId: channel.id,
        updatedFields,
      });
    } catch (error: any) {
      logger.error('❌ Error processing interest channel updated event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Channel Content Event Handlers
   */

  /**
   * Handle channel post created event
   */
  private handlePostCreated = async (event: ChannelPostCreatedEvent): Promise<void> => {
    try {
      const { post, channel, author, organization, postType, hasAttachments } = event.data;
      
      logger.info('🎯 Processing channel post created event', {
        eventId: event.id,
        postId: post.id,
        channelId: channel.id,
        channelName: channel.name,
        authorId: author.id,
        organizationId: organization.id,
        postType,
        hasAttachments,
        isPrivate: channel.isPrivate,
      });

      // Actions could include:
      // - Send notifications to channel members
      // - Update channel activity metrics
      // - Index content for search
      // - Award points for posting
      // - Send mobile push notifications
      // - Update user engagement metrics
      // - Create activity feed entries
      // - Process attachments for virus scanning
      // - Generate content recommendations

      logger.info('✅ Channel post created event processed successfully', {
        eventId: event.id,
        postId: post.id,
        channelId: channel.id,
        postType,
      });
    } catch (error: any) {
      logger.error('❌ Error processing channel post created event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle post pinned event
   */
  private handlePostPinned = async (event: PostPinnedEvent): Promise<void> => {
    try {
      const { post, channelId, pinnedBy, organization } = event.data;
      
      logger.info('🎯 Processing post pinned event', {
        eventId: event.id,
        postId: post.id,
        channelId,
        pinnedById: pinnedBy.id,
        organizationId: organization.id,
        postType: post.postType,
      });

      // Actions could include:
      // - Notify channel members about pinned post
      // - Update channel highlights
      // - Award points for important posts
      // - Update post visibility metrics
      // - Create announcement about pinned content

      logger.info('✅ Post pinned event processed successfully', {
        eventId: event.id,
        postId: post.id,
        channelId,
      });
    } catch (error: any) {
      logger.error('❌ Error processing post pinned event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle post unpinned event
   */
  private handlePostUnpinned = async (event: PostUnpinnedEvent): Promise<void> => {
    try {
      const { post, channelId, unpinnedBy, organization } = event.data;
      
      logger.info('🎯 Processing post unpinned event', {
        eventId: event.id,
        postId: post.id,
        channelId,
        unpinnedById: unpinnedBy.id,
        organizationId: organization.id,
        postType: post.postType,
      });

      // Actions could include:
      // - Update channel highlights
      // - Update post visibility metrics
      // - Clean up related notifications

      logger.info('✅ Post unpinned event processed successfully', {
        eventId: event.id,
        postId: post.id,
        channelId,
      });
    } catch (error: any) {
      logger.error('❌ Error processing post unpinned event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Membership Event Handlers
   */

  /**
   * Handle member joined channel event
   */
  private handleMemberJoined = async (event: MemberJoinedChannelEvent): Promise<void> => {
    try {
      const { member, channel, user, organization, joinMethod } = event.data;
      
      logger.info('🎯 Processing member joined channel event', {
        eventId: event.id,
        memberId: member.id,
        channelId: channel.id,
        channelName: channel.name,
        userId: user.id,
        organizationId: organization.id,
        role: member.role,
        joinMethod,
        isPrivate: channel.isPrivate,
      });

      // Actions could include:
      // - Send welcome message to new member
      // - Notify channel admins about new member
      // - Award points for joining
      // - Update channel member count
      // - Send mobile push notification
      // - Update user activity feed
      // - Create onboarding tasks
      // - Update member directory

      logger.info('✅ Member joined channel event processed successfully', {
        eventId: event.id,
        memberId: member.id,
        channelId: channel.id,
        joinMethod,
      });
    } catch (error: any) {
      logger.error('❌ Error processing member joined channel event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle member left channel event
   */
  private handleMemberLeft = async (event: MemberLeftChannelEvent): Promise<void> => {
    try {
      const { channelId, user, organization, previousRole } = event.data;
      
      logger.info('🎯 Processing member left channel event', {
        eventId: event.id,
        channelId,
        userId: user.id,
        organizationId: organization.id,
        previousRole,
      });

      // Actions could include:
      // - Notify channel admins about member leaving
      // - Update channel member count
      // - Clean up member-specific data
      // - Update activity metrics
      // - Archive user's contributions

      logger.info('✅ Member left channel event processed successfully', {
        eventId: event.id,
        channelId,
        userId: user.id,
        previousRole,
      });
    } catch (error: any) {
      logger.error('❌ Error processing member left channel event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Join Request Event Handlers
   */

  /**
   * Handle join request created event
   */
  private handleJoinRequestCreated = async (event: JoinRequestCreatedEvent): Promise<void> => {
    try {
      const { joinRequest, channel, user, organization, message } = event.data;
      
      logger.info('🎯 Processing join request created event', {
        eventId: event.id,
        requestId: joinRequest.id,
        channelId: channel.id,
        channelName: channel.name,
        userId: user.id,
        organizationId: organization.id,
        hasMessage: !!message,
        isPrivate: channel.isPrivate,
      });

      // Actions could include:
      // - Send notification to channel admins/moderators
      // - Create approval workflow
      // - Send confirmation to requesting user
      // - Update pending requests metrics
      // - Create review task for admins

      logger.info('✅ Join request created event processed successfully', {
        eventId: event.id,
        requestId: joinRequest.id,
        channelId: channel.id,
      });
    } catch (error: any) {
      logger.error('❌ Error processing join request created event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle join request approved event
   */
  private handleJoinRequestApproved = async (event: JoinRequestApprovedEvent): Promise<void> => {
    try {
      const { joinRequest, member, reviewer, organization } = event.data;
      
      logger.info('🎯 Processing join request approved event', {
        eventId: event.id,
        requestId: joinRequest.id,
        memberId: member.id,
        channelId: member.channelId,
        userId: member.userId,
        reviewerId: reviewer.id,
        organizationId: organization.id,
        memberRole: member.role,
      });

      // Actions could include:
      // - Send approval notification to user
      // - Send welcome message to channel
      // - Update approval metrics
      // - Award points for successful join
      // - Update reviewer activity

      logger.info('✅ Join request approved event processed successfully', {
        eventId: event.id,
        requestId: joinRequest.id,
        memberId: member.id,
      });
    } catch (error: any) {
      logger.error('❌ Error processing join request approved event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };

  /**
   * Handle join request rejected event
   */
  private handleJoinRequestRejected = async (event: JoinRequestRejectedEvent): Promise<void> => {
    try {
      const { joinRequest, reviewer, organization } = event.data;
      
      logger.info('🎯 Processing join request rejected event', {
        eventId: event.id,
        requestId: joinRequest.id,
        channelId: joinRequest.channelId,
        userId: joinRequest.userId,
        reviewerId: reviewer.id,
        organizationId: organization.id,
      });

      // Actions could include:
      // - Send rejection notification to user
      // - Update rejection metrics
      // - Log rejection reason for analytics
      // - Clean up pending request data

      logger.info('✅ Join request rejected event processed successfully', {
        eventId: event.id,
        requestId: joinRequest.id,
      });
    } catch (error: any) {
      logger.error('❌ Error processing join request rejected event', {
        eventId: event.id,
        error: error?.message || 'unknown_error',
      });
      throw error;
    }
  };
}

/**
 * Initialize interest channels event handlers
 * Legacy function wrapper for backwards compatibility
 */
export const initializeInterestChannelsEventHandlers = () => {
  const handlers = new InterestChannelsEventHandlers();
  handlers.initialize();
  return handlers;
};