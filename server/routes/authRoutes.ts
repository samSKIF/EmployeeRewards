import { Router } from 'express';
import { z } from 'zod';
import { hash, compare } from 'bcrypt';
import { storage } from '../storage';
import {
  generateToken,
  verifyToken,
  AuthenticatedRequest,
} from '../middleware/auth';
import { db } from '../db';
import {
  users,
  organizations,
  subscriptions,
  insertUserSchema,
} from '@shared/schema';
import { eq, sql, and, desc, count } from 'drizzle-orm';
import { logger } from '@shared/logger';
import jwt from 'jsonwebtoken';

const router = Router();

// Helper function to check user count limits for organization
async function checkUserCountLimit(
  organizationId: number
): Promise<{
  allowed: boolean;
  message?: string;
  currentCount?: number;
  subscribedUsers?: number;
}> {
  try {
    // Get organization's current subscription
    const [organization] = await db
      .select({
        id: organizations.id,
        currentSubscriptionId: organizations.currentSubscriptionId,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!organization) {
      return { allowed: false, message: 'Organization not found' };
    }

    // Get current ACTIVE user count only (for subscription validation)
    const [userCountResult] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.organization_id, organizationId),
          eq(users.status, 'active')
        )
      );

    const currentUserCount = userCountResult.count;

    // Get subscription subscribed users limit if there's an active subscription
    let subscribedUsersLimit = 50; // Default fallback

    if (organization.currentSubscriptionId) {
      const [subscription] = await db
        .select({
          subscribedUsers: subscriptions.subscribedUsers,
          isActive: subscriptions.is_active,
          expirationDate: subscriptions.expirationDate,
        })
        .from(subscriptions)
        .where(eq(subscriptions.id, organization.currentSubscriptionId));

      if (subscription && subscription.is_active) {
        // Check if subscription is still valid
        const now = new Date();
        const isExpired = new Date(subscription.expirationDate) <= now;

        if (!isExpired && subscription.subscribedUsers) {
          subscribedUsersLimit = subscription.subscribedUsers;
        }
      }
    }

    // Check if adding a new user would exceed the limit
    if (currentUserCount >= subscribedUsersLimit) {
      return {
        allowed: false,
        message: `Organization has reached its user limit of ${subscribedUsersLimit} users. Current count: ${currentUserCount}`,
        currentCount: currentUserCount,
        subscribedUsers: subscribedUsersLimit,
      };
    }

    return {
      allowed: true,
      currentCount: currentUserCount,
      subscribedUsers: subscribedUsersLimit,
    };
  } catch (error) {
    logger.error('Error checking user count limit:', error);
    return { allowed: false, message: 'Error checking user limits' };
  }
}

// User registration endpoint
router.post('/register', async (req, res) => {
  try {
    logger.info('REGISTRATION ATTEMPT - Raw body:', req.body);

    // Check if this is a Firebase user registration
    const { firebaseUid, firebaseUser, ...userData } = req.body;

    // Validate user data using the insertUserSchema (or a subset for Firebase users)
    if (firebaseUid && firebaseUser) {
      // This is a Firebase user registration
      logger.info('Processing Firebase user registration', firebaseUser);

      // Check if email already exists
      const existingEmailUser = await storage.getUserByEmail(
        firebaseUser.email
      );
      if (existingEmailUser) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      // Create username from email if not provided
      const username = userData.username || firebaseUser.email.split('@')[0];

      // Check if username already exists
      const [existingUsernameUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      if (existingUsernameUser) {
        return res.status(409).json({ message: 'Username already taken' });
      }

      // Check user count limits for the organization
      if (userData.organization_id) {
        const userLimitCheck = await checkUserCountLimit(
          userData.organization_id
        );
        if (!userLimitCheck.allowed) {
          return res.status(403).json({
            message: userLimitCheck.message,
            error: 'USER_LIMIT_EXCEEDED',
            currentCount: userLimitCheck.currentCount,
            subscribedUsers: userLimitCheck.subscribedUsers,
          });
        }
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
        firebaseUid, // Store the Firebase UID for future reference
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      logger.info(
        'Firebase user registration successful for:',
        userWithoutPassword
      );

      res.status(201).json({
        user: userWithoutPassword,
      });
    } else {
      // This is a regular user registration
      // Validate user data
      const validatedUserData = insertUserSchema.parse(userData);

      // Check if email already exists
      const existingEmailUser = await storage.getUserByEmail(
        validatedUserData.email
      );
      if (existingEmailUser) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      // Check if username already exists
      const [existingUsernameUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, validatedUserData.username));
      if (existingUsernameUser) {
        return res.status(409).json({ message: 'Username already taken' });
      }

      // Check user count limits for the organization
      if (validatedUserData.organization_id) {
        const userLimitCheck = await checkUserCountLimit(
          validatedUserData.organization_id
        );
        if (!userLimitCheck.allowed) {
          return res.status(403).json({
            message: userLimitCheck.message,
            error: 'USER_LIMIT_EXCEEDED',
            currentCount: userLimitCheck.currentCount,
            subscribedUsers: userLimitCheck.subscribedUsers,
          });
        }
      }

      // PostgreSQL authentication only - no Firebase dependency
      logger.info(
        `Creating user in PostgreSQL database: ${validatedUserData.email}`
      );

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
        phoneNumber: user.phone_number,
        jobTitle: user.job_title,
        department: user.department,
        sex: user.sex,
        nationality: user.nationality,
        birthDate: user.birth_date,
        isAdmin: user.is_admin,
        status: user.status,
        avatarUrl: user.avatar_url,
        hireDate: user.hire_date,
        createdAt: user.created_at,
      });

      logger.info('Standard registration successful for:', userWithoutPassword);

      res.status(201).json({
        token,
        user: userWithoutPassword,
      });
    }
  } catch (error: any) {
    logger.error('Registration error:', error);
    res.status(400).json({ message: error.message || 'Registration failed' });
  }
});

// User login endpoint
router.post('/login', async (req, res) => {
  try {
    logger.info('LOGIN ATTEMPT - Raw body:', req.body);

    // Handle both email and username login attempts
    const { email, username, password } = req.body;

    if ((!email && !username) || !password) {
      logger.warn('Missing authentication credentials');
      return res
        .status(400)
        .json({ message: 'Email/username and password are required' });
    }

    let user = null;

    // If email is provided, look up user directly in main database
    if (email) {
      logger.debug(`Looking up user with email: ${email}`);

      // Look up user directly in the main database (case-insensitive)
      const [foundUser] = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`);
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
      const [foundUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      user = foundUser;
    }

    if (!user) {
      logger.warn('No user found with provided credentials');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    logger.debug(`User found: ${user.username}, verifying password`);

    const passwordMatch = await storage.verifyPassword(password, user.password);

    logger.debug('Password verification result:', passwordMatch);

    if (!passwordMatch) {
      logger.warn('Password verification failed');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    logger.debug(
      'Password verified, checking organization subscription status'
    );

    // Check if user's organization has an active subscription (skip for corporate admins)
    if (user.role_type !== 'corporate_admin' && user.organization_id) {
      try {
        // Get organization details
        const [organization] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, user.organization_id));

        if (organization) {
          // Check for active subscription
          const [activeSubscription] = await db
            .select()
            .from(subscriptions)
            .where(
              and(
                eq(subscriptions.organization_id, organization.id),
                eq(subscriptions.is_active, true)
              )
            )
            .orderBy(desc(subscriptions.created_at))
            .limit(1);

          let hasActiveSubscription = false;

          if (activeSubscription) {
            const now = new Date();
            const expirationDate = new Date(activeSubscription.expirationDate);
            hasActiveSubscription = expirationDate > now;
          }

          // If no active subscription, deny login with message
          if (!hasActiveSubscription) {
            logger.warn(
              `Login denied for user ${user.username} - organization ${organization.name} has no active subscription`
            );

            // Get organization admin email for contact info (prefer contactEmail over superuserEmail)
            const adminEmail =
              organization.contactEmail ||
              organization.superuserEmail ||
              'admin@thriviohr.com';

            return res.status(403).json({
              message: `The system is inactive please contact the admin: ${adminEmail}`,
              organizationStatus: 'inactive',
              contactEmail: adminEmail,
              showPopup: true, // Flag to trigger popup on frontend
            });
          }

          logger.debug(
            `Organization ${organization.name} has active subscription, allowing login`
          );
        }
      } catch (error) {
        logger.error('Error checking subscription status:', error);
        // Allow login on error to avoid blocking users due to system issues
      }
    }

    // Update last seen timestamp on successful authentication
    try {
      await db
        .update(users)
        .set({ last_seen_at: new Date() })
        .where(eq(users.id, user.id));
      logger.debug(`Updated last seen for user ${user.id}`);
    } catch (error) {
      logger.warn('Failed to update last seen on login:', error);
    }

    // Create JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      name: user.name,
      surname: user.surname,
      email: user.email,
      phoneNumber: user.phone_number,
      jobTitle: user.job_title,
      department: user.department,
      sex: user.sex,
      nationality: user.nationality,
      birthDate: user.birth_date,
      isAdmin: user.is_admin,
      status: user.status,
      avatarUrl: user.avatar_url,
      hireDate: user.hire_date,
      createdAt: user.created_at,
    });

    // Don't send the password back to the client
    const { password: _, ...userWithoutPassword } = user;

    logger.info('Login successful for:', userWithoutPassword);

    // For corporate admins, also generate a management token
    const responseData: any = {
      token,
      user: userWithoutPassword,
    };

    if (user.role_type === 'corporate_admin') {
      // Generate management token using same user data
      const MANAGEMENT_JWT_SECRET =
        process.env.MANAGEMENT_JWT_SECRET || 'management-secret-key';
      const managementToken = jwt.sign({ id: user.id }, MANAGEMENT_JWT_SECRET, {
        expiresIn: '8h',
      });

      logger.info('Generated management token for corporate admin');

      // Use the main token as the management token since our backend now supports both
      responseData.managementToken = token;
    }

    res.status(200).json(responseData);
  } catch (error: any) {
    logger.error('Login error:', error);
    res
      .status(500)
      .json({ message: error.message || 'An error occurred during login' });
  }
});

export default router;
