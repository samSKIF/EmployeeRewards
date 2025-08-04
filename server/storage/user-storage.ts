// User storage module for ThrivioHR platform
// Gold standard compliance: Enterprise-grade error handling and type safety

import { db } from '../db';
import { users, accounts, type User, type InsertUser, type Account } from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';
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
}