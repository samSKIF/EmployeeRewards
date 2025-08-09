// Recognition Repository - Infrastructure Layer
// Handles all data access operations for recognition system

import { db } from '../../../db';
import {
  recognitions,
  recognitionSettings,
  managerBudgets,
  transactions,
  users,
  type Recognition,
  type RecognitionSetting,
  type ManagerBudget,
  type Transaction,
  type User,
  type InsertRecognition,
  type InsertTransaction,
  type InsertManagerBudget,
} from '@shared/schema';
import { eq, and, desc, asc, count, gte, lte, ilike, sql, inArray } from 'drizzle-orm';
import type { RecognitionFilters } from '../domain/recognition.domain';
import { logger } from '@platform/sdk';

/**
 * Recognition Repository
 * Implements data access patterns for recognition system
 */
export class RecognitionRepository {
  /**
   * Create a new recognition
   */
  async createRecognition(data: InsertRecognition): Promise<Recognition> {
    try {
      const [recognition] = await db
        .insert(recognitions)
        .values(data)
        .returning();

      return recognition;
    } catch (error: any) {
      logger.error('❌ Error creating recognition in database', {
        error: error?.message || 'unknown_error',
        data,
      });
      throw new Error(`Failed to create recognition: ${error?.message || 'database_error'}`);
    }
  }

  /**
   * Update recognition by ID
   */
  async updateRecognition(id: number, data: Partial<Recognition>): Promise<Recognition | null> {
    try {
      const [updatedRecognition] = await db
        .update(recognitions)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(recognitions.id, id))
        .returning();

      return updatedRecognition || null;
    } catch (error: any) {
      logger.error('❌ Error updating recognition in database', {
        error: error?.message || 'unknown_error',
        recognitionId: id,
        data,
      });
      throw new Error(`Failed to update recognition: ${error?.message || 'database_error'}`);
    }
  }

  /**
   * Get recognition by ID with full details
   */
  async getRecognitionById(id: number): Promise<(Recognition & { 
    recognizer: User | null; 
    recipient: User | null;
    transaction: PointsTransaction | null;
  }) | null> {
    try {
      const result = await db
        .select({
          recognition: recognitions,
          recognizer: users,
          recipient: users,
          transaction: pointsTransactions,
        })
        .from(recognitions)
        .leftJoin(users, eq(recognitions.recognizerId, users.id))
        .leftJoin(users, eq(recognitions.recipientId, users.id))
        .leftJoin(pointsTransactions, eq(recognitions.transactionId, pointsTransactions.id))
        .where(eq(recognitions.id, id))
        .limit(1);

      if (!result[0]) return null;

      return {
        ...result[0].recognition,
        recognizer: result[0].recognizer,
        recipient: result[0].recipient,
        transaction: result[0].transaction,
      };
    } catch (error: any) {
      logger.error('❌ Error getting recognition by ID', {
        error: error?.message || 'unknown_error',
        recognitionId: id,
      });
      return null;
    }
  }

  /**
   * Get recognitions with filters and pagination
   */
  async getRecognitionsWithFilters(
    organizationId: number,
    filters: RecognitionFilters
  ): Promise<{ 
    recognitions: (Recognition & { recognizer: User | null; recipient: User | null })[];
    total: number;
  }> {
    try {
      const conditions = [];

      // Base condition: users belong to the organization
      conditions.push(eq(users.organization_id, organizationId));

      // Apply filters
      if (filters.status) {
        conditions.push(eq(recognitions.status, filters.status));
      }

      if (filters.badgeType) {
        conditions.push(eq(recognitions.badgeType, filters.badgeType));
      }

      if (filters.recipientId) {
        conditions.push(eq(recognitions.recipientId, filters.recipientId));
      }

      if (filters.recognizerId) {
        conditions.push(eq(recognitions.recognizerId, filters.recognizerId));
      }

      if (filters.dateFrom) {
        conditions.push(gte(recognitions.createdAt, new Date(filters.dateFrom)));
      }

      if (filters.dateTo) {
        conditions.push(lte(recognitions.createdAt, new Date(filters.dateTo)));
      }

      if (filters.search) {
        conditions.push(
          sql`(${recognitions.message} ILIKE ${'%' + filters.search + '%'} OR 
              ${recognitions.badgeType} ILIKE ${'%' + filters.search + '%'})`
        );
      }

      if (filters.departmentFilter) {
        conditions.push(
          sql`(${users.department} = ${filters.departmentFilter})`
        );
      }

      const whereCondition = conditions.length > 0 
        ? (conditions.length === 1 ? conditions[0] : and(...conditions))
        : undefined;

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(recognitions)
        .leftJoin(users, eq(recognitions.recipientId, users.id))
        .where(whereCondition);

      const total = totalResult[0]?.count || 0;

      // Get filtered recognitions
      const results = await db
        .select({
          recognition: recognitions,
          recognizer: users,
          recipient: users,
        })
        .from(recognitions)
        .leftJoin(users, eq(recognitions.recognizerId, users.id))
        .leftJoin(users, eq(recognitions.recipientId, users.id))
        .where(whereCondition)
        .orderBy(desc(recognitions.createdAt))
        .limit(filters.limit)
        .offset(filters.offset);

      const recognitionsWithDetails = results.map(result => ({
        ...result.recognition,
        recognizer: result.recognizer,
        recipient: result.recipient,
      }));

      return { recognitions: recognitionsWithDetails, total };
    } catch (error: any) {
      logger.error('❌ Error getting recognitions with filters', {
        error: error?.message || 'unknown_error',
        organizationId,
        filters,
      });
      return { recognitions: [], total: 0 };
    }
  }

  /**
   * Get recognition statistics for organization
   */
  async getRecognitionStats(organizationId: number): Promise<{
    totalRecognitions: number;
    pendingRecognitions: number;
    approvedRecognitions: number;
    rejectedRecognitions: number;
    totalPointsAwarded: number;
  }> {
    try {
      const stats = await db
        .select({
          total: count(recognitions.id),
          totalPoints: sql<number>`COALESCE(SUM(${recognitions.points}), 0)`,
          pending: sql<number>`COUNT(CASE WHEN ${recognitions.status} = 'pending' THEN 1 END)`,
          approved: sql<number>`COUNT(CASE WHEN ${recognitions.status} = 'approved' THEN 1 END)`,
          rejected: sql<number>`COUNT(CASE WHEN ${recognitions.status} = 'rejected' THEN 1 END)`,
        })
        .from(recognitions)
        .leftJoin(users, eq(recognitions.recipientId, users.id))
        .where(eq(users.organization_id, organizationId));

      const result = stats[0] || {
        total: 0,
        totalPoints: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      };

      return {
        totalRecognitions: result.total,
        pendingRecognitions: result.pending,
        approvedRecognitions: result.approved,
        rejectedRecognitions: result.rejected,
        totalPointsAwarded: result.totalPoints,
      };
    } catch (error: any) {
      logger.error('❌ Error getting recognition statistics', {
        error: error?.message || 'unknown_error',
        organizationId,
      });
      return {
        totalRecognitions: 0,
        pendingRecognitions: 0,
        approvedRecognitions: 0,
        rejectedRecognitions: 0,
        totalPointsAwarded: 0,
      };
    }
  }

  /**
   * Get recognition settings for organization
   */
  async getRecognitionSettings(organizationId: number): Promise<RecognitionSetting | null> {
    try {
      const settings = await db.query.recognitionSettings.findFirst({
        where: eq(recognitionSettings.organization_id, organizationId),
      });

      return settings || null;
    } catch (error: any) {
      logger.error('❌ Error getting recognition settings', {
        error: error?.message || 'unknown_error',
        organizationId,
      });
      return null;
    }
  }

  /**
   * Create or update recognition settings
   */
  async upsertRecognitionSettings(
    organizationId: number,
    data: Partial<RecognitionSetting>,
    userId: number
  ): Promise<RecognitionSetting> {
    try {
      const existing = await this.getRecognitionSettings(organizationId);

      if (existing) {
        const [updated] = await db
          .update(recognitionSettings)
          .set({
            ...data,
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(eq(recognitionSettings.id, existing.id))
          .returning();

        return updated;
      } else {
        const [created] = await db
          .insert(recognitionSettings)
          .values({
            ...data,
            organization_id: organizationId,
            createdBy: userId,
            updatedBy: userId,
          } as any)
          .returning();

        return created;
      }
    } catch (error: any) {
      logger.error('❌ Error upserting recognition settings', {
        error: error?.message || 'unknown_error',
        organizationId,
        data,
      });
      throw new Error(`Failed to update recognition settings: ${error?.message || 'database_error'}`);
    }
  }

  /**
   * Create points transaction
   */
  async createPointsTransaction(data: InsertPointsTransaction): Promise<PointsTransaction> {
    try {
      const [transaction] = await db
        .insert(pointsTransactions)
        .values(data)
        .returning();

      return transaction;
    } catch (error: any) {
      logger.error('❌ Error creating points transaction', {
        error: error?.message || 'unknown_error',
        data,
      });
      throw new Error(`Failed to create points transaction: ${error?.message || 'database_error'}`);
    }
  }

  /**
   * Get user's points balance
   */
  async getUserBalance(userId: number): Promise<number> {
    try {
      const result = await db
        .select({
          balance: sql<number>`COALESCE(SUM(
            CASE 
              WHEN ${pointsTransactions.type} = 'earned' THEN ${pointsTransactions.amount}
              WHEN ${pointsTransactions.type} = 'redeemed' THEN -${pointsTransactions.amount}
              ELSE 0
            END
          ), 0)`,
        })
        .from(pointsTransactions)
        .where(eq(pointsTransactions.userId, userId));

      return result[0]?.balance || 0;
    } catch (error: any) {
      logger.error('❌ Error getting user balance', {
        error: error?.message || 'unknown_error',
        userId,
      });
      return 0;
    }
  }

  /**
   * Update user's points in the users table
   */
  async updateUserPoints(userId: number, newBalance: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ points: newBalance })
        .where(eq(users.id, userId));

      return true;
    } catch (error: any) {
      logger.error('❌ Error updating user points', {
        error: error?.message || 'unknown_error',
        userId,
        newBalance,
      });
      return false;
    }
  }

  /**
   * Get manager budget
   */
  async getManagerBudget(managerId: number, month: number, year: number): Promise<ManagerBudget | null> {
    try {
      const budget = await db.query.managerBudgets.findFirst({
        where: and(
          eq(managerBudgets.manager_id, managerId),
          eq(managerBudgets.month, month),
          eq(managerBudgets.year, year)
        ),
      });

      return budget || null;
    } catch (error: any) {
      logger.error('❌ Error getting manager budget', {
        error: error?.message || 'unknown_error',
        managerId,
        month,
        year,
      });
      return null;
    }
  }

  /**
   * Get all manager budgets for organization
   */
  async getManagerBudgets(organizationId: number, month?: number, year?: number): Promise<ManagerBudget[]> {
    try {
      const conditions = [eq(managerBudgets.organization_id, organizationId)];

      if (month) conditions.push(eq(managerBudgets.month, month));
      if (year) conditions.push(eq(managerBudgets.year, year));

      const budgets = await db.query.managerBudgets.findMany({
        where: and(...conditions),
        with: {
          manager: {
            columns: {
              id: true,
              name: true,
              surname: true,
              email: true,
              jobTitle: true,
              department: true,
            },
          },
        },
        orderBy: [desc(managerBudgets.year), desc(managerBudgets.month)],
      });

      return budgets;
    } catch (error: any) {
      logger.error('❌ Error getting manager budgets', {
        error: error?.message || 'unknown_error',
        organizationId,
        month,
        year,
      });
      return [];
    }
  }

  /**
   * Create or update manager budget
   */
  async upsertManagerBudget(data: InsertManagerBudget): Promise<ManagerBudget> {
    try {
      const existing = await this.getManagerBudget(data.manager_id, data.month, data.year);

      if (existing) {
        const [updated] = await db
          .update(managerBudgets)
          .set({
            totalPoints: data.totalPoints,
            remainingPoints: data.totalPoints - (existing.totalPoints - existing.remainingPoints),
            updatedAt: new Date(),
          })
          .where(eq(managerBudgets.id, existing.id))
          .returning();

        return updated;
      } else {
        const [created] = await db
          .insert(managerBudgets)
          .values({
            ...data,
            remainingPoints: data.totalPoints,
          })
          .returning();

        return created;
      }
    } catch (error: any) {
      logger.error('❌ Error upserting manager budget', {
        error: error?.message || 'unknown_error',
        data,
      });
      throw new Error(`Failed to update manager budget: ${error?.message || 'database_error'}`);
    }
  }

  /**
   * Get user's recognition history (sent and received)
   */
  async getUserRecognitionHistory(userId: number): Promise<{
    sent: Recognition[];
    received: Recognition[];
  }> {
    try {
      const [sent, received] = await Promise.all([
        db.query.recognitions.findMany({
          where: eq(recognitions.recognizerId, userId),
          with: {
            recipient: {
              columns: { id: true, name: true, surname: true, department: true },
            },
          },
          orderBy: desc(recognitions.createdAt),
        }),
        db.query.recognitions.findMany({
          where: eq(recognitions.recipientId, userId),
          with: {
            recognizer: {
              columns: { id: true, name: true, surname: true, department: true },
            },
          },
          orderBy: desc(recognitions.createdAt),
        }),
      ]);

      return { sent, received };
    } catch (error: any) {
      logger.error('❌ Error getting user recognition history', {
        error: error?.message || 'unknown_error',
        userId,
      });
      return { sent: [], received: [] };
    }
  }

  /**
   * Get top recognizers for organization
   */
  async getTopRecognizers(organizationId: number, limit: number = 10): Promise<Array<{
    user: User;
    recognitionCount: number;
  }>> {
    try {
      const topRecognizers = await db
        .select({
          user: users,
          recognitionCount: count(recognitions.id),
        })
        .from(users)
        .leftJoin(recognitions, eq(users.id, recognitions.recognizerId))
        .where(eq(users.organization_id, organizationId))
        .groupBy(users.id)
        .having(sql`COUNT(${recognitions.id}) > 0`)
        .orderBy(desc(count(recognitions.id)))
        .limit(limit);

      return topRecognizers.map(result => ({
        user: result.user,
        recognitionCount: result.recognitionCount,
      }));
    } catch (error: any) {
      logger.error('❌ Error getting top recognizers', {
        error: error?.message || 'unknown_error',
        organizationId,
        limit,
      });
      return [];
    }
  }

  /**
   * Get most recognized users for organization
   */
  async getTopRecipients(organizationId: number, limit: number = 10): Promise<Array<{
    user: User;
    recognitionCount: number;
  }>> {
    try {
      const topRecipients = await db
        .select({
          user: users,
          recognitionCount: count(recognitions.id),
        })
        .from(users)
        .leftJoin(recognitions, eq(users.id, recognitions.recipientId))
        .where(eq(users.organization_id, organizationId))
        .groupBy(users.id)
        .having(sql`COUNT(${recognitions.id}) > 0`)
        .orderBy(desc(count(recognitions.id)))
        .limit(limit);

      return topRecipients.map(result => ({
        user: result.user,
        recognitionCount: result.recognitionCount,
      }));
    } catch (error: any) {
      logger.error('❌ Error getting top recipients', {
        error: error?.message || 'unknown_error',
        organizationId,
        limit,
      });
      return [];
    }
  }
}