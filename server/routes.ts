import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { verifyToken, verifyAdmin, AuthenticatedRequest, generateToken } from "./middleware/auth";
import { scheduleBirthdayRewards } from "./middleware/scheduler";
import { tilloSupplier, carltonSupplier } from "./middleware/suppliers";
import { z } from "zod";
import { db } from "./db";
import { compare } from "bcrypt";
import { users, insertUserSchema, products, insertProductSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
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
        email: user.email,
        department: user.department,
        isAdmin: user.isAdmin,
        birthDate: user.birthDate,
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
      
      const userWithBalance = await storage.getUserWithBalance(req.user.id);
      
      if (!userWithBalance) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(userWithBalance);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get user" });
    }
  });
  
  app.get("/api/users", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsersWithBalance();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get users" });
    }
  });
  
  // Transaction routes
  app.get("/api/transactions", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const isAdmin = req.user.isAdmin;
      
      // If admin, return all transactions, otherwise return only user's transactions
      const transactions = isAdmin 
        ? await storage.getAllTransactions()
        : await storage.getTransactionsByUserId(req.user.id);
      
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get transactions" });
    }
  });
  
  // Product routes
  app.get("/api/catalog", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const products = await storage.getProductsWithAvailability(req.user.id);
      res.json(products);
    } catch (error: any) {
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
      
      const stats = await storage.getUserDashboardStats(req.user.id);
      res.json(stats);
    } catch (error: any) {
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
  
  // Add special route to serve static HTML for direct login
  app.get("/admin-login", (req, res) => {
    res.sendFile("login-direct.html", { root: "./client/src" });
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
      
      // Create admin user
      await storage.createUser({
        username: "admin",
        password: "admin123",
        name: "Admin User",
        email: "admin@demo.io",
        department: "HR",
        isAdmin: true
      });
      
      console.log("Admin user created successfully");
      
      // Seed 10 demo products
      console.log("Seeding demo products...");
      
      const demoProducts = [
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
          name: "Apple Airpods Pro",
          description: "Latest model with noise cancellation technology.",
          category: "Electronics",
          points: 650,
          imageUrl: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
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
          name: "Bluetooth Speaker",
          description: "Portable high-quality Bluetooth speaker.",
          category: "Electronics",
          points: 300,
          imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&h=300&fit=crop",
          supplier: "carlton",
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
          name: "Smart Watch",
          description: "Fitness and health tracking smart watch.",
          category: "Electronics",
          points: 500,
          imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&h=300&fit=crop",
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
          name: "Wireless Charger",
          description: "Fast wireless charging pad for compatible devices.",
          category: "Electronics",
          points: 180,
          imageUrl: "https://images.unsplash.com/photo-1603539444875-76e7684265f6?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        },
        {
          name: "Yoga Class Package",
          description: "10-class package at a premium yoga studio.",
          category: "Wellness",
          points: 350,
          imageUrl: "https://images.unsplash.com/photo-1588286840104-8957b019727f?w=500&h=300&fit=crop",
          supplier: "carlton",
          isActive: true
        }
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
