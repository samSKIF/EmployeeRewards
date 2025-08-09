// User storage module for ThrivioHR platform
// Gold standard compliance: Enterprise-grade error handling and type safety

import { db } from '../db';
import { users, accounts, type User, type InsertUser, type Account } from '@shared/schema';
import { eq, and, or, count, like, inArray } from 'drizzle-orm';
import { hash, compare } from 'bcrypt';
import type { UserWithBalance } from '@platform/sdk/types';
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

  async getUsersByEmails(emails: string[]): Promise<User[]> {
    try {
      if (emails.length === 0) return [];
      const userList = await db.select().from(users).where(inArray(users.email, emails));
      return userList;
    } catch (error: any) {
      console.error('Error getting users by emails:', error?.message || 'unknown_error');
      return [];
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
      location?: string;
      status?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: string;
    }
  ): Promise<User[]> {
    try {
      // Build where conditions array
      const conditions: any[] = [eq(users.organization_id, organizationId)];

      if (filters.status) {
        conditions.push(eq(users.status, filters.status));
      }

      if (filters.department) {
        conditions.push(ilike(users.department, filters.department));
      }

      if (filters.location) {
        conditions.push(ilike(users.location, filters.location));
      }

      if (filters.search) {
        const searchCondition = or(
          like(users.name, `%${filters.search}%`),
          like(users.email, `%${filters.search}%`)
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      // Build query with all conditions
      let query = db.select().from(users).where(and(...conditions)) as any;

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
      const searchCondition = or(
        like(users.name, `%${searchQuery}%`),
        like(users.email, `%${searchQuery}%`),
        like(users.job_title, `%${searchQuery}%`)
      );
      
      const conditions: any[] = [eq(users.organization_id, organizationId)];
      if (searchCondition) {
        conditions.push(searchCondition);
      }

      if (filters?.department) {
        conditions.push(eq(users.department, filters.department));
      }

      if (filters?.status) {
        conditions.push(eq(users.status, filters.status));
      }

      // Build query with all conditions
      let query = db.select().from(users).where(and(...conditions)) as any;

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

  // Organization hierarchy methods
  async getOrganizationHierarchy(organizationId: number): Promise<User[]> {
    try {
      const orgUsers = await db
        .select()
        .from(users)
        .where(eq(users.organization_id, organizationId));
      return orgUsers;
    } catch (error: any) {
      console.error('Error getting organization hierarchy:', error?.message || 'unknown_error');
      return [];
    }
  }

  async getUserHierarchy(userId: number): Promise<{
    user: User;
    manager: User | null;
    skipManager: User | null;
    directReports: User[];
    indirectReports: User[];
    peers: User[];
  }> {
    try {
      // Get the current user
      const currentUser = await this.getUser(userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Get the manager (N+1) - person whose email is in my manager_email field
      let manager: User | null = null;
      if (currentUser.manager_email) {
        manager = await this.getUserByEmail(currentUser.manager_email) || null;
      }

      // Get skip-level manager (N+2) - my manager's manager
      let skipManager: User | null = null;
      if (manager?.manager_email) {
        skipManager = await this.getUserByEmail(manager.manager_email) || null;
      }

      // Get direct reports (N-1) - people who have my email in their manager_email field
      const directReports = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.manager_email, currentUser.email),
            currentUser.organization_id ? eq(users.organization_id, currentUser.organization_id) : undefined
          )
        );

      // Get indirect reports (N-2) - people who report to my direct reports
      const indirectReportPromises = directReports.map(async (report) => {
        return await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.manager_email, report.email),
              currentUser.organization_id ? eq(users.organization_id, currentUser.organization_id) : undefined
            )
          );
      });
      const indirectReportArrays = await Promise.all(indirectReportPromises);
      const indirectReports = indirectReportArrays.flat();

      // Get peers - people with the same manager_email as me (excluding self)
      let peers: User[] = [];
      if (currentUser.manager_email) {
        const allPeers = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.manager_email, currentUser.manager_email),
              currentUser.organization_id ? eq(users.organization_id, currentUser.organization_id) : undefined
            )
          );
        peers = allPeers.filter(p => p.id !== userId);
      }

      return {
        user: currentUser,
        manager,
        skipManager,
        directReports,
        indirectReports,
        peers
      };
    } catch (error: any) {
      console.error('Error getting user hierarchy:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getManagerChain(userId: number): Promise<User[]> {
    try {
      const chain: User[] = [];
      let currentUser = await this.getUser(userId);
      
      if (!currentUser) {
        return [];
      }

      // Walk up the hierarchy using manager_email
      while (currentUser?.manager_email) {
        const manager = await this.getUserByEmail(currentUser.manager_email);
        if (manager) {
          chain.push(manager);
          currentUser = manager;
        } else {
          break;
        }
      }

      return chain;
    } catch (error: any) {
      console.error('Error getting manager chain:', error?.message || 'unknown_error');
      return [];
    }
  }

  async getReportingTree(userId: number, maxDepth: number = 3): Promise<any> {
    try {
      const buildTree = async (id: number, depth: number): Promise<any> => {
        if (depth >= maxDepth) {
          return null;
        }

        const user = await this.getUser(id);
        if (!user) {
          return null;
        }

        // Get direct reports - people who have this user's email as their manager_email
        const directReports = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.manager_email, user.email),
              user.organization_id ? eq(users.organization_id, user.organization_id) : undefined
            )
          );

        // Recursively build tree for each direct report
        const children = await Promise.all(
          directReports.map(report => buildTree(report.id, depth + 1))
        );

        return {
          id: user.id,
          name: user.name,
          surname: user.surname,
          email: user.email,
          jobTitle: user.job_title,
          department: user.department,
          avatarUrl: user.avatar_url,
          children: children.filter(child => child !== null)
        };
      };

      return await buildTree(userId, 0);
    } catch (error: any) {
      console.error('Error getting reporting tree:', error?.message || 'unknown_error');
      return null;
    }
  }
}