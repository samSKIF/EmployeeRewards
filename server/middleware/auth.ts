import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "@shared/schema";
import { auth as firebaseAuth } from "../firebase-admin";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";

// JWT secret - should be stored in environment variables (keeping for backward compatibility)
const JWT_SECRET = process.env.JWT_SECRET || "rewardhub-secret-key";

// Extended Request type with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: Omit<User, "password">;
  firebaseUid?: string;
}

// Generate JWT token (keeping for backward compatibility)
export const generateToken = (user: Omit<User, "password">): string => {
  return jwt.sign(
    { id: user.id, email: user.email, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// Verify token middleware - works with both Firebase and JWT tokens
export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // First try to verify as a Firebase token
    try {
      const decodedToken = await firebaseAuth.verifyIdToken(token);
      req.firebaseUid = decodedToken.uid;
      
      // Get the user from database by email
      if (decodedToken.email) {
        const user = await db.select().from(users).where(eq(users.email, decodedToken.email)).then(rows => rows[0]);
        
        if (user) {
          // Remove password from user object
          const { password: _, ...userWithoutPassword } = user;
          req.user = userWithoutPassword;
          return next();
        } else {
          console.log("User authenticated with Firebase but not found in database, creating mapping...");
          // You might want to create a new user in your database or handle this differently
          return res.status(403).json({ 
            message: "User authenticated but not registered in the system",
            firebaseUser: {
              uid: decodedToken.uid,
              email: decodedToken.email,
              displayName: decodedToken.name || decodedToken.email?.split('@')[0] || 'New User'
            }
          });
        }
      }
    } catch (err) {
      // Type assertion to handle the unknown error type
      const firebaseError = err as { message?: string };
      console.log("Failed to verify Firebase token, trying JWT:", firebaseError.message || "Unknown error");
      
      // If Firebase token verification fails, try JWT (for backward compatibility)
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as Omit<User, "password">;
        req.user = decoded;
        return next();
      } catch (err2) {
        // Type assertion to handle the unknown error type
        const jwtError = err2 as { message?: string };
        console.log("JWT verification also failed:", jwtError.message || "Unknown error");
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
      }
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
};

// Check admin role middleware
export const verifyAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized: No user" });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }

  next();
};
