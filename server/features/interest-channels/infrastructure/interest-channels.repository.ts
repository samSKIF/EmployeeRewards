// Interest Channels Infrastructure Layer
// Implements data access operations for interest channels using PostgreSQL with Drizzle ORM

import { eq, and, gte, lte, desc, sql, or, ilike, inArray } from 'drizzle-orm';
import { db } from '../../../db';
import {
  interests,
  interestChannels,
  interestChannelMembers,
  interestChannelPosts,
  interestChannelPostComments,
  interestChannelPostLikes,
  interestChannelJoinRequests,
  interestChannelPinnedPosts,
  users,
  organizations,
} from '@shared/schema';
import type {
  Interest,
  InterestChannel,
  InterestChannelMember,
  InterestChannelPost,
  InterestChannelPostComment,
  InterestChannelJoinRequest,
  InsertInterestChannel,
  InsertInterestChannelMember,
  InsertInterestChannelPost,
  InsertInterestChannelJoinRequest,
} from '@shared/schema';
import type {
  CreateInterestChannelData,
  UpdateInterestChannelData,
  CreateChannelPostData,
  UpdateChannelPostData,
  CreateJoinRequestData,
  InterestChannelFilters,
  ChannelPostFilters,
} from '../domain/interest-channels.domain';
import { logger } from '@shared/logger';

/**
 * Interest Channels Repository
 * Handles all database operations for interest channels management
 */
export class InterestChannelsRepository {
  /**
   * Create a new interest channel
   */
  async createInterestChannel(
    data: CreateInterestChannelData,
    organizationId: number,
    createdBy: number
  ): Promise<InterestChannel> {
    try {
      const channelData: InsertInterestChannel = {
        name: data.name,
        description: data.description,
        interestId: data.interestId,
        organization_id: organizationId,
        channelType: data.channelType || 'interest',
        isPrivate: data.isPrivate || false,
        isAutoCreated: data.isAutoCreated || false,
        autoJoinRoles: data.autoJoinRoles,
        moderatorPermissions: data.moderatorPermissions,
        memberPermissions: data.memberPermissions,
        maxMembers: data.maxMembers,
        createdBy,
      };

      const [channel] = await db.insert(interestChannels).values(channelData).returning();

      logger.info('✅ Interest channel created in database', {
        channelId: channel.id,
        name: channel.name,
        organizationId,
        createdBy,
      });

      return channel;
    } catch (error: any) {
      logger.error('❌ Error creating interest channel in database', {
        error: error?.message || 'unknown_error',
        name: data.name,
        organizationId,
        createdBy,
      });
      throw error;
    }
  }

  /**
   * Get interest channel by ID
   */
  async getChannelById(channelId: number, organizationId?: number): Promise<InterestChannel | null> {
    try {
      const conditions = [eq(interestChannels.id, channelId)];
      
      if (organizationId) {
        conditions.push(eq(interestChannels.organization_id, organizationId));
      }

      const [channel] = await db
        .select()
        .from(interestChannels)
        .where(and(...conditions))
        .limit(1);

      return channel || null;
    } catch (error: any) {
      logger.error('❌ Error getting channel by ID', {
        error: error?.message || 'unknown_error',
        channelId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get channels by organization with filtering
   */
  async getChannelsByOrganization(
    organizationId: number,
    filters?: InterestChannelFilters
  ): Promise<(InterestChannel & { interest?: Interest; memberCount?: number })[]> {
    try {
      const conditions = [eq(interestChannels.organization_id, organizationId)];

      // Apply filters
      if (filters?.channelType) {
        conditions.push(eq(interestChannels.channelType, filters.channelType));
      }

      if (filters?.isPrivate !== undefined) {
        conditions.push(eq(interestChannels.isPrivate, filters.isPrivate));
      }

      if (filters?.isActive !== undefined) {
        conditions.push(eq(interestChannels.isActive, filters.isActive));
      }

      if (filters?.interestId) {
        conditions.push(eq(interestChannels.interestId, filters.interestId));
      }

      if (filters?.createdBy) {
        conditions.push(eq(interestChannels.createdBy, filters.createdBy));
      }

      if (filters?.search) {
        conditions.push(
          or(
            ilike(interestChannels.name, `%${filters.search}%`),
            ilike(interestChannels.description, `%${filters.search}%`)
          )!
        );
      }

      const query = db
        .select({
          channel: interestChannels,
          interest: interests,
          memberCount: sql<number>`count(${interestChannelMembers.id})`,
        })
        .from(interestChannels)
        .leftJoin(interests, eq(interestChannels.interestId, interests.id))
        .leftJoin(interestChannelMembers, eq(interestChannels.id, interestChannelMembers.channelId))
        .where(and(...conditions))
        .groupBy(interestChannels.id, interests.id)
        .orderBy(desc(interestChannels.createdAt));

      const results = await query;
      return results.map(r => ({
        ...r.channel,
        interest: r.interest || undefined,
        memberCount: r.memberCount || 0,
      }));
    } catch (error: any) {
      logger.error('❌ Error getting channels by organization', {
        error: error?.message || 'unknown_error',
        organizationId,
        filters,
      });
      throw error;
    }
  }

  /**
   * Update interest channel
   */
  async updateInterestChannel(
    channelId: number,
    data: UpdateInterestChannelData,
    organizationId?: number
  ): Promise<InterestChannel | null> {
    try {
      const conditions = [eq(interestChannels.id, channelId)];
      if (organizationId) {
        conditions.push(eq(interestChannels.organization_id, organizationId));
      }

      const [updatedChannel] = await db
        .update(interestChannels)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(and(...conditions))
        .returning();

      if (updatedChannel) {
        logger.info('✅ Interest channel updated in database', {
          channelId,
          updatedFields: Object.keys(data),
          organizationId,
        });
      }

      return updatedChannel || null;
    } catch (error: any) {
      logger.error('❌ Error updating interest channel in database', {
        error: error?.message || 'unknown_error',
        channelId,
        data,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get channel by name and interest
   */
  async getChannelByNameAndInterest(
    name: string,
    interestId: number,
    organizationId: number
  ): Promise<InterestChannel | null> {
    try {
      const [channel] = await db
        .select()
        .from(interestChannels)
        .where(
          and(
            eq(interestChannels.name, name),
            eq(interestChannels.interestId, interestId),
            eq(interestChannels.organization_id, organizationId)
          )
        )
        .limit(1);

      return channel || null;
    } catch (error: any) {
      logger.error('❌ Error getting channel by name and interest', {
        error: error?.message || 'unknown_error',
        name,
        interestId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get interest by ID
   */
  async getInterestById(interestId: number, organizationId: number): Promise<Interest | null> {
    try {
      const [interest] = await db
        .select()
        .from(interests)
        .where(eq(interests.id, interestId))
        .limit(1);

      return interest || null;
    } catch (error: any) {
      logger.error('❌ Error getting interest by ID', {
        error: error?.message || 'unknown_error',
        interestId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Add channel member
   */
  async addChannelMember(
    channelId: number,
    userId: number,
    role: string,
    organizationId?: number
  ): Promise<InterestChannelMember> {
    try {
      const memberData: InsertInterestChannelMember = {
        channelId,
        userId,
        role,
      };

      const [member] = await db
        .insert(interestChannelMembers)
        .values(memberData)
        .returning();

      logger.info('✅ Channel member added in database', {
        memberId: member.id,
        channelId,
        userId,
        role,
        organizationId,
      });

      return member;
    } catch (error: any) {
      logger.error('❌ Error adding channel member in database', {
        error: error?.message || 'unknown_error',
        channelId,
        userId,
        role,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get channel membership
   */
  async getChannelMembership(
    channelId: number,
    userId: number,
    organizationId?: number
  ): Promise<InterestChannelMember | null> {
    try {
      const [membership] = await db
        .select()
        .from(interestChannelMembers)
        .where(
          and(
            eq(interestChannelMembers.channelId, channelId),
            eq(interestChannelMembers.userId, userId)
          )
        )
        .limit(1);

      return membership || null;
    } catch (error: any) {
      logger.error('❌ Error getting channel membership', {
        error: error?.message || 'unknown_error',
        channelId,
        userId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Remove channel member
   */
  async removeChannelMember(
    channelId: number,
    userId: number,
    organizationId?: number
  ): Promise<boolean> {
    try {
      const [deletedMember] = await db
        .delete(interestChannelMembers)
        .where(
          and(
            eq(interestChannelMembers.channelId, channelId),
            eq(interestChannelMembers.userId, userId)
          )
        )
        .returning();

      const success = !!deletedMember;

      if (success) {
        logger.info('✅ Channel member removed in database', {
          channelId,
          userId,
          organizationId,
        });
      }

      return success;
    } catch (error: any) {
      logger.error('❌ Error removing channel member', {
        error: error?.message || 'unknown_error',
        channelId,
        userId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get channel member count
   */
  async getChannelMemberCount(
    channelId: number,
    organizationId?: number,
    role?: string
  ): Promise<number> {
    try {
      const conditions = [eq(interestChannelMembers.channelId, channelId)];
      
      if (role) {
        conditions.push(eq(interestChannelMembers.role, role));
      }

      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(interestChannelMembers)
        .where(and(...conditions));

      return result?.count || 0;
    } catch (error: any) {
      logger.error('❌ Error getting channel member count', {
        error: error?.message || 'unknown_error',
        channelId,
        role,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Create channel post
   */
  async createChannelPost(
    data: CreateChannelPostData,
    userId: number,
    organizationId?: number
  ): Promise<InterestChannelPost> {
    try {
      const postData: InsertInterestChannelPost = {
        channelId: data.channelId,
        userId,
        title: data.title,
        content: data.content,
        postType: data.postType || 'text',
        attachments: data.attachments,
        tags: data.tags,
      };

      const [post] = await db.insert(interestChannelPosts).values(postData).returning();

      logger.info('✅ Channel post created in database', {
        postId: post.id,
        channelId: data.channelId,
        userId,
        postType: post.postType,
        organizationId,
      });

      return post;
    } catch (error: any) {
      logger.error('❌ Error creating channel post in database', {
        error: error?.message || 'unknown_error',
        channelId: data.channelId,
        userId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get channel posts
   */
  async getChannelPosts(
    channelId: number,
    filters?: ChannelPostFilters,
    organizationId?: number
  ): Promise<(InterestChannelPost & { author: { id: number; name: string; email: string }; likeCount: number; commentCount: number })[]> {
    try {
      const conditions = [eq(interestChannelPosts.channelId, channelId)];

      // Apply filters
      if (filters?.postType) {
        conditions.push(eq(interestChannelPosts.postType, filters.postType));
      }

      if (filters?.authorId) {
        conditions.push(eq(interestChannelPosts.userId, filters.authorId));
      }

      if (filters?.search) {
        conditions.push(
          or(
            ilike(interestChannelPosts.title, `%${filters.search}%`),
            ilike(interestChannelPosts.content, `%${filters.search}%`)
          )!
        );
      }

      if (filters?.startDate) {
        conditions.push(gte(interestChannelPosts.createdAt, filters.startDate));
      }

      if (filters?.endDate) {
        conditions.push(lte(interestChannelPosts.createdAt, filters.endDate));
      }

      if (filters?.tags && filters.tags.length > 0) {
        // This would need proper JSON array filtering in production
        // For now, we'll use a simple text match
        conditions.push(
          sql`${interestChannelPosts.tags}::text ILIKE ANY(${filters.tags.map(tag => `%${tag}%`)})`
        );
      }

      const query = db
        .select({
          post: interestChannelPosts,
          author: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
          likeCount: sql<number>`count(DISTINCT ${interestChannelPostLikes.id})`,
          commentCount: sql<number>`count(DISTINCT ${interestChannelPostComments.id})`,
        })
        .from(interestChannelPosts)
        .leftJoin(users, eq(interestChannelPosts.userId, users.id))
        .leftJoin(interestChannelPostLikes, eq(interestChannelPosts.id, interestChannelPostLikes.postId))
        .leftJoin(interestChannelPostComments, eq(interestChannelPosts.id, interestChannelPostComments.postId))
        .where(and(...conditions))
        .groupBy(interestChannelPosts.id, users.id)
        .orderBy(desc(interestChannelPosts.createdAt));

      const results = await query;
      return results.map(r => ({
        ...r.post,
        author: r.author,
        likeCount: r.likeCount || 0,
        commentCount: r.commentCount || 0,
      }));
    } catch (error: any) {
      logger.error('❌ Error getting channel posts', {
        error: error?.message || 'unknown_error',
        channelId,
        filters,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get channel post by ID
   */
  async getChannelPostById(postId: number, organizationId?: number): Promise<InterestChannelPost | null> {
    try {
      const [post] = await db
        .select()
        .from(interestChannelPosts)
        .where(eq(interestChannelPosts.id, postId))
        .limit(1);

      return post || null;
    } catch (error: any) {
      logger.error('❌ Error getting channel post by ID', {
        error: error?.message || 'unknown_error',
        postId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Create join request
   */
  async createJoinRequest(
    data: CreateJoinRequestData,
    userId: number,
    organizationId?: number
  ): Promise<InterestChannelJoinRequest> {
    try {
      const requestData: InsertInterestChannelJoinRequest = {
        channelId: data.channelId,
        userId,
        message: data.message,
        status: 'pending',
      };

      const [joinRequest] = await db
        .insert(interestChannelJoinRequests)
        .values(requestData)
        .returning();

      logger.info('✅ Join request created in database', {
        requestId: joinRequest.id,
        channelId: data.channelId,
        userId,
        organizationId,
      });

      return joinRequest;
    } catch (error: any) {
      logger.error('❌ Error creating join request in database', {
        error: error?.message || 'unknown_error',
        channelId: data.channelId,
        userId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get pending join request
   */
  async getPendingJoinRequest(
    channelId: number,
    userId: number,
    organizationId?: number
  ): Promise<InterestChannelJoinRequest | null> {
    try {
      const [request] = await db
        .select()
        .from(interestChannelJoinRequests)
        .where(
          and(
            eq(interestChannelJoinRequests.channelId, channelId),
            eq(interestChannelJoinRequests.userId, userId),
            eq(interestChannelJoinRequests.status, 'pending')
          )
        )
        .limit(1);

      return request || null;
    } catch (error: any) {
      logger.error('❌ Error getting pending join request', {
        error: error?.message || 'unknown_error',
        channelId,
        userId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get join request by ID
   */
  async getJoinRequestById(
    requestId: number,
    organizationId?: number
  ): Promise<InterestChannelJoinRequest | null> {
    try {
      const [request] = await db
        .select()
        .from(interestChannelJoinRequests)
        .where(eq(interestChannelJoinRequests.id, requestId))
        .limit(1);

      return request || null;
    } catch (error: any) {
      logger.error('❌ Error getting join request by ID', {
        error: error?.message || 'unknown_error',
        requestId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Update join request
   */
  async updateJoinRequest(
    requestId: number,
    data: Partial<InsertInterestChannelJoinRequest>,
    organizationId?: number
  ): Promise<InterestChannelJoinRequest | null> {
    try {
      const [updatedRequest] = await db
        .update(interestChannelJoinRequests)
        .set(data)
        .where(eq(interestChannelJoinRequests.id, requestId))
        .returning();

      return updatedRequest || null;
    } catch (error: any) {
      logger.error('❌ Error updating join request', {
        error: error?.message || 'unknown_error',
        requestId,
        data,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Pin post
   */
  async pinPost(
    postId: number,
    channelId: number,
    pinnedBy: number,
    organizationId?: number
  ): Promise<boolean> {
    try {
      const [pinnedPost] = await db
        .insert(interestChannelPinnedPosts)
        .values({
          channelId,
          postId,
          pinnedBy,
        })
        .returning();

      return !!pinnedPost;
    } catch (error: any) {
      logger.error('❌ Error pinning post', {
        error: error?.message || 'unknown_error',
        postId,
        channelId,
        pinnedBy,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Unpin post
   */
  async unpinPost(
    postId: number,
    channelId: number,
    organizationId?: number
  ): Promise<boolean> {
    try {
      const [unpinnedPost] = await db
        .delete(interestChannelPinnedPosts)
        .where(
          and(
            eq(interestChannelPinnedPosts.postId, postId),
            eq(interestChannelPinnedPosts.channelId, channelId)
          )
        )
        .returning();

      return !!unpinnedPost;
    } catch (error: any) {
      logger.error('❌ Error unpinning post', {
        error: error?.message || 'unknown_error',
        postId,
        channelId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Check if post is pinned
   */
  async isPostPinned(
    postId: number,
    channelId: number,
    organizationId?: number
  ): Promise<boolean> {
    try {
      const [pinnedPost] = await db
        .select()
        .from(interestChannelPinnedPosts)
        .where(
          and(
            eq(interestChannelPinnedPosts.postId, postId),
            eq(interestChannelPinnedPosts.channelId, channelId)
          )
        )
        .limit(1);

      return !!pinnedPost;
    } catch (error: any) {
      logger.error('❌ Error checking if post is pinned', {
        error: error?.message || 'unknown_error',
        postId,
        channelId,
        organizationId,
      });
      throw error;
    }
  }
}