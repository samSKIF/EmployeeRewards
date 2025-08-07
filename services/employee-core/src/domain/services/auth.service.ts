// Authentication Service - Handles JWT, login, password management
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db, User, InsertUser, users } from '../../infrastructure/database/connection';
import { eq, and } from 'drizzle-orm';
import { eventBus } from '../../../../shared/event-bus';

const JWT_SECRET = process.env.JWT_SECRET || 'employee-core-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const SALT_ROUNDS = 10;

export interface TokenPayload {
  id: number;
  email: string;
  username: string;
  organization_id: number | null;
  role_type: string | null;
  is_admin: boolean;
}

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
}

export interface AuthResult {
  user: Omit<User, 'password'>;
  token: string;
  refresh_token?: string;
}

export class AuthenticationService {
  /**
   * Generate JWT token
   */
  static generateToken(user: User): string {
    const payload: TokenPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      organization_id: user.organization_id,
      role_type: user.role_type,
      is_admin: user.is_admin,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: number): string {
    return jwt.sign(
      { id: userId, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error: any) {
      console.error('[Auth Service] Token verification failed:', error?.message);
      return null;
    }
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Authenticate user with credentials
   */
  static async authenticate(credentials: LoginCredentials): Promise<AuthResult | null> {
    try {
      // Find user by email or username
      let user: User | undefined;
      
      if (credentials.email) {
        [user] = await db
          .select()
          .from(users)
          .where(and(
            eq(users.email, credentials.email),
            eq(users.is_active, true)
          ));
      } else if (credentials.username) {
        [user] = await db
          .select()
          .from(users)
          .where(and(
            eq(users.username, credentials.username),
            eq(users.is_active, true)
          ));
      }

      if (!user) {
        return null;
      }

      // Verify password
      const isValid = await this.comparePassword(credentials.password, user.password);
      if (!isValid) {
        // Publish failed login event
        await eventBus.publish({
          type: 'auth.login_failed',
          version: '1.0',
          source: 'employee-core',
          data: {
            username: credentials.username || credentials.email,
            reason: 'invalid_password',
            timestamp: new Date().toISOString(),
          },
        });
        return null;
      }

      // Update last login
      await db
        .update(users)
        .set({ last_login: new Date() })
        .where(eq(users.id, user.id));

      // Generate tokens
      const token = this.generateToken(user);
      const refresh_token = this.generateRefreshToken(user.id);

      // Remove password from user object
      const { password: _, ...userWithoutPassword } = user;

      // Publish successful login event
      await eventBus.publish({
        type: 'auth.user_logged_in',
        version: '1.0',
        source: 'employee-core',
        data: {
          user_id: user.id,
          username: user.username,
          organization_id: user.organization_id,
          login_time: new Date().toISOString(),
        },
        metadata: {
          userId: user.id,
          organizationId: user.organization_id,
        },
      });

      return {
        user: userWithoutPassword,
        token,
        refresh_token,
      };
    } catch (error: any) {
      console.error('[Auth Service] Authentication error:', error?.message);
      throw error;
    }
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return false;
      }

      // Verify current password
      const isValid = await this.comparePassword(currentPassword, user.password);
      if (!isValid) {
        return false;
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      await db
        .update(users)
        .set({
          password: hashedPassword,
          password_changed_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(users.id, userId));

      // Publish password changed event
      await eventBus.publish({
        type: 'auth.password_changed',
        version: '1.0',
        source: 'employee-core',
        data: {
          user_id: userId,
          changed_at: new Date().toISOString(),
        },
      });

      return true;
    } catch (error: any) {
      console.error('[Auth Service] Password change error:', error?.message);
      throw error;
    }
  }

  /**
   * Reset user password (admin action)
   */
  static async resetPassword(
    userId: number,
    newPassword: string,
    resetBy: number
  ): Promise<boolean> {
    try {
      const hashedPassword = await this.hashPassword(newPassword);

      await db
        .update(users)
        .set({
          password: hashedPassword,
          password_changed_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(users.id, userId));

      // Publish password reset event
      await eventBus.publish({
        type: 'auth.password_reset',
        version: '1.0',
        source: 'employee-core',
        data: {
          user_id: userId,
          reset_by: resetBy,
          reset_at: new Date().toISOString(),
        },
      });

      return true;
    } catch (error: any) {
      console.error('[Auth Service] Password reset error:', error?.message);
      throw error;
    }
  }

  /**
   * Validate user session
   */
  static async validateSession(token: string): Promise<User | null> {
    try {
      const payload = await this.verifyToken(token);
      if (!payload) {
        return null;
      }

      // Get fresh user data
      const [user] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, payload.id),
          eq(users.is_active, true)
        ));

      return user || null;
    } catch (error: any) {
      console.error('[Auth Service] Session validation error:', error?.message);
      return null;
    }
  }

  /**
   * Logout user (invalidate session)
   */
  static async logout(userId: number): Promise<void> {
    try {
      // In production, invalidate refresh tokens in database
      
      // Publish logout event
      await eventBus.publish({
        type: 'auth.user_logged_out',
        version: '1.0',
        source: 'employee-core',
        data: {
          user_id: userId,
          logout_time: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('[Auth Service] Logout error:', error?.message);
      throw error;
    }
  }
}