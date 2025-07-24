import { connectToMongoDB } from './connection';
import { SocialService } from './socialService';
import { db } from '../db';
import { posts, comments, reactions, users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export class SocialDataMigration {
  private socialService: SocialService;

  constructor() {
    this.socialService = new SocialService();
  }

  async migrateSocialData() {
    console.log('Starting social data migration from MySQL to MongoDB...');

    try {
      // Connect to MongoDB
      await connectToMongoDB();
      console.log('Connected to MongoDB');

      // Migrate posts
      await this.migratePosts();

      // Migrate comments
      await this.migrateComments();

      // Migrate reactions
      await this.migrateReactions();

      console.log('Social data migration completed successfully!');
    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }
  }

  private async migratePosts() {
    console.log('Migrating posts...');

    // Get all posts from MySQL with user data
    const mysqlPosts = await db
      .select({
        id: posts.id,
        userId: posts.userId,
        userName: users.name,
        userSurname: users.surname,
        content: posts.content,
        imageUrl: posts.imageUrl,
        type: posts.type,
        tags: posts.tags,
        isPinned: posts.isPinned,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        organizationId: users.organizationId,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .orderBy(posts.id);

    console.log(`Found ${mysqlPosts.length} posts to migrate`);

    for (const post of mysqlPosts) {
      try {
        // Map MySQL post to MongoDB format
        const mongoPost = {
          authorId: post.userId,
          authorName: `${post.userName} ${post.userSurname || ''}`.trim(),
          organizationId: post.organizationId || 1, // Default to organization 1 if null
          content: post.content,
          imageUrl: post.imageUrl || undefined,
          type: this.mapPostType(post.type),
          visibility: 'public' as const,
          tags: post.tags || [],
          isPinned: post.isPinned || false,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt || post.createdAt,
          // Initialize empty arrays for MongoDB-specific fields
          reactions: [],
          commentsCount: 0,
          sharesCount: 0,
          viewsCount: 0,
          isDeleted: false,
        };

        await this.socialService.createPost(mongoPost);
        console.log(`Migrated post ${post.id}`);
      } catch (error) {
        console.error(`Error migrating post ${post.id}:`, error);
      }
    }

    console.log('Posts migration completed');
  }

  private async migrateComments() {
    console.log('Migrating comments...');

    // Get all comments from MySQL with user data
    const mysqlComments = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        userId: comments.userId,
        userName: users.name,
        userSurname: users.surname,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        organizationId: users.organizationId,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .orderBy(comments.id);

    console.log(`Found ${mysqlComments.length} comments to migrate`);

    // Get MongoDB posts to map MySQL post IDs to MongoDB ObjectIds
    const mongoPosts = await this.socialService.getPosts(1, 1000); // Get first 1000 posts
    const postIdMap = new Map();

    // Create mapping based on creation time and author (best effort matching)
    for (const mongoPost of mongoPosts) {
      const key = `${mongoPost.authorId}-${mongoPost.createdAt.getTime()}`;
      postIdMap.set(key, mongoPost._id);
    }

    for (const comment of mysqlComments) {
      try {
        // Try to find corresponding MongoDB post
        // This is a best-effort approach - in production you'd want a more robust mapping
        const postKey = `${comment.userId}-${comment.createdAt.getTime()}`;
        const mongoPostId = postIdMap.get(postKey);

        if (!mongoPostId) {
          console.warn(
            `Could not find MongoDB post for comment ${comment.id}, skipping`
          );
          continue;
        }

        const mongoComment = {
          postId: mongoPostId,
          authorId: comment.userId,
          authorName: `${comment.userName} ${comment.userSurname || ''}`.trim(),
          organizationId: comment.organizationId || 1,
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt || comment.createdAt,
          reactions: [],
          isDeleted: false,
        };

        await this.socialService.createComment(mongoComment);
        console.log(`Migrated comment ${comment.id}`);
      } catch (error) {
        console.error(`Error migrating comment ${comment.id}:`, error);
      }
    }

    console.log('Comments migration completed');
  }

  private async migrateReactions() {
    console.log('Migrating reactions...');

    // Get all reactions from MySQL with user data
    const mysqlReactions = await db
      .select({
        id: reactions.id,
        postId: reactions.postId,
        userId: reactions.userId,
        userName: users.name,
        userSurname: users.surname,
        type: reactions.type,
        createdAt: reactions.createdAt,
      })
      .from(reactions)
      .innerJoin(users, eq(reactions.userId, users.id))
      .orderBy(reactions.id);

    console.log(`Found ${mysqlReactions.length} reactions to migrate`);

    // Get MongoDB posts for mapping
    const mongoPosts = await this.socialService.getPosts(1, 1000);
    const postIdMap = new Map();

    for (const mongoPost of mongoPosts) {
      const key = `${mongoPost.authorId}-${mongoPost.createdAt.getTime()}`;
      postIdMap.set(key, mongoPost._id);
    }

    for (const reaction of mysqlReactions) {
      try {
        // Find corresponding MongoDB post
        const postKey = `${reaction.userId}-${reaction.createdAt.getTime()}`;
        const mongoPostId = postIdMap.get(postKey);

        if (!mongoPostId) {
          console.warn(
            `Could not find MongoDB post for reaction ${reaction.id}, skipping`
          );
          continue;
        }

        const userName =
          `${reaction.userName} ${reaction.userSurname || ''}`.trim();

        await this.socialService.addReactionToPost(
          mongoPostId.toString(),
          reaction.userId,
          userName,
          this.mapReactionType(reaction.type)
        );

        console.log(`Migrated reaction ${reaction.id}`);
      } catch (error) {
        console.error(`Error migrating reaction ${reaction.id}:`, error);
      }
    }

    console.log('Reactions migration completed');
  }

  private mapPostType(
    mysqlType: string
  ): 'text' | 'image' | 'poll' | 'recognition' | 'announcement' {
    switch (mysqlType) {
      case 'standard':
        return 'text';
      case 'poll':
        return 'poll';
      case 'announcement':
        return 'announcement';
      case 'recognition':
        return 'recognition';
      default:
        return 'text';
    }
  }

  private mapReactionType(
    mysqlType: string
  ): 'like' | 'love' | 'celebrate' | 'support' | 'insightful' {
    switch (mysqlType) {
      case 'like':
        return 'like';
      case 'love':
        return 'love';
      case 'celebrate':
        return 'celebrate';
      case 'support':
        return 'support';
      case 'insightful':
        return 'insightful';
      default:
        return 'like';
    }
  }
}

// Migration script
export async function runSocialMigration() {
  const migration = new SocialDataMigration();
  await migration.migrateSocialData();
}

// Export the migration function for use in other modules
