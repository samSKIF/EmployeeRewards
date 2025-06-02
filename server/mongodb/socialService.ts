import { ObjectId, Collection } from 'mongodb';
import { getMongoDb } from './connection';
import { SocialPost, Comment, Notification, ActivityFeed } from './models';

export class SocialService {
  private db = getMongoDb();
  private postsCollection: Collection<SocialPost>;
  private commentsCollection: Collection<Comment>;
  private notificationsCollection: Collection<Notification>;
  private activityCollection: Collection<ActivityFeed>;

  constructor() {
    this.postsCollection = this.db.collection('social_posts');
    this.commentsCollection = this.db.collection('comments');
    this.notificationsCollection = this.db.collection('notifications');
    this.activityCollection = this.db.collection('activity_feed');
  }

  // Post Methods
  async createPost(postData: Omit<SocialPost, '_id' | 'createdAt' | 'updatedAt' | 'reactions' | 'commentsCount' | 'sharesCount' | 'viewsCount' | 'isDeleted'>): Promise<SocialPost> {
    const post: SocialPost = {
      ...postData,
      reactions: [],
      commentsCount: 0,
      sharesCount: 0,
      viewsCount: 0,
      isPinned: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.postsCollection.insertOne(post);
    return { ...post, _id: result.insertedId };
  }

  async getPosts(organizationId: number, limit: number = 20, skip: number = 0, authorId?: number): Promise<SocialPost[]> {
    const filter: any = { 
      organizationId, 
      isDeleted: false 
    };
    
    if (authorId) {
      filter.authorId = authorId;
    }

    return await this.postsCollection
      .find(filter)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  async getPostById(postId: string): Promise<SocialPost | null> {
    return await this.postsCollection.findOne({ 
      _id: new ObjectId(postId), 
      isDeleted: false 
    });
  }

  async updatePost(postId: string, updates: Partial<SocialPost>): Promise<boolean> {
    const result = await this.postsCollection.updateOne(
      { _id: new ObjectId(postId) },
      { 
        $set: { 
          ...updates, 
          updatedAt: new Date() 
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  async deletePost(postId: string, deletedBy: number): Promise<boolean> {
    const result = await this.postsCollection.updateOne(
      { _id: new ObjectId(postId) },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date(),
          deletedBy 
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  async addReactionToPost(postId: string, userId: number, userName: string, reactionType: string): Promise<boolean> {
    // Remove existing reaction from same user
    await this.postsCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $pull: { reactions: { userId } } }
    );

    // Add new reaction
    const result = await this.postsCollection.updateOne(
      { _id: new ObjectId(postId) },
      { 
        $push: { 
          reactions: { 
            userId, 
            userName, 
            type: reactionType, 
            createdAt: new Date() 
          } 
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  async removeReactionFromPost(postId: string, userId: number): Promise<boolean> {
    const result = await this.postsCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $pull: { reactions: { userId } } }
    );
    return result.modifiedCount > 0;
  }

  // Comment Methods
  async createComment(commentData: Omit<Comment, '_id' | 'createdAt' | 'updatedAt' | 'reactions' | 'isDeleted'>): Promise<Comment> {
    const comment: Comment = {
      ...commentData,
      reactions: [],
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.commentsCollection.insertOne(comment);
    
    // Update post comments count
    await this.postsCollection.updateOne(
      { _id: commentData.postId },
      { $inc: { commentsCount: 1 } }
    );

    return { ...comment, _id: result.insertedId };
  }

  async getCommentsByPost(postId: string): Promise<Comment[]> {
    return await this.commentsCollection
      .find({ 
        postId: new ObjectId(postId), 
        isDeleted: false 
      })
      .sort({ createdAt: 1 })
      .toArray();
  }

  async deleteComment(commentId: string, deletedBy: number): Promise<boolean> {
    const comment = await this.commentsCollection.findOne({ _id: new ObjectId(commentId) });
    if (!comment) return false;

    const result = await this.commentsCollection.updateOne(
      { _id: new ObjectId(commentId) },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date(),
          deletedBy 
        } 
      }
    );

    if (result.modifiedCount > 0) {
      // Update post comments count
      await this.postsCollection.updateOne(
        { _id: comment.postId },
        { $inc: { commentsCount: -1 } }
      );
    }

    return result.modifiedCount > 0;
  }

  async addReactionToComment(commentId: string, userId: number, userName: string, reactionType: string): Promise<boolean> {
    // Remove existing reaction from same user
    await this.commentsCollection.updateOne(
      { _id: new ObjectId(commentId) },
      { $pull: { reactions: { userId } } }
    );

    // Add new reaction
    const result = await this.commentsCollection.updateOne(
      { _id: new ObjectId(commentId) },
      { 
        $push: { 
          reactions: { 
            userId, 
            userName, 
            type: reactionType, 
            createdAt: new Date() 
          } 
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  // Notification Methods
  async createNotification(notificationData: Omit<Notification, '_id' | 'createdAt' | 'isRead'>): Promise<Notification> {
    const notification: Notification = {
      ...notificationData,
      isRead: false,
      createdAt: new Date()
    };

    const result = await this.notificationsCollection.insertOne(notification);
    return { ...notification, _id: result.insertedId };
  }

  async getUserNotifications(userId: number, limit: number = 20, skip: number = 0): Promise<Notification[]> {
    return await this.notificationsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const result = await this.notificationsCollection.updateOne(
      { _id: new ObjectId(notificationId) },
      { 
        $set: { 
          isRead: true, 
          readAt: new Date() 
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const result = await this.notificationsCollection.updateMany(
      { userId, isRead: false },
      { 
        $set: { 
          isRead: true, 
          readAt: new Date() 
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    return await this.notificationsCollection.countDocuments({
      userId,
      isRead: false
    });
  }

  // Search Methods
  async searchPosts(organizationId: number, query: string, limit: number = 20): Promise<SocialPost[]> {
    return await this.postsCollection
      .find({
        organizationId,
        isDeleted: false,
        $or: [
          { content: { $regex: query, $options: 'i' } },
          { tags: { $regex: query, $options: 'i' } },
          { authorName: { $regex: query, $options: 'i' } }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  // Stats Methods
  async getUserSocialStats(userId: number, organizationId: number): Promise<any> {
    const [postsCount, commentsCount, reactionsGiven, reactionsReceived] = await Promise.all([
      this.postsCollection.countDocuments({ authorId: userId, organizationId, isDeleted: false }),
      this.commentsCollection.countDocuments({ authorId: userId, organizationId, isDeleted: false }),
      this.postsCollection.countDocuments({ 'reactions.userId': userId, organizationId, isDeleted: false }),
      this.postsCollection.countDocuments({ authorId: userId, organizationId, isDeleted: false, 'reactions.0': { $exists: true } })
    ]);

    return {
      posts: postsCount,
      comments: commentsCount,
      reactions: reactionsGiven,
      recognitionsGiven: 0, // TODO: Calculate from recognition posts
      recognitionsReceived: 0 // TODO: Calculate from recognition posts
    };
  }
}