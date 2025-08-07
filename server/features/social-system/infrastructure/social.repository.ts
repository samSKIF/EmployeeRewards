// Social Infrastructure Layer
// Implements data access operations for social domain using MongoDB and PostgreSQL hybrid approach

import { ObjectId } from 'mongodb';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../db';
import { users } from '@shared/schema';
import { SocialService } from '../../../mongodb/socialService';
import type { SocialPost, Comment, User, SocialDependencies } from '../domain/social.domain';
import { logger } from '@shared/logger';

/**
 * Social Repository
 * Provides data access operations for social features using MongoDB for social data
 * and PostgreSQL for user data, following the hybrid storage strategy
 */
export class SocialRepository implements SocialDependencies {
  private _socialService: SocialService | null = null;

  constructor() {
    // Initialize social service lazily to avoid MongoDB connection issues during startup
  }

  public get socialService(): SocialService {
    if (!this._socialService) {
      try {
        this._socialService = new SocialService();
      } catch (error: any) {
        logger.error('❌ Failed to initialize SocialService', {
          error: error?.message || 'unknown_error',
        });
        throw new Error('Social service unavailable - MongoDB connection required');
      }
    }
    return this._socialService;
  }

  // Post operations
  async persistPost(data: Partial<SocialPost>): Promise<SocialPost> {
    try {
      // Convert to format expected by SocialService
      const postData = {
        authorId: data.authorId!,
        authorName: data.authorName!,
        organizationId: data.organizationId!,
        content: data.content!,
        imageUrl: data.imageUrl,
        type: data.type! as 'text' | 'image' | 'poll' | 'recognition' | 'announcement',
        visibility: data.visibility! as 'public' | 'team' | 'department',
        tags: data.tags || [],
        pollOptions: data.pollOptions,
        isPinned: data.isPinned || false,
      };

      const result = await this.socialService.createPost(postData);
      
      // Convert MongoDB result back to domain model
      return {
        _id: result._id,
        authorId: result.authorId,
        authorName: result.authorName,
        authorAvatar: result.authorAvatar,
        organizationId: result.organizationId,
        content: result.content,
        imageUrl: result.imageUrl,
        type: result.type,
        visibility: result.visibility,
        pollOptions: result.pollOptions,
        pollVotes: result.pollVotes || [],
        pollExpiresAt: data.pollExpiresAt,
        recognitionData: data.recognitionData,
        reactions: result.reactions || [],
        commentsCount: result.commentsCount || 0,
        sharesCount: result.sharesCount || 0,
        viewsCount: result.viewsCount || 0,
        isPinned: result.isPinned || false,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        isDeleted: result.isDeleted || false,
        tags: result.tags,
        mentions: data.mentions || [],
      };
    } catch (error: any) {
      logger.error('❌ Error persisting post', {
        error: error?.message || 'unknown_error',
        data,
      });
      throw error;
    }
  }

  async updatePost(postId: string, data: Partial<SocialPost>): Promise<SocialPost | null> {
    try {
      const success = await this.socialService.updatePost(postId, data);
      if (!success) {
        return null;
      }
      
      // Return updated post
      return await this.getPostById(postId);
    } catch (error: any) {
      logger.error('❌ Error updating post', {
        error: error?.message || 'unknown_error',
        postId,
        data,
      });
      throw error;
    }
  }

  async getPostById(postId: string): Promise<SocialPost | null> {
    try {
      const result = await this.socialService.getPostById(postId);
      if (!result) {
        return null;
      }

      // Convert MongoDB result to domain model
      return {
        _id: result._id,
        authorId: result.authorId,
        authorName: result.authorName,
        authorAvatar: result.authorAvatar,
        organizationId: result.organizationId,
        content: result.content,
        imageUrl: result.imageUrl,
        type: result.type,
        visibility: result.visibility,
        pollOptions: result.pollOptions,
        pollVotes: result.pollVotes || [],
        pollExpiresAt: result.pollExpiresAt,
        recognitionData: result.recognitionData,
        reactions: result.reactions || [],
        commentsCount: result.commentsCount || 0,
        sharesCount: result.sharesCount || 0,
        viewsCount: result.viewsCount || 0,
        isPinned: result.isPinned || false,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        isDeleted: result.isDeleted || false,
        deletedAt: result.deletedAt,
        deletedBy: result.deletedBy,
        tags: result.tags,
        mentions: result.mentions || [],
      };
    } catch (error: any) {
      logger.error('❌ Error getting post by ID', {
        error: error?.message || 'unknown_error',
        postId,
      });
      throw error;
    }
  }

  async deletePost(postId: string, deletedBy: number): Promise<boolean> {
    try {
      return await this.socialService.deletePost(postId, deletedBy);
    } catch (error: any) {
      logger.error('❌ Error deleting post', {
        error: error?.message || 'unknown_error',
        postId,
        deletedBy,
      });
      throw error;
    }
  }

  // Comment operations
  async persistComment(data: Partial<Comment>): Promise<Comment> {
    try {
      const commentData = {
        postId: data.postId!,
        authorId: data.authorId!,
        authorName: data.authorName!,
        organizationId: data.organizationId!,
        content: data.content!,
        parentCommentId: data.parentCommentId,
      };

      const result = await this.socialService.createComment(commentData);
      
      // Convert MongoDB result to domain model
      return {
        _id: result._id,
        postId: result.postId,
        authorId: result.authorId,
        authorName: result.authorName,
        authorAvatar: result.authorAvatar,
        organizationId: result.organizationId,
        content: result.content,
        parentCommentId: result.parentCommentId,
        reactions: result.reactions || [],
        mentions: data.mentions || [],
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        isDeleted: result.isDeleted || false,
        deletedAt: result.deletedAt,
        deletedBy: result.deletedBy,
      };
    } catch (error: any) {
      logger.error('❌ Error persisting comment', {
        error: error?.message || 'unknown_error',
        data,
      });
      throw error;
    }
  }

  async updateComment(commentId: string, data: Partial<Comment>): Promise<Comment | null> {
    try {
      // SocialService doesn't have updateComment, so we'll implement basic update
      // In a real implementation, this would be added to SocialService
      logger.warn('⚠️ Comment update not implemented in SocialService', { commentId });
      return null;
    } catch (error: any) {
      logger.error('❌ Error updating comment', {
        error: error?.message || 'unknown_error',
        commentId,
        data,
      });
      throw error;
    }
  }

  async deleteComment(commentId: string, deletedBy: number): Promise<boolean> {
    try {
      return await this.socialService.deleteComment(commentId, deletedBy);
    } catch (error: any) {
      logger.error('❌ Error deleting comment', {
        error: error?.message || 'unknown_error',
        commentId,
        deletedBy,
      });
      throw error;
    }
  }

  // Reaction operations
  async addPostReaction(postId: string, userId: number, userName: string, type: string): Promise<boolean> {
    try {
      const validType = type as 'like' | 'love' | 'celebrate' | 'support' | 'insightful';
      return await this.socialService.addReactionToPost(postId, userId, userName, validType);
    } catch (error: any) {
      logger.error('❌ Error adding post reaction', {
        error: error?.message || 'unknown_error',
        postId,
        userId,
        type,
      });
      throw error;
    }
  }

  async removePostReaction(postId: string, userId: number): Promise<boolean> {
    try {
      return await this.socialService.removeReactionFromPost(postId, userId);
    } catch (error: any) {
      logger.error('❌ Error removing post reaction', {
        error: error?.message || 'unknown_error',
        postId,
        userId,
      });
      throw error;
    }
  }

  async addCommentReaction(commentId: string, userId: number, userName: string, type: string): Promise<boolean> {
    try {
      const validType = type as 'like' | 'love' | 'celebrate' | 'support';
      return await this.socialService.addReactionToComment(commentId, userId, userName, validType);
    } catch (error: any) {
      logger.error('❌ Error adding comment reaction', {
        error: error?.message || 'unknown_error',
        commentId,
        userId,
        type,
      });
      throw error;
    }
  }

  // User operations - Using PostgreSQL for user data
  async getUserById(userId: number): Promise<User | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        organization_id: user.organization_id || 1,
        avatar: user.avatar_url || undefined,
      };
    } catch (error: any) {
      logger.error('❌ Error getting user by ID', {
        error: error?.message || 'unknown_error',
        userId,
      });
      throw error;
    }
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    try {
      const usersList = await db
        .select()
        .from(users)
        .where(eq(users.organization_id, organizationId));

      return usersList.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        organization_id: user.organization_id || 1,
        avatar: user.avatar_url || undefined,
      }));
    } catch (error: any) {
      logger.error('❌ Error getting users by organization', {
        error: error?.message || 'unknown_error',
        organizationId,
      });
      throw error;
    }
  }

  // Poll operations
  async castPollVote(postId: string, userId: number, userName: string, option: string): Promise<boolean> {
    try {
      // Get current post to check poll votes
      const post = await this.getPostById(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      // Remove existing vote from same user
      const existingVotes = post.pollVotes?.filter(vote => vote.user_id !== userId) || [];
      
      // Add new vote
      const newVote = {
        user_id: userId,
        userName,
        option,
        votedAt: new Date(),
      };
      
      const updatedVotes = [...existingVotes, newVote];
      
      // Update post with new votes
      return await this.socialService.updatePost(postId, {
        pollVotes: updatedVotes,
      });
    } catch (error: any) {
      logger.error('❌ Error casting poll vote', {
        error: error?.message || 'unknown_error',
        postId,
        userId,
        option,
      });
      throw error;
    }
  }

  async getPollVotes(postId: string): Promise<any[]> {
    try {
      const post = await this.getPostById(postId);
      return post?.pollVotes || [];
    } catch (error: any) {
      logger.error('❌ Error getting poll votes', {
        error: error?.message || 'unknown_error',
        postId,
      });
      throw error;
    }
  }

  // Utility operations
  extractMentions(content: string): string[] {
    try {
      // Extract @mentions from content using regex
      const mentionRegex = /@(\w+)/g;
      const mentions = [];
      let match;
      
      while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push(match[1]);
      }
      
      return mentions;
    } catch (error: any) {
      logger.error('❌ Error extracting mentions', {
        error: error?.message || 'unknown_error',
        content,
      });
      return [];
    }
  }

  async validateUserAccess(userId: number, organizationId: number): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      return user !== null && user.organization_id === organizationId;
    } catch (error: any) {
      logger.error('❌ Error validating user access', {
        error: error?.message || 'unknown_error',
        userId,
        organizationId,
      });
      return false;
    }
  }

  async incrementViewCount(postId: string): Promise<void> {
    try {
      const post = await this.getPostById(postId);
      if (post) {
        await this.socialService.updatePost(postId, {
          viewsCount: (post.viewsCount || 0) + 1,
        });
      }
    } catch (error: any) {
      logger.error('❌ Error incrementing view count', {
        error: error?.message || 'unknown_error',
        postId,
      });
      // Don't throw for view count errors - not critical
    }
  }

  async checkEngagementThresholds(postId: string): Promise<any> {
    try {
      const post = await this.getPostById(postId);
      if (!post) {
        return null;
      }

      const metrics = {
        reactions: post.reactions.length,
        comments: post.commentsCount,
        shares: post.sharesCount,
        views: post.viewsCount,
      };

      // Check for engagement milestones
      const milestones = [];
      
      // Viral post thresholds
      if (metrics.reactions >= 50) {
        milestones.push({ type: 'post_viral', threshold: 50, value: metrics.reactions });
      }
      
      if (metrics.comments >= 25) {
        milestones.push({ type: 'high_engagement', threshold: 25, value: metrics.comments });
      }
      
      if (metrics.views >= 500) {
        milestones.push({ type: 'high_reach', threshold: 500, value: metrics.views });
      }

      return {
        metrics,
        milestones,
      };
    } catch (error: any) {
      logger.error('❌ Error checking engagement thresholds', {
        error: error?.message || 'unknown_error',
        postId,
      });
      return null;
    }
  }

  // Additional methods for API layer convenience
  async getPosts(
    organizationId: number,
    limit: number = 20,
    skip: number = 0,
    authorId?: number
  ): Promise<SocialPost[]> {
    try {
      return await this.socialService.getPosts(organizationId, limit, skip, authorId);
    } catch (error: any) {
      logger.error('❌ Error getting posts', {
        error: error?.message || 'unknown_error',
        organizationId,
        limit,
        skip,
        authorId,
      });
      throw error;
    }
  }

  async getCommentsByPost(postId: string): Promise<Comment[]> {
    try {
      return await this.socialService.getCommentsByPost(postId);
    } catch (error: any) {
      logger.error('❌ Error getting comments by post', {
        error: error?.message || 'unknown_error',
        postId,
      });
      throw error;
    }
  }
}