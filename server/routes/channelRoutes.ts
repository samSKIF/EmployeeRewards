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
router.get("/:id", async (req, res) => {
  try {
    const channelId = parseInt(req.params.id);
    
    if (isNaN(channelId)) {
      return res.status(400).json({ message: "Invalid channel ID" });
    }

    // Get channel details from database
    const channel = await db.select({
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
    .where(eq(interestChannels.id, channelId))
    .limit(1);

    if (channel.length === 0) {
      return res.status(404).json({ message: "Channel not found" });
    }

    res.json(channel[0]);
  } catch (error: any) {
    logger.error("Error fetching channel:", error);
    res.status(500).json({ message: error.message || "Failed to fetch channel" });
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

// Get channel posts
router.get("/:id/posts", async (req, res) => {
  try {

    const channelId = parseInt(req.params.id);
    
    if (isNaN(channelId)) {
      return res.status(400).json({ message: "Invalid channel ID" });
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
      type: sql`'post'`.as('type')
    })
    .from(interestChannelPosts)
    .innerJoin(users, eq(interestChannelPosts.userId, users.id))
    .where(eq(interestChannelPosts.channelId, channelId))
    .orderBy(desc(interestChannelPosts.createdAt));

    res.json(posts);
  } catch (error: any) {
    logger.error("Error fetching channel posts:", error);
    res.status(500).json({ message: error.message || "Failed to fetch channel posts" });
  }
});

// Get channel members
router.get("/:id/members", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const channelId = parseInt(req.params.id);
    
    if (isNaN(channelId)) {
      return res.status(400).json({ message: "Invalid channel ID" });
    }

    const members = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      avatarUrl: users.avatarUrl,
      department: users.department,
      joinedAt: interestChannelMembers.joinedAt
    })
    .from(interestChannelMembers)
    .innerJoin(users, eq(interestChannelMembers.userId, users.id))
    .where(eq(interestChannelMembers.channelId, channelId))
    .orderBy(desc(interestChannelMembers.joinedAt));

    res.json(members);
  } catch (error: any) {
    logger.error("Error fetching channel members:", error);
    res.status(500).json({ message: error.message || "Failed to fetch channel members" });
  }
});

// Get channel admins
router.get("/:id/admins", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const channelId = parseInt(req.params.id);
    
    if (isNaN(channelId)) {
      return res.status(400).json({ message: "Invalid channel ID" });
    }

    // Get channel creator as admin
    const channel = await db.select({
      createdBy: interestChannels.createdBy
    })
    .from(interestChannels)
    .where(eq(interestChannels.id, channelId))
    .limit(1);

    if (channel.length === 0) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const admin = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      avatarUrl: users.avatarUrl,
      department: users.department
    })
    .from(users)
    .where(eq(users.id, channel[0].createdBy));

    res.json(admin);
  } catch (error: any) {
    logger.error("Error fetching channel admins:", error);
    res.status(500).json({ message: error.message || "Failed to fetch channel admins" });
  }
});

// Get channel join requests (placeholder for future implementation)
router.get("/:id/join-requests", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const channelId = parseInt(req.params.id);
    
    if (isNaN(channelId)) {
      return res.status(400).json({ message: "Invalid channel ID" });
    }

    // Return empty array for now - join requests functionality not implemented yet
    res.json([]);
  } catch (error: any) {
    logger.error("Error fetching join requests:", error);
    res.status(500).json({ message: error.message || "Failed to fetch join requests" });
  }
});



export default router;