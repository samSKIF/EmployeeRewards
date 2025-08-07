// Social Domain Events
// Handles all social feature lifecycle events and cross-cutting concerns

import { z } from 'zod';
import { type TypedEvent } from './event-system';

/**
 * Post Created Event
 * Triggered when a new social post is created
 */
export const postCreatedSchema = z.object({
  post: z.object({
    id: z.string(),
    authorId: z.number(),
    authorName: z.string(),
    organizationId: z.number(),
    content: z.string(),
    type: z.enum(['text', 'image', 'poll', 'recognition', 'announcement']),
    visibility: z.enum(['public', 'team', 'department']),
    imageUrl: z.string().optional(),
    tags: z.array(z.string()).optional(),
    createdAt: z.date(),
  }),
  author: z.object({
    id: z.number(),
    name: z.string(),
    department: z.string().nullable(),
    avatar: z.string().optional(),
  }),
  organization: z.object({
    id: z.number(),
    name: z.string(),
  }),
  // Poll-specific data
  pollData: z.object({
    options: z.array(z.string()),
    expiresAt: z.date().optional(),
  }).optional(),
  // Recognition-specific data
  recognitionData: z.object({
    recipientId: z.number(),
    recipientName: z.string(),
    points: z.number(),
    badgeType: z.string(),
  }).optional(),
});

export type PostCreatedEvent = TypedEvent<z.infer<typeof postCreatedSchema>>;

/**
 * Comment Added Event
 * Triggered when a comment is added to a post
 */
export const commentAddedSchema = z.object({
  comment: z.object({
    id: z.string(),
    postId: z.string(),
    authorId: z.number(),
    authorName: z.string(),
    organizationId: z.number(),
    content: z.string(),
    parentCommentId: z.string().optional(),
    createdAt: z.date(),
  }),
  post: z.object({
    id: z.string(),
    authorId: z.number(),
    authorName: z.string(),
    type: z.enum(['text', 'image', 'poll', 'recognition', 'announcement']),
  }),
  author: z.object({
    id: z.number(),
    name: z.string(),
    department: z.string().nullable(),
  }),
  mentions: z.array(z.object({
    userId: z.number(),
    userName: z.string(),
  })).optional(),
  isReply: z.boolean(),
});

export type CommentAddedEvent = TypedEvent<z.infer<typeof commentAddedSchema>>;

/**
 * Reaction Added Event
 * Triggered when a reaction is added to a post or comment
 */
export const reactionAddedSchema = z.object({
  reaction: z.object({
    userId: z.number(),
    userName: z.string(),
    type: z.enum(['like', 'love', 'celebrate', 'support', 'insightful']),
    createdAt: z.date(),
  }),
  target: z.object({
    id: z.string(),
    type: z.enum(['post', 'comment']),
    authorId: z.number(),
    authorName: z.string(),
    organizationId: z.number(),
  }),
  reactor: z.object({
    id: z.number(),
    name: z.string(),
    department: z.string().nullable(),
  }),
  previousReaction: z.string().optional(), // If user changed reaction
});

export type ReactionAddedEvent = TypedEvent<z.infer<typeof reactionAddedSchema>>;

/**
 * Post Deleted Event
 * Triggered when a post is deleted (soft delete)
 */
export const postDeletedSchema = z.object({
  post: z.object({
    id: z.string(),
    authorId: z.number(),
    authorName: z.string(),
    organizationId: z.number(),
    type: z.enum(['text', 'image', 'poll', 'recognition', 'announcement']),
    commentsCount: z.number(),
    reactionsCount: z.number(),
    deletedAt: z.date(),
  }),
  deletedBy: z.object({
    id: z.number(),
    name: z.string(),
    isAuthor: z.boolean(),
  }),
  reason: z.string().optional(),
});

export type PostDeletedEvent = TypedEvent<z.infer<typeof postDeletedSchema>>;

/**
 * User Mentioned Event
 * Triggered when a user is mentioned in a post or comment
 */
export const userMentionedSchema = z.object({
  mention: z.object({
    mentionedUserId: z.number(),
    mentionedUserName: z.string(),
    mentionedByUserId: z.number(),
    mentionedByUserName: z.string(),
    organizationId: z.number(),
  }),
  content: z.object({
    id: z.string(),
    type: z.enum(['post', 'comment']),
    content: z.string(),
    createdAt: z.date(),
  }),
  context: z.object({
    postId: z.string(),
    postAuthorId: z.number(),
    commentId: z.string().optional(),
  }),
});

export type UserMentionedEvent = TypedEvent<z.infer<typeof userMentionedSchema>>;

/**
 * Poll Vote Cast Event
 * Triggered when a user votes on a poll
 */
export const pollVoteCastSchema = z.object({
  vote: z.object({
    userId: z.number(),
    userName: z.string(),
    option: z.string(),
    previousOption: z.string().optional(),
    votedAt: z.date(),
  }),
  poll: z.object({
    postId: z.string(),
    authorId: z.number(),
    authorName: z.string(),
    organizationId: z.number(),
    question: z.string(),
    options: z.array(z.string()),
    expiresAt: z.date().optional(),
  }),
  voter: z.object({
    id: z.number(),
    name: z.string(),
    department: z.string().nullable(),
  }),
  isFirstVote: z.boolean(),
});

export type PollVoteCastEvent = TypedEvent<z.infer<typeof pollVoteCastSchema>>;

/**
 * Social Engagement Milestone Event
 * Triggered when engagement thresholds are reached
 */
export const engagementMilestoneSchema = z.object({
  milestone: z.object({
    type: z.enum(['post_viral', 'user_popular', 'high_engagement']),
    threshold: z.number(),
    actualValue: z.number(),
    period: z.enum(['daily', 'weekly', 'monthly']),
    achievedAt: z.date(),
  }),
  entity: z.object({
    id: z.string(),
    type: z.enum(['post', 'user', 'organization']),
    name: z.string(),
    organizationId: z.number(),
  }),
  metrics: z.object({
    reactions: z.number(),
    comments: z.number(),
    shares: z.number(),
    views: z.number(),
  }),
});

export type EngagementMilestoneEvent = TypedEvent<z.infer<typeof engagementMilestoneSchema>>;

/**
 * Event Factory Functions
 * Convenient functions to create properly typed events
 */

export const createPostCreatedEvent = (
  data: z.infer<typeof postCreatedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<PostCreatedEvent, 'id' | 'timestamp'> => ({
  type: 'social.post_created',
  data,
  organizationId,
  source: 'social-system',
  correlationId: `post-${data.post.id}-${Date.now()}`,
  metadata: metadata || {},
});

export const createCommentAddedEvent = (
  data: z.infer<typeof commentAddedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<CommentAddedEvent, 'id' | 'timestamp'> => ({
  type: 'social.comment_added',
  data,
  organizationId,
  source: 'social-system',
  correlationId: `comment-${data.comment.id}-${Date.now()}`,
  metadata: metadata || {},
});

export const createReactionAddedEvent = (
  data: z.infer<typeof reactionAddedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<ReactionAddedEvent, 'id' | 'timestamp'> => ({
  type: 'social.reaction_added',
  data,
  organizationId,
  source: 'social-system',
  correlationId: `reaction-${data.target.id}-${data.reaction.userId}-${Date.now()}`,
  metadata: metadata || {},
});

export const createPostDeletedEvent = (
  data: z.infer<typeof postDeletedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<PostDeletedEvent, 'id' | 'timestamp'> => ({
  type: 'social.post_deleted',
  data,
  organizationId,
  source: 'social-system',
  correlationId: `post-deleted-${data.post.id}-${Date.now()}`,
  metadata: metadata || {},
});

export const createUserMentionedEvent = (
  data: z.infer<typeof userMentionedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<UserMentionedEvent, 'id' | 'timestamp'> => ({
  type: 'social.user_mentioned',
  data,
  organizationId,
  source: 'social-system',
  correlationId: `mention-${data.mention.mentionedUserId}-${Date.now()}`,
  metadata: metadata || {},
});

export const createPollVoteCastEvent = (
  data: z.infer<typeof pollVoteCastSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<PollVoteCastEvent, 'id' | 'timestamp'> => ({
  type: 'social.poll_vote_cast',
  data,
  organizationId,
  source: 'social-system',
  correlationId: `poll-vote-${data.poll.postId}-${data.vote.userId}-${Date.now()}`,
  metadata: metadata || {},
});

export const createEngagementMilestoneEvent = (
  data: z.infer<typeof engagementMilestoneSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<EngagementMilestoneEvent, 'id' | 'timestamp'> => ({
  type: 'social.engagement_milestone',
  data,
  organizationId,
  source: 'social-system',
  correlationId: `milestone-${data.entity.type}-${data.entity.id}-${Date.now()}`,
  metadata: metadata || {},
});