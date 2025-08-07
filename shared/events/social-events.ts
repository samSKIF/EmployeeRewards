// Social Features Domain Events
// Defines all events related to social feed, posts, comments, and reactions

import { z } from 'zod';
import { TypedEvent } from './event-system';

// Social data schemas for events
const postDataSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  content: z.string().optional(),
  image_url: z.string().url().optional(),
  type: z.enum(['standard', 'recognition', 'announcement', 'celebration']),
  tags: z.array(z.string()).optional(),
  created_at: z.date(),
});

const commentDataSchema = z.object({
  id: z.number(),
  post_id: z.number(),
  user_id: z.number(),
  content: z.string(),
  created_at: z.date(),
});

const reactionDataSchema = z.object({
  id: z.number(),
  post_id: z.number().optional(),
  comment_id: z.number().optional(),
  user_id: z.number(),
  type: z.enum(['like', 'celebrate', 'insightful', 'love', 'funny']),
  created_at: z.date(),
});

// Event schemas
export const postCreatedSchema = z.object({
  post: postDataSchema,
  mentionedUsers: z.array(z.number()).default([]),
  hashtags: z.array(z.string()).default([]),
  notificationsToSend: z.array(z.object({
    userId: z.number(),
    type: z.enum(['mention', 'announcement']),
  })).default([]),
});

export const postUpdatedSchema = z.object({
  post: postDataSchema,
  previousContent: z.string().optional(),
  updatedBy: z.number(),
  updatedFields: z.array(z.string()),
});

export const postDeletedSchema = z.object({
  postId: z.number(),
  post: postDataSchema,
  deletedBy: z.number(),
  deletionReason: z.string().optional(),
  commentsCount: z.number(),
  reactionsCount: z.number(),
});

export const commentCreatedSchema = z.object({
  comment: commentDataSchema,
  post: postDataSchema,
  mentionedUsers: z.array(z.number()).default([]),
  notifyPostAuthor: z.boolean().default(true),
});

export const reactionAddedSchema = z.object({
  reaction: reactionDataSchema,
  targetType: z.enum(['post', 'comment']),
  targetId: z.number(),
  targetAuthorId: z.number(),
  previousReaction: z.object({
    type: z.string(),
    id: z.number(),
  }).optional(),
  actionType: z.enum(['added', 'updated', 'removed']),
});

export const socialMilestoneReachedSchema = z.object({
  userId: z.number(),
  milestone: z.object({
    type: z.enum(['posts_count', 'reactions_received', 'comments_made', 'engagement_score']),
    value: z.number(),
    level: z.string(),
    badge: z.string().optional(),
    points_awarded: z.number().optional(),
  }),
  stats: z.object({
    totalPosts: z.number(),
    totalReactions: z.number(),
    totalComments: z.number(),
    engagementScore: z.number(),
  }),
});

// Event types
export type PostCreatedEvent = TypedEvent<z.infer<typeof postCreatedSchema>>;
export type PostUpdatedEvent = TypedEvent<z.infer<typeof postUpdatedSchema>>;
export type PostDeletedEvent = TypedEvent<z.infer<typeof postDeletedSchema>>;
export type CommentCreatedEvent = TypedEvent<z.infer<typeof commentCreatedSchema>>;
export type ReactionAddedEvent = TypedEvent<z.infer<typeof reactionAddedSchema>>;
export type SocialMilestoneReachedEvent = TypedEvent<z.infer<typeof socialMilestoneReachedSchema>>;

// Event type constants
export const SOCIAL_EVENTS = {
  POST_CREATED: 'social.post_created',
  POST_UPDATED: 'social.post_updated',
  POST_DELETED: 'social.post_deleted',
  COMMENT_CREATED: 'social.comment_created',
  REACTION_ADDED: 'social.reaction_added',
  MILESTONE_REACHED: 'social.milestone_reached',
} as const;

// Event factory functions
export const createPostCreatedEvent = (
  data: z.infer<typeof postCreatedSchema>,
  organizationId: number,
  correlationId?: string,
  metadata?: Record<string, any>
): Omit<PostCreatedEvent, 'id' | 'timestamp'> => ({
  type: SOCIAL_EVENTS.POST_CREATED,
  source: 'social-features',
  version: '1.0',
  correlationId,
  userId: data.post.user_id,
  organizationId,
  data,
  metadata,
});

export const createCommentCreatedEvent = (
  data: z.infer<typeof commentCreatedSchema>,
  organizationId: number,
  correlationId?: string,
  metadata?: Record<string, any>
): Omit<CommentCreatedEvent, 'id' | 'timestamp'> => ({
  type: SOCIAL_EVENTS.COMMENT_CREATED,
  source: 'social-features',
  version: '1.0',
  correlationId,
  userId: data.comment.user_id,
  organizationId,
  data,
  metadata,
});

export const createReactionAddedEvent = (
  data: z.infer<typeof reactionAddedSchema>,
  organizationId: number,
  correlationId?: string,
  metadata?: Record<string, any>
): Omit<ReactionAddedEvent, 'id' | 'timestamp'> => ({
  type: SOCIAL_EVENTS.REACTION_ADDED,
  source: 'social-features',
  version: '1.0',
  correlationId,
  userId: data.reaction.user_id,
  organizationId,
  data,
  metadata,
});

export const createSocialMilestoneReachedEvent = (
  data: z.infer<typeof socialMilestoneReachedSchema>,
  organizationId: number,
  correlationId?: string,
  metadata?: Record<string, any>
): Omit<SocialMilestoneReachedEvent, 'id' | 'timestamp'> => ({
  type: SOCIAL_EVENTS.MILESTONE_REACHED,
  source: 'social-features',
  version: '1.0',
  correlationId,
  userId: data.userId,
  organizationId,
  data,
  metadata,
});