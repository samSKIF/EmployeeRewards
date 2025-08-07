// Social Features Adapter
// Provides standardized interface for social feed, posts, comments, and reactions

import { z } from 'zod';
import { BaseAdapter, AdapterResult, AdapterContext, PaginatedResult, PaginationOptions, AdapterValidator, commonSchemas } from './base-adapter';
import { db, pool } from '../../server/db';
import { users } from '@shared/schema';
import { eq, and, sql, desc, or, ilike } from 'drizzle-orm';

// Social-specific schemas
const postSchema = z.object({
  id: commonSchemas.id,
  user_id: commonSchemas.userId,
  content: z.string().max(2000).optional(),
  image_url: z.string().url().optional(),
  type: z.enum(['standard', 'recognition', 'announcement', 'celebration']).default('standard'),
  tags: z.array(z.string()).optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

const createPostSchema = postSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

const commentSchema = z.object({
  id: commonSchemas.id,
  post_id: commonSchemas.id,
  user_id: commonSchemas.userId,
  content: z.string().min(1).max(1000),
  created_at: z.date(),
  updated_at: z.date(),
});

const createCommentSchema = commentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

const reactionSchema = z.object({
  id: commonSchemas.id,
  post_id: commonSchemas.id.optional(),
  comment_id: commonSchemas.id.optional(),
  user_id: commonSchemas.userId,
  type: z.enum(['like', 'celebrate', 'insightful', 'love', 'funny']).default('like'),
  created_at: z.date(),
});

const createReactionSchema = reactionSchema.omit({
  id: true,
  created_at: true,
});

// Social data types
export type Post = z.infer<typeof postSchema>;
export type CreatePostData = z.infer<typeof createPostSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type CreateCommentData = z.infer<typeof createCommentSchema>;
export type Reaction = z.infer<typeof reactionSchema>;
export type CreateReactionData = z.infer<typeof createReactionSchema>;

export class SocialAdapter extends BaseAdapter {
  constructor() {
    super({
      adapterName: 'social-adapter',
      version: '1.0.0',
      featureFlag: 'social_adapter_enabled',
      cacheEnabled: true,
      cacheTtl: 60, // 1 minute - social content is dynamic
      fallbackEnabled: true,
    });
  }

  /**
   * Get social feed posts with pagination
   */
  async getFeedPosts(
    pagination: PaginationOptions,
    context: AdapterContext
  ): Promise<PaginatedResult<Post & { 
    user: { name: string; avatar_url?: string; job_title?: string }; 
    reactionCount: number;
    commentCount: number;
    userReaction?: string;
  }>> {
    return this.executeOperation('getFeedPosts', async () => {
      const validatedPagination = AdapterValidator.validate(
        commonSchemas.pagination,
        pagination
      );

      if (!context.organizationId) {
        throw new Error('Organization ID is required');
      }

      // Use raw SQL for complex joins and aggregations
      const query = `
        SELECT 
          p.id, 
          p.user_id,
          p.content, 
          p.image_url,
          p.type,
          p.created_at,
          p.updated_at,
          u.name AS user_name,
          u.avatar_url AS user_avatar_url,
          u.job_title AS user_job_title,
          (
            SELECT COUNT(*) 
            FROM reactions 
            WHERE post_id = p.id
          ) AS reaction_count,
          (
            SELECT COUNT(*) 
            FROM comments 
            WHERE post_id = p.id
          ) AS comment_count,
          (
            SELECT type 
            FROM reactions 
            WHERE post_id = p.id AND user_id = $1
            LIMIT 1
          ) AS user_reaction
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE u.organization_id = $2
        ORDER BY p.created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const offset = (validatedPagination.page - 1) * validatedPagination.limit;
      
      const [postsResult, totalCountResult] = await Promise.all([
        pool.query(query, [
          context.userId || null,
          context.organizationId,
          validatedPagination.limit,
          offset,
        ]),
        pool.query(`
          SELECT COUNT(*) as total
          FROM posts p
          JOIN users u ON p.user_id = u.id
          WHERE u.organization_id = $1
        `, [context.organizationId])
      ]);

      const totalCount = parseInt(totalCountResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / validatedPagination.limit);

      const posts = postsResult.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        content: row.content,
        image_url: row.image_url,
        type: row.type,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        user: {
          name: row.user_name,
          avatar_url: row.user_avatar_url,
          job_title: row.user_job_title,
        },
        reactionCount: parseInt(row.reaction_count),
        commentCount: parseInt(row.comment_count),
        userReaction: row.user_reaction,
      }));

      return {
        data: posts,
        pagination: {
          currentPage: validatedPagination.page,
          totalPages,
          totalCount,
          limit: validatedPagination.limit,
          hasNext: validatedPagination.page < totalPages,
          hasPrev: validatedPagination.page > 1,
        },
      };
    }, context) as Promise<PaginatedResult<Post & { 
      user: { name: string; avatar_url?: string; job_title?: string }; 
      reactionCount: number;
      commentCount: number;
      userReaction?: string;
    }>>;
  }

  /**
   * Create a new post
   */
  async createPost(
    postData: CreatePostData,
    context: AdapterContext
  ): Promise<AdapterResult<Post>> {
    return this.executeOperation('createPost', async () => {
      const validatedData = AdapterValidator.validate(createPostSchema, postData);

      if (!validatedData.content && !validatedData.image_url) {
        throw new Error('Post must have content or image');
      }

      // Use raw SQL for post creation to match existing pattern
      const query = `
        INSERT INTO posts (user_id, content, image_url, type, tags, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, user_id, content, image_url, type, tags, created_at, updated_at
      `;

      const result = await pool.query(query, [
        validatedData.user_id,
        validatedData.content || '',
        validatedData.image_url,
        validatedData.type,
        validatedData.tags ? JSON.stringify(validatedData.tags) : null,
      ]);

      const newPost = result.rows[0];
      return {
        id: newPost.id,
        user_id: newPost.user_id,
        content: newPost.content,
        image_url: newPost.image_url,
        type: newPost.type,
        tags: newPost.tags ? JSON.parse(newPost.tags) : undefined,
        created_at: new Date(newPost.created_at),
        updated_at: new Date(newPost.updated_at),
      };
    }, context);
  }

  /**
   * Get comments for a post
   */
  async getPostComments(
    postId: number,
    pagination: PaginationOptions,
    context: AdapterContext
  ): Promise<PaginatedResult<Comment & { 
    user: { name: string; avatar_url?: string; job_title?: string }; 
    reactionCount: number;
    userReaction?: string;
  }>> {
    return this.executeOperation('getPostComments', async () => {
      const validatedPagination = AdapterValidator.validate(
        commonSchemas.pagination,
        pagination
      );

      const query = `
        SELECT 
          c.id,
          c.post_id,
          c.user_id,
          c.content,
          c.created_at,
          c.updated_at,
          u.name AS user_name,
          u.avatar_url AS user_avatar_url,
          u.job_title AS user_job_title,
          (
            SELECT COUNT(*) 
            FROM comment_reactions cr 
            WHERE cr.comment_id = c.id
          ) AS reaction_count,
          (
            SELECT cr.type 
            FROM comment_reactions cr 
            WHERE cr.comment_id = c.id AND cr.user_id = $1
            LIMIT 1
          ) AS user_reaction
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = $2
        ORDER BY c.created_at ASC
        LIMIT $3 OFFSET $4
      `;

      const offset = (validatedPagination.page - 1) * validatedPagination.limit;
      
      const [commentsResult, totalCountResult] = await Promise.all([
        pool.query(query, [
          context.userId || null,
          postId,
          validatedPagination.limit,
          offset,
        ]),
        pool.query(`
          SELECT COUNT(*) as total
          FROM comments
          WHERE post_id = $1
        `, [postId])
      ]);

      const totalCount = parseInt(totalCountResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / validatedPagination.limit);

      const comments = commentsResult.rows.map(row => ({
        id: row.id,
        post_id: row.post_id,
        user_id: row.user_id,
        content: row.content,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        user: {
          name: row.user_name,
          avatar_url: row.user_avatar_url,
          job_title: row.user_job_title,
        },
        reactionCount: parseInt(row.reaction_count),
        userReaction: row.user_reaction,
      }));

      return {
        data: comments,
        pagination: {
          currentPage: validatedPagination.page,
          totalPages,
          totalCount,
          limit: validatedPagination.limit,
          hasNext: validatedPagination.page < totalPages,
          hasPrev: validatedPagination.page > 1,
        },
      };
    }, context) as Promise<PaginatedResult<Comment & { 
      user: { name: string; avatar_url?: string; job_title?: string }; 
      reactionCount: number;
      userReaction?: string;
    }>>;
  }

  /**
   * Add or update a reaction to a post
   */
  async togglePostReaction(
    postId: number,
    reactionType: string,
    context: AdapterContext
  ): Promise<AdapterResult<{ action: 'added' | 'updated' | 'removed'; reaction?: Reaction }>> {
    return this.executeOperation('togglePostReaction', async () => {
      if (!context.userId) {
        throw new Error('User ID is required');
      }

      if (!['like', 'celebrate', 'insightful', 'love', 'funny'].includes(reactionType)) {
        throw new Error('Invalid reaction type');
      }

      // Check for existing reaction
      const existingQuery = `
        SELECT id, type FROM reactions 
        WHERE post_id = $1 AND user_id = $2
      `;
      const existingResult = await pool.query(existingQuery, [postId, context.userId]);

      if (existingResult.rows.length > 0) {
        const existingReaction = existingResult.rows[0];

        if (existingReaction.type === reactionType) {
          // Remove reaction if same type
          await pool.query(`
            DELETE FROM reactions 
            WHERE post_id = $1 AND user_id = $2
          `, [postId, context.userId]);
          
          return { action: 'removed' };
        } else {
          // Update to new reaction type
          const updateResult = await pool.query(`
            UPDATE reactions 
            SET type = $1, created_at = NOW()
            WHERE post_id = $2 AND user_id = $3
            RETURNING *
          `, [reactionType, postId, context.userId]);

          return {
            action: 'updated',
            reaction: {
              id: updateResult.rows[0].id,
              post_id: updateResult.rows[0].post_id,
              comment_id: updateResult.rows[0].comment_id,
              user_id: updateResult.rows[0].user_id,
              type: updateResult.rows[0].type,
              created_at: new Date(updateResult.rows[0].created_at),
            },
          };
        }
      } else {
        // Create new reaction
        const insertResult = await pool.query(`
          INSERT INTO reactions (post_id, user_id, type, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING *
        `, [postId, context.userId, reactionType]);

        return {
          action: 'added',
          reaction: {
            id: insertResult.rows[0].id,
            post_id: insertResult.rows[0].post_id,
            comment_id: insertResult.rows[0].comment_id,
            user_id: insertResult.rows[0].user_id,
            type: insertResult.rows[0].type,
            created_at: new Date(insertResult.rows[0].created_at),
          },
        };
      }
    }, context);
  }

  /**
   * Get social engagement statistics
   */
  async getSocialStats(
    context: AdapterContext,
    period: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<AdapterResult<{
    totalPosts: number;
    totalComments: number;
    totalReactions: number;
    activeUsers: number;
    topPosters: Array<{ userId: number; name: string; postCount: number }>;
    engagementRate: number;
  }>> {
    return this.executeOperation('getSocialStats', async () => {
      if (!context.organizationId) {
        throw new Error('Organization ID is required');
      }

      // Calculate date range
      const now = new Date();
      const periodStart = new Date();
      switch (period) {
        case 'week':
          periodStart.setDate(now.getDate() - 7);
          break;
        case 'month':
          periodStart.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          periodStart.setMonth(now.getMonth() - 3);
          break;
      }

      const [
        postStats,
        commentStats,
        reactionStats,
        activeUserStats,
        topPostersResult,
      ] = await Promise.all([
        pool.query(`
          SELECT COUNT(*) as total_posts
          FROM posts p
          JOIN users u ON p.user_id = u.id
          WHERE u.organization_id = $1 AND p.created_at >= $2
        `, [context.organizationId, periodStart]),

        pool.query(`
          SELECT COUNT(*) as total_comments
          FROM comments c
          JOIN posts p ON c.post_id = p.id
          JOIN users u ON p.user_id = u.id
          WHERE u.organization_id = $1 AND c.created_at >= $2
        `, [context.organizationId, periodStart]),

        pool.query(`
          SELECT COUNT(*) as total_reactions
          FROM reactions r
          JOIN posts p ON r.post_id = p.id
          JOIN users u ON p.user_id = u.id
          WHERE u.organization_id = $1 AND r.created_at >= $2
        `, [context.organizationId, periodStart]),

        pool.query(`
          SELECT COUNT(DISTINCT p.user_id) as active_users
          FROM posts p
          JOIN users u ON p.user_id = u.id
          WHERE u.organization_id = $1 AND p.created_at >= $2
        `, [context.organizationId, periodStart]),

        pool.query(`
          SELECT 
            p.user_id,
            u.name,
            u.surname,
            COUNT(*) as post_count
          FROM posts p
          JOIN users u ON p.user_id = u.id
          WHERE u.organization_id = $1 AND p.created_at >= $2
          GROUP BY p.user_id, u.name, u.surname
          ORDER BY COUNT(*) DESC
          LIMIT 5
        `, [context.organizationId, periodStart])
      ]);

      const totalPosts = parseInt(postStats.rows[0].total_posts);
      const totalComments = parseInt(commentStats.rows[0].total_comments);
      const totalReactions = parseInt(reactionStats.rows[0].total_reactions);
      const activeUsers = parseInt(activeUserStats.rows[0].active_users);

      const engagementRate = totalPosts > 0 
        ? ((totalComments + totalReactions) / totalPosts) * 100 
        : 0;

      const topPosters = topPostersResult.rows.map(row => ({
        userId: row.user_id,
        name: `${row.name} ${row.surname || ''}`.trim(),
        postCount: parseInt(row.post_count),
      }));

      return {
        totalPosts,
        totalComments,
        totalReactions,
        activeUsers,
        topPosters,
        engagementRate: Math.round(engagementRate * 100) / 100,
      };
    }, context);
  }
}

// Export singleton instance
export const socialAdapter = new SocialAdapter();