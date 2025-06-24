import { Express } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import adminRoutes from "./adminRoutes";
import celebrationRoutes from "./celebrationRoutes";
import pointsRoutes from "./pointsRoutes";
import channelRoutes from "./channelRoutes";
import spacesRoutes from "./spacesRoutes";
import featuredPostsRoutes from "./featuredPostsRoutes";
import prioritiesRoutes from "./prioritiesRoutes";
import postsRoutes from "./postsRoutes";
import { logger } from "@shared/logger";

export function registerRoutes(app: Express) {
  logger.info("Registering modular routes...");
  
  // Authentication routes
  app.use("/api/auth", authRoutes);
  
  // User management routes
  app.use("/api/users", userRoutes);
  
  // Admin functionality routes
  app.use("/api/admin", adminRoutes);
  
  // Celebration routes (birthdays, anniversaries)
  app.use("/api/celebrations", celebrationRoutes);
  
  // Points system routes
  app.use("/api/points", pointsRoutes);
  
  // Channel/Space routes
  app.use("/api/channels", channelRoutes);
  app.use("/api/spaces", spacesRoutes);
  
  // Posts interaction routes
  app.use("/api/posts", postsRoutes);
  
  // Featured posts management routes
  app.use("/api/featured-posts", featuredPostsRoutes);
  
  // Priorities management routes
  app.use("/api/priorities", prioritiesRoutes);
  
  logger.info("All modular routes registered successfully");
}