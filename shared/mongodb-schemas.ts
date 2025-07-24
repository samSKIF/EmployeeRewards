import { ObjectId } from 'mongodb';

// Social Posts Schema
export interface SocialPost {
  _id?: ObjectId;
  authorId: number;
  authorName: string;
  organizationId: number;
  content: string;
  imageUrl?: string;
  type: 'text' | 'image' | 'poll' | 'recognition';
  visibility: 'public' | 'team' | 'department';

  // Poll specific fields
  pollOptions?: string[];
  pollVotes?: Array<{
    userId: number;
    option: string;
    votedAt: Date;
  }>;

  // Recognition specific fields
  recognitionData?: {
    recipientId: number;
    recipientName: string;
    points: number;
    category: string;
  };

  // Engagement metrics
  reactions: Array<{
    userId: number;
    type: 'like' | 'love' | 'celebrate' | 'support';
    createdAt: Date;
  }>;

  commentsCount: number;
  sharesCount: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;

  // Indexing fields
  tags?: string[];
  mentions?: number[];
}

// Comments Schema
export interface Comment {
  _id?: ObjectId;
  postId: ObjectId;
  authorId: number;
  authorName: string;
  organizationId: number;
  content: string;
  parentCommentId?: ObjectId; // For nested comments

  reactions: Array<{
    userId: number;
    type: 'like' | 'love' | 'celebrate' | 'support';
    createdAt: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

// Real-time Activity Feed
export interface ActivityFeed {
  _id?: ObjectId;
  userId: number;
  organizationId: number;
  activityType:
    | 'post_created'
    | 'comment_added'
    | 'reaction_added'
    | 'recognition_given'
    | 'recognition_received';

  // Reference to the related entity
  relatedEntityType: 'post' | 'comment' | 'recognition';
  relatedEntityId: string | ObjectId;

  // Activity details
  details: {
    actorId: number;
    actorName: string;
    targetId?: number;
    targetName?: string;
    content?: string;
    points?: number;
  };

  // Status
  isRead: boolean;
  readAt?: Date;

  createdAt: Date;
  expiresAt: Date; // TTL for cleanup
}

// User Conversations (Real-time messaging)
export interface Conversation {
  _id?: ObjectId;
  participants: number[];
  organizationId: number;
  type: 'direct' | 'group';
  title?: string; // For group conversations

  lastMessage?: {
    content: string;
    senderId: number;
    senderName: string;
    timestamp: Date;
    messageType: 'text' | 'image' | 'file';
  };

  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Messages
export interface Message {
  _id?: ObjectId;
  conversationId: ObjectId;
  senderId: number;
  senderName: string;
  organizationId: number;

  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  attachments?: Array<{
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }>;

  // Status tracking
  readBy: Array<{
    userId: number;
    readAt: Date;
  }>;

  // References
  replyToMessageId?: ObjectId;

  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

// Real-time Notifications
export interface Notification {
  _id?: ObjectId;
  userId: number;
  organizationId: number;

  type:
    | 'recognition'
    | 'comment'
    | 'reaction'
    | 'leave_approval'
    | 'system'
    | 'message';
  title: string;
  message: string;

  // Related entity reference
  relatedEntityType?: string;
  relatedEntityId?: string;

  // Status
  isRead: boolean;
  readAt?: Date;

  // Actions
  actionUrl?: string;
  actionLabel?: string;

  createdAt: Date;
  expiresAt: Date; // TTL for cleanup
}

// User Sessions (for real-time presence)
export interface UserSession {
  _id?: ObjectId;
  userId: number;
  organizationId: number;
  sessionId: string;

  // Connection details
  socketId?: string;
  ipAddress?: string;
  userAgent?: string;

  // Status
  status: 'online' | 'away' | 'offline';
  lastActivity: Date;

  createdAt: Date;
  expiresAt: Date; // TTL for cleanup
}

// MongoDB collection names
export const COLLECTIONS = {
  POSTS: 'posts',
  COMMENTS: 'comments',
  ACTIVITY_FEED: 'activity_feed',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  USER_SESSIONS: 'user_sessions',
} as const;

// MongoDB indexes setup
export const mongoIndexes = {
  posts: [
    { organizationId: 1, createdAt: -1 },
    { authorId: 1, createdAt: -1 },
    { 'reactions.userId': 1 },
    { tags: 1 },
    { mentions: 1 },
    { isDeleted: 1 },
  ],
  comments: [
    { postId: 1, createdAt: -1 },
    { authorId: 1, createdAt: -1 },
    { organizationId: 1 },
    { parentCommentId: 1 },
    { isDeleted: 1 },
  ],
  activity_feed: [
    { userId: 1, createdAt: -1 },
    { organizationId: 1, createdAt: -1 },
    { isRead: 1 },
    { expiresAt: 1 }, // TTL index
  ],
  conversations: [
    { participants: 1 },
    { organizationId: 1 },
    { updatedAt: -1 },
    { isActive: 1 },
  ],
  messages: [
    { conversationId: 1, createdAt: -1 },
    { senderId: 1, createdAt: -1 },
    { organizationId: 1 },
    { 'readBy.userId': 1 },
    { isDeleted: 1 },
  ],
  notifications: [
    { userId: 1, createdAt: -1 },
    { organizationId: 1 },
    { isRead: 1 },
    { type: 1 },
    { expiresAt: 1 }, // TTL index
  ],
  user_sessions: [
    { userId: 1 },
    { organizationId: 1 },
    { sessionId: 1 },
    { status: 1 },
    { expiresAt: 1 }, // TTL index
  ],
};
