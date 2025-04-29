import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./firebase-storage";
import { verifyToken, verifyAdmin, AuthenticatedRequest, generateToken } from "./middleware/auth";
import { scheduleBirthdayRewards } from "./middleware/scheduler";
import { tilloSupplier, carltonSupplier } from "./middleware/suppliers";
import { z } from "zod";
import ExcelJS from 'exceljs';
import { db, pool } from "./db";
import { compare, hash } from "bcrypt";
import { 
  users, insertUserSchema, 
  products, insertProductSchema,
  employees, insertEmployeeSchema,
  brandingSettings, insertBrandingSettingsSchema,
  fileTemplates, insertFileTemplateSchema, FileTemplate,
  organizations, organizationFeatures,
  sellers, productCategories, orderItems,
  supportTickets, ticketMessages, productReviews,
  posts, comments, reactions, polls, pollVotes, recognitions
} from "@shared/schema";
import { eq, desc, asc, and, or, sql } from "drizzle-orm";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create corporate admin account
  app.post("/api/admin/corporate-account", async (req, res) => {
    try {
      const { email, password, name, username } = req.body;
      console.log("Attempting to create corporate admin account:", { email, name, username });

      if (!email || !password || !name || !username) {
        console.log("Missing required fields");
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if email already exists
      const existingEmailUser = await storage.getUserByEmail(email);
      if (existingEmailUser) {
        console.log("Email already registered:", email);
        return res.status(409).json({ message: "Email already registered" });
      }

      // Check if username already exists
      const [existingUsernameUser] = await db.select().from(users).where(eq(users.username, username));
      if (existingUsernameUser) {
        console.log("Username already taken:", username);
        return res.status(409).json({ message: "Username already taken" });
      }

      // Get the corporate organization
      const orgsResult = await pool.query(`
        SELECT * FROM organizations WHERE type = 'corporate' LIMIT 1
      `);
      console.log("Found corporate organizations:", orgsResult.rows);
      
      let corporateOrg = orgsResult.rows[0];
      
      if (!corporateOrg) {
        console.log("No corporate organization found, creating one");
        const newOrgResult = await pool.query(`
          INSERT INTO organizations (name, type, status)
          VALUES ('ThrivioHR Corporate', 'corporate', 'active')
          RETURNING *
        `);
        
        corporateOrg = newOrgResult.rows[0];
        console.log("Created corporate organization:", corporateOrg);
      }

      // Hash the password
      const hashedPassword = await hash(password, 10);
      console.log("Password hashed successfully");

      console.log("Inserting corporate admin user with values:", {
        email,
        username,
        name,
        isAdmin: true,
        role_type: "corporate_admin",
        organization_id: corporateOrg.id
      });

      // Create the user with corporate_admin role
      // Use SQL directly to avoid type errors
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
      console.log("Corporate admin user created successfully:", {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role_type: newUser.role_type
      });

      // Return success with user data (excluding password)
      const userWithoutPassword = { ...newUser, password: undefined };
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating corporate admin account:", error);
      return res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });
  
  // Verify corporate admin access
  app.get("/api/admin/corporate/check", verifyToken, async (req: AuthenticatedRequest, res) => {
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
      console.error("Error checking corporate admin:", error);
      res.status(500).json({ message: error.message || "Error checking corporate admin status" });
    }
  });

  // Get all organizations (clients)
  app.get("/api/admin/organizations", verifyToken, async (req: AuthenticatedRequest, res) => {
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
      console.error("Error getting organizations:", error);
      res.status(500).json({ message: error.message || "Error retrieving organizations" });
    }
  });
  
  // Create a new organization (client)
  app.post("/api/admin/organizations", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if the user is a corporate admin
      if (req.user.roleType !== "corporate_admin") {
        return res.status(403).json({ message: "Forbidden: Corporate admin access required" });
      }

      const { name, type, status } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({ message: "Name and type are required" });
      }
      
      // Create the new organization
      const result = await pool.query(`
        INSERT INTO organizations (name, type, status)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [
        name,
        type,
        status || 'active'
      ]);

      const newOrganization = result.rows[0];
      
      // Create the organization features (enable all by default)
      try {
        await pool.query(`
          INSERT INTO organization_features (organization_id, feature_name, is_enabled)
          VALUES 
            ($1, 'shop', true),
            ($1, 'social', true),
            ($1, 'surveys', true),
            ($1, 'hr', true)
        `, [newOrganization.id]);
      } catch (featureError: any) {
        console.error("Error adding organization features:", featureError);
        // Don't throw the error - we want the organization to be created even if features fail
      }
      
      res.status(201).json(newOrganization);
    } catch (error: any) {
      console.error("Error creating organization:", error);
      res.status(500).json({ message: error.message || "Error creating organization" });
    }
  });
  // Registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log("REGISTRATION ATTEMPT - Raw body:", req.body);

      // Check if this is a Firebase user registration
      const { firebaseUid, firebaseUser, ...userData } = req.body;

      // Validate user data using the insertUserSchema (or a subset for Firebase users)
      if (firebaseUid && firebaseUser) {
        // This is a Firebase user registration
        console.log("Processing Firebase user registration", firebaseUser);

        // Check if email already exists
        const existingEmailUser = await storage.getUserByEmail(firebaseUser.email);
        if (existingEmailUser) {
          return res.status(409).json({ message: "Email already registered" });
        }

        // Create username from email if not provided
        const username = userData.username || firebaseUser.email.split('@')[0];

        // Check if username already exists
        const [existingUsernameUser] = await db.select().from(users).where(eq(users.username, username));
        if (existingUsernameUser) {
          return res.status(409).json({ message: "Username already taken" });
        }

        // Create user with data from Firebase and form
        const user = await storage.createUser({
          ...userData,
          email: firebaseUser.email,
          username: username,
          name: firebaseUser.displayName?.split(' ')[0] || username,
          surname: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
          // Set a random password since Firebase handles auth
          password: await hash(Math.random().toString(36).substring(2, 15), 10),
          isAdmin: false, // Firebase users can't be admins by default
          status: 'active',
          firebaseUid // Store the Firebase UID for future reference
        });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        console.log("Firebase user registration successful for:", userWithoutPassword);

        res.status(201).json({
          user: userWithoutPassword
        });
      } else {
        // This is a regular user registration
        // Validate user data
        const validatedUserData = insertUserSchema.parse(userData);

        // Check if email already exists
        const existingEmailUser = await storage.getUserByEmail(validatedUserData.email);
        if (existingEmailUser) {
          return res.status(409).json({ message: "Email already registered" });
        }

        // Check if username already exists
        const [existingUsernameUser] = await db.select().from(users).where(eq(users.username, validatedUserData.username));
        if (existingUsernameUser) {
          return res.status(409).json({ message: "Username already taken" });
        }

        // Create the user
        const user = await storage.createUser(validatedUserData);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        // Generate JWT token for automatic login (for backward compatibility)
        const token = generateToken({
          id: user.id,
          username: user.username,
          name: user.name,
          surname: user.surname,
          email: user.email,
          phoneNumber: user.phoneNumber,
          jobTitle: user.jobTitle,
          department: user.department,
          sex: user.sex,
          nationality: user.nationality,
          birthDate: user.birthDate,
          isAdmin: user.isAdmin,
          status: user.status,
          avatarUrl: user.avatarUrl,
          hireDate: user.hireDate,
          createdAt: user.createdAt
        });

        console.log("Standard registration successful for:", userWithoutPassword);

        res.status(201).json({
          token,
          user: userWithoutPassword
        });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("LOGIN ATTEMPT - Raw body:", req.body);

      // Handle both email and username login attempts
      const { email, username, password } = req.body;

      if ((!email && !username) || !password) {
        console.log("Missing authentication credentials");
        return res.status(400).json({ message: "Email/username and password are required" });
      }

      // Try to find user by email first, then by username if email doesn't exist
      let user = null;

      if (email) {
        console.log(`Looking up user with email: ${email}`);
        user = await storage.getUserByEmail(email);
        if (!user) {
          console.log(`No user found with email: ${email}`);
        }
      }

      if (!user && username) {
        console.log(`Looking up user with username: ${username}`);
        // Add a getUserByUsername method to storage or use direct DB query
        const [foundUser] = await db.select().from(users).where(eq(users.username, username));
        user = foundUser;
        if (!user) {
          console.log(`No user found with username: ${username}`);
        }
      }

      if (!user) {
        console.log("No user found with provided credentials");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log(`User found: ${user.username}, verifying password`);
      console.log("Stored password hash:", user.password);
      console.log("Provided password:", password);

      const passwordMatch = await storage.verifyPassword(password, user.password);

      console.log("Password verification result:", passwordMatch);

      if (!passwordMatch) {
        console.log("Password verification failed");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("Password verified, generating token");
      // Create JWT token
      const token = generateToken({
        id: user.id,
        username: user.username,
        name: user.name,
        surname: user.surname,
        email: user.email,
        phoneNumber: user.phoneNumber,
        jobTitle: user.jobTitle,
        department: user.department,
        sex: user.sex,
        nationality: user.nationality,
        birthDate: user.birthDate,
        isAdmin: user.isAdmin,
        status: user.status,
        avatarUrl: user.avatarUrl,
        hireDate: user.hireDate,
        createdAt: user.createdAt
      });

      // Don't send the password back to the client
      const { password: _, ...userWithoutPassword } = user;

      console.log("Login successful for:", userWithoutPassword);
      console.log("Generated token:", token.substring(0, 20) + "...");

      res.status(200).json({
        token,
        user: userWithoutPassword
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message || "An error occurred during login" });
    }
  });

  // Points ledger routes
  app.post("/api/points/earn", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, amount, reason, description } = req.body;

      if (!userId || !amount || !reason || !description) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const adminId = req.user?.id;

      // Award points to the user
      const transaction = await storage.earnPoints(userId, amount, reason, description, adminId);

      // Get updated balance
      const balance = await storage.getUserBalance(userId);

      res.json({
        transaction,
        balance
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to award points" });
    }
  });

  app.post("/api/points/redeem", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { amount, productId, description } = req.body;

      if (!amount || !productId || !description) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Redeem points for the product
      const { transaction, order } = await storage.redeemPoints(
        req.user.id,
        amount,
        description,
        productId
      );

      // Get updated balance
      const balance = await storage.getUserBalance(req.user.id);

      res.json({
        transaction,
        order,
        balance
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to redeem points" });
    }
  });

  app.get("/api/points/balance", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const balance = await storage.getUserBalance(req.user.id);

      res.json({
        balance,
        userId: req.user.id
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get balance" });
    }
  });

  // User routes
  app.get("/api/users/me", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the user's balance
      const balance = await storage.getUserBalance(req.user.id);
      
      // Combine user data with balance
      const userWithBalance = {
        ...req.user,
        balance
      };

      res.json(userWithBalance);
    } catch (error: any) {
      console.error("Error getting user data:", error);
      res.status(500).json({ message: error.message || "Failed to get user" });
    }
  });

  // Save user metadata from Firebase auth
  app.post("/api/users/metadata", async (req, res) => {
    try {
      console.log("Received user metadata:", req.body);
      const { email, name, username, department, firebaseUid } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user already exists with this email
      const existingUser = await storage.getUserByEmail(email);

      // If user exists, just update the Firebase UID
      if (existingUser) {
        console.log("User already exists, updating Firebase UID", existingUser.id);

        // Update the user's firebaseUid in the database and set admin status if needed
        const isAdmin = email === 'admin@demo.io';

        await db.update(users)
          .set({ 
            firebaseUid: firebaseUid || null,
            // Only set to true for admin email, never change existing admins to false
            ...(isAdmin ? { isAdmin: true } : {})
          })
          .where(eq(users.id, existingUser.id));

        return res.status(200).json({ 
          message: "User updated with Firebase UID", 
          user: existingUser 
        });
      }

      // Otherwise create a new user
      console.log("Creating new user from Firebase auth");
      const defaultPassword = await hash(Math.random().toString(36).slice(2), 10);

      // Special case: Consider admin@demo.io to be an admin user
      const isAdmin = email === 'admin@demo.io';

      const userData = {
        email,
        name: name || email.split('@')[0],
        username: username || email.split('@')[0],
        department: department || null,
        password: defaultPassword,
        firebaseUid: firebaseUid || null,
        isAdmin: isAdmin // Set isAdmin flag based on email check
      };

      const newUser = await storage.createUser(userData);

      res.status(201).json({ 
        message: "User metadata saved", 
        user: newUser 
      });
    } catch (error: any) {
      console.error("Error saving user metadata:", error);
      res.status(500).json({ message: error.message || "Failed to save user metadata" });
    }
  });

  app.get("/api/users", verifyToken, verifyAdmin, async (req, res) => {
    try {
      // Get all users from the database
      const allUsers = await db.select().from(users);
      
      // Get balances for all users
      const usersWithBalance = await Promise.all(allUsers.map(async (user) => {
        const balance = await storage.getUserBalance(user.id);
        // Remove sensitive data like password
        const { password, ...userWithoutPassword } = user;
        return {
          ...userWithoutPassword,
          balance
        };
      }));
      
      res.json(usersWithBalance);
    } catch (error: any) {
      console.error("Error getting all users:", error);
      res.status(500).json({ message: error.message || "Failed to get users" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Return empty transactions for now until we implement proper DB queries
      // This allows the app to function without errors
      const transactions = [];
      
      res.json(transactions);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: error.message || "Failed to get transactions" });
    }
  });

  // Product routes
  // Shop Configuration Routes
  app.get("/api/shop/config", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      const config = await storage.getShopConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching shop config:", error);
      res.status(500).json({ message: "Failed to fetch shop configuration" });
    }
  });

  app.post("/api/shop/config", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      const config = await storage.updateShopConfig(req.body);
      res.json(config);
    } catch (error) {
      console.error("Error updating shop config:", error);
      res.status(500).json({ message: "Failed to update shop configuration" });
    }
  });
  
  // Admin endpoint to refresh the product catalog
  app.post("/api/admin/products/refresh", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log("Refreshing product catalog at admin request...");
      
      // Delete all existing products
      await storage.deleteAllProducts();
      console.log("All existing products deleted");
      
      // Insert all the gift card products
      const giftCardProducts = [
        {
          name: "Amazon Gift Card",
          description: "$50 Amazon gift card to spend on anything you want.",
          category: "Gift Cards",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1584990451792-a664249664bc?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Starbucks Gift Card",
          description: "$25 Starbucks gift card for your coffee breaks.",
          category: "Gift Cards",
          points: 200,
          imageUrl: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Netflix Gift Card",
          description: "$30 Netflix gift card for movies and shows.",
          category: "Gift Cards",
          points: 250,
          imageUrl: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Uber Eats Gift Card",
          description: "$35 Uber Eats credit for meals delivered to your door.",
          category: "Gift Cards",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1593504049359-74330189a345?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Apple App Store Gift Card",
          description: "$25 Apple App Store credit for apps, games and entertainment.",
          category: "Gift Cards",
          points: 200,
          imageUrl: "https://images.unsplash.com/photo-1585184394271-4c0a47dc59c9?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Google Play Gift Card",
          description: "$25 Google Play credit for apps, games, books, and more.",
          category: "Gift Cards",
          points: 200,
          imageUrl: "https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "DoorDash Gift Card",
          description: "$30 DoorDash credit for food delivery from your favorite restaurants.",
          category: "Gift Cards",
          points: 240,
          imageUrl: "https://images.unsplash.com/photo-1582060371588-5d30bf398aa1?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Spotify Premium Gift Card",
          description: "3-month subscription to Spotify Premium.",
          category: "Gift Cards",
          points: 300,
          imageUrl: "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Target Gift Card",
          description: "$50 Target gift card for shopping essentials and more.",
          category: "Gift Cards",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1580828343064-fde4fc206bc6?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Walmart Gift Card",
          description: "$50 Walmart gift card for everyday essentials.",
          category: "Gift Cards",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1601524909162-ae8725290836?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Best Buy Gift Card",
          description: "$100 Best Buy gift card for electronics and appliances.",
          category: "Gift Cards",
          points: 800,
          imageUrl: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Airbnb Gift Card",
          description: "$100 Airbnb credit for your next getaway.",
          category: "Gift Cards",
          points: 800,
          imageUrl: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Steam Gift Card",
          description: "$50 Steam credit for PC games and software.",
          category: "Gift Cards",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1609092472326-41329e320fbc?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Xbox Gift Card",
          description: "$60 Xbox gift card for games and digital content.",
          category: "Gift Cards",
          points: 480,
          imageUrl: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "PlayStation Store Gift Card",
          description: "$60 PlayStation Store credit for games and add-ons.",
          category: "Gift Cards",
          points: 480,
          imageUrl: "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Home Depot Gift Card",
          description: "$75 Home Depot gift card for home improvement projects.",
          category: "Gift Cards",
          points: 600,
          imageUrl: "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Lowe's Gift Card",
          description: "$75 Lowe's gift card for home and garden supplies.",
          category: "Gift Cards",
          points: 600,
          imageUrl: "https://images.unsplash.com/photo-1516822669470-73637e892be3?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Sephora Gift Card",
          description: "$50 Sephora gift card for beauty and skincare products.",
          category: "Gift Cards",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Grubhub Gift Card",
          description: "$40 Grubhub credit for food delivery.",
          category: "Gift Cards",
          points: 320,
          imageUrl: "https://images.unsplash.com/photo-1555992336-fb0d29498b13?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "REI Gift Card",
          description: "$100 REI gift card for outdoor gear and apparel.",
          category: "Gift Cards",
          points: 800,
          imageUrl: "https://images.unsplash.com/photo-1539183204366-63a0589187ab?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Disney+ Subscription",
          description: "6-month subscription to Disney+ streaming service.",
          category: "Gift Cards",
          points: 450,
          imageUrl: "https://images.unsplash.com/photo-1604913571179-f9642e6b43f8?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Hulu Subscription",
          description: "6-month subscription to Hulu streaming service.",
          category: "Gift Cards",
          points: 420,
          imageUrl: "https://images.unsplash.com/photo-1580543687419-070d3bd4858c?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "HBO Max Subscription",
          description: "3-month subscription to HBO Max streaming service.",
          category: "Gift Cards",
          points: 450,
          imageUrl: "https://images.unsplash.com/photo-1520342868574-5fa3804e551c?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Whole Foods Gift Card",
          description: "$50 Whole Foods gift card for grocery shopping.",
          category: "Gift Cards",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Audible Subscription",
          description: "3-month subscription to Audible for audiobooks.",
          category: "Gift Cards",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        }
      ];
      
      // Insert all the electronics products
      const electronicsProducts = [
        {
          name: "Apple Airpods Pro",
          description: "Latest model with noise cancellation technology.",
          category: "Electronics",
          points: 650,
          imageUrl: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Bluetooth Speaker",
          description: "Portable high-quality Bluetooth speaker.",
          category: "Electronics",
          points: 300,
          imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Smart Watch",
          description: "Fitness and health tracking smart watch.",
          category: "Electronics",
          points: 500,
          imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Wireless Charger",
          description: "Fast wireless charging pad for compatible devices.",
          category: "Electronics",
          points: 180,
          imageUrl: "https://images.unsplash.com/photo-1603539444875-76e7684265f6?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Noise-Cancelling Headphones",
          description: "Premium over-ear headphones with active noise cancellation.",
          category: "Electronics",
          points: 700,
          imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Smart Home Speaker",
          description: "Voice-controlled smart speaker with virtual assistant.",
          category: "Electronics",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1549482199-bc1ca6f58502?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Tablet Stand",
          description: "Adjustable stand for tablets and e-readers.",
          category: "Electronics",
          points: 120,
          imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Portable Power Bank",
          description: "20,000mAh power bank for charging devices on the go.",
          category: "Electronics",
          points: 250,
          imageUrl: "https://images.unsplash.com/photo-1587047163886-e71b96567eb9?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Wireless Earbuds",
          description: "Compact wireless earbuds with charging case.",
          category: "Electronics",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1623515651673-28033bd10d13?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Smart Bulb Kit",
          description: "Set of 4 smart LED bulbs with app control.",
          category: "Electronics",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1569073120512-05362a6b92e4?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Digital Photo Frame",
          description: "10-inch digital photo frame with cloud connectivity.",
          category: "Electronics",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1540885762261-a2ca01f290f9?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Smartphone Gimbal",
          description: "3-axis stabilizer for smartphone videography.",
          category: "Electronics",
          points: 450,
          imageUrl: "https://images.unsplash.com/photo-1595781572981-d63151b232ed?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Smart Scale",
          description: "Digital bathroom scale with health metrics and app integration.",
          category: "Electronics",
          points: 320,
          imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Portable Bluetooth Keyboard",
          description: "Foldable Bluetooth keyboard for tablets and smartphones.",
          category: "Electronics",
          points: 200,
          imageUrl: "https://images.unsplash.com/photo-1516317518460-4a16985740e6?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Video Doorbell",
          description: "Smart doorbell with camera and two-way audio.",
          category: "Electronics",
          points: 550,
          imageUrl: "https://images.unsplash.com/photo-1558002038-1055e2fc65af?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Smart Thermostat",
          description: "Energy-saving smart thermostat with remote control.",
          category: "Electronics",
          points: 480,
          imageUrl: "https://images.unsplash.com/photo-1567769541735-d43de3326c00?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Wireless Mouse",
          description: "Ergonomic wireless mouse with long battery life.",
          category: "Electronics",
          points: 150,
          imageUrl: "https://images.unsplash.com/photo-1605773527852-c546a8584ea3?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "USB-C Hub",
          description: "7-in-1 USB-C hub adapter with multiple ports.",
          category: "Electronics",
          points: 220,
          imageUrl: "https://images.unsplash.com/photo-1634328783781-b542bce0b3a6?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Portable Bluetooth Printer",
          description: "Compact photo printer for smartphones and tablets.",
          category: "Electronics",
          points: 380,
          imageUrl: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Streaming Media Player",
          description: "4K streaming device for smart TVs.",
          category: "Electronics",
          points: 320,
          imageUrl: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Wireless Charging Stand",
          description: "Vertical wireless charging stand for smartphones.",
          category: "Electronics",
          points: 220,
          imageUrl: "https://images.unsplash.com/photo-1633060284626-89f955be6f0a?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Gaming Controller",
          description: "Bluetooth gaming controller compatible with PC and mobile.",
          category: "Electronics",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1580327344181-c1163234e5a0?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Bluetooth Tracker Tags",
          description: "Set of 4 Bluetooth trackers for keys, wallets, and more.",
          category: "Electronics",
          points: 190,
          imageUrl: "https://images.unsplash.com/photo-1513116476489-7635e79feb27?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Mini Drone",
          description: "Compact drone with HD camera and app control.",
          category: "Electronics",
          points: 700,
          imageUrl: "https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Polaroid Camera",
          description: "Instant camera with built-in printer for immediate photos.",
          category: "Electronics",
          points: 650,
          imageUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        }
      ];
      
      // Insert all the experiences products
      const experiencesProducts = [
        {
          name: "Wellness Retreat Day",
          description: "Full day pass at luxury spa including treatments.",
          category: "Experiences",
          points: 550,
          imageUrl: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Movie Tickets",
          description: "Two premium movie tickets for the theater of your choice.",
          category: "Experiences",
          points: 150,
          imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Wine Tasting Tour",
          description: "Guided tour of a local winery with tastings for two.",
          category: "Experiences",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Cooking Class",
          description: "Interactive cooking class with professional chef.",
          category: "Experiences",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Concert Tickets",
          description: "Two tickets to a live music performance of your choice.",
          category: "Experiences",
          points: 500,
          imageUrl: "https://images.unsplash.com/photo-1501612780327-45045538702b?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Museum Annual Pass",
          description: "12-month membership to local art and science museums.",
          category: "Experiences",
          points: 600,
          imageUrl: "https://images.unsplash.com/photo-1503632235181-2618281d021e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Hot Air Balloon Ride",
          description: "Scenic hot air balloon experience for one person.",
          category: "Experiences",
          points: 800,
          imageUrl: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Pottery Workshop",
          description: "Hands-on pottery class with materials included.",
          category: "Experiences",
          points: 300,
          imageUrl: "https://images.unsplash.com/photo-1565122640447-3128631baa36?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Kayaking Adventure",
          description: "Guided kayaking tour for two on scenic waterways.",
          category: "Experiences",
          points: 450,
          imageUrl: "https://images.unsplash.com/photo-1511098217401-2291d3b7cebd?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Theme Park Day Pass",
          description: "Two tickets to a popular theme park for a full day of fun.",
          category: "Experiences",
          points: 700,
          imageUrl: "https://images.unsplash.com/photo-1543313661-988f8be8809a?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Escape Room Challenge",
          description: "Admission for 4 to an immersive escape room game.",
          category: "Experiences",
          points: 380,
          imageUrl: "https://images.unsplash.com/photo-1543101516-5bcc9614f918?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Zip-lining Experience",
          description: "Exhilarating zip-line course through scenic landscapes.",
          category: "Experiences",
          points: 550,
          imageUrl: "https://images.unsplash.com/photo-1544230980-8f19ebdb9ea1?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Golf Lesson Package",
          description: "Series of 3 golf lessons with a PGA professional.",
          category: "Experiences",
          points: 650,
          imageUrl: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Skydiving Simulation",
          description: "Indoor skydiving experience with professional instruction.",
          category: "Experiences",
          points: 480,
          imageUrl: "https://images.unsplash.com/photo-1511169355326-be606c6e1da7?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Comedy Club Tickets",
          description: "Two tickets to a live stand-up comedy show.",
          category: "Experiences",
          points: 250,
          imageUrl: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Brewery Tour & Tasting",
          description: "Behind-the-scenes tour with beer tasting flight for two.",
          category: "Experiences",
          points: 300,
          imageUrl: "https://images.unsplash.com/photo-1559526324-593bc073d938?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Rock Climbing Session",
          description: "Indoor rock climbing experience with gear and instruction.",
          category: "Experiences",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Helicopter City Tour",
          description: "15-minute helicopter sightseeing tour for one person.",
          category: "Experiences",
          points: 1200,
          imageUrl: "https://images.unsplash.com/photo-1583991111178-7b042e3077f6?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Horseback Riding Lesson",
          description: "Beginner horseback riding lesson with professional instruction.",
          category: "Experiences",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1511195448591-062cec834bc2?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Painting & Wine Workshop",
          description: "Guided painting session with complimentary wine.",
          category: "Experiences",
          points: 320,
          imageUrl: "https://images.unsplash.com/photo-1547333590-47fae5f58d21?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Dance Class Package",
          description: "4-class package for ballroom or Latin dance lessons.",
          category: "Experiences",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1547048615-da56eb92d444?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Sushi Making Workshop",
          description: "Learn to make sushi rolls with a professional chef.",
          category: "Experiences",
          points: 370,
          imageUrl: "https://images.unsplash.com/photo-1583623025817-d180a2fe075e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Axe Throwing Session",
          description: "1-hour axe throwing session with instruction for two people.",
          category: "Experiences",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1574103188526-4faae477d34e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Star Gazing Tour",
          description: "Guided nighttime astronomy experience with telescopes.",
          category: "Experiences",
          points: 420,
          imageUrl: "https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Luxury Boat Cruise",
          description: "2-hour sunset cruise on a luxury yacht for two.",
          category: "Experiences",
          points: 900,
          imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        }
      ];
      
      // Insert all the wellness products
      const wellnessProducts = [
        {
          name: "Yoga Class Package",
          description: "10-class package at a premium yoga studio.",
          category: "Wellness",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1588286840104-8957b019727f?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Monthly Gym Membership",
          description: "30-day access to a premium fitness club.",
          category: "Wellness",
          points: 500,
          imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Premium Massage Chair Session",
          description: "1-hour session in a luxury massage chair.",
          category: "Wellness",
          points: 250,
          imageUrl: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Meditation Course",
          description: "8-week guided meditation program with certified instructor.",
          category: "Wellness",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1536623975707-c4b3b2af565d?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Aromatherapy Gift Set",
          description: "Essential oil diffuser with 6 premium essential oils.",
          category: "Wellness",
          points: 320,
          imageUrl: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Weighted Blanket",
          description: "15lb therapeutic weighted blanket for better sleep.",
          category: "Wellness",
          points: 380,
          imageUrl: "https://images.unsplash.com/photo-1631756964162-25c8c07579b1?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Acupuncture Session",
          description: "Traditional acupuncture therapy with certified practitioner.",
          category: "Wellness",
          points: 450,
          imageUrl: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Home Fitness Equipment",
          description: "Resistance band set with workout guide.",
          category: "Wellness",
          points: 220,
          imageUrl: "https://images.unsplash.com/photo-1598550593506-b035cba3ba0e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Nutritional Counseling",
          description: "Personalized nutrition consultation with registered dietitian.",
          category: "Wellness",
          points: 600,
          imageUrl: "https://images.unsplash.com/photo-1505576633757-0ac1084f63cd?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Sleep Therapy Light",
          description: "Light therapy lamp for improved sleep and mood.",
          category: "Wellness",
          points: 300,
          imageUrl: "https://images.unsplash.com/photo-1542728928-1413d1894ed1?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Yoga Mat & Props Set",
          description: "Premium yoga mat with blocks, strap, and towel.",
          category: "Wellness",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1576095910607-644cd66e5c65?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Mindfulness Journal",
          description: "Guided journal for daily mindfulness practice.",
          category: "Wellness",
          points: 150,
          imageUrl: "https://images.unsplash.com/photo-1615310748514-99796d46e94e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Himalayan Salt Lamp",
          description: "Natural salt crystal lamp for air purification.",
          category: "Wellness",
          points: 200,
          imageUrl: "https://images.unsplash.com/photo-1539207554081-7214fbd6e282?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Foot Massager",
          description: "Electric foot massager with heat therapy.",
          category: "Wellness",
          points: 420,
          imageUrl: "https://images.unsplash.com/photo-1595238242018-22219945cf66?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Water Purification System",
          description: "Countertop water filter for clean drinking water.",
          category: "Wellness",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1546483667-f62d66b96636?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Organic Tea Collection",
          description: "Assortment of premium organic herbal teas.",
          category: "Wellness",
          points: 180,
          imageUrl: "https://images.unsplash.com/photo-1563911892437-1feda0179e41?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Personal Air Purifier",
          description: "HEPA air purifier for home or office.",
          category: "Wellness",
          points: 480,
          imageUrl: "https://images.unsplash.com/photo-1598803783347-dada77361e66?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Fitness Tracker Watch",
          description: "Smart fitness tracker with heart rate monitoring.",
          category: "Wellness",
          points: 500,
          imageUrl: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Posture Corrector",
          description: "Adjustable brace for improved posture and back support.",
          category: "Wellness",
          points: 140,
          imageUrl: "https://images.unsplash.com/photo-1537344836915-25a58b04e69c?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Luxury Bath Set",
          description: "Premium bath bombs, salts, and oils for relaxation.",
          category: "Wellness",
          points: 230,
          imageUrl: "https://images.unsplash.com/photo-1532771522233-9079b9616c44?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Sleep Sound Machine",
          description: "White noise machine with natural sounds for better sleep.",
          category: "Wellness",
          points: 250,
          imageUrl: "https://images.unsplash.com/photo-1631703412785-e9754dea55c6?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Indoor Plant Collection",
          description: "Set of 3 air-purifying houseplants with decorative pots.",
          category: "Wellness",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1545165375-7c5f3a1a2c83?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Foam Roller Set",
          description: "Deep tissue massage foam roller and balls for recovery.",
          category: "Wellness",
          points: 210,
          imageUrl: "https://images.unsplash.com/photo-1600881333168-2ef49b341f30?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Cold Therapy System",
          description: "Targeted cold therapy for muscle recovery and pain relief.",
          category: "Wellness",
          points: 370,
          imageUrl: "https://images.unsplash.com/photo-1605296867424-35c82a8b1da1?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        },
        {
          name: "Luxury Bathrobe",
          description: "Premium Turkish cotton spa robe.",
          category: "Wellness",
          points: 320,
          imageUrl: "https://images.unsplash.com/photo-1614255976202-43b92dfb7d67?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true,
          createdBy: req.user.id
        }
      ];
      
      // Insert all products
      const allProducts = [
        ...giftCardProducts,
        ...electronicsProducts,
        ...experiencesProducts,
        ...wellnessProducts
      ];
      
      // Use a transaction to ensure all products are inserted
      await db.transaction(async (tx) => {
        for (const product of allProducts) {
          await tx.insert(products).values(product);
        }
      });
      
      console.log(`Catalog refreshed successfully with ${allProducts.length} products`);
      
      res.status(200).json({ 
        message: "Product catalog refreshed successfully", 
        count: allProducts.length 
      });
    } catch (error: any) {
      console.error("Error refreshing product catalog:", error);
      res.status(500).json({ message: error.message || "Failed to refresh product catalog" });
    }
  });

  app.get("/api/catalog", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Direct query to products table instead of using storage method
      const productsData = await db.select().from(products);
      
      // Return products with empty availability info for now
      const productsWithAvailability = productsData.map(product => ({
        ...product,
        available: true,
        stock: 999,
        userCanAfford: true
      }));
      
      res.json(productsWithAvailability);
    } catch (error: any) {
      console.error("Error fetching catalog:", error);
      res.status(500).json({ message: error.message || "Failed to get catalog" });
    }
  });

  app.post("/api/products", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const productData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create product" });
    }
  });

  // Order routes
  app.get("/api/orders", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const isAdmin = req.user.isAdmin;

      // If admin, return all orders, otherwise return only user's orders
      const orders = isAdmin 
        ? await storage.getAllOrders()
        : await storage.getOrdersByUserId(req.user.id);

      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get orders" });
    }
  });

  app.patch("/api/orders/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { status, externalRef } = req.body;

      if (!id || !status) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const order = await storage.updateOrderStatus(parseInt(id), status, externalRef);
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update order status" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Provide default dashboard stats until we can query the database properly
      const stats = {
        pointsEarned: 0,
        pointsSpent: 0,
        pointsBalance: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalUsers: 10,
        activeSurveys: 0,
        employeeRecognitions: 0,
        birthdayCount: 0,
        leaderboardPosition: 0
      };
      
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: error.message || "Failed to get dashboard stats" });
    }
  });

  // Mock supplier endpoints
  app.post("/api/supplier/tillo", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const { productName, userId } = req.body;

      if (!productName || !userId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const response = await tilloSupplier(productName, userId);
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to process with Tillo supplier" });
    }
  });

  app.post("/api/supplier/carlton", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const { productName, userId, shippingDetails } = req.body;

      if (!productName || !userId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const response = await carltonSupplier(productName, userId, shippingDetails);
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to process with Carlton supplier" });
    }
  });

  // Add special routes to serve static HTML for direct login options
  app.get("/admin-login", (req, res) => {
    res.sendFile(path.resolve(import.meta.dirname, "../client/src/login-direct.html"));
  });

  app.get("/direct-login", (req, res) => {
    res.sendFile(path.resolve(import.meta.dirname, "../client/direct-login.html"));
  });

  // Admin API - Employee Management
  app.get("/api/admin/employees", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get employees" });
    }
  });

  app.patch("/api/admin/employees/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const updateData = { ...req.body };

      // If password is provided, hash it
      if (updateData.password) {
        updateData.password = await hash(updateData.password, 10);
      } else {
        delete updateData.password; // Don't update password if not provided
      }

      // Update user
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update employee" });
    }
  });

  app.delete("/api/admin/employees/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Don't allow deleting the admin user (id=1)
      if (userId === 1) {
        return res.status(403).json({ message: "Cannot delete the primary admin user" });
      }

      // Delete user
      await db.delete(users).where(eq(users.id, userId));

      res.json({ success: true, message: "Employee deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete employee" });
    }
  });

  // File upload handler for employee bulk upload
  app.post("/api/admin/employees/bulk-upload", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      // Note: This is a placeholder. In a real implementation, you would:
      // 1. Use multer or another middleware to handle file uploads
      // 2. Parse the CSV file
      // 3. Validate each record
      // 4. Create users in a transaction

      res.status(501).json({ 
        message: "Bulk upload functionality not yet implemented",
        count: 0
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to process bulk upload" });
    }
  });

  // HR Configuration routes for employee management
  app.get("/api/hr/employees", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const allEmployees = await db.select().from(employees).orderBy(desc(employees.createdAt));

      res.json(allEmployees);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch employees" });
    }
  });

  app.post("/api/hr/employees", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate employee data
      const validatedData = insertEmployeeSchema.parse(req.body);

      // Check if email already exists
      const [existingEmployee] = await db.select().from(employees).where(eq(employees.email, validatedData.email));
      if (existingEmployee) {
        return res.status(409).json({ message: "Email already registered for another employee" });
      }

      // Hash the password
      const hashedPassword = await hash(validatedData.password, 10);

      // Create employee record
      const [newEmployee] = await db.insert(employees)
        .values({
          ...validatedData,
          password: hashedPassword,
          createdById: req.user.id,
          createdAt: new Date()
        })
        .returning();

      // Remove password from response
      const { password: _, ...employeeWithoutPassword } = newEmployee;

      res.status(201).json(employeeWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create employee" });
    }
  });

  app.get("/api/hr/employees/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;

      const [employee] = await db.select().from(employees).where(eq(employees.id, parseInt(id)));

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Remove password from response
      const { password: _, ...employeeWithoutPassword } = employee;

      res.json(employeeWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch employee" });
    }
  });

  // Endpoint for downloading employee template CSV
  // Alternative endpoint without admin check for testing purposes
  // Create or update file template
  app.post("/api/file-templates", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { name, fileName, contentType, content, description } = req.body;

      if (!name || !fileName || !contentType || !content) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if template with this name already exists
      const [existingTemplate] = await db
        .select()
        .from(fileTemplates)
        .where(eq(fileTemplates.name, name));

      let template;

      if (existingTemplate) {
        // Update existing template
        const [updatedTemplate] = await db
          .update(fileTemplates)
          .set({
            fileName,
            contentType,
            content,
            description,
            updatedAt: new Date(),
            createdBy: req.user.id
          })
          .where(eq(fileTemplates.name, name))
          .returning();

        template = updatedTemplate;
      } else {
        // Create new template
        const [newTemplate] = await db
          .insert(fileTemplates)
          .values({
            name,
            fileName,
            contentType,
            content,
            description,
            createdBy: req.user.id
          })
          .returning();

        template = newTemplate;
      }

      res.status(200).json(template);
    } catch (error: any) {
      console.error("Error saving file template:", error);
      res.status(500).json({ message: error.message || "Failed to save file template" });
    }
  });

  // Get file template by name
  app.get("/api/file-templates/:name", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { name } = req.params;

      const [template] = await db
        .select()
        .from(fileTemplates)
        .where(eq(fileTemplates.name, name));

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.status(200).json(template);
    } catch (error: any) {
      console.error("Error retrieving file template:", error);
      res.status(500).json({ message: error.message || "Failed to retrieve file template" });
    }
  });

  // Get all file templates
  app.get("/api/file-templates", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const templates = await db
        .select()
        .from(fileTemplates)
        .orderBy(fileTemplates.name);

      res.status(200).json(templates);
    } catch (error: any) {
      console.error("Error retrieving file templates:", error);
      res.status(500).json({ message: error.message || "Failed to retrieve file templates" });
    }
  });

  // Update existing file template
  app.patch("/api/file-templates/:name", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { name } = req.params;
      const { fileName, contentType, content, description } = req.body;

      // Check if template exists
      const [existingTemplate] = await db
        .select()
        .from(fileTemplates)
        .where(eq(fileTemplates.name, name));

      if (!existingTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Update only provided fields
      const updateData: Partial<typeof fileTemplates.$inferInsert> = {
        updatedAt: new Date()
      };

      if (fileName !== undefined) updateData.fileName = fileName;
      if (contentType !== undefined) updateData.contentType = contentType;
      if (content !== undefined) updateData.content = content;
      if (description !== undefined) updateData.description = description;

      // Update template
      const [updatedTemplate] = await db
        .update(fileTemplates)
        .set(updateData)
        .where(eq(fileTemplates.name, name))
        .returning();

      res.status(200).json(updatedTemplate);
    } catch (error: any) {
      console.error("Error updating file template:", error);
      res.status(500).json({ message: error.message || "Failed to update file template" });
    }
  });

  // Download file template content as Excel XLSX
  app.get("/api/file-templates/:name/download", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { name } = req.params;

      // Special case for employee_import template
      if (name === 'employee_import') {
        // Use a public CDN URL for employee template
        // We're using a trusted Microsoft Excel sample file available via a public CDN
        const cdnUrl = 'https://docs.microsoft.com/en-us/azure/open-datasets/media/sample-data/employee_data.xlsx';

        // Redirect to the CDN file
        res.redirect(cdnUrl);
        return;
      }

      const [template] = await db
        .select()
        .from(fileTemplates)
        .where(eq(fileTemplates.name, name));

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Create a new workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Template');

      // Parse CSV content to extract headers and sample data
      const csvLines = template.content.split(/\r?\n/);
      if (csvLines.length > 0) {
        // Add headers
        const headers = csvLines[0].split(',');
        worksheet.addRow(headers);

        // Format header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };

        // Add sample data if available
        if (csvLines.length > 1) {
          const sampleData = csvLines[1].split(',');
          worksheet.addRow(sampleData);
        }

        // Auto-size columns for better readability
        headers.forEach((header, i) => {
          const column = worksheet.getColumn(i+1);
          const maxLength = Math.max(
            (header?.length || 0) + 2,
            10 // Minimum width
          );
          column.width = maxLength;
        });
      }

      // Set proper content type and attachment headers for XLSX
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.xlsx"`);

      // Basic security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Write the workbook directly to the response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      console.error("Error downloading file template:", error);
      res.status(500).json({ message: error.message || "Failed to download filetemplate" });
    }
  });

  // Fallback for backwards compatibility using Excel
  app.get("/api/hr/template/download-test", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("Template test download request received, user:", req.user?.email);

      // Use the same Microsoft sample Excel file
      const cdnUrl = 'https://docs.microsoft.com/en-us/azure/open-datasets/media/sample-data/employee_data.xlsx';

      // Redirect to the CDN file
      res.redirect(cdnUrl);
    } catch (error: any) {
      console.error("Error generating template:", error);
      res.status(500).json({ message: "Failed to generate template" });
    }
  });

  app.get("/api/hr/template/download", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("Template download request received, user:", req.user?.email);

      // Use the same Microsoft sample Excel file
      const cdnUrl = 'https://docs.microsoft.com/en-us/azure/open-datasets/media/sample-data/employee_data.xlsx';

      // Redirect to the CDN file
      res.redirect(cdnUrl);
    } catch (error: any) {
      console.error("Error generating template:", error);
      res.status(500).json({ message: "Failed to generate template" });
    }
  });

  app.patch("/api/hr/employees/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { password, ...updateData } = req.body;

      // Find employee
      const [employee] = await db.select().from(employees).where(eq(employees.id, parseInt(id)));

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // If email is being changed, check it's not already in use
      if (updateData.email && updateData.email !== employee.email) {
        const [existingEmail] = await db.select().from(employees).where(eq(employees.email, updateData.email));
        if (existingEmail) {
          return res.status(409).json({ message: "Email already registered for another employee" });
        }
      }

      // Prepare update data
      const dataToUpdate: any = { ...updateData };

      // Hash new password if provided
      if (password) {
        dataToUpdate.password = await hash(password, 10);
      }

      // Update employee record
      const [updatedEmployee] = await db.update(employees)
        .set(dataToUpdate)
        .where(eq(employees.id, parseInt(id)))
        .returning();

      // Remove password from response
      const { password: _, ...employeeWithoutPassword } = updatedEmployee;

      res.json(employeeWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update employee" });
    }
  });

  app.delete("/api/hr/employees/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;

      // Find employee
      const [employee] = await db.select().from(employees).where(eq(employees.id, parseInt(id)));

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Delete employee record
      await db.delete(employees).where(eq(employees.id, parseInt(id)));

      res.json({ message: "Employee deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete employee" });
    }
  });

  // Branding settings routes - view accessible to all users
  app.get("/api/hr/branding", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get branding settings for the organization
      const [settings] = await db.select().from(brandingSettings).where(eq(brandingSettings.organizationId, req.user.id));

      if (!settings) {
        // Return default settings if none are found
        return res.json({
          organizationName: "ThrivioHR",
          colorScheme: "default",
          logoUrl: null,
          primaryColor: null,
          secondaryColor: null,
          accentColor: null
        });
      }

      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch branding settings" });
    }
  });

  app.post("/api/hr/branding", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log("Saving branding settings for user ID:", req.user.id, "Data:", req.body);

      // Check if settings already exist for this organization
      const [existingSettings] = await db.select().from(brandingSettings).where(eq(brandingSettings.organizationId, req.user.id));

      if (existingSettings) {
        console.log("Updating existing branding settings:", existingSettings.id);

        // Update existing settings instead of creating new ones
        const updateData = {
          ...req.body,
          updatedAt: new Date(),
          updatedById: req.user.id
        };

        console.log("Update data:", updateData);

        const [updatedSettings] = await db.update(brandingSettings)
          .set(updateData)
          .where(eq(brandingSettings.id, existingSettings.id))
          .returning();

        console.log("Updated settings:", updatedSettings);
        return res.json(updatedSettings);
      }

      console.log("Creating new branding settings");

      // Create new branding settings with minimal validation
      const insertData = {
        organizationId: req.user.id,
        organizationName: req.body.organizationName || "ThrivioHR",
        logoUrl: req.body.logoUrl || null,
        colorScheme: req.body.colorScheme || "default",
        primaryColor: req.body.primaryColor || null,
        secondaryColor: req.body.secondaryColor || null,
        accentColor: req.body.accentColor || null,
        updatedAt: new Date(),
        updatedById: req.user.id
      };

      console.log("Insert data:", insertData);

      // Create new branding settings
      const [newSettings] = await db.insert(brandingSettings)
        .values(insertData)
        .returning();

      console.log("Created new settings:", newSettings);
      res.status(201).json(newSettings);
    } catch (error: any) {
      console.error("Error saving branding settings:", error);
      res.status(500).json({ message: error.message || "Failed to save branding settings" });
    }
  });

  // Logo upload endpoint (this would use a storage service in production)
  app.post("/api/hr/branding/logo", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // For demonstration, we'll accept a base64 image URL
      // In a production environment, you would use proper file upload and storage
      const { logoUrl } = req.body;

      if (!logoUrl) {
        return res.status(400).json({ message: "No logo provided" });
      }

      // Check if settings already exist for this organization
      const [existingSettings] = await db.select().from(brandingSettings).where(eq(brandingSettings.organizationId, req.user.id));

      if (existingSettings) {
        // Update existing settings with new logo
        const [updatedSettings] = await db.update(brandingSettings)
          .set({
            logoUrl,
            updatedAt: new Date(),
            updatedById: req.user.id
          })
          .where(eq(brandingSettings.id, existingSettings.id))
          .returning();

        return res.json({
          message: "Logo updated successfully",
          logoUrl: updatedSettings.logoUrl
        });
      } else {
        // Create new settings with logo
        const [newSettings] = await db.insert(brandingSettings)
          .values({
            organizationId: req.user.id,
            organizationName: "ThrivioHR",
            logoUrl,
            colorScheme: "default",
            updatedAt: new Date(),
            updatedById: req.user.id
          })
          .returning();

        return res.json({
          message: "Logo created successfully",
          logoUrl: newSettings.logoUrl
        });
      }
    } catch (error: any) {
      console.error("Failed to upload logo:", error);
      res.status(500).json({ message: error.message || "Failed to upload logo" });
    }
  });

  // Social API - Posts
  app.get("/api/social/posts", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      // Direct query to bypass the storage error temporarily
      const postsData = await db.select({
        post: posts,
        user: users,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

      // Get comment counts for each post
      const postIds = postsData.map(p => p.post.id);

      // If no posts, return empty array
      if (postIds.length === 0) {
        return res.json([]);
      }

      // Format posts without complex joins
      const formattedPosts = postsData.map(p => {
        const { password, ...userWithoutPassword } = p.user;
        return {
          ...p.post,
          user: userWithoutPassword,
          commentCount: 0,
          reactionCounts: {},
        };
      });

      res.json(formattedPosts);
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: error.message || "Failed to get posts" });
    }
  });

  app.get("/api/social/posts/user/:userId", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const posts = await storage.getUserPosts(userId, limit, offset);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get user posts" });
    }
  });

  app.get("/api/social/posts/:id", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Add the user's reaction to the post if exists
      const userReaction = await storage.getUserReaction(req.user.id, postId);
      if (userReaction) {
        post.userReaction = userReaction.type;
      }

      // If it's a poll, add the user's vote
      if (post.poll) {
        const userPollVote = await storage.getUserPollVote(req.user.id, post.poll.id);
        if (userPollVote) {
          post.poll.userVote = userPollVote.optionIndex;
        }
      }

      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get post" });
    }
  });

  app.post("/api/social/posts", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { content, imageUrl, type, tags } = req.body;

      if (!content || !type) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Different handling based on post type
      if (type === 'standard') {
        const post = await storage.createPost(req.user.id, {
          content,
          imageUrl,
          type,
          tags
        });

        res.status(201).json(post);
      }
      else if (type === 'poll') {
        const { pollData } = req.body;

        if (!pollData || !pollData.question || !pollData.options || pollData.options.length < 2) {
          return res.status(400).json({ message: "Invalid poll data" });
        }

        const { post, poll } = await storage.createPollPost(
          req.user.id,
          { content, imageUrl, tags },
          {
            question: pollData.question,
            options: pollData.options,
            expiresAt: pollData.expiresAt ? new Date(pollData.expiresAt) : undefined
          }
        );

        res.status(201).json({ ...post, poll });
      }
      else if (type === 'recognition') {
        const { recognitionData } = req.body;

        if (!recognitionData || !recognitionData.recipientId || !recognitionData.badgeType || !recognitionData.message) {
          return res.status(400).json({ message: "Invalid recognition data" });
        }

        const { post, recognition } = await storage.createRecognitionPost(
          req.user.id,
          { content, imageUrl, tags },
          {
            recipientId: recognitionData.recipientId,
            badgeType: recognitionData.badgeType,
            message: recognitionData.message,
            points: recognitionData.points || 0
          }
        );

        res.status(201).json({ ...post, recognition });
      }
      else {
        return res.status(400).json({ message: "Invalid post type" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create post" });
    }
  });

  app.put("/api/social/posts/:id", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Check if user owns the post or is admin
      if (post.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not authorized to update this post" });
      }

      const { content, imageUrl, tags, isPinned } = req.body;

      // Only allow updating these fields
      const updatedPost = await storage.updatePost(postId, {
        content,
        imageUrl,
        tags,
        isPinned
      });

      res.json(updatedPost);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update post" });
    }
  });

  app.delete("/api/social/posts/:id", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const postId = parseInt(req.params.id);
      const post = await storage.getPostById(postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Check if user owns the post or is admin
      if (post.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not authorized to delete this post" });
      }

      const success = await storage.deletePost(postId);

      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete post" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete post" });
    }
  });

  // Social API - Comments
  app.get("/api/social/posts/:postId/comments", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const postId = parseInt(req.params.postId);
      const comments = await storage.getPostComments(postId);

      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get comments" });
    }
  });

  app.post("/api/social/comments", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { postId, content } = req.body;

      if (!postId || !content) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const comment = await storage.createComment(req.user.id, {
        postId,
        content
      });

      // Get full comment with user info to return
      const comments = await storage.getPostComments(postId);
      const createdComment = comments.find(c => c.id === comment.id);

      res.status(201).json(createdComment);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create comment" });
    }
  });

  app.delete("/api/social/comments/:id", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const commentId = parseInt(req.params.id);

      // TODO: Check if user owns the comment or is admin
      // (would require a getCommentById method)

      const success = await storage.deleteComment(commentId);

      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete comment" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete comment" });
    }
  });

  // Social API - Reactions
  app.post("/api/social/reactions", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { postId, type } = req.body;

      if (!postId || !type) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate reaction type
      const validTypes = ['like', 'celebrate', 'insightful', 'funny', 'support'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid reaction type" });
      }

      const reaction = await storage.addReaction(req.user.id, {
        postId,
        type
      });

      res.status(201).json(reaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to add reaction" });
    }
  });

  app.delete("/api/social/reactions/:postId", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const postId = parseInt(req.params.postId);

      const success = await storage.removeReaction(req.user.id, postId);

      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to remove reaction" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to remove reaction" });
    }
  });

  // Social API - Polls
  app.get("/api/social/polls/:id", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const pollId = parseInt(req.params.id);
      const poll = await storage.getPollById(pollId);

      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }

      // Add the user's vote if exists
      const userVote = await storage.getUserPollVote(req.user.id, pollId);
      if (userVote) {
        poll.userVote = userVote.optionIndex;
      }

      res.json(poll);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get poll" });
    }
  });

  app.post("/api/social/polls/:id/vote", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const pollId = parseInt(req.params.id);
      const { optionIndex } = req.body;

      if (optionIndex === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate that poll exists first
      const poll = await storage.getPollById(pollId);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }

      // Validate option index
      if (optionIndex < 0 || optionIndex >= poll.options.length) {
        return res.status(400).json({ message: "Invalid option index" });
      }

      const vote = await storage.votePoll(req.user.id, pollId, optionIndex);

      // Return the updated poll with votes
      const updatedPoll = await storage.getPollById(pollId);
      res.json(updatedPoll);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to vote on poll" });
    }
  });

  // Social API - Recognitions
  app.get("/api/social/recognitions/received", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const recognitions = await storage.getUserRecognitionsReceived(req.user.id);
      res.json(recognitions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get recognitions" });
    }
  });

  app.get("/api/social/recognitions/given", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const recognitions = await storage.getUserRecognitionsGiven(req.user.id);
      res.json(recognitions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get recognitions" });
    }
  });

  // Social API - Chat
  app.get("/api/social/conversations", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const conversations = await storage.getUserConversations(req.user.id);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get conversations" });
    }
  });

  app.post("/api/social/conversations", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { participantIds, name, isGroup } = req.body;

      if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // If it's a direct conversation, make sure there are only two participants
      if (!isGroup && participantIds.length !== 1) {
        return res.status(400).json({ message: "Direct conversations should have exactly one participant besides yourself" });
      }

      const conversation = await storage.createConversation(
        req.user.id,
        {
          name: isGroup ? name : undefined,
          isGroup: isGroup || false
        },
        participantIds
      );

      // Get conversation with details to return
      const conversationWithDetails = await storage.getConversationById(conversation.id);
      res.status(201).json(conversationWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create conversation" });
    }
  });

  app.get("/api/social/conversations/:id", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversationById(conversationId);

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Check if user is a participant
      const isParticipant = conversation.participants.some(p => p.id === req.user!.id);
      if (!isParticipant && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not authorized to view this conversation" });
      }

      // Get unread count for this user
      const allConversations = await storage.getUserConversations(req.user.id);
      const userConversation = allConversations.find(c => c.id === conversationId);

      if (userConversation) {
        conversation.unreadCount = userConversation.unreadCount;
      }

      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get conversation" });
    }
  });

  app.get("/api/social/conversations/:id/messages", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const conversationId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      // Verify user is participant (could be extracted to middleware)
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const isParticipant = conversation.participants.some(p => p.id === req.user!.id);
      if (!isParticipant && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not authorized to view messages in this conversation" });
      }

      const messages = await storage.getConversationMessages(conversationId, limit, offset);
      res.json(messages);

      // Mark messages as read
      await storage.markMessagesAsRead(req.user.id, conversationId);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get messages" });
    }
  });

  app.post("/api/social/messages", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { conversationId, content } = req.body;

      if (!conversationId || !content) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify user is participant
      const conversation = await storage.getConversationById(parseInt(conversationId));
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const isParticipant = conversation.participants.some(p => p.id === req.user!.id);
      if (!isParticipant) {
        return res.status(403).json({ message: "Not authorized to send messages to this conversation" });
      }

      const message = await storage.sendMessage(req.user.id, {
        conversationId,
        content,
        isRead: false
      });

      // Get message with sender info to return
      const messages = await storage.getConversationMessages(conversationId, 1);
      const messageWithSender = messages.find(m => m.id === message.id);

      res.status(201).json(messageWithSender);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to send message" });
    }
  });

  app.post("/api/social/conversations/:id/mark-read", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const conversationId = parseInt(req.params.id);

      // Verify user is participant
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const isParticipant = conversation.participants.some(p => p.id === req.user!.id);
      if (!isParticipant) {
        return res.status(403).json({ message: "Not authorized for this conversation" });
      }

      const success = await storage.markMessagesAsRead(req.user.id, conversationId);

      if (success) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ message: "Failed to mark messages as read" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to mark messages as read" });
    }
  });

  // Social API - Stats
  app.get("/api/social/stats", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Implement direct query for social stats
      const postsCount = await db.select({ count: sql`count(*)` })
        .from(posts)
        .where(eq(posts.userId, req.user.id));
        
      const commentsCount = await db.select({ count: sql`count(*)` })
        .from(comments)
        .where(eq(comments.userId, req.user.id));
        
      // Return default stats since we can't use storage.getUserSocialStats
      const stats = {
        posts: Number(postsCount[0]?.count || 0),
        comments: Number(commentsCount[0]?.count || 0),
        reactions: 0,
        recognitionsGiven: 0,
        recognitionsReceived: 0
      };
      
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting social stats:", error);
      res.status(500).json({ message: error.message || "Failed to get social stats" });
    }
  });

  // Survey API routes
  app.get("/api/surveys", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.query;
      const surveys = await storage.getSurveys(status as string);
      res.json(surveys);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ message: "Failed to fetch surveys" });
    }
  });

  app.get("/api/surveys/:id", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = reqparams;
      const survey = await storage.getSurveyById(parseInt(id));

      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      // Get questions for this survey
      const questions = await storage.getSurveyQuestions(parseInt(id));

      res.json({
        ...survey,
        questions
      });
    } catch (error) {
      console.error(`Error fetching survey ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  app.post("/api/surveys", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      // Process the request body to match the actual database schema
      const { startDate, endDate, targetAudience, ...restData } = req.body;

      // Create a data object that matches the database schema
      const surveyData = {
        ...restData,
        startDate: new Date(), // Set start date to now
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days if not specified
        // Map targetAudience to totalRecipients if needed
        totalRecipients: targetAudience === 'all' ? -1 : (req.body.targetUserIds?.length || 0),
        createdBy: req.user?.id
      };

      const survey = await storage.createSurvey(surveyData);
      res.status(201).json(survey);
    } catch (error) {
      console.error("Error creating survey:", error);
      res.status(500).json({ message: "Failed to create survey" });
    }
  });

  app.put("/api/surveys/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const survey = await storage.updateSurvey(parseInt(id), req.body);
      res.json(survey);
    } catch (error) {
      console.error(`Error updating survey ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update survey" });
    }
  });

  app.delete("/api/surveys/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const result = await storage.deleteSurvey(parseInt(id));

      if (!result) {
        return res.status(404).json({ message: "Survey not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting survey ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete survey" });
    }
  });

  app.post("/api/surveys/:id/publish", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      // Update to match the actual schema - set startDate to now and status to published
      const survey = await storage.updateSurvey(parseInt(id), {
        status: 'published',
        startDate: new Date()
      });
      res.json(survey);
    } catch (error) {
      console.error(`Error publishing survey ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to publish survey" });
    }
  });

  // Survey questions API
  app.get("/api/surveys/:surveyId/questions", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { surveyId } = req.params;
      const questions = await storage.getSurveyQuestions(parseInt(surveyId));
      res.json(questions);
    } catch (error) {
      console.error(`Error fetching questions for survey ${req.params.surveyId}:`, error);
      res.status(500).json({ message: "Failed to fetch survey questions" });
    }
  });

  app.post("/api/surveys/:surveyId/questions", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { surveyId } = req.params;
      const questions = Array.isArray(req.body) ? req.body : [req.body];

      // Add surveyId to each question if not already present
      const questionsWithSurveyId = questions.map(q => ({
        ...q,
        surveyId: parseInt(surveyId),
        options: q.options ? JSON.stringify(q.options) : null // Convert options array to JSON string
      }));

      const savedQuestions = await storage.createSurveyQuestions(questionsWithSurveyId);
      res.status(201).json(savedQuestions);
    } catch (error) {
      console.error(`Error creating questions for survey ${req.params.surveyId}:`, error);
      res.status(500).json({ message: "Failed to create survey questions" });
    }
  });

  app.put("/api/survey-questions/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const question = await storage.updateSurveyQuestion(parseInt(id), req.body);
      res.json(question);
    } catch (error) {
      console.error(`Error updating question ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update survey question" });
    }
  });

  app.delete("/api/survey-questions/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const result = await storage.deleteSurveyQuestion(parseInt(id));

      if (!result) {
        return res.status(404).json({ message: "Question not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting question ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete survey question" });
    }
  });

  // Survey responses API
  app.get("/api/surveys/:surveyId/responses", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { surveyId } = req.params;
      const responses = await storage.getSurveyResponses(parseInt(surveyId));
      res.json(responses);
    } catch (error) {
      console.error(`Error fetching responses for survey ${req.params.surveyId}:`, error);
      res.status(500).json({ message: "Failed to fetch survey responses" });
    }
  });

  app.post("/api/surveys/:surveyId/responses", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { surveyId } = req.params;
      const userId = req.user?.id; // Can be null for anonymous responses
      const isAnonymous = req.body.isAnonymous === true;

      const response = await storage.createSurveyResponse(
        isAnonymous ? null : userId, 
        parseInt(surveyId)
      );

      res.status(201).json(response);
    } catch (error) {
      console.error(`Error creating response for survey ${req.params.surveyId}:`, error);
      res.status(500).json({ message: "Failed to create survey response" });
    }
  });

  app.post("/api/survey-responses/:responseId/complete", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { responseId } = req.params;
      const { timeToComplete } = req.body;

      const response = await storage.completeSurveyResponse(
        parseInt(responseId), 
        timeToComplete
      );

      res.json(response);
    } catch (error) {
      console.error(`Error completing response ${req.params.responseId}:`, error);
      res.status(500).json({ message: "Failed to complete survey response" });
    }
  });

  // Survey answers API
  app.get("/api/survey-responses/:responseId/answers", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { responseId } = req.params;
      const answers = await storage.getSurveyAnswers(parseInt(responseId));
      res.json(answers);
    } catch (error) {
      console.error(`Error fetching answers for response ${req.params.responseId}:`, error);
      res.status(500).json({ message: "Failed to fetch survey answers" });
    }
  });

  app.post("/api/survey-responses/:responseId/answers", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { responseId } = req.params;
      const answers = Array.isArray(req.body) ? req.body : [req.body];

      // Process each answer individually to handle validation
      const savedAnswers = [];
      for (const answerData of answers) {
        const answer = await storage.createSurveyAnswer({
          ...answerData,
          responseId: parseInt(responseId)
        });
        savedAnswers.push(answer);
      }

      res.status(201).json(savedAnswers);
    } catch (error) {
      console.error(`Error creating answers for response ${req.params.responseId}:`, error);
      res.status(500).json({ message: "Failed to create survey answers" });
    }
  });

  // Initialize the server
  const httpServer = createServer(app);

  // Seed initial data if needed
  await seedInitialData();

  // Start the birthday rewards scheduler
  scheduleBirthdayRewards();

  return httpServer;
}

// Helper function to seed initial data
async function seedInitialData() {
  try {
    // Check if we already have users
    const existingUsers = await db.select().from(users);

    // If no users, seed an admin user
    if (existingUsers.length === 0) {
      console.log("Seeding admin user...");

      try {
        // First try to create a corporate organization - might fail if table doesn't exist yet
        try {
          // Check if organizations table exists
          await db.select().from(organizations).limit(1);
          
          // If we got here, the organizations table exists
          const [corporateOrg] = await db.insert(organizations).values({
            name: "ThrivioHR Corporate",
            type: "corporate",
            status: "active",
          }).returning();
          
          console.log("Corporate organization created successfully");

          // Create admin user with organization reference
          await storage.createUser({
            username: "admin",
            password: "admin123",
            name: "Admin User",
            email: "admin@demo.io",
            department: "HR",
            isAdmin: true
          });
          
          // After creating user, try to update with the new fields
          try {
            await db.update(users)
              .set({ 
                roleType: "corporate_admin",
                organizationId: corporateOrg.id
              })
              .where(eq(users.username, "admin"));
            console.log("Admin user updated with roleType and organizationId");
          } catch (error) {
            console.log("Could not update user with roleType and organizationId - new columns may not exist yet");
          }
          
        } catch (error) {
          console.log("Organizations table might not exist yet, creating basic admin user");
          
          // Just create the admin user without the organization reference
          await storage.createUser({
            username: "admin",
            password: "admin123",
            name: "Admin User",
            email: "admin@demo.io",
            department: "HR",
            isAdmin: true
          });
        }
      } catch (error) {
        console.error("Error creating organization or admin user:", error);
      }

      console.log("Admin user created successfully");

      // Seed expanded catalog with 25 products per category
      console.log("Seeding expanded product catalog...");

      // Gift Cards Category - 25 products
      const giftCardProducts = [
        {
          name: "Amazon Gift Card",
          description: "$50 Amazon gift card to spend on anything you want.",
          category: "Gift Cards",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1584990451792-a664249664bc?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Starbucks Gift Card",
          description: "$25 Starbucks gift card for your coffee breaks.",
          category: "Gift Cards",
          points: 200,
          imageUrl: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Netflix Gift Card",
          description: "$30 Netflix gift card for movies and shows.",
          category: "Gift Cards",
          points: 250,
          imageUrl: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Uber Eats Gift Card",
          description: "$35 Uber Eats credit for meals delivered to your door.",
          category: "Gift Cards",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1593504049359-74330189a345?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Apple App Store Gift Card",
          description: "$25 Apple App Store credit for apps, games and entertainment.",
          category: "Gift Cards",
          points: 200,
          imageUrl: "https://images.unsplash.com/photo-1585184394271-4c0a47dc59c9?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Google Play Gift Card",
          description: "$25 Google Play credit for apps, games, books, and more.",
          category: "Gift Cards",
          points: 200,
          imageUrl: "https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "DoorDash Gift Card",
          description: "$30 DoorDash credit for food delivery from your favorite restaurants.",
          category: "Gift Cards",
          points: 240,
          imageUrl: "https://images.unsplash.com/photo-1582060371588-5d30bf398aa1?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Spotify Premium Gift Card",
          description: "3-month subscription to Spotify Premium.",
          category: "Gift Cards",
          points: 300,
          imageUrl: "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Target Gift Card",
          description: "$50 Target gift card for shopping essentials and more.",
          category: "Gift Cards",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1580828343064-fde4fc206bc6?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Walmart Gift Card",
          description: "$50 Walmart gift card for everyday essentials.",
          category: "Gift Cards",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1601524909162-ae8725290836?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Best Buy Gift Card",
          description: "$100 Best Buy gift card for electronics and appliances.",
          category: "Gift Cards",
          points: 800,
          imageUrl: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Airbnb Gift Card",
          description: "$100 Airbnb credit for your next getaway.",
          category: "Gift Cards",
          points: 800,
          imageUrl: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Steam Gift Card",
          description: "$50 Steam credit for PC games and software.",
          category: "Gift Cards",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1609092472326-41329e320fbc?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Xbox Gift Card",
          description: "$60 Xbox gift card for games and digital content.",
          category: "Gift Cards",
          points: 480,
          imageUrl: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "PlayStation Store Gift Card",
          description: "$60 PlayStation Store credit for games and add-ons.",
          category: "Gift Cards",
          points: 480,
          imageUrl: "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Home Depot Gift Card",
          description: "$75 Home Depot gift card for home improvement projects.",
          category: "Gift Cards",
          points: 600,
          imageUrl: "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Lowe's Gift Card",
          description: "$75 Lowe's gift card for home and garden supplies.",
          category: "Gift Cards",
          points: 600,
          imageUrl: "https://images.unsplash.com/photo-1516822669470-73637e892be3?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Sephora Gift Card",
          description: "$50 Sephora gift card for beauty and skincare products.",
          category: "Gift Cards",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Grubhub Gift Card",
          description: "$40 Grubhub credit for food delivery.",
          category: "Gift Cards",
          points: 320,
          imageUrl: "https://images.unsplash.com/photo-1555992336-fb0d29498b13?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "REI Gift Card",
          description: "$100 REI gift card for outdoor gear and apparel.",
          category: "Gift Cards",
          points: 800,
          imageUrl: "https://images.unsplash.com/photo-1539183204366-63a0589187ab?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Disney+ Subscription",
          description: "6-month subscription to Disney+ streaming service.",
          category: "Gift Cards",
          points: 450,
          imageUrl: "https://images.unsplash.com/photo-1604913571179-f9642e6b43f8?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Hulu Subscription",
          description: "6-month subscription to Hulu streaming service.",
          category: "Gift Cards",
          points: 420,
          imageUrl: "https://images.unsplash.com/photo-1580543687419-070d3bd4858c?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "HBO Max Subscription",
          description: "3-month subscription to HBO Max streaming service.",
          category: "Gift Cards",
          points: 450,
          imageUrl: "https://images.unsplash.com/photo-1520342868574-5fa3804e551c?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Whole Foods Gift Card",
          description: "$50 Whole Foods gift card for grocery shopping.",
          category: "Gift Cards",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Audible Subscription",
          description: "3-month subscription to Audible for audiobooks.",
          category: "Gift Cards",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        }
      ];

      // Electronics Category - 25 products
      const electronicsProducts = [
        {
          name: "Apple Airpods Pro",
          description: "Latest model with noise cancellation technology.",
          category: "Electronics",
          points: 650,
          imageUrl: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Bluetooth Speaker",
          description: "Portable high-quality Bluetooth speaker.",
          category: "Electronics",
          points: 300,
          imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Smart Watch",
          description: "Fitness and health tracking smart watch.",
          category: "Electronics",
          points: 500,
          imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Wireless Charger",
          description: "Fast wireless charging pad for compatible devices.",
          category: "Electronics",
          points: 180,
          imageUrl: "https://images.unsplash.com/photo-1603539444875-76e7684265f6?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Noise-Cancelling Headphones",
          description: "Premium over-ear headphones with active noise cancellation.",
          category: "Electronics",
          points: 700,
          imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Smart Home Speaker",
          description: "Voice-controlled smart speaker with virtual assistant.",
          category: "Electronics",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1549482199-bc1ca6f58502?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Tablet Stand",
          description: "Adjustable stand for tablets and e-readers.",
          category: "Electronics",
          points: 120,
          imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Portable Power Bank",
          description: "20,000mAh power bank for charging devices on the go.",
          category: "Electronics",
          points: 250,
          imageUrl: "https://images.unsplash.com/photo-1587047163886-e71b96567eb9?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Wireless Earbuds",
          description: "Compact wireless earbuds with charging case.",
          category: "Electronics",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1623515651673-28033bd10d13?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Smart Bulb Kit",
          description: "Set of 4 smart LED bulbs with app control.",
          category: "Electronics",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1569073120512-05362a6b92e4?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Digital Photo Frame",
          description: "10-inch digital photo frame with cloud connectivity.",
          category: "Electronics",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1540885762261-a2ca01f290f9?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Smartphone Gimbal",
          description: "3-axis stabilizer for smartphone videography.",
          category: "Electronics",
          points: 450,
          imageUrl: "https://images.unsplash.com/photo-1595781572981-d63151b232ed?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Smart Scale",
          description: "Digital bathroom scale with health metrics and app integration.",
          category: "Electronics",
          points: 320,
          imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Portable Bluetooth Keyboard",
          description: "Foldable Bluetooth keyboard for tablets and smartphones.",
          category: "Electronics",
          points: 200,
          imageUrl: "https://images.unsplash.com/photo-1516317518460-4a16985740e6?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Video Doorbell",
          description: "Smart doorbell with camera and two-way audio.",
          category: "Electronics",
          points: 550,
          imageUrl: "https://images.unsplash.com/photo-1558002038-1055e2fc65af?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Smart Thermostat",
          description: "Energy-saving smart thermostat with remote control.",
          category: "Electronics",
          points: 480,
          imageUrl: "https://images.unsplash.com/photo-1567769541735-d43de3326c00?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Wireless Mouse",
          description: "Ergonomic wireless mouse with long battery life.",
          category: "Electronics",
          points: 150,
          imageUrl: "https://images.unsplash.com/photo-1605773527852-c546a8584ea3?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "USB-C Hub",
          description: "7-in-1 USB-C hub adapter with multiple ports.",
          category: "Electronics",
          points: 220,
          imageUrl: "https://images.unsplash.com/photo-1634328783781-b542bce0b3a6?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Portable Bluetooth Printer",
          description: "Compact photo printer for smartphones and tablets.",
          category: "Electronics",
          points: 380,
          imageUrl: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Streaming Media Player",
          description: "4K streaming device for smart TVs.",
          category: "Electronics",
          points: 320,
          imageUrl: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Wireless Charging Stand",
          description: "Vertical wireless charging stand for smartphones.",
          category: "Electronics",
          points: 220,
          imageUrl: "https://images.unsplash.com/photo-1633060284626-89f955be6f0a?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Gaming Controller",
          description: "Bluetooth gaming controller compatible with PC and mobile.",
          category: "Electronics",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1580327344181-c1163234e5a0?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Bluetooth Tracker Tags",
          description: "Set of 4 Bluetooth trackers for keys, wallets, and more.",
          category: "Electronics",
          points: 190,
          imageUrl: "https://images.unsplash.com/photo-1513116476489-7635e79feb27?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Mini Drone",
          description: "Compact drone with HD camera and app control.",
          category: "Electronics",
          points: 700,
          imageUrl: "https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Polaroid Camera",
          description: "Instant camera with built-in printer for immediate photos.",
          category: "Electronics",
          points: 650,
          imageUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        }
      ];

      // Experiences Category - 25 products
      const experiencesProducts = [
        {
          name: "Wellness Retreat Day",
          description: "Full day pass at luxury spa including treatments.",
          category: "Experiences",
          points: 550,
          imageUrl: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Movie Tickets",
          description: "Two premium movie tickets for the theater of your choice.",
          category: "Experiences",
          points: 150,
          imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Wine Tasting Tour",
          description: "Guided tour of a local winery with tastings for two.",
          category: "Experiences",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Cooking Class",
          description: "Interactive cooking class with professional chef.",
          category: "Experiences",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Concert Tickets",
          description: "Two tickets to a live music performance of your choice.",
          category: "Experiences",
          points: 500,
          imageUrl: "https://images.unsplash.com/photo-1501612780327-45045538702b?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Museum Annual Pass",
          description: "12-month membership to local art and science museums.",
          category: "Experiences",
          points: 600,
          imageUrl: "https://images.unsplash.com/photo-1503632235181-2618281d021e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Hot Air Balloon Ride",
          description: "Scenic hot air balloon experience for one person.",
          category: "Experiences",
          points: 800,
          imageUrl: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Pottery Workshop",
          description: "Hands-on pottery class with materials included.",
          category: "Experiences",
          points: 300,
          imageUrl: "https://images.unsplash.com/photo-1565122640447-3128631baa36?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Kayaking Adventure",
          description: "Guided kayaking tour for two on scenic waterways.",
          category: "Experiences",
          points: 450,
          imageUrl: "https://images.unsplash.com/photo-1511098217401-2291d3b7cebd?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Theme Park Day Pass",
          description: "Two tickets to a popular theme park for a full day of fun.",
          category: "Experiences",
          points: 700,
          imageUrl: "https://images.unsplash.com/photo-1543313661-988f8be8809a?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Escape Room Challenge",
          description: "Admission for 4 to an immersive escape room game.",
          category: "Experiences",
          points: 380,
          imageUrl: "https://images.unsplash.com/photo-1543101516-5bcc9614f918?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Zip-lining Experience",
          description: "Exhilarating zip-line course through scenic landscapes.",
          category: "Experiences",
          points: 550,
          imageUrl: "https://images.unsplash.com/photo-1544230980-8f19ebdb9ea1?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Golf Lesson Package",
          description: "Series of 3 golf lessons with a PGA professional.",
          category: "Experiences",
          points: 650,
          imageUrl: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Skydiving Simulation",
          description: "Indoor skydiving experience with professional instruction.",
          category: "Experiences",
          points: 480,
          imageUrl: "https://images.unsplash.com/photo-1511169355326-be606c6e1da7?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Comedy Club Tickets",
          description: "Two tickets to a live stand-up comedy show.",
          category: "Experiences",
          points: 250,
          imageUrl: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=500&h=300&fit=crop",
          supplier: "tillo",
          isActive: true
        },
        {
          name: "Brewery Tour & Tasting",
          description: "Behind-the-scenes tour with beer tasting flight for two.",
          category: "Experiences",
          points: 300,
          imageUrl: "https://images.unsplash.com/photo-1559526324-593bc073d938?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Rock Climbing Session",
          description: "Indoor rock climbing experience with gear and instruction.",
          category: "Experiences",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Helicopter City Tour",
          description: "15-minute helicopter sightseeing tour for one person.",
          category: "Experiences",
          points: 1200,
          imageUrl: "https://images.unsplash.com/photo-1583991111178-7b042e3077f6?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Horseback Riding Lesson",
          description: "Beginner horseback riding lesson with professional instruction.",
          category: "Experiences",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1511195448591-062cec834bc2?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Painting & Wine Workshop",
          description: "Guided painting session with complimentary wine.",
          category: "Experiences",
          points: 320,
          imageUrl: "https://images.unsplash.com/photo-1547333590-47fae5f58d21?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Dance Class Package",
          description: "4-class package for ballroom or Latin dance lessons.",
          category: "Experiences",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1547048615-da56eb92d444?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Sushi Making Workshop",
          description: "Learn to make sushi rolls with a professional chef.",
          category: "Experiences",
          points: 370,
          imageUrl: "https://images.unsplash.com/photo-1583623025817-d180a2fe075e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Axe Throwing Session",
          description: "1-hour axe throwing session with instruction for two people.",
          category: "Experiences",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1574103188526-4faae477d34e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Star Gazing Tour",
          description: "Guided nighttime astronomy experience with telescopes.",
          category: "Experiences",
          points: 420,
          imageUrl: "https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Luxury Boat Cruise",
          description: "2-hour sunset cruise on a luxury yacht for two.",
          category: "Experiences",
          points: 900,
          imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        }
      ];

      // Wellness Category - 25 products
      const wellnessProducts = [
        {
          name: "Yoga Class Package",
          description: "10-class package at a premium yoga studio.",
          category: "Wellness",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1588286840104-8957b019727f?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Monthly Gym Membership",
          description: "30-day access to a premium fitness club.",
          category: "Wellness",
          points: 500,
          imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Premium Massage Chair Session",
          description: "1-hour session in a luxury massage chair.",
          category: "Wellness",
          points: 250,
          imageUrl: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Meditation Course",
          description: "8-week guided meditation program with certified instructor.",
          category: "Wellness",
          points: 400,
          imageUrl: "https://images.unsplash.com/photo-1536623975707-c4b3b2af565d?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Aromatherapy Gift Set",
          description: "Essential oil diffuser with 6 premium essential oils.",
          category: "Wellness",
          points: 320,
          imageUrl: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Weighted Blanket",
          description: "15lb therapeutic weighted blanket for better sleep.",
          category: "Wellness",
          points: 380,
          imageUrl: "https://images.unsplash.com/photo-1631756964162-25c8c07579b1?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Acupuncture Session",
          description: "Traditional acupuncture therapy with certified practitioner.",
          category: "Wellness",
          points: 450,
          imageUrl: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Home Fitness Equipment",
          description: "Resistance band set with workout guide.",
          category: "Wellness",
          points: 220,
          imageUrl: "https://images.unsplash.com/photo-1598550593506-b035cba3ba0e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Nutritional Counseling",
          description: "Personalized nutrition consultation with registered dietitian.",
          category: "Wellness",
          points: 600,
          imageUrl: "https://images.unsplash.com/photo-1505576633757-0ac1084f63cd?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Sleep Therapy Light",
          description: "Light therapy lamp for improved sleep and mood.",
          category: "Wellness",
          points: 300,
          imageUrl: "https://images.unsplash.com/photo-1542728928-1413d1894ed1?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Yoga Mat & Props Set",
          description: "Premium yoga mat with blocks, strap, and towel.",
          category: "Wellness",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1576095910607-644cd66e5c65?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Mindfulness Journal",
          description: "Guided journal for daily mindfulness practice.",
          category: "Wellness",
          points: 150,
          imageUrl: "https://images.unsplash.com/photo-1615310748514-99796d46e94e?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Himalayan Salt Lamp",
          description: "Natural salt crystal lamp for air purification.",
          category: "Wellness",
          points: 200,
          imageUrl: "https://images.unsplash.com/photo-1539207554081-7214fbd6e282?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Foot Massager",
          description: "Electric foot massager with heat therapy.",
          category: "Wellness",
          points: 420,
          imageUrl: "https://images.unsplash.com/photo-1595238242018-22219945cf66?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Water Purification System",
          description: "Countertop water filter for clean drinking water.",
          category: "Wellness",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1546483667-f62d66b96636?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Organic Tea Collection",
          description: "Assortment of premium organic herbal teas.",
          category: "Wellness",
          points: 180,
          imageUrl: "https://images.unsplash.com/photo-1563911892437-1feda0179e41?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Personal Air Purifier",
          description: "HEPA air purifier for home or office.",
          category: "Wellness",
          points: 480,
          imageUrl: "https://images.unsplash.com/photo-1598803783347-dada77361e66?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Fitness Tracker Watch",
          description: "Smart fitness tracker with heart rate monitoring.",
          category: "Wellness",
          points: 500,
          imageUrl: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Posture Corrector",
          description: "Adjustable brace for improved posture and back support.",
          category: "Wellness",
          points: 140,
          imageUrl: "https://images.unsplash.com/photo-1537344836915-25a58b04e69c?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Luxury Bath Set",
          description: "Premium bath bombs, salts, and oils for relaxation.",
          category: "Wellness",
          points: 230,
          imageUrl: "https://images.unsplash.com/photo-1532771522233-9079b9616c44?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Sleep Sound Machine",
          description: "White noise machine with natural sounds for better sleep.",
          category: "Wellness",
          points: 250,
          imageUrl: "https://images.unsplash.com/photo-1631703412785-e9754dea55c6?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Indoor Plant Collection",
          description: "Set of 3 air-purifying houseplants with decorative pots.",
          category: "Wellness",
          points: 280,
          imageUrl: "https://images.unsplash.com/photo-1545165375-7c5f3a1a2c83?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Foam Roller Set",
          description: "Deep tissue massage foam roller and balls for recovery.",
          category: "Wellness",
          points: 210,
          imageUrl: "https://images.unsplash.com/photo-1600881333168-2ef49b341f30?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Cold Therapy System",
          description: "Targeted cold therapy for muscle recovery and pain relief.",
          category: "Wellness",
          points: 370,
          imageUrl: "https://images.unsplash.com/photo-1605296867424-35c82a8b1da1?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Luxury Bathrobe",
          description: "Premium Turkish cotton spa robe.",
          category: "Wellness",
          points: 320,
          imageUrl: "https://images.unsplash.com/photo-1614255976202-43b92dfb7d67?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        }
      ];

      // Combine all products into one array
      const demoProducts = [
        ...giftCardProducts,
        ...electronicsProducts,
        ...experiencesProducts,
        ...wellnessProducts
      ];
      
      for (const product of demoProducts) {
        await db.insert(products).values(product);
      }

      console.log("Demo products seeded successfully");
    }
  } catch (error) {
    console.error("Error seeding initial data:", error);
  }
}