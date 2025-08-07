// Interest Channels Domain Events
// Defines all events related to interest channels lifecycle and management

import { z } from 'zod';
import { type TypedEvent } from './event-system';

/**
 * Interest Channel Created Event
 * Triggered when a new interest channel is created
 */
export const interestChannelCreatedSchema = z.object({
  channel: z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    interestId: z.number(),
    channelType: z.string(),
    isPrivate: z.boolean(),
    isAutoCreated: z.boolean(),
    maxMembers: z.number().optional(),
    createdBy: z.number(),
    createdAt: z.date(),
  }),
  interest: z.object({
    id: z.number(),
    name: z.string(),
  }),
  organization: z.object({
    id: z.number(),
  }),
  creator: z.object({
    id: z.number(),
  }),
  isAutoCreated: z.boolean(),
  memberCount: z.number(),
});

export type InterestChannelCreatedEvent = TypedEvent<z.infer<typeof interestChannelCreatedSchema>>;

/**
 * Interest Channel Updated Event
 * Triggered when channel information is modified
 */
export const interestChannelUpdatedSchema = z.object({
  channel: z.object({
    id: z.number(),
    name: z.string(),
    updatedAt: z.date(),
  }),
  previousChannel: z.object({
    id: z.number(),
    name: z.string(),
  }),
  updater: z.object({
    id: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
  updatedFields: z.array(z.string()),
});

export type InterestChannelUpdatedEvent = TypedEvent<z.infer<typeof interestChannelUpdatedSchema>>;

/**
 * Channel Post Created Event
 * Triggered when a new post is created in a channel
 */
export const channelPostCreatedSchema = z.object({
  post: z.object({
    id: z.number(),
    channelId: z.number(),
    userId: z.number(),
    title: z.string().optional(),
    content: z.string(),
    postType: z.string(),
    createdAt: z.date(),
  }),
  channel: z.object({
    id: z.number(),
    name: z.string(),
    isPrivate: z.boolean(),
  }),
  author: z.object({
    id: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
  postType: z.string(),
  hasAttachments: z.boolean(),
});

export type ChannelPostCreatedEvent = TypedEvent<z.infer<typeof channelPostCreatedSchema>>;

/**
 * Member Joined Channel Event
 * Triggered when a user joins a channel (auto-join or approved request)
 */
export const memberJoinedChannelSchema = z.object({
  member: z.object({
    id: z.number(),
    channelId: z.number(),
    userId: z.number(),
    role: z.string(),
    joinedAt: z.date(),
  }),
  channel: z.object({
    id: z.number(),
    name: z.string(),
    isPrivate: z.boolean(),
  }),
  user: z.object({
    id: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
  joinMethod: z.enum(['auto', 'approved']),
});

export type MemberJoinedChannelEvent = TypedEvent<z.infer<typeof memberJoinedChannelSchema>>;

/**
 * Member Left Channel Event
 * Triggered when a user leaves a channel
 */
export const memberLeftChannelSchema = z.object({
  channelId: z.number(),
  user: z.object({
    id: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
  previousRole: z.string(),
});

export type MemberLeftChannelEvent = TypedEvent<z.infer<typeof memberLeftChannelSchema>>;

/**
 * Join Request Created Event
 * Triggered when a user requests to join a private channel
 */
export const joinRequestCreatedSchema = z.object({
  joinRequest: z.object({
    id: z.number(),
    channelId: z.number(),
    userId: z.number(),
    message: z.string().optional(),
    status: z.string(),
    createdAt: z.date(),
  }),
  channel: z.object({
    id: z.number(),
    name: z.string(),
    isPrivate: z.boolean(),
  }),
  user: z.object({
    id: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
  message: z.string().optional(),
});

export type JoinRequestCreatedEvent = TypedEvent<z.infer<typeof joinRequestCreatedSchema>>;

/**
 * Join Request Approved Event
 * Triggered when a join request is approved
 */
export const joinRequestApprovedSchema = z.object({
  joinRequest: z.object({
    id: z.number(),
    channelId: z.number(),
    userId: z.number(),
    status: z.string(),
    reviewedBy: z.number(),
    reviewedAt: z.date(),
  }),
  member: z.object({
    id: z.number(),
    channelId: z.number(),
    userId: z.number(),
    role: z.string(),
  }),
  reviewer: z.object({
    id: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
});

export type JoinRequestApprovedEvent = TypedEvent<z.infer<typeof joinRequestApprovedSchema>>;

/**
 * Join Request Rejected Event
 * Triggered when a join request is rejected
 */
export const joinRequestRejectedSchema = z.object({
  joinRequest: z.object({
    id: z.number(),
    channelId: z.number(),
    userId: z.number(),
    status: z.string(),
    reviewedBy: z.number(),
    reviewedAt: z.date(),
  }),
  reviewer: z.object({
    id: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
});

export type JoinRequestRejectedEvent = TypedEvent<z.infer<typeof joinRequestRejectedSchema>>;

/**
 * Post Pinned Event
 * Triggered when a post is pinned in a channel
 */
export const postPinnedSchema = z.object({
  post: z.object({
    id: z.number(),
    channelId: z.number(),
    title: z.string().optional(),
    content: z.string(),
    postType: z.string(),
  }),
  channelId: z.number(),
  pinnedBy: z.object({
    id: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
});

export type PostPinnedEvent = TypedEvent<z.infer<typeof postPinnedSchema>>;

/**
 * Post Unpinned Event
 * Triggered when a post is unpinned in a channel
 */
export const postUnpinnedSchema = z.object({
  post: z.object({
    id: z.number(),
    channelId: z.number(),
    title: z.string().optional(),
    content: z.string(),
    postType: z.string(),
  }),
  channelId: z.number(),
  unpinnedBy: z.object({
    id: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
});

export type PostUnpinnedEvent = TypedEvent<z.infer<typeof postUnpinnedSchema>>;

// Event factory functions (not needed with current eventSystem.publishEvent pattern, but included for completeness)
export const createInterestChannelCreatedEvent = (
  data: z.infer<typeof interestChannelCreatedSchema>
): InterestChannelCreatedEvent => ({
  ...eventSystem.createBaseEvent('interest_channels.channel_created'),
  data,
});

export const createChannelPostCreatedEvent = (
  data: z.infer<typeof channelPostCreatedSchema>
): ChannelPostCreatedEvent => ({
  ...eventSystem.createBaseEvent('interest_channels.post_created'),
  data,
});

export const createMemberJoinedChannelEvent = (
  data: z.infer<typeof memberJoinedChannelSchema>
): MemberJoinedChannelEvent => ({
  ...eventSystem.createBaseEvent('interest_channels.member_joined'),
  data,
});

export const createJoinRequestCreatedEvent = (
  data: z.infer<typeof joinRequestCreatedSchema>
): JoinRequestCreatedEvent => ({
  ...eventSystem.createBaseEvent('interest_channels.join_request_created'),
  data,
});