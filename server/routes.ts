import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { verifyToken, verifyAdmin, AuthenticatedRequest, generateToken } from "./middleware/auth";
import { scheduleBirthdayRewards } from "./middleware/scheduler";
import { tilloSupplier, carltonSupplier } from "./middleware/suppliers";
import { z } from "zod";
import { db } from "./db";
import { compare, hash } from "bcrypt";
import { users, insertUserSchema, products, insertProductSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log("REGISTRATION ATTEMPT - Raw body:", req.body);
      
      // Validate user data using the insertUserSchema
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingEmailUser = await storage.getUserByEmail(userData.email);
      if (existingEmailUser) {
        return res.status(409).json({ message: "Email already registered" });
      }
      
      // Check if username already exists
      const [existingUsernameUser] = await db.select().from(users).where(eq(users.username, userData.username));
      if (existingUsernameUser) {
        return res.status(409).json({ message: "Username already taken" });
      }
      
      // Create the user
      const user = await storage.createUser(userData);
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      // Generate JWT token for automatic login
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
      
      console.log("Registration successful for:", userWithoutPassword);
      
      res.status(201).json({
        token,
        user: userWithoutPassword
      });
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
  
  // Add special routes to serve static HTML for direct login options
  app.get("/admin-login", (req, res) => {
    res.sendFile(path.resolve(import.meta.dirname, "../client/src/login-direct.html"));
  });
  
  app.get("/direct-login", (req, res) => {
    res.sendFile(path.resolve(import.meta.dirname, "../client/direct-login.html"));
  });
  
  // Social API - Posts
  app.get("/api/social/posts", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const posts = await storage.getPosts(limit, offset);
      res.json(posts);
    } catch (error: any) {
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
      
      const stats = await storage.getUserSocialStats(req.user.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get social stats" });
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
