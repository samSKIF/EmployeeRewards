import { Express } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import adminRoutes from "./adminRoutes";
import celebrationRoutes from "./celebrationRoutes";
import pointsRoutes from "./pointsRoutes";
import channelRoutes from "./channelRoutes";
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
  
  logger.info("All modular routes registered successfully");
}