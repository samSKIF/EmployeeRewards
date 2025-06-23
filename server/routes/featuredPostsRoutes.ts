import { Router } from "express";
import { logger } from "@shared/logger";

const router = Router();

// GET /api/featured-posts - Get featured posts for Spaces discovery page
router.get("/", async (req, res) => {
  try {
    logger.info("Featured posts route accessed");

    // Return mock featured posts data for testing
    const mockFeaturedPosts = [
      {
        id: 1,
        content: "Celebrating our biggest milestone yet with Project Phoenix launch!",
        imageUrl: null,
        likeCount: 15,
        commentCount: 8,
        createdAt: new Date().toISOString(),
        channelId: 1,
        channelName: "Company Updates",
        channelType: "company-wide",
        authorId: 1,
        authorName: "Sarah Johnson",
        authorAvatarUrl: "https://api.dicebear.com/7.x/personas/png?seed=Sarah"
      },
      {
        id: 21,
        content: "Join us for our annual company anniversary celebration!",
        imageUrl: null,
        likeCount: 12,
        commentCount: 5,
        createdAt: new Date().toISOString(),
        channelId: 21,
        channelName: "Friday Social Club",
        channelType: "social",
        authorId: 2,
        authorName: "Mike Chen",
        authorAvatarUrl: "https://api.dicebear.com/7.x/personas/png?seed=Mike"
      },
      {
        id: 3,
        content: "Community Day was a huge success! Thanks to everyone who participated.",
        imageUrl: null,
        likeCount: 18,
        commentCount: 6,
        createdAt: new Date().toISOString(),
        channelId: 3,
        channelName: "Community Events",
        channelType: "social",
        authorId: 3,
        authorName: "Emma Wilson",
        authorAvatarUrl: "https://api.dicebear.com/7.x/personas/png?seed=Emma"
      }
    ];

    logger.info(`Retrieved ${mockFeaturedPosts.length} featured posts`);
    res.json(mockFeaturedPosts);
  } catch (error) {
    logger.error("Error fetching featured posts:", error);
    res.status(500).json({ message: "Failed to fetch featured posts" });
  }
});

export default router;