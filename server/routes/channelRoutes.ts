import { Router } from "express";
import { verifyToken, AuthenticatedRequest } from "../middleware/auth";
import { storage } from "../storage";
import { db } from "../db";
import { interestChannels, interestChannelMembers, interestChannelPosts, users } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { logger } from "@shared/logger";

const router = Router();

// Get all channels (main endpoint for spaces discovery)
router.get("/", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get all active channels for the user's organization
    const channels = await db.select({
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
    .where(
      and(
        eq(interestChannels.isActive, true),
        eq(interestChannels.organizationId, req.user.organizationId || 1)
      )
    )
    .orderBy(desc(interestChannels.createdAt));

    logger.info(`Fetched ${channels.length} channels for user ${req.user.id}`);
    res.json(channels);
  } catch (error: any) {
    logger.error("Error fetching channels:", error);
    res.status(500).json({ message: error.message || "Failed to fetch channels" });
  }
});

// Get recent posts for admin management
router.get("/recent-posts", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const recentPosts = await db.select({
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
    .orderBy(desc(interestChannelPosts.createdAt))
    .limit(50);

    res.json(recentPosts);
  } catch (error: any) {
    logger.error("Error fetching recent posts:", error);
    res.status(500).json({ message: error.message || "Failed to fetch recent posts" });
  }
});

// Get trending channels
router.get("/trending", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const channels = await storage.getTrendingChannels();
    res.json(channels);
  } catch (error: any) {
    logger.error("Error fetching trending channels:", error);
    res.status(500).json({ message: error.message || "Failed to fetch trending channels" });
  }
});

// Get user's channels
router.get("/my-channels", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const channels = await storage.getUserChannels(req.user.id);
    res.json(channels);
  } catch (error: any) {
    logger.error("Error fetching user channels:", error);
    res.status(500).json({ message: error.message || "Failed to fetch user channels" });
  }
});

// Get channel suggestions
router.get("/suggestions", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const suggestions = await storage.getChannelSuggestions(req.user.id);
    res.json(suggestions);
  } catch (error: any) {
    logger.error("Error fetching channel suggestions:", error);
    res.status(500).json({ message: error.message || "Failed to fetch channel suggestions" });
  }
});

// Get specific channel details
router.get("/:id", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const channelId = parseInt(req.params.id);
    
    if (isNaN(channelId)) {
      return res.status(400).json({ message: "Invalid channel ID" });
    }

    const channel = await storage.getChannel(channelId);
    
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    res.json(channel);
  } catch (error: any) {
    logger.error("Error fetching channel:", error);
    res.status(500).json({ message: error.message || "Failed to fetch channel" });
  }
});

// Get channel posts
router.get("/:id/posts", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const channelId = parseInt(req.params.id);
    
    if (isNaN(channelId)) {
      return res.status(400).json({ message: "Invalid channel ID" });
    }

    const posts = await storage.getChannelPosts(channelId);
    res.json(posts);
  } catch (error: any) {
    logger.error("Error fetching channel posts:", error);
    res.status(500).json({ message: error.message || "Failed to fetch channel posts" });
  }
});

// Get channel members
router.get("/:id/members", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const channelId = parseInt(req.params.id);
    
    if (isNaN(channelId)) {
      return res.status(400).json({ message: "Invalid channel ID" });
    }

    const members = await storage.getChannelMembers(channelId);
    res.json(members);
  } catch (error: any) {
    logger.error("Error fetching channel members:", error);
    res.status(500).json({ message: error.message || "Failed to fetch channel members" });
  }
});

// Join a channel
router.post("/:id/join", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const channelId = parseInt(req.params.id);
    
    if (isNaN(channelId)) {
      return res.status(400).json({ message: "Invalid channel ID" });
    }

    await storage.joinChannel(req.user.id, channelId);
    res.json({ message: "Successfully joined channel" });
  } catch (error: any) {
    logger.error("Error joining channel:", error);
    res.status(500).json({ message: error.message || "Failed to join channel" });
  }
});

// Leave a channel
router.delete("/:id/leave", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const channelId = parseInt(req.params.id);
    
    if (isNaN(channelId)) {
      return res.status(400).json({ message: "Invalid channel ID" });
    }

    await storage.leaveChannel(req.user.id, channelId);
    res.json({ message: "Successfully left channel" });
  } catch (error: any) {
    logger.error("Error leaving channel:", error);
    res.status(500).json({ message: error.message || "Failed to leave channel" });
  }
});

export default router;