// Social Domain Layer
// Handles all social features business logic, validation, and event publishing

import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { eventSystem } from '@shared/events';
import {
  createPostCreatedEvent,
  createCommentAddedEvent,
  createReactionAddedEvent,
  createPostDeletedEvent,
  createUserMentionedEvent,
  createPollVoteCastEvent,
  createEngagementMilestoneEvent,
} from '@shared/events';
import { logger } from '@shared/logger';

// Social domain types based on MongoDB models
export interface SocialPost {
  _id?: ObjectId;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  organizationId: number;
  content: string;
  imageUrl?: string;
  type: 'text' | 'image' | 'poll' | 'recognition' | 'announcement';
  visibility: 'public' | 'team' | 'department';
  pollOptions?: string[];
  pollVotes?: Array<{
    user_id: number;
    userName: string;
    option: string;
    votedAt: Date;
  }>;
  pollExpiresAt?: Date;
  recognitionData?: {
    recipientId: number;
    recipientName: string;
    points: number;
    category: string;
    badgeType: string;
  };
  reactions: Array<{
    user_id: number;
    userName: string;
    type: 'like' | 'love' | 'celebrate' | 'support' | 'insightful';
    createdAt: Date;
  }>;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: number;
  tags?: string[];
  mentions?: Array<{
    user_id: number;
    userName: string;
  }>;
}

export interface Comment {
  _id?: ObjectId;
  postId: ObjectId;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  organizationId: number;
  content: string;
  parentCommentId?: ObjectId;
  reactions: Array<{
    user_id: number;
    userName: string;
    type: 'like' | 'love' | 'celebrate' | 'support';
    createdAt: Date;
  }>;
  mentions?: Array<{
    user_id: number;
    userName: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  department: string | null;
  organization_id: number;
  avatar?: string;
}

// Validation schemas for social operations
export const createPostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(2000, 'Content must not exceed 2000 characters'),
  type: z.enum(['text', 'image', 'poll', 'recognition', 'announcement']).default('text'),
  visibility: z.enum(['public', 'team', 'department']).default('public'),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  // Poll-specific fields
  pollOptions: z.array(z.string().min(1).max(200)).min(2).max(10).optional(),
  pollExpiresAt: z.date().optional(),
  // Recognition-specific fields
  recognitionData: z.object({
    recipientId: z.number().positive(),
    recipientName: z.string().min(1),
    points: z.number().positive().max(1000),
    category: z.string().min(1),
    badgeType: z.string().min(1),
  }).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(1000, 'Comment must not exceed 1000 characters'),
  parentCommentId: z.string().optional(),
});

export const reactionSchema = z.object({
  type: z.enum(['like', 'love', 'celebrate', 'support', 'insightful']),
});

export const pollVoteSchema = z.object({
  option: z.string().min(1, 'Poll option is required'),
});

export const postFiltersSchema = z.object({
  type: z.enum(['text', 'image', 'poll', 'recognition', 'announcement']).optional(),
  authorId: z.number().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  visibility: z.enum(['public', 'team', 'department']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().positive().max(100).default(20),
  skip: z.number().nonnegative().default(0),
});

// Type exports
export type CreatePostData = z.infer<typeof createPostSchema>;
export type CreateCommentData = z.infer<typeof createCommentSchema>;
export type ReactionData = z.infer<typeof reactionSchema>;
export type PollVoteData = z.infer<typeof pollVoteSchema>;
export type PostFilters = z.infer<typeof postFiltersSchema>;

// Dependencies interface for social domain
export interface SocialDependencies {
  // Post operations
  persistPost: (data: Partial<SocialPost>) => Promise<SocialPost>;
  updatePost: (postId: string, data: Partial<SocialPost>) => Promise<SocialPost | null>;
  getPostById: (postId: string) => Promise<SocialPost | null>;
  deletePost: (postId: string, deletedBy: number) => Promise<boolean>;
  
  // Comment operations
  persistComment: (data: Partial<Comment>) => Promise<Comment>;
  updateComment: (commentId: string, data: Partial<Comment>) => Promise<Comment | null>;
  deleteComment: (commentId: string, deletedBy: number) => Promise<boolean>;
  
  // Reaction operations
  addPostReaction: (postId: string, userId: number, userName: string, type: string) => Promise<boolean>;
  removePostReaction: (postId: string, userId: number) => Promise<boolean>;
  addCommentReaction: (commentId: string, userId: number, userName: string, type: string) => Promise<boolean>;
  
  // User operations
  getUserById: (userId: number) => Promise<User | null>;
  getUsersByOrganization: (organizationId: number) => Promise<User[]>;
  
  // Poll operations
  castPollVote: (postId: string, userId: number, userName: string, option: string) => Promise<boolean>;
  getPollVotes: (postId: string) => Promise<any[]>;
  
  // Utility operations
  extractMentions: (content: string) => string[];
  validateUserAccess: (userId: number, organizationId: number) => Promise<boolean>;
  incrementViewCount: (postId: string) => Promise<void>;
  checkEngagementThresholds: (postId: string) => Promise<any>;
}

/**
 * Social Domain Service
 * Centralizes all social features business logic and validation
 */
export class SocialDomain {
  /**
   * Create a new social post with validation and event publishing
   */
  static async createPost(
    data: CreatePostData,
    authorId: number,
    organizationId: number,
    dependencies: SocialDependencies
  ): Promise<SocialPost> {
    try {
      // Validate input data
      const validatedData = createPostSchema.parse(data);
      
      // Get author information
      const author = await dependencies.getUserById(authorId);
      if (!author || author.organization_id !== organizationId) {
        throw new Error('Invalid author or organization mismatch');
      }

      // Validate poll-specific rules
      if (validatedData.type === 'poll') {
        if (!validatedData.pollOptions || validatedData.pollOptions.length < 2) {
          throw new Error('Polls must have at least 2 options');
        }
        if (validatedData.pollExpiresAt && validatedData.pollExpiresAt <= new Date()) {
          throw new Error('Poll expiration must be in the future');
        }
      }

      // Validate recognition-specific rules
      if (validatedData.type === 'recognition') {
        if (!validatedData.recognitionData) {
          throw new Error('Recognition posts must include recognition data');
        }
        const recipient = await dependencies.getUserById(validatedData.recognitionData.recipientId);
        if (!recipient || recipient.organization_id !== organizationId) {
          throw new Error('Recognition recipient must be from the same organization');
        }
      }

      // Extract mentions from content
      const mentions = dependencies.extractMentions(validatedData.content);
      const mentionUsers = [];
      for (const mention of mentions) {
        // This would need user lookup by username/display name
        // For now, we'll pass the mentions as strings
      }

      // Create post data
      const postData: Partial<SocialPost> = {
        authorId: author.id,
        authorName: author.name,
        authorAvatar: author.avatar,
        organizationId,
        content: validatedData.content,
        imageUrl: validatedData.imageUrl,
        type: validatedData.type,
        visibility: validatedData.visibility,
        tags: validatedData.tags,
        pollOptions: validatedData.pollOptions,
        pollVotes: validatedData.type === 'poll' ? [] : undefined,
        pollExpiresAt: validatedData.pollExpiresAt,
        recognitionData: validatedData.recognitionData,
        reactions: [],
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        isPinned: false,
        mentions: mentions.map(mention => ({
          user_id: 0, // This would need proper user lookup
          userName: mention,
        })),
      };

      const post = await dependencies.persistPost(postData);

      // Publish post created event
      const createdEvent = createPostCreatedEvent(
        {
          post: {
            id: post._id!.toString(),
            authorId: post.authorId,
            authorName: post.authorName,
            organizationId: post.organizationId,
            content: post.content,
            type: post.type,
            visibility: post.visibility,
            imageUrl: post.imageUrl,
            tags: post.tags,
            createdAt: post.createdAt,
          },
          author: {
            id: author.id,
            name: author.name,
            department: author.department,
            avatar: author.avatar,
          },
          organization: {
            id: organizationId,
            name: 'Organization', // This could be fetched from org service
          },
          pollData: validatedData.type === 'poll' ? {
            options: validatedData.pollOptions!,
            expiresAt: validatedData.pollExpiresAt,
          } : undefined,
          recognitionData: validatedData.recognitionData,
        },
        organizationId,
        { postType: validatedData.type, visibility: validatedData.visibility }
      );

      await eventSystem.publish(createdEvent);

      // Publish mention events if there are any
      for (const mention of mentions) {
        // This would need proper user lookup to get mentionedUserId
        // For now, we'll log the mention
        logger.info('📢 User mentioned in post', {
          postId: post._id!.toString(),
          mentionedUser: mention,
          author: author.name,
        });
      }

      logger.info('✅ Social post created', {
        postId: post._id!.toString(),
        author: author.name,
        type: post.type,
        organizationId,
      });

      return post;
    } catch (error: any) {
      logger.error('❌ Error creating social post', {
        error: error?.message || 'unknown_error',
        authorId,
        organizationId,
        data,
      });
      throw error;
    }
  }

  /**
   * Add comment to a post with validation and event publishing
   */
  static async addComment(
    postId: string,
    data: CreateCommentData,
    authorId: number,
    organizationId: number,
    dependencies: SocialDependencies
  ): Promise<Comment> {
    try {
      // Validate input data
      const validatedData = createCommentSchema.parse(data);
      
      // Get post and verify it exists
      const post = await dependencies.getPostById(postId);
      if (!post || post.isDeleted) {
        throw new Error('Post not found or has been deleted');
      }

      if (post.organizationId !== organizationId) {
        throw new Error('Cannot comment on posts from different organization');
      }

      // Get author information
      const author = await dependencies.getUserById(authorId);
      if (!author || author.organization_id !== organizationId) {
        throw new Error('Invalid author or organization mismatch');
      }

      // Validate parent comment if specified
      let parentComment = null;
      if (validatedData.parentCommentId) {
        // This would need comment lookup - for now we'll assume it's valid
        // parentComment = await dependencies.getCommentById(validatedData.parentCommentId);
      }

      // Extract mentions from comment content
      const mentions = dependencies.extractMentions(validatedData.content);

      // Create comment data
      const commentData: Partial<Comment> = {
        postId: new ObjectId(postId),
        authorId: author.id,
        authorName: author.name,
        authorAvatar: author.avatar,
        organizationId,
        content: validatedData.content,
        parentCommentId: validatedData.parentCommentId ? new ObjectId(validatedData.parentCommentId) : undefined,
        reactions: [],
        mentions: mentions.map(mention => ({
          user_id: 0, // This would need proper user lookup
          userName: mention,
        })),
      };

      const comment = await dependencies.persistComment(commentData);

      // Publish comment added event
      const commentEvent = createCommentAddedEvent(
        {
          comment: {
            id: comment._id!.toString(),
            postId: postId,
            authorId: comment.authorId,
            authorName: comment.authorName,
            organizationId: comment.organizationId,
            content: comment.content,
            parentCommentId: comment.parentCommentId?.toString(),
            createdAt: comment.createdAt,
          },
          post: {
            id: postId,
            authorId: post.authorId,
            authorName: post.authorName,
            type: post.type,
          },
          author: {
            id: author.id,
            name: author.name,
            department: author.department,
          },
          mentions: mentions.map(mention => ({
            userId: 0, // Would need proper lookup
            userName: mention,
          })),
          isReply: !!validatedData.parentCommentId,
        },
        organizationId
      );

      await eventSystem.publish(commentEvent);

      logger.info('✅ Comment added to post', {
        commentId: comment._id!.toString(),
        postId,
        author: author.name,
        isReply: !!validatedData.parentCommentId,
      });

      return comment;
    } catch (error: any) {
      logger.error('❌ Error adding comment', {
        error: error?.message || 'unknown_error',
        postId,
        authorId,
        data,
      });
      throw error;
    }
  }

  /**
   * Add reaction to a post with validation and event publishing
   */
  static async addPostReaction(
    postId: string,
    data: ReactionData,
    userId: number,
    organizationId: number,
    dependencies: SocialDependencies
  ): Promise<boolean> {
    try {
      // Validate input data
      const validatedData = reactionSchema.parse(data);
      
      // Get post and verify it exists
      const post = await dependencies.getPostById(postId);
      if (!post || post.isDeleted) {
        throw new Error('Post not found or has been deleted');
      }

      if (post.organizationId !== organizationId) {
        throw new Error('Cannot react to posts from different organization');
      }

      // Get user information
      const user = await dependencies.getUserById(userId);
      if (!user || user.organization_id !== organizationId) {
        throw new Error('Invalid user or organization mismatch');
      }

      // Check if user already has a reaction on this post
      const existingReaction = post.reactions.find(r => r.user_id === userId);
      const previousReaction = existingReaction?.type;

      // Add the reaction (this will replace existing reaction)
      const success = await dependencies.addPostReaction(
        postId,
        user.id,
        user.name,
        validatedData.type
      );

      if (success) {
        // Publish reaction added event
        const reactionEvent = createReactionAddedEvent(
          {
            reaction: {
              userId: user.id,
              userName: user.name,
              type: validatedData.type,
              createdAt: new Date(),
            },
            target: {
              id: postId,
              type: 'post',
              authorId: post.authorId,
              authorName: post.authorName,
              organizationId: post.organizationId,
            },
            reactor: {
              id: user.id,
              name: user.name,
              department: user.department,
            },
            previousReaction,
          },
          organizationId
        );

        await eventSystem.publish(reactionEvent);

        logger.info('✅ Reaction added to post', {
          postId,
          userId: user.id,
          userName: user.name,
          reactionType: validatedData.type,
          previousReaction,
        });
      }

      return success;
    } catch (error: any) {
      logger.error('❌ Error adding reaction to post', {
        error: error?.message || 'unknown_error',
        postId,
        userId,
        data,
      });
      throw error;
    }
  }

  /**
   * Cast vote on a poll with validation and event publishing
   */
  static async castPollVote(
    postId: string,
    data: PollVoteData,
    userId: number,
    organizationId: number,
    dependencies: SocialDependencies
  ): Promise<boolean> {
    try {
      // Validate input data
      const validatedData = pollVoteSchema.parse(data);
      
      // Get post and verify it's a poll
      const post = await dependencies.getPostById(postId);
      if (!post || post.isDeleted) {
        throw new Error('Post not found or has been deleted');
      }

      if (post.type !== 'poll') {
        throw new Error('Can only vote on poll posts');
      }

      if (post.organizationId !== organizationId) {
        throw new Error('Cannot vote on polls from different organization');
      }

      // Check if poll has expired
      if (post.pollExpiresAt && post.pollExpiresAt < new Date()) {
        throw new Error('This poll has expired');
      }

      // Validate option exists
      if (!post.pollOptions || !post.pollOptions.includes(validatedData.option)) {
        throw new Error('Invalid poll option');
      }

      // Get user information
      const user = await dependencies.getUserById(userId);
      if (!user || user.organization_id !== organizationId) {
        throw new Error('Invalid user or organization mismatch');
      }

      // Check if user has already voted
      const existingVote = post.pollVotes?.find(vote => vote.user_id === userId);
      const previousOption = existingVote?.option;
      const isFirstVote = !existingVote;

      // Cast the vote
      const success = await dependencies.castPollVote(
        postId,
        user.id,
        user.name,
        validatedData.option
      );

      if (success) {
        // Publish poll vote event
        const voteEvent = createPollVoteCastEvent(
          {
            vote: {
              userId: user.id,
              userName: user.name,
              option: validatedData.option,
              previousOption,
              votedAt: new Date(),
            },
            poll: {
              postId,
              authorId: post.authorId,
              authorName: post.authorName,
              organizationId: post.organizationId,
              question: post.content,
              options: post.pollOptions,
              expiresAt: post.pollExpiresAt,
            },
            voter: {
              id: user.id,
              name: user.name,
              department: user.department,
            },
            isFirstVote,
          },
          organizationId
        );

        await eventSystem.publish(voteEvent);

        logger.info('✅ Poll vote cast', {
          postId,
          userId: user.id,
          userName: user.name,
          option: validatedData.option,
          previousOption,
          isFirstVote,
        });
      }

      return success;
    } catch (error: any) {
      logger.error('❌ Error casting poll vote', {
        error: error?.message || 'unknown_error',
        postId,
        userId,
        data,
      });
      throw error;
    }
  }

  /**
   * Delete a post with validation and event publishing
   */
  static async deletePost(
    postId: string,
    deletedById: number,
    organizationId: number,
    reason: string | undefined,
    dependencies: SocialDependencies
  ): Promise<boolean> {
    try {
      // Get post and verify it exists
      const post = await dependencies.getPostById(postId);
      if (!post || post.isDeleted) {
        throw new Error('Post not found or already deleted');
      }

      if (post.organizationId !== organizationId) {
        throw new Error('Cannot delete posts from different organization');
      }

      // Get deleter information
      const deleter = await dependencies.getUserById(deletedById);
      if (!deleter || deleter.organization_id !== organizationId) {
        throw new Error('Invalid user or organization mismatch');
      }

      // Check permissions - user can delete their own post or admin can delete any post
      const isAuthor = post.authorId === deletedById;
      // For now, we'll allow any user to delete (in real implementation, check admin role)
      
      // Perform soft delete
      const success = await dependencies.deletePost(postId, deletedById);

      if (success) {
        // Publish post deleted event
        const deleteEvent = createPostDeletedEvent(
          {
            post: {
              id: postId,
              authorId: post.authorId,
              authorName: post.authorName,
              organizationId: post.organizationId,
              type: post.type,
              commentsCount: post.commentsCount,
              reactionsCount: post.reactions.length,
              deletedAt: new Date(),
            },
            deletedBy: {
              id: deleter.id,
              name: deleter.name,
              isAuthor,
            },
            reason,
          },
          organizationId
        );

        await eventSystem.publish(deleteEvent);

        logger.info('✅ Post deleted', {
          postId,
          deletedBy: deleter.name,
          isAuthor,
          reason,
        });
      }

      return success;
    } catch (error: any) {
      logger.error('❌ Error deleting post', {
        error: error?.message || 'unknown_error',
        postId,
        deletedById,
        reason,
      });
      throw error;
    }
  }

  /**
   * Validate social business rules
   */
  static async validateSocialRules(
    operation: 'create_post' | 'add_comment' | 'add_reaction' | 'vote_poll',
    data: any,
    userId: number,
    organizationId: number,
    dependencies: SocialDependencies
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check user access
      const hasAccess = await dependencies.validateUserAccess(userId, organizationId);
      if (!hasAccess) {
        errors.push('User does not have access to this organization');
      }

      // Operation-specific validations
      switch (operation) {
        case 'create_post':
          const postValidation = createPostSchema.safeParse(data);
          if (!postValidation.success) {
            errors.push(...postValidation.error.errors.map(e => e.message));
          }
          break;

        case 'add_comment':
          const commentValidation = createCommentSchema.safeParse(data);
          if (!commentValidation.success) {
            errors.push(...commentValidation.error.errors.map(e => e.message));
          }
          break;

        case 'add_reaction':
          const reactionValidation = reactionSchema.safeParse(data);
          if (!reactionValidation.success) {
            errors.push(...reactionValidation.error.errors.map(e => e.message));
          }
          break;

        case 'vote_poll':
          const voteValidation = pollVoteSchema.safeParse(data);
          if (!voteValidation.success) {
            errors.push(...voteValidation.error.errors.map(e => e.message));
          }
          break;
      }

      return { valid: errors.length === 0, errors };
    } catch (error: any) {
      logger.error('❌ Error validating social rules', {
        error: error?.message || 'unknown_error',
        operation,
        userId,
      });
      return { valid: false, errors: ['Validation failed'] };
    }
  }
}