import { Router } from "express";
import { verifyToken, AuthenticatedRequest } from "../middleware/auth";
import { db } from "../db";
import { 
  featuredPostsConfig, 
  interestChannelPinnedPosts, 
  interestChannelPosts, 
  interestChannels,
  users,
  interestChannelPostLikes 
} from "@shared/schema";
import { eq, desc, and, sql, inArray, gte } from "drizzle-orm";
import { logger } from "@shared/logger";

const router = Router();

// Get featured posts configuration
router.get("/config", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const config = await db.select()
      .from(featuredPostsConfig)
      .where(eq(featuredPostsConfig.organizationId, req.user.organizationId || 1))
      .limit(1);

    if (config.length === 0) {
      // Create default configuration
      const defaultConfig = await db.insert(featuredPostsConfig)
        .values({
          organizationId: req.user.organizationId || 1,
          displayMode: "pinned",
          maxPosts: 4,
          updatedBy: req.user.id
        })
        .returning();

      return res.json(defaultConfig[0]);
    }

    res.json(config[0]);
  } catch (error: any) {
    logger.error("Error fetching featured posts config:", error);
    res.status(500).json({ message: error.message || "Failed to fetch configuration" });
  }
});

// Update featured posts configuration
router.put("/config", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { displayMode, specificSpaces, maxPosts } = req.body;

    const updatedConfig = await db.update(featuredPostsConfig)
      .set({
        displayMode,
        specificSpaces,
        maxPosts,
        updatedBy: req.user.id,
        updatedAt: new Date()
      })
      .where(eq(featuredPostsConfig.organizationId, req.user.organizationId || 1))
      .returning();

    if (updatedConfig.length === 0) {
      // Create if doesn't exist
      const newConfig = await db.insert(featuredPostsConfig)
        .values({
          organizationId: req.user.organizationId || 1,
          displayMode,
          specificSpaces,
          maxPosts,
          updatedBy: req.user.id
        })
        .returning();

      return res.json(newConfig[0]);
    }

    res.json(updatedConfig[0]);
  } catch (error: any) {
    logger.error("Error updating featured posts config:", error);
    res.status(500).json({ message: error.message || "Failed to update configuration" });
  }
});

// Get featured posts for Spaces discovery page
router.get("/", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get configuration
    const config = await db.select()
      .from(featuredPostsConfig)
      .where(eq(featuredPostsConfig.organizationId, req.user.organizationId || 1))
      .limit(1);

    const displayMode = config[0]?.displayMode || "pinned";
    const maxPosts = config[0]?.maxPosts || 4;
    const specificSpaces = config[0]?.specificSpaces || [];

    let featuredPosts;

    switch (displayMode) {
      case "pinned":
        // Get pinned posts across all channels - fallback to engagement for now
        featuredPosts = [];
        break;

      case "latest_from_spaces":
        // Get latest posts from specific spaces
        if (specificSpaces.length === 0) {
          return res.json([]);
        }

        featuredPosts = await db.select({
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
          authorAvatarUrl: users.avatarUrl,
          pinnedOrder: sql<number>`0`
        })
        .from(interestChannelPosts)
        .innerJoin(interestChannels, eq(interestChannelPosts.channelId, interestChannels.id))
        .innerJoin(users, eq(interestChannelPosts.authorId, users.id))
        .where(
          and(
            inArray(interestChannels.id, specificSpaces.map(Number)),
            eq(interestChannels.organizationId, req.user.organizationId || 1),
            eq(interestChannels.isActive, true)
          )
        )
        .orderBy(desc(interestChannelPosts.createdAt))
        .limit(maxPosts);
        break;

      case "engagement":
      default:
        // Get most engaging posts from last 48 hours
        const twoDaysAgo = new Date();
        twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

        featuredPosts = await db.select({
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
          authorAvatarUrl: users.avatarUrl,
          pinnedOrder: sql<number>`0`,
          engagementScore: sql<number>`${interestChannelPosts.likeCount} + ${interestChannelPosts.commentCount}`
        })
        .from(interestChannelPosts)
        .innerJoin(interestChannels, eq(interestChannelPosts.channelId, interestChannels.id))
        .innerJoin(users, eq(interestChannelPosts.authorId, users.id))
        .where(
          and(
            eq(interestChannels.organizationId, req.user.organizationId || 1),
            eq(interestChannels.isActive, true),
            gte(interestChannelPosts.createdAt, twoDaysAgo)
          )
        )
        .orderBy(desc(sql`${interestChannelPosts.likeCount} + ${interestChannelPosts.commentCount}`), desc(interestChannelPosts.createdAt))
        .limit(maxPosts);
        break;
    }

    // If no pinned posts found, fallback to engagement-based
    if (displayMode === "pinned" && featuredPosts.length === 0) {
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

      featuredPosts = await db.select({
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
        authorAvatarUrl: users.avatarUrl,
        pinnedOrder: sql<number>`0`,
        engagementScore: sql<number>`${interestChannelPosts.likeCount} + ${interestChannelPosts.commentCount}`
      })
      .from(interestChannelPosts)
      .innerJoin(interestChannels, eq(interestChannelPosts.channelId, interestChannels.id))
      .innerJoin(users, eq(interestChannelPosts.authorId, users.id))
      .where(
        and(
          eq(interestChannels.organizationId, req.user.organizationId || 1),
          eq(interestChannels.isActive, true),
          gte(interestChannelPosts.createdAt, twoDaysAgo)
        )
      )
      .orderBy(desc(sql`${interestChannelPosts.likeCount} + ${interestChannelPosts.commentCount}`), desc(interestChannelPosts.createdAt))
      .limit(maxPosts);
    }

    logger.info(`Fetched ${featuredPosts.length} featured posts using ${displayMode} mode`);
    res.json(featuredPosts);
  } catch (error: any) {
    logger.error("Error fetching featured posts:", error);
    res.status(500).json({ message: error.message || "Failed to fetch featured posts" });
  }
});

// Pin a post to featured posts
router.post("/pin/:postId", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const postId = parseInt(req.params.postId);
    const { order = 0 } = req.body;

    // Get the post to find its channel
    const post = await db.select({
      channelId: interestChannelPosts.channelId
    })
    .from(interestChannelPosts)
    .where(eq(interestChannelPosts.id, postId))
    .limit(1);

    if (post.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Pin the post
    const pinnedPost = await db.insert(interestChannelPinnedPosts)
      .values({
        channelId: post[0].channelId,
        postId,
        pinnedBy: req.user.id,
        order
      })
      .onConflictDoUpdate({
        target: [interestChannelPinnedPosts.channelId, interestChannelPinnedPosts.postId],
        set: {
          order,
          pinnedBy: req.user.id,
          pinnedAt: new Date()
        }
      })
      .returning();

    res.json(pinnedPost[0]);
  } catch (error: any) {
    logger.error("Error pinning post:", error);
    res.status(500).json({ message: error.message || "Failed to pin post" });
  }
});

// Unpin a post
router.delete("/pin/:postId", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const postId = parseInt(req.params.postId);

    await db.delete(interestChannelPinnedPosts)
      .where(eq(interestChannelPinnedPosts.postId, postId));

    res.json({ message: "Post unpinned successfully" });
  } catch (error: any) {
    logger.error("Error unpinning post:", error);
    res.status(500).json({ message: error.message || "Failed to unpin post" });
  }
});

export default router;