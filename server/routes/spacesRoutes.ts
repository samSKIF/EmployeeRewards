import { Router } from 'express';
import { db } from '../db';
import {
  interestChannels,
  interestChannelPosts,
  users,
} from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@shared/logger';

const router = Router();

// GET /api/spaces/:id - Get specific space details (no auth required)
router.get('/:id', async (req, res) => {
  try {
    const spaceId = parseInt(req.params.id);

    if (isNaN(spaceId)) {
      return res.status(400).json({ message: 'Invalid space ID' });
    }

    const space = await db
      .select()
      .from(interestChannels)
      .where(eq(interestChannels.id, spaceId))
      .limit(1);

    if (space.length === 0) {
      return res.status(404).json({ message: 'Space not found' });
    }

    // Transform the data to match expected interface
    const transformedSpace = {
      id: space[0].id,
      name: space[0].name,
      description: space[0].description,
      channelType: space[0].channelType,
      accessLevel: space[0].accessLevel,
      memberCount: space[0].memberCount || 0,
      isActive: space[0].isActive,
      allowedDepartments: space[0].allowedDepartments,
      allowedSites: space[0].allowedSites,
      createdBy: space[0].createdBy,
      organizationId: space[0].organization_id,
      createdAt: space[0].created_at,
      coverImage: space[0].coverImage,
    };

    logger.info(`Fetched space details for ID: ${spaceId}`);
    res.json(transformedSpace);
  } catch (error: any) {
    logger.error('Error fetching space:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch space' });
  }
});

// GET /api/spaces/:id/posts - Get posts for a specific space (no auth required)
router.get('/:id/posts', async (req, res) => {
  try {
    const spaceId = parseInt(req.params.id);

    if (isNaN(spaceId)) {
      return res.status(400).json({ message: 'Invalid space ID' });
    }

    const posts = await db
      .select({
        id: interestChannelPosts.id,
        content: interestChannelPosts.content,
        user_id: interestChannelPosts.user_id,
        userName: users.name,
        userAvatar: users.avatar_url,
        createdAt: interestChannelPosts.created_at,
        likeCount: interestChannelPosts.likeCount,
        commentCount: interestChannelPosts.commentCount,
        imageUrl: interestChannelPosts.imageUrl,
        type: interestChannelPosts.type,
      })
      .from(interestChannelPosts)
      .innerJoin(users, eq(interestChannelPosts.user_id, users.id))
      .where(eq(interestChannelPosts.channelId, spaceId))
      .orderBy(desc(interestChannelPosts.created_at));

    logger.info(`Fetched ${posts.length} posts for space ID: ${spaceId}`);
    res.json(posts);
  } catch (error: any) {
    logger.error('Error fetching space posts:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to fetch space posts' });
  }
});

export default router;
