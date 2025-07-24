import { ObjectId } from 'mongodb';

// Social Posts Schema
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

  // Poll specific fields
  pollOptions?: string[];
  pollVotes?: Array<{
    userId: number;
    userName: string;
    option: string;
    votedAt: Date;
  }>;
  pollExpiresAt?: Date;

  // Recognition specific fields
  recognitionData?: {
    recipientId: number;
    recipientName: string;
    points: number;
    category: string;
    badgeType: string;
  };

  // Engagement metrics
  reactions: Array<{
    userId: number;
    userName: string;
    type: 'like' | 'love' | 'celebrate' | 'support' | 'insightful';
    createdAt: Date;
  }>;

  commentsCount: number;
  sharesCount: number;
  viewsCount: number;

  // Metadata
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: number;

  // Indexing fields
  tags?: string[];
  mentions?: Array<{
    userId: number;
    userName: string;
  }>;
}

// Comments Schema
export interface Comment {
  _id?: ObjectId;
  postId: ObjectId;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  organizationId: number;
  content: string;
  parentCommentId?: ObjectId; // For nested comments

  reactions: Array<{
    userId: number;
    userName: string;
    type: 'like' | 'love' | 'celebrate' | 'support';
    createdAt: Date;
  }>;

  mentions?: Array<{
    userId: number;
    userName: string;
  }>;

  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: number;
}

// Notifications Schema
export interface Notification {
  _id?: ObjectId;
  userId: number;
  organizationId: number;
  type:
    | 'post_like'
    | 'post_comment'
    | 'comment_like'
    | 'mention'
    | 'recognition'
    | 'birthday'
    | 'anniversary'
    | 'system';
  title: string;
  message: string;

  // Related entity references
  relatedPostId?: ObjectId;
  relatedCommentId?: ObjectId;
  relatedUserId?: number;

  // Action data
  actionData?: {
    url?: string;
    buttonText?: string;
    points?: number;
    recognitionType?: string;
  };

  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date; // For temporary notifications
}

// Activity Feed Schema (for tracking user activities)
export interface ActivityFeed {
  _id?: ObjectId;
  userId: number;
  organizationId: number;
  activityType:
    | 'post_created'
    | 'comment_added'
    | 'reaction_given'
    | 'recognition_sent'
    | 'recognition_received';

  // Activity details
  entityId: ObjectId; // Post ID, Comment ID, etc.
  entityType: 'post' | 'comment' | 'recognition';
  description: string;

  // Related users
  targetUserId?: number; // For activities involving other users
  targetUserName?: string;

  points?: number; // If activity involves points
  createdAt: Date;
}

// Social Stats Aggregation Schema (for dashboard)
export interface SocialStatsDaily {
  _id?: ObjectId;
  userId: number;
  organizationId: number;
  date: string; // YYYY-MM-DD format

  postsCreated: number;
  commentsAdded: number;
  reactionsGiven: number;
  recognitionsSent: number;
  recognitionsReceived: number;
  pointsEarned: number;

  createdAt: Date;
  updatedAt: Date;
}
