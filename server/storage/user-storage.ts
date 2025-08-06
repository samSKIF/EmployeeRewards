// User storage module for ThrivioHR platform
// Gold standard compliance: Enterprise-grade error handling and type safety

import { db } from '../db';
import { users, accounts, type User, type InsertUser, type Account } from '@shared/schema';
import { eq, and, or, count, like } from 'drizzle-orm';
import { hash, compare } from 'bcrypt';
import type { UserWithBalance } from '@shared/types';
import type { IUserStorage } from './interfaces';

export class UserStorage implements IUserStorage {
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error: any) {
      console.error('Error getting user:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error: any) {
      console.error('Error getting user by email:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async getUserByName(name: string, surname: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.name, name), eq(users.surname, surname)));
      return user;
    } catch (error: any) {
      console.error('Error getting user by name:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async checkDuplicateUser(
    email: string,
    name?: string,
    surname?: string
  ): Promise<{ emailExists: boolean; nameExists: boolean }> {
    try {
      // Check for email duplicates
      const [emailUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      let nameUser = null;
      if (name && surname) {
        [nameUser] = await db
          .select()
          .from(users)
          .where(and(eq(users.name, name), eq(users.surname, surname)));
      }

      return {
        emailExists: !!emailUser,
        nameExists: !!nameUser,
      };
    } catch (error: any) {
      console.error('Error checking duplicate user:', error?.message || 'unknown_error');
      return { emailExists: false, nameExists: false };
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      // Hash password before storing
      const hashedPassword = await hash(user.password, 10);
      
      const [newUser] = await db
        .insert(users)
        .values({
          ...user,
          password: hashedPassword,
        })
        .returning();

      // Create default account for the user
      await db.insert(accounts).values({
        user_id: newUser.id,
        account_type: 'user',
        balance: 0,
      });

      return newUser;
    } catch (error: any) {
      console.error('Error creating user:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getUserWithBalance(id: number): Promise<UserWithBalance | undefined> {
    try {
      const [userData] = await db
        .select({
          user: users,
          account: accounts,
        })
        .from(users)
        .leftJoin(accounts, eq(accounts.user_id, users.id))
        .where(eq(users.id, id));

      if (!userData?.user) return undefined;

      return {
        ...userData.user,
        balance: userData.account?.balance || 0,
        createdAt: new Date(userData.user.created_at),
      } as UserWithBalance;
    } catch (error: any) {
      console.error('Error getting user with balance:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async getAllUsersWithBalance(): Promise<UserWithBalance[]> {
    try {
      const usersData = await db
        .select({
          user: users,
          account: accounts,
        })
        .from(users)
        .leftJoin(accounts, eq(accounts.user_id, users.id));

      return usersData.map((row) => ({
        ...row.user,
        balance: row.account?.balance || 0,
        createdAt: new Date(row.user.created_at),
      })) as UserWithBalance[];
    } catch (error: any) {
      console.error('Error getting all users with balance:', error?.message || 'unknown_error');
      return [];
    }
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await compare(plainPassword, hashedPassword);
    } catch (error: any) {
      console.error('Error verifying password:', error?.message || 'unknown_error');
      return false;
    }
  }

  async getUserCount(): Promise<number> {
    try {
      const result = await db.select({ count: count() }).from(users);
      return result[0]?.count || 0;
    } catch (error: any) {
      console.error('Error getting user count:', error?.message || 'unknown_error');
      return 0;
    }
  }

  async getUsersByOrganization(organizationId: number) {
    try {
      const organizationUsers = await db
        .select()
        .from(users)
        .where(eq(users.organization_id, organizationId));
      return organizationUsers;
    } catch (error: any) {
      console.error('Error getting users by organization:', error?.message || 'unknown_error');
      return [];
    }
  }

  async getUsers(organizationId?: number, limit?: number, offset?: number) {
    try {
      // CRITICAL SECURITY FIX: Always filter by organization_id for multi-tenant isolation
      if (!organizationId) {
        throw new Error('Organization ID is required for multi-tenant data isolation');
      }
      
      let query = db
        .select()
        .from(users)
        .where(eq(users.organization_id, organizationId));
        
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.offset(offset);
      }
      
      const organizationUsers = await query;
      return organizationUsers;
    } catch (error: any) {
      console.error('Error getting users for organization:', error?.message || 'unknown_error');
      return [];
    }
  }

  // Missing methods for employee management
  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id); // Alias for consistency
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      
      if (!updatedUser) {
        throw new Error(`User with id ${id} not found`);
      }
      
      return updatedUser;
    } catch (error: any) {
      console.error('Error updating user:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    try {
      await db.delete(users).where(eq(users.id, id));
    } catch (error: any) {
      console.error('Error deleting user:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getEmployeesWithFilters(
    organizationId: number, 
    filters: {
      search?: string;
      department?: string;
      status?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: string;
    }
  ): Promise<User[]> {
    try {
      // Build where conditions array
      const conditions = [eq(users.organization_id, organizationId)];

      if (filters.status) {
        conditions.push(eq(users.status, filters.status));
      }

      if (filters.department) {
        conditions.push(eq(users.department, filters.department));
      }

      if (filters.search) {
        conditions.push(
          or(
            like(users.name, `%${filters.search}%`),
            like(users.email, `%${filters.search}%`)
          )
        );
      }

      // Build query with all conditions
      let query = db.select().from(users).where(and(...conditions));

      // Add pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const employees = await query;
      return employees;
    } catch (error: any) {
      console.error('Error getting employees with filters:', error?.message || 'unknown_error');
      return [];
    }
  }

  async searchEmployees(
    organizationId: number, 
    searchQuery: string, 
    filters?: {
      department?: string;
      status?: string;
      limit?: number;
    }
  ): Promise<User[]> {
    try {
      // Build where conditions array
      const conditions = [
        eq(users.organization_id, organizationId),
        or(
          like(users.name, `%${searchQuery}%`),
          like(users.email, `%${searchQuery}%`),
          like(users.job_title, `%${searchQuery}%`)
        )
      ];

      if (filters?.department) {
        conditions.push(eq(users.department, filters.department));
      }

      if (filters?.status) {
        conditions.push(eq(users.status, filters.status));
      }

      // Build query with all conditions
      let query = db.select().from(users).where(and(...conditions));

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const searchResults = await query;
      return searchResults;
    } catch (error: any) {
      console.error('Error searching employees:', error?.message || 'unknown_error');
      return [];
    }
  }

  async checkUserDependencies(userId: number): Promise<{
    hasActivePosts: boolean;
    hasActiveRecognitions: boolean;
    hasActiveOrders: boolean;
  }> {
    try {
      // For now return false for all dependencies
      // This would need to be implemented with actual table checks
      // when posts, recognitions, and orders tables are available
      return {
        hasActivePosts: false,
        hasActiveRecognitions: false, 
        hasActiveOrders: false
      };
    } catch (error: any) {
      console.error('Error checking user dependencies:', error?.message || 'unknown_error');
      return {
        hasActivePosts: false,
        hasActiveRecognitions: false,
        hasActiveOrders: false
      };
    }
  }
}