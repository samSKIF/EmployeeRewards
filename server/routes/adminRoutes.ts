import { Router } from "express";
import { hash } from "bcrypt";
import { verifyToken, verifyAdmin, AuthenticatedRequest } from "../middleware/auth";
import { storage } from "../storage";
import { db, pool } from "../db";
import { users, organizations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "@shared/logger";

const router = Router();

// Create corporate admin account
router.post("/corporate-account", async (req, res) => {
  try {
    const { email, password, name, username } = req.body;
    logger.info("Attempting to create corporate admin account:", { email, name, username });

    if (!email || !password || !name || !username) {
      logger.warn("Missing required fields");
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if email already exists
    const existingEmailUser = await storage.getUserByEmail(email);
    if (existingEmailUser) {
      logger.warn("Email already registered:", email);
      return res.status(409).json({ message: "Email already registered" });
    }

    // Check if username already exists
    const [existingUsernameUser] = await db.select().from(users).where(eq(users.username, username));
    if (existingUsernameUser) {
      logger.warn("Username already taken:", username);
      return res.status(409).json({ message: "Username already taken" });
    }

    // Get the corporate organization
    const orgsResult = await pool.query(`
      SELECT * FROM organizations WHERE type = 'corporate' LIMIT 1
    `);
    logger.debug("Found corporate organizations:", orgsResult.rows);

    let corporateOrg = orgsResult.rows[0];

    if (!corporateOrg) {
      logger.info("No corporate organization found, creating one");
      const newOrgResult = await pool.query(`
        INSERT INTO organizations (name, type, status)
        VALUES ('ThrivioHR Corporate', 'corporate', 'active')
        RETURNING *
      `);

      corporateOrg = newOrgResult.rows[0];
      logger.info("Created corporate organization:", corporateOrg);
    }

    // Hash the password
    const hashedPassword = await hash(password, 10);
    logger.debug("Password hashed successfully");

    logger.debug("Inserting corporate admin user with values:", {
      email,
      username,
      name,
      isAdmin: true,
      role_type: "corporate_admin",
      organization_id: corporateOrg.id
    });

    // Create the user with corporate_admin role
    const result = await pool.query(`
      INSERT INTO users (
        email, username, password, name, 
        "is_admin", role_type, organization_id, 
        permissions, status
      ) 
      VALUES (
        $1, $2, $3, $4, 
        $5, $6, $7, 
        $8, $9
      )
      RETURNING *
    `, [
      email, 
      username, 
      hashedPassword, 
      name, 
      true, 
      "corporate_admin", 
      corporateOrg.id, 
      JSON.stringify({
        manage_clients: true,
        manage_marketplace: true,
        manage_features: true
      }),
      "active"
    ]);

    const newUser = result.rows[0];
    logger.info("Corporate admin user created successfully:", {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role_type: newUser.role_type
    });

    // Return success with user data (excluding password)
    const userWithoutPassword = { ...newUser, password: undefined };
    return res.status(201).json(userWithoutPassword);
  } catch (error: any) {
    logger.error("Error creating corporate admin account:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Verify corporate admin access
router.get("/corporate/check", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if the user is a corporate admin
    if (req.user.roleType !== "corporate_admin") {
      return res.status(403).json({ message: "Forbidden: Corporate admin access required" });
    }

    res.json({ isCorporateAdmin: true });
  } catch (error: any) {
    logger.error("Error checking corporate admin:", error);
    res.status(500).json({ message: error.message || "Error checking corporate admin status" });
  }
});

// Get all organizations (clients)
router.get("/organizations", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if the user is a corporate admin
    if (req.user.roleType !== "corporate_admin") {
      return res.status(403).json({ message: "Forbidden: Corporate admin access required" });
    }

    // Query all organizations that are not corporate
    const result = await pool.query(`
      SELECT 
        o.*, 
        (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count 
      FROM organizations o 
      WHERE o.type != 'corporate'
      ORDER BY o.created_at DESC
    `);

    const organizations = result.rows;

    res.json(organizations);
  } catch (error: any) {
    logger.error("Error getting organizations:", error);
    res.status(500).json({ message: error.message || "Error retrieving organizations" });
  }
});

// Create a new organization (client)
router.post("/organizations", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if the user is a corporate admin
    if (req.user.roleType !== "corporate_admin") {
      return res.status(403).json({ message: "Forbidden: Corporate admin access required" });
    }

    const { name, type, domain, features } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Missing required fields: name and type" });
    }

    // Create new organization
    const result = await pool.query(`
      INSERT INTO organizations (name, type, domain, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING *
    `, [name, type, domain]);

    const newOrg = result.rows[0];

    // Add features if provided
    if (features && Array.isArray(features)) {
      for (const feature of features) {
        await pool.query(`
          INSERT INTO organization_features (organization_id, feature_name, is_enabled)
          VALUES ($1, $2, $3)
        `, [newOrg.id, feature.name, feature.enabled || true]);
      }
    }

    logger.info("New organization created:", newOrg);
    res.status(201).json(newOrg);
  } catch (error: any) {
    logger.error("Error creating organization:", error);
    res.status(500).json({ message: error.message || "Error creating organization" });
  }
});

export default router;