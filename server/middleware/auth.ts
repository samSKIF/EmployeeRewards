import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users } from '@shared/schema';
import { logger } from '@shared/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'rewardhub-secret-key';

// Extended Request type with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: Omit<User, 'password'>;
}

// Generate JWT token
export const generateToken = (user: Omit<User, 'password'>): string => {
  return jwt.sign(
    { id: user.id, email: user.email, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: '1d' }
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

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // If no token in header, check query parameter (useful for direct downloads)
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  // If still no token, return unauthorized
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Fetch the current user data from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.id));

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    // Remove password before attaching to request
    const { password: _, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;

    next();
  } catch (error) {
    logger.error('Token verification error:', error);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

// Verify admin access middleware
export const verifyAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!req.user.isAdmin) {
    return res
      .status(403)
      .json({ message: 'Forbidden: Admin access required' });
  }

  next();
};
