// Interest Channels Domain Layer
// Contains business logic, validation, and domain events for interest channels operations

import { z } from 'zod';
import { eventSystem } from '@shared/events';
import { logger } from '@platform/sdk';
import type { InterestChannelsRepository } from '../infrastructure/interest-channels.repository';
import type {
  InterestChannel,
  InterestChannelPost,
  InterestChannelMember,
  InterestChannelJoinRequest,
  InsertInterestChannel,
  InsertInterestChannelPost,
  InsertInterestChannelMember,
  InsertInterestChannelJoinRequest,
} from '@shared/schema';

// Domain Data Transfer Objects
export interface CreateInterestChannelData {
  name: string;
  description?: string;
  interestId: number;
  channelType?: string;
  isPrivate?: boolean;
  isAutoCreated?: boolean;
  autoJoinRoles?: string[];
  moderatorPermissions?: any;
  memberPermissions?: any;
  maxMembers?: number;
}

export interface UpdateInterestChannelData {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  isActive?: boolean;
  moderatorPermissions?: any;
  memberPermissions?: any;
  maxMembers?: number;
}

export interface CreateChannelPostData {
  channelId: number;
  title?: string;
  content: string;
  postType?: string;
  attachments?: any;
  tags?: string[];
}

export interface UpdateChannelPostData {
  title?: string;
  content?: string;
  postType?: string;
  attachments?: any;
  tags?: string[];
}

export interface CreateJoinRequestData {
  channelId: number;
  message?: string;
}

export interface InterestChannelFilters {
  channelType?: string;
  isPrivate?: boolean;
  isActive?: boolean;
  interestId?: number;
  createdBy?: number;
  search?: string;
}

export interface ChannelPostFilters {
  postType?: string;
  tags?: string[];
  authorId?: number;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

// Validation Schemas
export const createInterestChannelSchema = z.object({
  name: z.string().min(1, 'Channel name is required').max(100, 'Channel name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  interestId: z.number().min(1, 'Interest ID is required'),
  channelType: z.enum(['interest', 'department', 'site', 'project', 'company']).optional().default('interest'),
  isPrivate: z.boolean().optional().default(false),
  isAutoCreated: z.boolean().optional().default(false),
  autoJoinRoles: z.array(z.string()).optional(),
  moderatorPermissions: z.any().optional(),
  memberPermissions: z.any().optional(),
  maxMembers: z.number().min(1).max(10000).optional(),
});

export const updateInterestChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().optional(),
  isActive: z.boolean().optional(),
  moderatorPermissions: z.any().optional(),
  memberPermissions: z.any().optional(),
  maxMembers: z.number().min(1).max(10000).optional(),
});

export const createChannelPostSchema = z.object({
  channelId: z.number().min(1, 'Channel ID is required'),
  title: z.string().max(200, 'Title too long').optional(),
  content: z.string().min(1, 'Post content is required').max(5000, 'Content too long'),
  postType: z.enum(['text', 'poll', 'announcement', 'question', 'event', 'resource']).optional().default('text'),
  attachments: z.any().optional(),
  tags: z.array(z.string().max(50)).max(10, 'Maximum 10 tags allowed').optional(),
});

export const updateChannelPostSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  postType: z.enum(['text', 'poll', 'announcement', 'question', 'event', 'resource']).optional(),
  attachments: z.any().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const createJoinRequestSchema = z.object({
  channelId: z.number().min(1, 'Channel ID is required'),
  message: z.string().max(500, 'Message too long').optional(),
});

/**
 * Interest Channels Domain Service
 * Handles business logic for interest channels management
 */
export class InterestChannelsDomain {
  /**
   * Create a new interest channel
   */
  static async createInterestChannel(
    data: CreateInterestChannelData,
    organizationId: number,
    createdBy: number,
    repository: InterestChannelsRepository
  ): Promise<InterestChannel> {
    try {
      // Validate input data
      const validatedData = createInterestChannelSchema.parse(data);
      
      logger.info('🎯 Creating interest channel', {
        name: validatedData.name,
        interestId: validatedData.interestId,
        channelType: validatedData.channelType,
        organizationId,
        createdBy,
      });

      // Business validations
      // Check if interest exists and belongs to organization
      const interest = await repository.getInterestById(validatedData.interestId, organizationId);
      if (!interest) {
        throw new Error('Interest not found or not accessible in your organization');
      }

      // Check for duplicate channel names within the same interest
      const existingChannel = await repository.getChannelByNameAndInterest(
        validatedData.name,
        validatedData.interestId,
        organizationId
      );
      if (existingChannel) {
        throw new Error('A channel with this name already exists for this interest');
      }

      // Create channel
      const channel = await repository.createInterestChannel(
        validatedData,
        organizationId,
        createdBy
      );

      // Auto-join creator as admin
      await repository.addChannelMember(
        channel.id,
        createdBy,
        'admin',
        organizationId
      );

      // Publish domain event
      await eventSystem.publishEvent('interest_channels.channel_created', {
        channel,
        interest,
        organization: { id: organizationId },
        creator: { id: createdBy },
        isAutoCreated: validatedData.isAutoCreated,
        memberCount: 1,
      });

      logger.info('✅ Interest channel created successfully', {
        channelId: channel.id,
        name: channel.name,
        interestId: channel.interestId,
        organizationId,
        createdBy,
      });

      return channel;
    } catch (error: any) {
      logger.error('❌ Error creating interest channel', {
        error: error?.message || 'unknown_error',
        name: data.name,
        organizationId,
        createdBy,
      });
      throw error;
    }
  }

  /**
   * Update interest channel
   */
  static async updateInterestChannel(
    channelId: number,
    data: UpdateInterestChannelData,
    organizationId: number,
    updatedBy: number,
    repository: InterestChannelsRepository
  ): Promise<InterestChannel> {
    try {
      // Validate input data
      const validatedData = updateInterestChannelSchema.parse(data);

      logger.info('🎯 Updating interest channel', {
        channelId,
        updateFields: Object.keys(validatedData),
        organizationId,
        updatedBy,
      });

      // Get current channel for comparison and authorization
      const currentChannel = await repository.getChannelById(channelId, organizationId);
      if (!currentChannel) {
        throw new Error('Channel not found');
      }

      // Check if user has permission to update (must be admin or moderator)
      const membership = await repository.getChannelMembership(channelId, updatedBy, organizationId);
      if (!membership || !['admin', 'moderator'].includes(membership.role)) {
        throw new Error('Insufficient permissions to update channel');
      }

      // Business rule: Name uniqueness check if name is being changed
      if (validatedData.name && validatedData.name !== currentChannel.name) {
        const existingChannel = await repository.getChannelByNameAndInterest(
          validatedData.name,
          currentChannel.interestId!,
          organizationId
        );
        if (existingChannel && existingChannel.id !== channelId) {
          throw new Error('A channel with this name already exists for this interest');
        }
      }

      // Update channel
      const updatedChannel = await repository.updateInterestChannel(
        channelId,
        validatedData,
        organizationId
      );

      if (!updatedChannel) {
        throw new Error('Channel not found or update failed');
      }

      // Publish domain event
      await eventSystem.publishEvent('interest_channels.channel_updated', {
        channel: updatedChannel,
        previousChannel: currentChannel,
        updater: { id: updatedBy },
        organization: { id: organizationId },
        updatedFields: Object.keys(validatedData),
      });

      logger.info('✅ Interest channel updated successfully', {
        channelId,
        name: updatedChannel.name,
        organizationId,
        updatedBy,
      });

      return updatedChannel;
    } catch (error: any) {
      logger.error('❌ Error updating interest channel', {
        error: error?.message || 'unknown_error',
        channelId,
        organizationId,
        updatedBy,
      });
      throw error;
    }
  }

  /**
   * Create channel post
   */
  static async createChannelPost(
    data: CreateChannelPostData,
    userId: number,
    organizationId: number,
    repository: InterestChannelsRepository
  ): Promise<InterestChannelPost> {
    try {
      // Validate input data
      const validatedData = createChannelPostSchema.parse(data);
      
      logger.info('🎯 Creating channel post', {
        channelId: validatedData.channelId,
        postType: validatedData.postType,
        userId,
        organizationId,
      });

      // Verify channel exists and user is a member
      const channel = await repository.getChannelById(validatedData.channelId, organizationId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      const membership = await repository.getChannelMembership(validatedData.channelId, userId, organizationId);
      if (!membership) {
        throw new Error('Must be a channel member to post');
      }

      // Business rule: Check posting permissions
      if (validatedData.postType === 'announcement' && !['admin', 'moderator'].includes(membership.role)) {
        throw new Error('Only admins and moderators can create announcements');
      }

      // Create post
      const post = await repository.createChannelPost(validatedData, userId, organizationId);

      // Publish domain event
      await eventSystem.publishEvent('interest_channels.post_created', {
        post,
        channel,
        author: { id: userId },
        organization: { id: organizationId },
        postType: validatedData.postType,
        hasAttachments: !!validatedData.attachments,
      });

      logger.info('✅ Channel post created successfully', {
        postId: post.id,
        channelId: validatedData.channelId,
        postType: post.postType,
        userId,
        organizationId,
      });

      return post;
    } catch (error: any) {
      logger.error('❌ Error creating channel post', {
        error: error?.message || 'unknown_error',
        channelId: data.channelId,
        userId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Request to join channel
   */
  static async requestToJoinChannel(
    data: CreateJoinRequestData,
    userId: number,
    organizationId: number,
    repository: InterestChannelsRepository
  ): Promise<InterestChannelJoinRequest | InterestChannelMember> {
    try {
      // Validate input data
      const validatedData = createJoinRequestSchema.parse(data);
      
      logger.info('🎯 Processing channel join request', {
        channelId: validatedData.channelId,
        userId,
        organizationId,
      });

      // Verify channel exists
      const channel = await repository.getChannelById(validatedData.channelId, organizationId);
      if (!channel || !channel.isActive) {
        throw new Error('Channel not found or inactive');
      }

      // Check if user is already a member
      const existingMembership = await repository.getChannelMembership(validatedData.channelId, userId, organizationId);
      if (existingMembership) {
        throw new Error('User is already a member of this channel');
      }

      // Check if there's already a pending request
      const existingRequest = await repository.getPendingJoinRequest(validatedData.channelId, userId, organizationId);
      if (existingRequest) {
        throw new Error('Join request already pending');
      }

      // Business logic: Auto-join for public channels or direct join for specific roles
      if (!channel.isPrivate) {
        // Auto-join for public channels
        const member = await repository.addChannelMember(
          validatedData.channelId,
          userId,
          'member',
          organizationId
        );

        // Publish domain event
        await eventSystem.publishEvent('interest_channels.member_joined', {
          member,
          channel,
          user: { id: userId },
          organization: { id: organizationId },
          joinMethod: 'auto',
        });

        logger.info('✅ User auto-joined public channel', {
          channelId: validatedData.channelId,
          userId,
          organizationId,
        });

        return member;
      } else {
        // Create join request for private channels
        const joinRequest = await repository.createJoinRequest(validatedData, userId, organizationId);

        // Publish domain event
        await eventSystem.publishEvent('interest_channels.join_request_created', {
          joinRequest,
          channel,
          user: { id: userId },
          organization: { id: organizationId },
          message: validatedData.message,
        });

        logger.info('✅ Join request created for private channel', {
          requestId: joinRequest.id,
          channelId: validatedData.channelId,
          userId,
          organizationId,
        });

        return joinRequest;
      }
    } catch (error: any) {
      logger.error('❌ Error processing channel join request', {
        error: error?.message || 'unknown_error',
        channelId: data.channelId,
        userId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Process join request (approve/reject)
   */
  static async processJoinRequest(
    requestId: number,
    action: 'approve' | 'reject',
    reviewedBy: number,
    organizationId: number,
    repository: InterestChannelsRepository
  ): Promise<{ request: InterestChannelJoinRequest; member?: InterestChannelMember }> {
    try {
      logger.info('🎯 Processing join request', {
        requestId,
        action,
        reviewedBy,
        organizationId,
      });

      // Get join request
      const joinRequest = await repository.getJoinRequestById(requestId, organizationId);
      if (!joinRequest || joinRequest.status !== 'pending') {
        throw new Error('Join request not found or already processed');
      }

      // Verify reviewer has permission (must be admin or moderator)
      const membership = await repository.getChannelMembership(joinRequest.channelId, reviewedBy, organizationId);
      if (!membership || !['admin', 'moderator'].includes(membership.role)) {
        throw new Error('Insufficient permissions to process join requests');
      }

      // Process request
      const updatedRequest = await repository.updateJoinRequest(
        requestId,
        {
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewedBy,
          reviewedAt: new Date(),
        },
        organizationId
      );

      let member;
      if (action === 'approve') {
        // Add user as member
        member = await repository.addChannelMember(
          joinRequest.channelId,
          joinRequest.userId,
          'member',
          organizationId
        );

        // Publish approval event
        await eventSystem.publishEvent('interest_channels.join_request_approved', {
          joinRequest: updatedRequest,
          member,
          reviewer: { id: reviewedBy },
          organization: { id: organizationId },
        });
      } else {
        // Publish rejection event
        await eventSystem.publishEvent('interest_channels.join_request_rejected', {
          joinRequest: updatedRequest,
          reviewer: { id: reviewedBy },
          organization: { id: organizationId },
        });
      }

      logger.info('✅ Join request processed successfully', {
        requestId,
        action,
        channelId: joinRequest.channelId,
        userId: joinRequest.userId,
        reviewedBy,
        organizationId,
      });

      return { request: updatedRequest, member };
    } catch (error: any) {
      logger.error('❌ Error processing join request', {
        error: error?.message || 'unknown_error',
        requestId,
        action,
        reviewedBy,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Leave channel
   */
  static async leaveChannel(
    channelId: number,
    userId: number,
    organizationId: number,
    repository: InterestChannelsRepository
  ): Promise<boolean> {
    try {
      logger.info('🎯 User leaving channel', {
        channelId,
        userId,
        organizationId,
      });

      // Verify membership exists
      const membership = await repository.getChannelMembership(channelId, userId, organizationId);
      if (!membership) {
        throw new Error('User is not a member of this channel');
      }

      // Business rule: Last admin cannot leave
      if (membership.role === 'admin') {
        const adminCount = await repository.getChannelMemberCount(channelId, organizationId, 'admin');
        if (adminCount <= 1) {
          throw new Error('Cannot leave channel - you are the last admin');
        }
      }

      // Remove membership
      const success = await repository.removeChannelMember(channelId, userId, organizationId);

      if (success) {
        // Publish domain event
        await eventSystem.publishEvent('interest_channels.member_left', {
          channelId,
          user: { id: userId },
          organization: { id: organizationId },
          previousRole: membership.role,
        });

        logger.info('✅ User left channel successfully', {
          channelId,
          userId,
          organizationId,
        });
      }

      return success;
    } catch (error: any) {
      logger.error('❌ Error leaving channel', {
        error: error?.message || 'unknown_error',
        channelId,
        userId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Pin/unpin channel post
   */
  static async togglePostPin(
    postId: number,
    channelId: number,
    pinnedBy: number,
    organizationId: number,
    repository: InterestChannelsRepository
  ): Promise<{ pinned: boolean; post: InterestChannelPost }> {
    try {
      logger.info('🎯 Toggling post pin', {
        postId,
        channelId,
        pinnedBy,
        organizationId,
      });

      // Verify user has permission (must be admin or moderator)
      const membership = await repository.getChannelMembership(channelId, pinnedBy, organizationId);
      if (!membership || !['admin', 'moderator'].includes(membership.role)) {
        throw new Error('Insufficient permissions to pin/unpin posts');
      }

      // Get post details
      const post = await repository.getChannelPostById(postId, organizationId);
      if (!post || post.channelId !== channelId) {
        throw new Error('Post not found in this channel');
      }

      // Check current pin status
      const isPinned = await repository.isPostPinned(postId, channelId, organizationId);
      
      let success;
      if (isPinned) {
        // Unpin post
        success = await repository.unpinPost(postId, channelId, organizationId);
        if (success) {
          await eventSystem.publishEvent('interest_channels.post_unpinned', {
            post,
            channelId,
            unpinnedBy: { id: pinnedBy },
            organization: { id: organizationId },
          });
        }
      } else {
        // Pin post
        success = await repository.pinPost(postId, channelId, pinnedBy, organizationId);
        if (success) {
          await eventSystem.publishEvent('interest_channels.post_pinned', {
            post,
            channelId,
            pinnedBy: { id: pinnedBy },
            organization: { id: organizationId },
          });
        }
      }

      logger.info('✅ Post pin status toggled successfully', {
        postId,
        channelId,
        pinned: !isPinned,
        pinnedBy,
        organizationId,
      });

      return { pinned: !isPinned, post };
    } catch (error: any) {
      logger.error('❌ Error toggling post pin', {
        error: error?.message || 'unknown_error',
        postId,
        channelId,
        pinnedBy,
        organizationId,
      });
      throw error;
    }
  }
}