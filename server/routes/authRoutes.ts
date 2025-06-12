import { Router } from "express";
import { z } from "zod";
import { hash, compare } from "bcrypt";
import { storage } from "../storage";
import { generateToken, verifyToken, AuthenticatedRequest } from "../middleware/auth";
import { db } from "../db";
import { users, insertUserSchema } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "@shared/logger";

const router = Router();

// User registration endpoint
router.post("/register", async (req, res) => {
  try {
    logger.info("REGISTRATION ATTEMPT - Raw body:", req.body);

    // Check if this is a Firebase user registration
    const { firebaseUid, firebaseUser, ...userData } = req.body;

    // Validate user data using the insertUserSchema (or a subset for Firebase users)
    if (firebaseUid && firebaseUser) {
      // This is a Firebase user registration
      logger.info("Processing Firebase user registration", firebaseUser);

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

      logger.info("Firebase user registration successful for:", userWithoutPassword);

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

      // PostgreSQL authentication only - no Firebase dependency
      logger.info(`Creating user in PostgreSQL database: ${validatedUserData.email}`);

      // Create the user in the database
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

      logger.info("Standard registration successful for:", userWithoutPassword);

      res.status(201).json({
        token,
        user: userWithoutPassword
      });
    }
  } catch (error: any) {
    logger.error("Registration error:", error);
    res.status(400).json({ message: error.message || "Registration failed"});
  }
});

// User login endpoint
router.post("/login", async (req, res) => {
  try {
    logger.info("LOGIN ATTEMPT - Raw body:", req.body);

    // Handle both email and username login attempts
    const { email, username, password } = req.body;

    if ((!email && !username) || !password) {
      logger.warn("Missing authentication credentials");
      return res.status(400).json({ message: "Email/username and password are required" });
    }

    let user = null;

    // If email is provided, look up user directly in main database
    if (email) {
      logger.debug(`Looking up user with email: ${email}`);

      // Look up user directly in the main database (case-insensitive)
      const [foundUser] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`);
      user = foundUser;

      if (user) {
        logger.debug(`User found in main database: ${user.email}`);
      } else {
        logger.debug(`No user found with email: ${email}`);
      }
    }

    // Fallback to main database for username lookup
    if (!user && username) {
      logger.debug(`Looking up user with username: ${username}`);
      const [foundUser] = await db.select().from(users).where(eq(users.username, username));
      user = foundUser;
    }

    if (!user) {
      logger.warn("No user found with provided credentials");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    logger.debug(`User found: ${user.username}, verifying password`);

    const passwordMatch = await storage.verifyPassword(password, user.password);

    logger.debug("Password verification result:", passwordMatch);

    if (!passwordMatch) {
      logger.warn("Password verification failed");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    logger.debug("Password verified, generating token");

    // Update last seen timestamp on successful authentication
    try {
      await db.update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.id, user.id));
      logger.debug(`Updated last seen for user ${user.id}`);
    } catch (error) {
      logger.warn("Failed to update last seen on login:", error);
    }

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

    logger.info("Login successful for:", userWithoutPassword);

    res.status(200).json({
      token,
      user: userWithoutPassword
    });
  } catch (error: any) {
    logger.error("Login error:", error);
    res.status(500).json({ message: error.message || "An error occurred during login" });
  }
});

export default router;