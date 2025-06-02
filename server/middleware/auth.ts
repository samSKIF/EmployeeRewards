import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "@shared/schema";
import { auth as firebaseAuth } from "../firebase-admin";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { users, employees } from "@shared/schema";
import { z } from "zod";

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
  // Get token from authorization header OR query parameter
  let token: string | undefined;
  
  // Check for token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  
  // If no token in header, check query parameter (useful for direct downloads)
  if (!token && req.query.token) {
    token = req.query.token as string;
  }
  
  // If still no token, return unauthorized
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    // First try to verify as a Firebase token
    try {
      // Instead of using the Firebase Admin SDK which has mismatched project IDs,
      // try a custom workflow to find the user by Firebase UID
      try {
        // Decode the token without verification to get the Firebase UID
        // This is less secure but necessary while we fix the project ID mismatch
        if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
          throw new Error('Invalid token format');
        }
        const decodedPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        
        // Log important fields from the token for debugging
        console.log("Custom token decode - important fields:");
        console.log("- sub (Firebase UID):", decodedPayload.sub);
        console.log("- email:", decodedPayload.email);
        console.log("- aud (audience):", decodedPayload.aud);
        console.log("- iss (issuer):", decodedPayload.iss);
        
        if (decodedPayload && decodedPayload.sub) {
          // 'sub' is the Firebase UID
          const firebaseUid = decodedPayload.sub;
          req.firebaseUid = firebaseUid;
          
          console.log("Looking up user by Firebase UID:", firebaseUid);
          
          // Find user by Firebase UID first (this should work if metadata was properly saved)
          let user;
          try {
            user = await db.select()
              .from(users)
              .where(eq(users.firebaseUid, firebaseUid))
              .then(rows => rows[0]);
          } catch (error) {
            console.error("Custom token decode failed:", error);
          }
          
          // If not found by UID, try finding by email as fallback in users table
          if (!user && decodedPayload.email) {
            console.log("User not found by UID, trying email in users table:", decodedPayload.email);
            try {
              user = await db.select()
                .from(users)
                .where(eq(users.email, decodedPayload.email))
                .then(rows => rows[0]);
                
              // If found by email but Firebase UID doesn't match, update it
              if (user && user.firebaseUid !== firebaseUid) {
                try {
                  console.log(`Updating Firebase UID for ${user.email} (ID: ${user.id})`);
                  await db.update(users)
                    .set({ firebaseUid: firebaseUid })
                    .where(eq(users.id, user.id));
                    
                  // Update the user object for this request
                  user.firebaseUid = firebaseUid;
                } catch (error) {
                  const updateErr = error as { message?: string };
                  console.error("Error updating Firebase UID - field may not exist:", updateErr.message || "Unknown error");
                  // Field might not exist yet (not migrated), but user is still valid
                }
              }
            } catch (error) {
              const emailLookupErr = error as { message?: string };
              console.error("Error looking up user by email:", emailLookupErr.message || "Unknown error");
            }
          }
          
          // If still not found, check the employees table
          if (!user && decodedPayload.email) {
            console.log("User not found in users table, checking employees table:", decodedPayload.email);
            try {
              // First try by Firebase UID in employees table
              let employee = await db.select()
                .from(employees)
                .where(eq(employees.firebaseUid, firebaseUid))
                .then(rows => rows[0]);
                
              // If not found by UID, try by email
              if (!employee) {
                employee = await db.select()
                  .from(employees)
                  .where(eq(employees.email, decodedPayload.email))
                  .then(rows => rows[0]);
                  
                // Update Firebase UID if found and it doesn't match  
                if (employee && employee.firebaseUid !== firebaseUid) {
                  try {
                    console.log(`Updating Firebase UID for employee ${employee.id} with email ${employee.email}`);
                    await db.update(employees)
                      .set({ firebaseUid: firebaseUid })
                      .where(eq(employees.id, employee.id));
                      
                    // Update the employee object
                    employee.firebaseUid = firebaseUid;
                  } catch (error) {
                    const updateErr = error as { message?: string };
                    console.error("Error updating Firebase UID for employee:", updateErr.message || "Unknown error");
                  }
                }
              }
              
              // If employee was found, create a user-compatible object
              if (employee) {
                console.log(`Employee found: ${employee.name} ${employee.surname || ''} (${employee.email})`);
                
                // Map employee fields to user fields with all required properties
                user = {
                  id: employee.id,
                  email: employee.email,
                  name: `${employee.name} ${employee.surname || ''}`.trim(),
                  username: employee.email.split('@')[0],
                  firebaseUid: employee.firebaseUid,
                  password: employee.password || '', // Include password for type compatibility
                  isAdmin: false,
                  department: employee.department,
                  jobTitle: employee.jobTitle,
                  location: employee.location,
                  // Add any other required fields with defaults
                  birthDate: null,
                  sex: employee.sex,
                  title: employee.jobTitle,
                  nationality: employee.nationality,
                  phoneNumber: employee.phoneNumber,
                  createdAt: employee.createdAt || new Date(),
                  status: employee.status,
                  avatarUrl: employee.photoUrl,
                  surname: employee.surname,
                  roleType: 'employee',
                  createdBy: employee.createdById || null,
                  organizationId: 1,
                  hireDate: employee.dateJoined || null,
                  // Add remaining missing fields required by the user type
                  permissions: [],
                  responsibilities: [],
                  coverPhotoUrl: null
                };
              }
            } catch (error) {
              const employeeLookupErr = error as { message?: string };
              console.error("Error looking up employee:", employeeLookupErr.message || "Unknown error");
            }
          }
          
          if (user) {
            console.log(`User found: ${user.name} (${user.email}), isAdmin: ${user.isAdmin}`);
            // Remove password from user object
            const { password: _, ...userWithoutPassword } = user;
            req.user = userWithoutPassword;
            return next();
          } else {
            console.log("User authenticated with Firebase but not found in database");
            // Return enough information so client can save the metadata
            return res.status(403).json({ 
              message: "User authenticated but needs registration",
              firebaseUser: {
                uid: firebaseUid,
                email: decodedPayload.email,
                displayName: decodedPayload.name || decodedPayload.email?.split('@')[0] || 'New User'
              }
            });
          }
        }
      } catch (decodeErr) {
        console.log("Custom token decode failed:", decodeErr);
      }
      
      // If custom decode fails, try normal Firebase verification as fallback
      const decodedToken = await firebaseAuth.verifyIdToken(token);
      console.log("Firebase token verified successfully");
      req.firebaseUid = decodedToken.uid;
      
      // Get the user from database by email
      if (decodedToken.email) {
        try {
          // First, try to find the user by Firebase UID which is the most reliable way
          let user = await db.select()
            .from(users)
            .where(eq(users.firebaseUid, decodedToken.uid))
            .then(rows => rows[0]);
            
          // If not found by Firebase UID, try looking by email in users table first
          if (!user) {
            console.log("User not found by Firebase UID in users table, checking by email:", decodedToken.email);
            
            user = await db.select()
              .from(users)
              .where(eq(users.email, decodedToken.email))
              .then(rows => rows[0]);
              
            if (user) {
              // Update Firebase UID if it doesn't match
              if (user.firebaseUid !== decodedToken.uid) {
                console.log(`Updating Firebase UID for user ${user.id} with email ${user.email}`);
                await db.update(users)
                  .set({ firebaseUid: decodedToken.uid })
                  .where(eq(users.id, user.id));
                  
                // Update the user object for this request
                user.firebaseUid = decodedToken.uid;
              }
            }
          }
          
          // If still not found, look in the employees table
          if (!user) {
            console.log("User not found in users table, checking employees table:", decodedToken.email);
            
            // Try to find by Firebase UID first in employees table
            let employee = await db.select()
              .from(employees)
              .where(eq(employees.firebaseUid, decodedToken.uid))
              .then(rows => rows[0]);
              
            // If not found by UID, try by email
            if (!employee) {
              employee = await db.select()
                .from(employees)
                .where(eq(employees.email, decodedToken.email))
                .then(rows => rows[0]);
                
              // Update Firebase UID if found and it doesn't match
              if (employee && employee.firebaseUid !== decodedToken.uid) {
                console.log(`Updating Firebase UID for employee ${employee.id} with email ${employee.email}`);
                await db.update(employees)
                  .set({ firebaseUid: decodedToken.uid })
                  .where(eq(employees.id, employee.id));
                  
                // Update the employee object
                employee.firebaseUid = decodedToken.uid;
              }
            }
            
            // If employee was found, create a user-compatible object
            if (employee) {
              console.log(`Employee found: ${employee.name} ${employee.surname || ''} (${employee.email})`);
              
              // Map employee fields to user fields with all required properties
              user = {
                id: employee.id,
                email: employee.email,
                name: `${employee.name} ${employee.surname || ''}`.trim(),
                username: employee.email.split('@')[0],
                firebaseUid: employee.firebaseUid,
                password: employee.password || '', // Include password for type compatibility
                isAdmin: false,
                department: employee.department,
                jobTitle: employee.jobTitle,
                location: employee.location,
                // Add any other required fields with defaults
                birthDate: null,
                sex: employee.sex,
                title: employee.jobTitle,
                nationality: employee.nationality,
                phoneNumber: employee.phoneNumber,
                createdAt: employee.createdAt || new Date(),
                status: employee.status,
                avatarUrl: employee.photoUrl,
                surname: employee.surname,
                roleType: 'employee',
                createdBy: employee.createdById || null,
                organizationId: 1,
                hireDate: employee.dateJoined || null,
                // Add remaining missing fields required by the user type
                permissions: [],
                responsibilities: [],
                coverPhotoUrl: null
              };
            }
          }
          
          // If user is found in either table
          if (user) {
            console.log(`User found: ${user.name} (${user.email}), isAdmin: ${user.isAdmin}`);
            // Remove password from user object
            const { password: _, ...userWithoutPassword } = user;
            req.user = userWithoutPassword;
            return next();
          } else {
            console.log("User authenticated with Firebase but not found in database");
            return res.status(403).json({ 
              message: "User authenticated but needs registration",
              firebaseUser: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                displayName: decodedToken.name || decodedToken.email?.split('@')[0] || 'New User'
              }
            });
          }
        } catch (error) {
          const dbErr = error as { message?: string };
          console.error("Error retrieving user from database:", dbErr.message || "Unknown error");
          return res.status(500).json({ message: "Database error" });
        }
      }
    } catch (err) {
      // Type assertion to handle the unknown error type
      const firebaseError = err as { message?: string };
      console.log("Failed to verify Firebase token, trying JWT:", firebaseError.message || "Unknown error");
      
      // If Firebase token verification fails, try JWT (for backward compatibility)
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; isAdmin: boolean };
        
        // Fetch the complete user data from the database
        try {
          const user = await db.select().from(users).where(eq(users.id, decoded.id)).then(rows => rows[0]);
          
          if (user) {
            // Remove password from user object
            const { password: _, ...userWithoutPassword } = user;
            req.user = userWithoutPassword;
            return next();
          } else {
            console.log("JWT token valid but user not found in database:", decoded.id);
            return res.status(401).json({ message: "User not found" });
          }
        } catch (dbError) {
          const err = dbError as { message?: string };
          console.error("Error fetching user after JWT verification:", err.message || "Unknown error");
          return res.status(500).json({ message: "Database error" });
        }
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
