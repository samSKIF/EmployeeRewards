import { Router } from 'express';
import { db } from '../db';
import {
  interestChannelPosts,
  interestChannels,
  users,
} from '../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { logger } from '@shared/logger';

const router = Router();

// GET /api/featured-posts - Get featured posts for Spaces discovery page
router.get('/', async (req, res) => {
  try {
    logger.info('Featured posts route accessed');

    // Get real featured posts from database
    const featuredPosts = await db
      .select({
        id: interestChannelPosts.id,
        content: interestChannelPosts.content,
        imageUrl: interestChannelPosts.image_url,
        likeCount: interestChannelPosts.like_count,
        commentCount: interestChannelPosts.comment_count,
        createdAt: interestChannelPosts.created_at,
        channelId: interestChannelPosts.channel_id,
        channelName: interestChannels.name,
        channelType: interestChannels.channel_type,
        authorId: interestChannelPosts.user_id,
        authorName: users.name,
        authorAvatarUrl: users.avatar_url,
      })
      .from(interestChannelPosts)
      .innerJoin(
        interestChannels,
        eq(interestChannelPosts.channel_id, interestChannels.id)
      )
      .innerJoin(users, eq(interestChannelPosts.user_id, users.id))
      .where(and(eq(interestChannels.is_active, true)))
      .orderBy(desc(interestChannelPosts.like_count))
      .limit(3);

    logger.info(`Retrieved ${featuredPosts.length} real featured posts`);
    res.json(featuredPosts);
  } catch (error) {
    logger.error('Error fetching featured posts:', error);
    res.status(500).json({ message: 'Failed to fetch featured posts' });
  }
});

export default router;
