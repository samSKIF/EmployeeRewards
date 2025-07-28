import { mysqlDb } from './db-mysql';
import { mongoDb } from './db-mongodb';
import { redisCache } from './db-redis';
import { auditLogger } from './db-elasticsearch';
import {
  COLLECTIONS,
  type SocialPost,
  type Comment,
  type Notification,
} from '@shared/mongodb-schemas';
import {
  users,
  organizations,
  leaveRequests,
  pointTransactions,
} from '@shared/mysql-schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

export class HybridDatabaseService {
  private static instance: HybridDatabaseService;
  private mongodb: any;
  private initialized = false;

  private constructor() {}

  public static getInstance(): HybridDatabaseService {
    if (!HybridDatabaseService.instance) {
      HybridDatabaseService.instance = new HybridDatabaseService();
    }
    return HybridDatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize MongoDB connection
      this.mongodb = await mongoDb.connect();
      console.log('Hybrid database service initialized');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize hybrid database service:', error);
      throw error;
    }
  }

  // MySQL operations (structured data)
  public async getUserById(id: number): Promise<any> {
    const cacheKey = `user:${id}`;

    // Try cache first
    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query MySQL
    const user = await mysqlDb
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    const result = user[0] || null;

    // Cache for 5 minutes
    if (result) {
      await redisCache.set(cacheKey, result, 300);
    }

    return result;
  }

  public async getOrganizationUsers(organizationId: number): Promise<any[]> {
    const cacheKey = `org_users:${organizationId}`;

    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const orgUsers = await mysqlDb
      .select()
      .from(users)
      .where(
        and(eq(users.organization_id, organizationId), eq(users.isActive, true))
      )
      .orderBy(users.name);

    // Cache for 2 minutes
    await redisCache.set(cacheKey, orgUsers, 120);
    return orgUsers;
  }

  public async createLeaveRequest(data: any): Promise<any> {
    const result = await mysqlDb.insert(leaveRequests).values(data);

    // Log audit event
    await auditLogger.logUserAction(
      data.user_id,
      'leave_request_created',
      { leaveRequestId: result.insertId, ...data },
      data.organization_id
    );

    // Invalidate cache
    await redisCache.del(`user_leave_requests:${data.user_id}`);

    return result;
  }

  // MongoDB operations (social/real-time data)
  public async createPost(
    postData: Omit<SocialPost, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<SocialPost> {
    const post: SocialPost = {
      ...postData,
      reactions: [],
      commentsCount: 0,
      sharesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    };

    const result = await this.mongodb
      .collection(COLLECTIONS.POSTS)
      .insertOne(post);

    // Log audit event
    await auditLogger.logUserAction(
      postData.authorId,
      'post_created',
      { postId: result.insertedId.toString(), content: postData.content },
      postData.organization_id
    );

    // Invalidate feed cache
    await redisCache.del(`feed:${postData.organization_id}`);
    await redisCache.del(`user_posts:${postData.authorId}`);

    return { ...post, _id: result.insertedId };
  }

  public async getOrganizationPosts(
    organizationId: number,
    limit = 20,
    skip = 0
  ): Promise<SocialPost[]> {
    const cacheKey = `feed:${organizationId}:${skip}:${limit}`;

    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const posts = await this.mongodb
      .collection(COLLECTIONS.POSTS)
      .find({
        organizationId,
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Cache for 1 minute
    await redisCache.set(cacheKey, posts, 60);
    return posts;
  }

  public async addComment(
    commentData: Omit<Comment, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<Comment> {
    const comment: Comment = {
      ...commentData,
      reactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    };

    const result = await this.mongodb
      .collection(COLLECTIONS.COMMENTS)
      .insertOne(comment);

    // Update post comment count
    await this.mongodb
      .collection(COLLECTIONS.POSTS)
      .updateOne({ _id: commentData.postId }, { $inc: { commentsCount: 1 } });

    // Log audit event
    await auditLogger.logUserAction(
      commentData.authorId,
      'comment_created',
      {
        commentId: result.insertedId.toString(),
        postId: commentData.postId.toString(),
      },
      commentData.organization_id
    );

    // Invalidate cache
    await redisCache.del(`post_comments:${commentData.postId}`);

    return { ...comment, _id: result.insertedId };
  }

  public async addReactionToPost(
    postId: string,
    user_id: number,
    reactionType: string,
    organizationId: number
  ): Promise<void> {
    const objectId = new (await import('mongodb')).ObjectId(postId);

    // Remove existing reaction from same user
    await this.mongodb
      .collection(COLLECTIONS.POSTS)
      .updateOne({ _id: objectId }, { $pull: { reactions: { user_id } } });

    // Add new reaction
    await this.mongodb.collection(COLLECTIONS.POSTS).updateOne(
      { _id: objectId },
      {
        $push: {
          reactions: {
            user_id,
            type: reactionType,
            createdAt: new Date(),
          },
        },
      }
    );

    // Log audit event
    await auditLogger.logUserAction(
      user_id,
      'reaction_added',
      { postId, reactionType },
      organizationId
    );

    // Invalidate cache
    await redisCache.del(`feed:${organizationId}`);
  }

  public async createNotification(
    notificationData: Omit<Notification, '_id' | 'createdAt' | 'expiresAt'>
  ): Promise<void> {
    const notification: Notification = {
      ...notificationData,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days TTL
    };

    await this.mongodb
      .collection(COLLECTIONS.NOTIFICATIONS)
      .insertOne(notification);

    // Invalidate user notifications cache
    await redisCache.del(`notifications:${notificationData.user_id}`);
  }

  public async getUserNotifications(
    user_id: number,
    limit = 20
  ): Promise<Notification[]> {
    const cacheKey = `notifications:${user_id}`;

    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const notifications = await this.mongodb
      .collection(COLLECTIONS.NOTIFICATIONS)
      .find({ user_id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Cache for 1 minute
    await redisCache.set(cacheKey, notifications, 60);
    return notifications;
  }

  // Hybrid operations (combining MySQL and MongoDB)
  public async getUserDashboardData(user_id: number): Promise<any> {
    const cacheKey = `dashboard:${user_id}`;

    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get user data from MySQL
    const user = await this.getUserById(user_id);
    if (!user) throw new Error('User not found');

    // Get recent activities from MongoDB
    const recentPosts = await this.mongodb
      .collection(COLLECTIONS.POSTS)
      .find({ authorId: user_id, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Get unread notifications count
    const unreadNotifications = await this.mongodb
      .collection(COLLECTIONS.NOTIFICATIONS)
      .countDocuments({ user_id, isRead: false });

    // Get recent point transactions from MySQL
    const recentTransactions = await mysqlDb
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.user_id, user_id))
      .orderBy(desc(pointTransactions.created_at))
      .limit(10);

    const dashboardData = {
      user,
      recentPosts,
      unreadNotifications,
      recentTransactions,
      summary: {
        totalPoints: user.points,
        postsCount: recentPosts.length,
        notificationsCount: unreadNotifications,
      },
    };

    // Cache for 2 minutes
    await redisCache.set(cacheKey, dashboardData, 120);
    return dashboardData;
  }

  // Cache invalidation utilities
  public async invalidateUserCache(user_id: number): Promise<void> {
    await Promise.all([
      redisCache.del(`user:${user_id}`),
      redisCache.del(`dashboard:${user_id}`),
      redisCache.del(`user_posts:${user_id}`),
      redisCache.del(`notifications:${user_id}`),
    ]);
  }

  public async invalidateOrganizationCache(
    organizationId: number
  ): Promise<void> {
    await Promise.all([
      redisCache.del(`org_users:${organizationId}`),
      redisCache.del(`feed:${organizationId}`),
    ]);
  }

  // Health check
  public async healthCheck(): Promise<{
    mysql: boolean;
    mongodb: boolean;
    redis: boolean;
    elasticsearch: boolean;
  }> {
    const results = {
      mysql: false,
      mongodb: false,
      redis: false,
      elasticsearch: false,
    };

    try {
      // Test MySQL
      await mysqlDb.select().from(users).limit(1);
      results.mysql = true;
    } catch (error) {
      console.error('MySQL health check failed:', error);
    }

    try {
      // Test MongoDB
      await this.mongodb.admin().ping();
      results.mongodb = true;
    } catch (error) {
      console.error('MongoDB health check failed:', error);
    }

    try {
      // Test Redis
      await redisCache.getClient().ping();
      results.redis = true;
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    try {
      // Test Elasticsearch
      await auditLogger.logSystemEvent('health_check', {
        timestamp: new Date(),
      });
      results.elasticsearch = true;
    } catch (error) {
      console.error('Elasticsearch health check failed:', error);
    }

    return results;
  }
}

export const hybridDb = HybridDatabaseService.getInstance();
