import { Router } from "express";
import { verifyToken, AuthenticatedRequest } from "../middleware/auth";
import { storage } from "../storage";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "@shared/logger";
import { CacheService } from "../cache/cacheService";

const router = Router();

// Get current user profile
router.get("/me", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    logger.debug(`/api/users/me: Returning data for user ${req.user.id} (${req.user.name}, ${req.user.email})`);
    logger.debug(`User isAdmin value: ${req.user.isAdmin}`);

    // Update lastSeenAt timestamp for ongoing activity tracking
    try {
      await db.update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.id, req.user.id));
    } catch (error) {
      logger.warn("Failed to update lastSeenAt:", error);
    }

    // Fetch fresh user data from database to include any recent updates
    const [freshUser] = await db.select().from(users).where(eq(users.id, req.user.id));

    if (!freshUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the user's balance
    const balance = await storage.getUserBalance(req.user.id);

    // Combine fresh user data with balance, ensuring isAdmin is explicitly set
    const userWithBalance = {
      ...freshUser,
      isAdmin: freshUser.isAdmin === true, // Ensure boolean false for non-admins
      balance
    };

    logger.debug(`Final user object isAdmin: ${userWithBalance.isAdmin}`);
    res.json(userWithBalance);
  } catch (error: any) {
    logger.error("Error getting user data:", error);
    res.status(500).json({ message: error.message || "Failed to get user" });
  }
});

// Update user profile
router.patch("/me", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get fields to update from the request body
    const { name, title, department, location, responsibilities, aboutMe, avatarUrl } = req.body;

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.jobTitle = title;
    if (department !== undefined) updateData.department = department;
    if (location !== undefined) updateData.location = location;
    if (responsibilities !== undefined) updateData.responsibilities = responsibilities;
    if (aboutMe !== undefined) updateData.aboutMe = aboutMe;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    // Update user in database
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, req.user.id))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the user's balance
    const balance = await storage.getUserBalance(req.user.id);

    // Combine user data with balance
    const userWithBalance = {
      ...updatedUser,
      balance
    };

    res.json(userWithBalance);
  } catch (error: any) {
    logger.error("Error updating user profile:", error);
    res.status(500).json({ message: error.message || "Failed to update user profile" });
  }
});

// Upload user avatar
router.post("/avatar", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({ message: "No avatar image provided" });
    }

    try {
      // Update the user record in the database
      const [updatedUser] = await db.update(users)
        .set({ avatarUrl })
        .where(eq(users.id, req.user.id))
        .returning();

      res.json({
        message: "Avatar updated successfully",
        user: updatedUser
      });
    } catch (dbError) {
      logger.error("Database error updating avatar:", dbError);

      // Fallback: If database update fails, still return the user with updated avatar
      const updatedUser = {
        ...req.user,
        avatarUrl
      };

      res.json({
        message: "Avatar updated successfully (local only)",
        user: updatedUser
      });
    }
  } catch (error: any) {
    logger.error("Error updating user avatar:", error);
    res.status(500).json({ message: error.message || "Failed to update avatar" });
  }
});

// Upload user cover photo
router.post("/cover-photo", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { coverPhotoUrl } = req.body;

    if (!coverPhotoUrl) {
      return res.status(400).json({ message: "No cover photo provided" });
    }

    // Update user with the cover photo URL in the database
    const [updatedUser] = await db.update(users)
      .set({ coverPhotoUrl })
      .where(eq(users.id, req.user.id))
      .returning();

    res.json({
      message: "Cover photo updated successfully",
      user: updatedUser
    });
  } catch (error: any) {
    logger.error("Error updating user cover photo:", error);
    res.status(500).json({ message: error.message || "Failed to update cover photo" });
  }
});

// Get all users with optional filtering
router.get("/", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { department, location, search, limit = 50, offset = 0 } = req.query;

    const organizationId = req.user.organizationId;
    
    const userCount = await storage.getUserCount(organizationId);
    logger.info(`Total users in organization ${organizationId}: ${userCount}`);
    logger.info(`Fetching users with limit: ${limit}, offset: ${offset}`);

    const users = await storage.getUsers(
      organizationId,
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    logger.info(`Returned ${users.length} users for organization ${organizationId}`);
    
    // Check if Shams is in the results
    const shamsUser = users.find(u => u.name?.toLowerCase() === 'shams' || u.surname?.toLowerCase() === 'aranib');
    if (shamsUser) {
      logger.info(`Found Shams Aranib in results: ${JSON.stringify(shamsUser)}`);
    } else {
      logger.info(`Shams Aranib NOT found in current batch`);
    }

    res.json(users);
  } catch (error: any) {
    logger.error("Error fetching users:", error);
    res.status(500).json({ message: error.message || "Failed to fetch users" });
  }
});

// Get user departments (from database tables)
router.get("/departments", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Query the departments table directly (no caching for now)
    const departmentRows = await db.execute(sql`
      SELECT name FROM departments 
      WHERE organization_id = ${req.user.organizationId || 1} 
      ORDER BY name
    `);

    const departments = departmentRows.rows.map((row: any) => row.name);
    
    logger.info(`Returning ${departments.length} departments for org ${req.user.organizationId}:`, departments);
    res.json(departments);
  } catch (error: any) {
    logger.error("Error fetching departments:", error);
    res.status(500).json({ message: error.message || "Failed to fetch departments" });
  }
});

// Get user locations (from database tables)
router.get("/locations", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Query the locations table directly (no caching for now)
    const locationRows = await db.execute(sql`
      SELECT name FROM locations 
      WHERE organization_id = ${req.user.organizationId || 1} 
      ORDER BY name
    `);

    const locations = locationRows.rows.map((row: any) => row.name);
    
    logger.info(`Returning ${locations.length} locations for org ${req.user.organizationId}:`, locations);
    res.json(locations);
  } catch (error: any) {
    logger.error("Error fetching locations:", error);
    res.status(500).json({ message: error.message || "Failed to fetch locations" });
  }
});

// Get specific user by ID (must be last to avoid conflicts with other routes)
router.get("/:id", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Fetch user data from database
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));

    if (!targetUser) {
      return res.status(404).json({ message: "Team member not found" });
    }

    // Only return public profile information
    const publicProfile = {
      id: targetUser.id,
      name: targetUser.name,
      surname: targetUser.surname,
      email: targetUser.email,
      jobTitle: targetUser.jobTitle,
      department: targetUser.department,
      location: targetUser.location,
      avatarUrl: targetUser.avatarUrl,
      responsibilities: targetUser.responsibilities,
      aboutMe: targetUser.aboutMe,
      birthDate: targetUser.birthDate,
      hireDate: targetUser.hireDate,
      phoneNumber: targetUser.phoneNumber,
      nationality: targetUser.nationality,
      sex: targetUser.sex,
      coverPhotoUrl: targetUser.coverPhotoUrl
    };

    logger.debug(`Returning public profile for user ${userId} (${targetUser.name})`);
    res.json(publicProfile);
  } catch (error: any) {
    logger.error("Error getting user by ID:", error);
    res.status(500).json({ message: error.message || "Failed to get user" });
  }
});

// Get user profile by ID
router.get("/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Fetch user data from database
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the user's balance if available
    let balance = 0;
    try {
      const balanceData = await storage.getUserBalance(userId);
      balance = balanceData || 0;
    } catch (error) {
      logger.warn("Failed to get user balance:", error);
    }

    // Return user profile data
    const userProfile = {
      ...user,
      balance
    };

    logger.info(`Profile fetched for user ${userId} (${user.name})`);
    res.json(userProfile);
  } catch (error: any) {
    logger.error("Error getting user profile:", error);
    res.status(500).json({ message: error.message || "Failed to get user profile" });
  }
});

export default router;