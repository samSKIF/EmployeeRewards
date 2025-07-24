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
        imageUrl: interestChannelPosts.imageUrl,
        likeCount: interestChannelPosts.likeCount,
        commentCount: interestChannelPosts.commentCount,
        createdAt: interestChannelPosts.createdAt,
        channelId: interestChannelPosts.channelId,
        channelName: interestChannels.name,
        channelType: interestChannels.channelType,
        authorId: interestChannelPosts.userId,
        authorName: users.name,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(interestChannelPosts)
      .innerJoin(
        interestChannels,
        eq(interestChannelPosts.channelId, interestChannels.id)
      )
      .innerJoin(users, eq(interestChannelPosts.userId, users.id))
      .where(and(eq(interestChannels.isActive, true)))
      .orderBy(desc(interestChannelPosts.likeCount))
      .limit(3);

    logger.info(`Retrieved ${featuredPosts.length} real featured posts`);
    res.json(featuredPosts);
  } catch (error) {
    logger.error('Error fetching featured posts:', error);
    res.status(500).json({ message: 'Failed to fetch featured posts' });
  }
});

export default router;
