
import { Injectable } from '@nestjs/common';
import { hybridDb } from '../../hybrid-db';
import { auditLogger } from '../../db-elasticsearch';
import { COLLECTIONS } from '@shared/mongodb-schemas';

@Injectable()
export class SocialService {
  async getPosts(organizationId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return await hybridDb.getOrganizationPosts(organizationId, limit, skip);
  }

  async createPost(postData: any) {
    return await hybridDb.createPost(postData);
  }

  async addComment(commentData: any) {
    return await hybridDb.addComment(commentData);
  }

  async addReaction(postId: string, userId: number, reactionType: string, organizationId: number) {
    return await hybridDb.addReactionToPost(postId, userId, reactionType, organizationId);
  }

  async getStats(organizationId: number) {
    const mongodb = (await import('../../db-mongodb')).mongoDb.getDb();
    
    const [postsCount, commentsCount, reactionsCount] = await Promise.all([
      mongodb.collection(COLLECTIONS.POSTS).countDocuments({ 
        organizationId, 
        isDeleted: false 
      }),
      mongodb.collection(COLLECTIONS.COMMENTS).countDocuments({ 
        organizationId, 
        isDeleted: false 
      }),
      mongodb.collection(COLLECTIONS.POSTS).aggregate([
        { $match: { organizationId, isDeleted: false } },
        { $project: { reactionCount: { $size: '$reactions' } } },
        { $group: { _id: null, total: { $sum: '$reactionCount' } } }
      ]).toArray()
    ]);

    return {
      posts: postsCount,
      comments: commentsCount,
      reactions: reactionsCount[0]?.total || 0,
      activeUsers: await mongodb.collection(COLLECTIONS.POSTS).distinct('authorId', {
        organizationId,
        isDeleted: false,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      }).then(users => users.length)
    };
  }
}
