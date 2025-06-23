import { Router } from "express";
import { db } from "../db";
import { interestChannels, interestChannelPosts, users } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "@shared/logger";

const router = Router();

// GET /api/spaces/:id - Get specific space details (no auth required)
router.get("/:id", async (req, res) => {
  try {
    const spaceId = parseInt(req.params.id);
    
    if (isNaN(spaceId)) {
      return res.status(400).json({ message: "Invalid space ID" });
    }

    const space = await db.select({
      id: interestChannels.id,
      name: interestChannels.name,
      description: interestChannels.description,
      channelType: interestChannels.channelType,
      accessLevel: interestChannels.accessLevel,
      memberCount: interestChannels.memberCount,
      isActive: interestChannels.isActive,
      allowedDepartments: interestChannels.allowedDepartments,
      allowedSites: interestChannels.allowedSites,
      createdAt: interestChannels.createdAt,
      createdBy: interestChannels.createdBy,
      organizationId: interestChannels.organizationId
    })
    .from(interestChannels)
    .where(eq(interestChannels.id, spaceId))
    .limit(1);

    if (space.length === 0) {
      return res.status(404).json({ message: "Space not found" });
    }

    logger.info(`Fetched space details for ID: ${spaceId}`);
    res.json(space[0]);
  } catch (error: any) {
    logger.error("Error fetching space:", error);
    res.status(500).json({ message: error.message || "Failed to fetch space" });
  }
});

// GET /api/spaces/:id/posts - Get posts for a specific space (no auth required)
router.get("/:id/posts", async (req, res) => {
  try {
    const spaceId = parseInt(req.params.id);
    
    if (isNaN(spaceId)) {
      return res.status(400).json({ message: "Invalid space ID" });
    }

    const posts = await db.select({
      id: interestChannelPosts.id,
      content: interestChannelPosts.content,
      userId: interestChannelPosts.userId,
      userName: users.name,
      userAvatar: users.avatarUrl,
      createdAt: interestChannelPosts.createdAt,
      likeCount: interestChannelPosts.likeCount,
      commentCount: interestChannelPosts.commentCount,
      imageUrl: interestChannelPosts.imageUrl,
      type: interestChannelPosts.type
    })
    .from(interestChannelPosts)
    .innerJoin(users, eq(interestChannelPosts.userId, users.id))
    .where(eq(interestChannelPosts.channelId, spaceId))
    .orderBy(desc(interestChannelPosts.createdAt));

    logger.info(`Fetched ${posts.length} posts for space ID: ${spaceId}`);
    res.json(posts);
  } catch (error: any) {
    logger.error("Error fetching space posts:", error);
    res.status(500).json({ message: error.message || "Failed to fetch space posts" });
  }
});

export default router;