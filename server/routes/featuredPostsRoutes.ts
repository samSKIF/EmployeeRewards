import { Router } from "express";
import { logger } from "@shared/logger";

const router = Router();

// GET /api/featured-posts - Get featured posts for Spaces discovery page
router.get("/", async (req, res) => {
  try {
    logger.info("Featured posts route accessed");

    // Return featured posts with images
    const mockFeaturedPosts = [
      {
        id: 1,
        content: "Celebrating our biggest milestone yet with Project Phoenix launch! 🚀 Our team has worked incredibly hard to bring this vision to life.",
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop&crop=center",
        likeCount: 45,
        commentCount: 18,
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
        content: "Join us for our annual company anniversary celebration! Great food, music, and team bonding activities planned.",
        imageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=600&fit=crop&crop=center",
        likeCount: 32,
        commentCount: 12,
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
        content: "Community Day was a huge success! Thanks to everyone who participated in our volunteer activities at the local shelter.",
        imageUrl: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop&crop=center",
        likeCount: 28,
        commentCount: 9,
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