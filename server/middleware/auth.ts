
 import { Request, Response, NextFunction } from "express";
 import jwt from "jsonwebtoken";
 import { User } from "@shared/schema";
 import { db } from "../db";
 import { eq } from "drizzle-orm";
 import { users } from "@shared/schema";
+import { logger } from "@shared/logger";

 const JWT_SECRET = process.env.JWT_SECRET || "rewardhub-secret-key";

 // Extended Request type with authenticated user
 export interface AuthenticatedRequest extends Request {
   user?: Omit<User, "password">;
 }

 // Generate JWT token
 export const generateToken = (user: Omit<User, "password">): string => {
   return jwt.sign(
     { id: user.id, email: user.email, isAdmin: user.isAdmin },
     JWT_SECRET,
     { expiresIn: "1d" }
   );
 };

 // Verify JWT token middleware
 export const verifyToken = async (
   req: AuthenticatedRequest,
   res: Response,
   next: NextFunction
 ) => {
   // Get token from authorization header OR query parameter
   let token: string | undefined;
diff --git a/server/middleware/auth.ts b/server/middleware/auth.ts
index 238507deea4b5eba1669b928987075220ad89f41..6f031364a5c25e17fa954bce3e8d433de7389a4f 100644
--- a/server/middleware/auth.ts
+++ b/server/middleware/auth.ts
@@ -37,51 +38,51 @@ export const verifyToken = async (
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
     // Verify JWT token
     const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; isAdmin: boolean };

     // Fetch the complete user data from the database
     const user = await db.select().from(users).where(eq(users.id, decoded.id)).then(rows => rows[0]);

     if (user) {
       // Remove password from user object
       const { password: _, ...userWithoutPassword } = user;
       req.user = userWithoutPassword;
       return next();
     } else {
-      console.log("JWT token valid but user not found in database:", decoded.id);
+      logger.warn("JWT token valid but user not found in database:", decoded.id);
       return res.status(401).json({ message: "User not found" });
     }
   } catch (error) {
     const jwtError = error as { message?: string };
-    console.log("JWT verification failed:", jwtError.message || "Unknown error");
+    logger.error("JWT verification failed:", jwtError.message || "Unknown error");
     return res.status(401).json({ message: "Unauthorized: Invalid token" });
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
