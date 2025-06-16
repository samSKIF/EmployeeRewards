import { Router } from "express";
import { verifyToken, AuthenticatedRequest } from "../middleware/auth";
import { db } from "../db";
import { 
  featuredPostsConfig, 
  interestChannelPosts, 
  interestChannels,
  users
} from "@shared/schema";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import { logger } from "@shared/logger";

const router = Router();

// GET /api/featured-posts - Get featured posts for Spaces discovery page
router.get("/", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    logger.info("Featured posts route accessed", { 
      userId: req.user.id, 
      organizationId: req.user.organizationId 
    });

    // Get most engaging posts from all time
    const featuredPosts = await db.select({
      id: interestChannelPosts.id,
      content: interestChannelPosts.content,
      imageUrl: interestChannelPosts.imageUrl,
      likeCount: interestChannelPosts.likeCount,
      commentCount: interestChannelPosts.commentCount,
      createdAt: interestChannelPosts.createdAt,
      channelId: interestChannels.id,
      channelName: interestChannels.name,
      channelType: interestChannels.channelType,
      authorId: users.id,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl
    })
    .from(interestChannelPosts)
    .innerJoin(interestChannels, eq(interestChannelPosts.channelId, interestChannels.id))
    .innerJoin(users, eq(interestChannelPosts.userId, users.id))
    .where(
      and(
        eq(interestChannels.organizationId, req.user.organizationId || 1),
        eq(interestChannels.isActive, true)
      )
    )
    .orderBy(desc(sql`${interestChannelPosts.likeCount} + ${interestChannelPosts.commentCount}`), desc(interestChannelPosts.createdAt))
    .limit(4);

    res.json(featuredPosts);
  } catch (error) {
    logger.error("Error fetching featured posts:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/featured-posts/config - Get featured posts configuration
router.get("/config", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const config = await db.select()
      .from(featuredPostsConfig)
      .where(eq(featuredPostsConfig.organizationId, req.user.organizationId || 1))
      .limit(1);

    if (config.length === 0) {
      return res.json({
        displayMode: "engagement",
        maxPosts: 4,
        specificSpaces: []
      });
    }

    res.json(config[0]);
  } catch (error) {
    logger.error("Error fetching featured posts config:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/featured-posts/config - Update featured posts configuration
router.post("/config", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { displayMode, maxPosts, specificSpaces } = req.body;

    // Check if config exists
    const existingConfig = await db.select()
      .from(featuredPostsConfig)
      .where(eq(featuredPostsConfig.organizationId, req.user.organizationId || 1))
      .limit(1);

    if (existingConfig.length === 0) {
      // Create new config
      await db.insert(featuredPostsConfig).values({
        organizationId: req.user.organizationId || 1,
        displayMode: displayMode || "engagement",
        maxPosts: maxPosts || 4,
        specificSpaces: specificSpaces || [],
        updatedBy: req.user.id
      });
    } else {
      // Update existing config
      await db.update(featuredPostsConfig)
        .set({
          displayMode: displayMode || "engagement",
          maxPosts: maxPosts || 4,
          specificSpaces: specificSpaces || [],
          updatedAt: new Date(),
          updatedBy: req.user.id
        })
        .where(eq(featuredPostsConfig.organizationId, req.user.organizationId || 1));
    }

    res.json({ success: true });
  } catch (error) {
    logger.error("Error updating featured posts config:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;