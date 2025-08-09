// Points and transaction storage module for ThrivioHR platform
// Gold standard compliance: Enterprise-grade error handling and type safety

import { db } from '../db';
import {
  accounts,
  transactions,
  users,
  type Account,
  type Transaction,
} from '@shared/schema';
import { eq, desc, and, or, count, sum } from 'drizzle-orm';
import type { TransactionWithDetails, DashboardStats } from '@platform/sdk/types';
import type { IPointsStorage } from './interfaces';

export class PointsStorage implements IPointsStorage {
  async getAccountByUserId(userId: number): Promise<Account | undefined> {
    try {
      const [account] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.user_id, userId), eq(accounts.account_type, 'user')));
      return account;
    } catch (error: any) {
      console.error('Error getting account by user ID:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async getSystemAccount(): Promise<Account> {
    try {
      let [systemAccount] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.account_type, 'system'));

      if (!systemAccount) {
        // Create system account if it doesn't exist
        [systemAccount] = await db
          .insert(accounts)
          .values({
            user_id: null,
            account_type: 'system',
            balance: 1000000, // Large initial balance for system account
          })
          .returning();
      }

      return systemAccount;
    } catch (error: any) {
      console.error('Error getting system account:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getUserBalance(userId: number): Promise<number> {
    try {
      const account = await this.getAccountByUserId(userId);
      return account?.balance || 0;
    } catch (error: any) {
      console.error('Error getting user balance:', error?.message || 'unknown_error');
      return 0;
    }
  }

  async earnPoints(
    userId: number,
    amount: number,
    reason: string,
    description: string,
    adminId?: number
  ): Promise<Transaction> {
    try {
      const userAccount = await this.getAccountByUserId(userId);
      const systemAccount = await this.getSystemAccount();

      if (!userAccount) {
        throw new Error('User account not found');
      }

      // Create transaction record
      const [transaction] = await db
        .insert(transactions)
        .values({
          from_account_id: systemAccount.id,
          to_account_id: userAccount.id,
          amount,
          description,
          reason,
          created_by: adminId || null,
        })
        .returning();

      // Update user account balance
      await db
        .update(accounts)
        .set({ balance: userAccount.balance + amount })
        .where(eq(accounts.id, userAccount.id));

      return transaction;
    } catch (error: any) {
      console.error('Error earning points:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async redeemPoints(
    userId: number,
    amount: number,
    reason: string,
    description: string,
    adminId?: number
  ): Promise<Transaction> {
    try {
      const userAccount = await this.getAccountByUserId(userId);
      const systemAccount = await this.getSystemAccount();

      if (!userAccount) {
        throw new Error('User account not found');
      }

      if (userAccount.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Create transaction record
      const [transaction] = await db
        .insert(transactions)
        .values({
          from_account_id: userAccount.id,
          to_account_id: systemAccount.id,
          amount,
          description,
          reason,
          created_by: adminId || null,
        })
        .returning();

      // Update user account balance
      await db
        .update(accounts)
        .set({ balance: userAccount.balance - amount })
        .where(eq(accounts.id, userAccount.id));

      return transaction;
    } catch (error: any) {
      console.error('Error redeeming points:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async transferPoints(
    fromUserId: number,
    toUserId: number,
    amount: number,
    reason: string,
    description: string,
    adminId?: number
  ): Promise<Transaction> {
    try {
      const fromAccount = await this.getAccountByUserId(fromUserId);
      const toAccount = await this.getAccountByUserId(toUserId);

      if (!fromAccount || !toAccount) {
        throw new Error('User account(s) not found');
      }

      if (fromAccount.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Create transaction record
      const [transaction] = await db
        .insert(transactions)
        .values({
          from_account_id: fromAccount.id,
          to_account_id: toAccount.id,
          amount,
          description,
          reason,
          created_by: adminId || null,
        })
        .returning();

      // Update account balances
      await db
        .update(accounts)
        .set({ balance: fromAccount.balance - amount })
        .where(eq(accounts.id, fromAccount.id));

      await db
        .update(accounts)
        .set({ balance: toAccount.balance + amount })
        .where(eq(accounts.id, toAccount.id));

      return transaction;
    } catch (error: any) {
      console.error('Error transferring points:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getUserTransactions(userId: number): Promise<TransactionWithDetails[]> {
    try {
      const userAccount = await this.getAccountByUserId(userId);
      if (!userAccount) return [];

      const rawTransactions = await db
        .select({
          transaction: transactions,
          fromAccount: accounts,
          toAccount: accounts,
          fromUser: users,
          toUser: users,
          creator: users,
        })
        .from(transactions)
        .leftJoin(
          accounts,
          or(
            eq(transactions.from_account_id, accounts.id),
            eq(transactions.to_account_id, accounts.id)
          )
        )
        .leftJoin(users, eq(accounts.user_id, users.id))
        .leftJoin(users, eq(transactions.created_by, users.id))
        .where(
          or(
            eq(transactions.from_account_id, userAccount.id),
            eq(transactions.to_account_id, userAccount.id)
          )
        )
        .orderBy(desc(transactions.created_at));

      return this.transformTransactionData(rawTransactions);
    } catch (error: any) {
      console.error('Error getting user transactions:', error?.message || 'unknown_error');
      return [];
    }
  }

  async getAllTransactions(): Promise<TransactionWithDetails[]> {
    try {
      const rawTransactions = await db
        .select({
          transaction: transactions,
          fromAccount: accounts,
          toAccount: accounts,
          fromUser: users,
          toUser: users,
          creator: users,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.from_account_id, accounts.id))
        .leftJoin(accounts, eq(transactions.to_account_id, accounts.id))
        .leftJoin(users, eq(accounts.user_id, users.id))
        .leftJoin(users, eq(accounts.user_id, users.id))
        .leftJoin(users, eq(transactions.created_by, users.id))
        .orderBy(desc(transactions.created_at));

      return this.transformTransactionData(rawTransactions);
    } catch (error: any) {
      console.error('Error getting all transactions:', error?.message || 'unknown_error');
      return [];
    }
  }

  async getTransactionById(id: number): Promise<TransactionWithDetails | undefined> {
    try {
      const [transactionData] = await db
        .select({
          transaction: transactions,
          fromAccount: accounts,
          toAccount: accounts,
          fromUser: users,
          toUser: users,
          creator: users,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.from_account_id, accounts.id))
        .leftJoin(accounts, eq(transactions.to_account_id, accounts.id))
        .leftJoin(users, eq(accounts.user_id, users.id))
        .leftJoin(users, eq(accounts.user_id, users.id))
        .leftJoin(users, eq(transactions.created_by, users.id))
        .where(eq(transactions.id, id));

      if (!transactionData) return undefined;

      const transformed = this.transformTransactionData([transactionData]);
      return transformed[0];
    } catch (error: any) {
      console.error('Error getting transaction by ID:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async getTransactionStats(): Promise<DashboardStats> {
    try {
      const [stats] = await db
        .select({
          totalTransactions: count(transactions.id),
          totalPoints: sum(transactions.amount),
        })
        .from(transactions);

      const [userCount] = await db.select({ count: count(users.id) }).from(users);

      return {
        totalUsers: Number(userCount.count),
        totalTransactions: Number(stats.totalTransactions),
        totalPoints: Number(stats.totalPoints) || 0,
        avgPointsPerUser: userCount.count > 0 
          ? Math.round((Number(stats.totalPoints) || 0) / Number(userCount.count))
          : 0,
      };
    } catch (error: any) {
      console.error('Error getting transaction stats:', error?.message || 'unknown_error');
      return {
        totalUsers: 0,
        totalTransactions: 0,
        totalPoints: 0,
        avgPointsPerUser: 0,
      };
    }
  }

  private transformTransactionData(rawTransactions: any[]): TransactionWithDetails[] {
    return rawTransactions.map((row) => {
      const isUserTransaction = row.toAccount?.account_type === 'user';
      const userName = isUserTransaction
        ? row.toUser?.name || 'Unknown'
        : row.fromUser?.name || 'Unknown';

      return {
        id: row.transaction.id,
        fromAccountId: row.transaction.from_account_id,
        toAccountId: row.transaction.to_account_id,
        amount: row.transaction.amount,
        description: row.transaction.description,
        reason: row.transaction.reason,
        createdAt: row.transaction.created_at,
        type: 'transfer',
        status: 'completed',
        createdBy: row.transaction.created_by,
        fromAccount: row.fromAccount ? {
          id: row.fromAccount.id,
          userId: row.fromAccount.user_id,
          accountType: row.fromAccount.account_type,
          balance: row.fromAccount.balance,
          createdAt: row.fromAccount.created_at,
        } : null,
        toAccount: row.toAccount ? {
          id: row.toAccount.id,
          userId: row.toAccount.user_id,
          accountType: row.toAccount.account_type,
          balance: row.toAccount.balance,
          createdAt: row.toAccount.created_at,
        } : null,
        user: null,
        product: null,
        transaction: row.transaction,
        userName,
        creatorName: row.creator?.name,
        accountType: row.toAccount?.account_type || row.fromAccount?.account_type || 'unknown',
        isDebit: row.fromAccount?.account_type === 'user',
      } as TransactionWithDetails;
    });
  }
}