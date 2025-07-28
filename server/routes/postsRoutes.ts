import { Router } from 'express';
import { db } from '../db';
import {
  interestChannelPosts,
  interestChannelPostLikes,
  interestChannelPostComments,
  users,
} from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '@shared/logger';

const router = Router();

// POST /api/posts/:id/like - Like/unlike a post
router.post(
  '/:id/like',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const postId = parseInt(req.params.id);
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (isNaN(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      // Check if user already liked this post
      const existingLike = await db
        .select()
        .from(interestChannelPostLikes)
        .where(
          and(
            eq(interestChannelPostLikes.postId, postId),
            eq(interestChannelPostLikes.user_id, user_id)
          )
        )
        .limit(1);

      if (existingLike.length > 0) {
        // Unlike the post
        await db
          .delete(interestChannelPostLikes)
          .where(
            and(
              eq(interestChannelPostLikes.postId, postId),
              eq(interestChannelPostLikes.user_id, user_id)
            )
          );

        // Decrement like count
        await db
          .update(interestChannelPosts)
          .set({ likeCount: sql`${interestChannelPosts.likeCount} - 1` })
          .where(eq(interestChannelPosts.id, postId));

        logger.info(`User ${user_id} unliked post ${postId}`);
        res.json({ message: 'Post unliked', liked: false });
      } else {
        // Like the post
        await db.insert(interestChannelPostLikes).values({
          postId,
          user_id,
          createdAt: new Date(),
        });

        // Increment like count
        await db
          .update(interestChannelPosts)
          .set({ likeCount: sql`${interestChannelPosts.likeCount} + 1` })
          .where(eq(interestChannelPosts.id, postId));

        logger.info(`User ${user_id} liked post ${postId}`);
        res.json({ message: 'Post liked', liked: true });
      }
    } catch (error: any) {
      logger.error('Error toggling post like:', error);
      res
        .status(500)
        .json({ message: error.message || 'Failed to toggle like' });
    }
  }
);

// POST /api/posts/:id/comments - Add a comment to a post
router.post(
  '/:id/comments',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const postId = parseInt(req.params.id);
      const user_id = req.user?.id;
      const { content } = req.body;

      if (!user_id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (isNaN(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Comment content is required' });
      }

      // Create the comment
      const [comment] = await db
        .insert(interestChannelPostComments)
        .values({
          postId,
          authorId: user_id,
          content: content.trim(),
          createdAt: new Date(),
        })
        .returning();

      // Increment comment count on the post
      await db
        .update(interestChannelPosts)
        .set({ commentCount: sql`${interestChannelPosts.commentCount} + 1` })
        .where(eq(interestChannelPosts.id, postId));

      // Get user details for the response
      const user = await db
        .select({
          id: users.id,
          name: users.name,
          avatarUrl: users.avatar_url,
        })
        .from(users)
        .where(eq(users.id, user_id))
        .limit(1);

      const commentWithUser = {
        ...comment,
        author: user[0],
      };

      logger.info(`User ${user_id} commented on post ${postId}`);
      res.status(201).json(commentWithUser);
    } catch (error: any) {
      logger.error('Error creating comment:', error);
      res
        .status(500)
        .json({ message: error.message || 'Failed to create comment' });
    }
  }
);

// GET /api/posts/:id/comments - Get comments for a post
router.get('/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    if (isNaN(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const comments = await db
      .select({
        id: interestChannelPostComments.id,
        content: interestChannelPostComments.content,
        createdAt: interestChannelPostComments.created_at,
        authorId: interestChannelPostComments.authorId,
        authorName: users.name,
        authorAvatar: users.avatar_url,
      })
      .from(interestChannelPostComments)
      .innerJoin(users, eq(interestChannelPostComments.authorId, users.id))
      .where(eq(interestChannelPostComments.postId, postId))
      .orderBy(interestChannelPostComments.created_at);

    res.json(comments);
  } catch (error: any) {
    logger.error('Error fetching comments:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to fetch comments' });
  }
});

export default router;
