// Recognition System Adapter
// Provides standardized interface for recognition and rewards operations

import { z } from 'zod';
import { BaseAdapter, AdapterResult, AdapterContext, PaginatedResult, PaginationOptions, AdapterValidator, commonSchemas } from './base-adapter';
import { db } from '../../server/db';
import { recognitions, recognitionSettings, managerBudgets, users } from '@shared/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';

// Recognition-specific schemas
const recognitionSchema = z.object({
  id: commonSchemas.id,
  giver_id: commonSchemas.userId,
  recipient_id: commonSchemas.userId,
  badge_type: z.string().min(1).max(50),
  message: z.string().min(1).max(1000),
  points: z.number().int().min(1),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  organization_id: commonSchemas.organizationId,
  created_at: z.date(),
  updated_at: z.date(),
});

const createRecognitionSchema = recognitionSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

const recognitionSettingsSchema = z.object({
  id: commonSchemas.id,
  organization_id: commonSchemas.organizationId,
  cost_per_point: z.number().min(0).default(0.1),
  peer_enabled: z.boolean().default(true),
  peer_requires_approval: z.boolean().default(false),
  peer_points_per_recognition: z.number().int().min(1).default(10),
  peer_max_recognitions_per_month: z.number().int().min(1).default(5),
  manager_enabled: z.boolean().default(true),
  manager_requires_approval: z.boolean().default(false),
  created_at: z.date(),
  updated_at: z.date(),
});

const updateRecognitionSettingsSchema = recognitionSettingsSchema.omit({
  id: true,
  organization_id: true,
  created_at: true,
  updated_at: true,
}).partial();

// Recognition data types
export type Recognition = z.infer<typeof recognitionSchema>;
export type CreateRecognitionData = z.infer<typeof createRecognitionSchema>;
export type RecognitionSettings = z.infer<typeof recognitionSettingsSchema>;
export type UpdateRecognitionSettingsData = z.infer<typeof updateRecognitionSettingsSchema>;

export class RecognitionAdapter extends BaseAdapter {
  constructor() {
    super({
      adapterName: 'recognition-adapter',
      version: '1.0.0',
      featureFlag: 'recognition_adapter_enabled',
      cacheEnabled: true,
      cacheTtl: 180, // 3 minutes
      fallbackEnabled: true,
    });
  }

  /**
   * Get organization's recognition settings
   */
  async getRecognitionSettings(
    context: AdapterContext
  ): Promise<AdapterResult<RecognitionSettings>> {
    return this.executeOperation('getRecognitionSettings', async () => {
      if (!context.organizationId) {
        throw new Error('Organization ID is required');
      }

      let settings = await db.query.recognitionSettings.findFirst({
        where: eq(recognitionSettings.organization_id, context.organizationId),
      });

      // Create default settings if none exist
      if (!settings) {
        const defaultSettings = {
          organization_id: context.organizationId,
          cost_per_point: 0.1,
          peer_enabled: true,
          peer_requires_approval: false,
          peer_points_per_recognition: 10,
          peer_max_recognitions_per_month: 5,
          manager_enabled: true,
          manager_requires_approval: false,
          created_by: context.userId || null,
        };

        const [newSettings] = await db
          .insert(recognitionSettings)
          .values(defaultSettings)
          .returning();

        settings = newSettings;
      }

      return AdapterValidator.validate(recognitionSettingsSchema, settings);
    }, context);
  }

  /**
   * Update organization's recognition settings
   */
  async updateRecognitionSettings(
    updateData: UpdateRecognitionSettingsData,
    context: AdapterContext
  ): Promise<AdapterResult<RecognitionSettings>> {
    return this.executeOperation('updateRecognitionSettings', async () => {
      if (!context.organizationId) {
        throw new Error('Organization ID is required');
      }

      const validatedData = AdapterValidator.validate(updateRecognitionSettingsSchema, updateData);

      // Check if settings exist
      const existingSettings = await db.query.recognitionSettings.findFirst({
        where: eq(recognitionSettings.organization_id, context.organizationId),
      });

      let updatedSettings;
      
      if (!existingSettings) {
        // Create new settings
        const [newSettings] = await db
          .insert(recognitionSettings)
          .values({
            ...validatedData,
            organization_id: context.organizationId,
            created_by: context.userId || null,
          })
          .returning();

        updatedSettings = newSettings;
      } else {
        // Update existing settings
        const [updated] = await db
          .update(recognitionSettings)
          .set({
            ...validatedData,
            updated_at: new Date(),
            updated_by: context.userId || null,
          })
          .where(eq(recognitionSettings.id, existingSettings.id))
          .returning();

        updatedSettings = updated;
      }

      return AdapterValidator.validate(recognitionSettingsSchema, updatedSettings);
    }, context);
  }

  /**
   * Create a peer-to-peer recognition
   */
  async createPeerRecognition(
    recognitionData: CreateRecognitionData,
    context: AdapterContext
  ): Promise<AdapterResult<Recognition>> {
    return this.executeOperation('createPeerRecognition', async () => {
      const validatedData = AdapterValidator.validate(createRecognitionSchema, recognitionData);

      if (!context.organizationId) {
        throw new Error('Organization ID is required');
      }

      // Validate recipient exists and belongs to same organization
      const recipient = await db.query.users.findFirst({
        where: and(
          eq(users.id, validatedData.recipient_id),
          eq(users.organization_id, context.organizationId)
        ),
      });

      if (!recipient) {
        throw new Error('Recipient not found in organization');
      }

      // Don't allow self-recognition
      if (validatedData.giver_id === validatedData.recipient_id) {
        throw new Error('Cannot recognize yourself');
      }

      // Check organization settings
      const settings = await this.getRecognitionSettings(context);
      if (!settings.success || !settings.data?.peer_enabled) {
        throw new Error('Peer-to-peer recognition is not enabled');
      }

      // Create recognition
      const [newRecognition] = await db
        .insert(recognitions)
        .values({
          ...validatedData,
          organization_id: context.organizationId,
          status: settings.data.peer_requires_approval ? 'pending' : 'approved',
        })
        .returning();

      return AdapterValidator.validate(recognitionSchema, newRecognition);
    }, context);
  }

  /**
   * Get recognitions received by a user
   */
  async getRecognitionsReceived(
    userId: number,
    pagination: PaginationOptions,
    context: AdapterContext
  ): Promise<PaginatedResult<Recognition>> {
    return this.executeOperation('getRecognitionsReceived', async () => {
      const validatedPagination = AdapterValidator.validate(
        commonSchemas.pagination,
        pagination
      );

      const whereConditions = [
        eq(recognitions.recipient_id, userId),
      ];

      if (context.organizationId) {
        whereConditions.push(eq(recognitions.organization_id, context.organizationId));
      }

      const offset = (validatedPagination.page - 1) * validatedPagination.limit;
      
      const [recognitionsList, totalCountResult] = await Promise.all([
        db.query.recognitions.findMany({
          where: and(...whereConditions),
          limit: validatedPagination.limit,
          offset,
          orderBy: desc(recognitions.created_at),
          with: {
            giver: {
              columns: {
                id: true,
                name: true,
                surname: true,
                avatar_url: true,
                job_title: true,
              },
            },
            recipient: {
              columns: {
                id: true,
                name: true,
                surname: true,
                avatar_url: true,
                job_title: true,
              },
            },
          },
        }),
        db.select({ count: sql<number>`count(*)` })
          .from(recognitions)
          .where(and(...whereConditions))
      ]);

      const totalCount = totalCountResult[0].count;
      const totalPages = Math.ceil(totalCount / validatedPagination.limit);

      return {
        data: recognitionsList.map(rec => AdapterValidator.validate(recognitionSchema, rec)),
        pagination: {
          currentPage: validatedPagination.page,
          totalPages,
          totalCount,
          limit: validatedPagination.limit,
          hasNext: validatedPagination.page < totalPages,
          hasPrev: validatedPagination.page > 1,
        },
      };
    }, context) as Promise<PaginatedResult<Recognition>>;
  }

  /**
   * Get recognitions given by a user
   */
  async getRecognitionsGiven(
    userId: number,
    pagination: PaginationOptions,
    context: AdapterContext
  ): Promise<PaginatedResult<Recognition>> {
    return this.executeOperation('getRecognitionsGiven', async () => {
      const validatedPagination = AdapterValidator.validate(
        commonSchemas.pagination,
        pagination
      );

      const whereConditions = [
        eq(recognitions.giver_id, userId),
      ];

      if (context.organizationId) {
        whereConditions.push(eq(recognitions.organization_id, context.organizationId));
      }

      const offset = (validatedPagination.page - 1) * validatedPagination.limit;
      
      const [recognitionsList, totalCountResult] = await Promise.all([
        db.query.recognitions.findMany({
          where: and(...whereConditions),
          limit: validatedPagination.limit,
          offset,
          orderBy: desc(recognitions.created_at),
          with: {
            giver: {
              columns: {
                id: true,
                name: true,
                surname: true,
                avatar_url: true,
                job_title: true,
              },
            },
            recipient: {
              columns: {
                id: true,
                name: true,
                surname: true,
                avatar_url: true,
                job_title: true,
              },
            },
          },
        }),
        db.select({ count: sql<number>`count(*)` })
          .from(recognitions)
          .where(and(...whereConditions))
      ]);

      const totalCount = totalCountResult[0].count;
      const totalPages = Math.ceil(totalCount / validatedPagination.limit);

      return {
        data: recognitionsList.map(rec => AdapterValidator.validate(recognitionSchema, rec)),
        pagination: {
          currentPage: validatedPagination.page,
          totalPages,
          totalCount,
          limit: validatedPagination.limit,
          hasNext: validatedPagination.page < totalPages,
          hasPrev: validatedPagination.page > 1,
        },
      };
    }, context) as Promise<PaginatedResult<Recognition>>;
  }

  /**
   * Get recognition statistics for dashboard
   */
  async getRecognitionStats(
    context: AdapterContext,
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<AdapterResult<{
    totalGiven: number;
    totalReceived: number;
    topGivers: Array<{ userId: number; name: string; count: number }>;
    topRecipients: Array<{ userId: number; name: string; count: number }>;
    badgeBreakdown: Record<string, number>;
    pointsDistributed: number;
  }>> {
    return this.executeOperation('getRecognitionStats', async () => {
      if (!context.organizationId) {
        throw new Error('Organization ID is required');
      }

      // Calculate date range based on period
      const now = new Date();
      const periodStart = new Date();
      switch (period) {
        case 'week':
          periodStart.setDate(now.getDate() - 7);
          break;
        case 'month':
          periodStart.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          periodStart.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          periodStart.setFullYear(now.getFullYear() - 1);
          break;
      }

      const whereCondition = and(
        eq(recognitions.organization_id, context.organizationId),
        sql`${recognitions.created_at} >= ${periodStart}`,
        eq(recognitions.status, 'approved')
      );

      const [
        totalStats,
        topGivers,
        topRecipients,
        badgeStats,
        pointsStats,
      ] = await Promise.all([
        // Total counts
        db.select({
          totalGiven: sql<number>`count(distinct ${recognitions.giver_id})`,
          totalReceived: sql<number>`count(distinct ${recognitions.recipient_id})`,
        }).from(recognitions).where(whereCondition),

        // Top givers
        db.select({
          userId: recognitions.giver_id,
          count: sql<number>`count(*)`,
        })
          .from(recognitions)
          .where(whereCondition)
          .groupBy(recognitions.giver_id)
          .orderBy(sql`count(*) desc`)
          .limit(5),

        // Top recipients
        db.select({
          userId: recognitions.recipient_id,
          count: sql<number>`count(*)`,
        })
          .from(recognitions)
          .where(whereCondition)
          .groupBy(recognitions.recipient_id)
          .orderBy(sql`count(*) desc`)
          .limit(5),

        // Badge breakdown
        db.select({
          badge_type: recognitions.badge_type,
          count: sql<number>`count(*)`,
        })
          .from(recognitions)
          .where(whereCondition)
          .groupBy(recognitions.badge_type),

        // Points distributed
        db.select({
          total_points: sql<number>`sum(${recognitions.points})`,
        })
          .from(recognitions)
          .where(whereCondition)
      ]);

      // Get user names for top givers/recipients
      const allUserIds = [
        ...topGivers.map(g => g.userId),
        ...topRecipients.map(r => r.userId),
      ];

      const usersData = await db.query.users.findMany({
        where: inArray(users.id, allUserIds),
        columns: {
          id: true,
          name: true,
          surname: true,
        },
      });

      const userNameMap = new Map(
        usersData.map(u => [u.id, `${u.name} ${u.surname || ''}`.trim()])
      );

      // Process results
      const badgeBreakdown: Record<string, number> = {};
      badgeStats.forEach(stat => {
        badgeBreakdown[stat.badge_type] = stat.count;
      });

      return {
        totalGiven: totalStats[0].totalGiven,
        totalReceived: totalStats[0].totalReceived,
        topGivers: topGivers.map(g => ({
          userId: g.userId,
          name: userNameMap.get(g.userId) || 'Unknown User',
          count: g.count,
        })),
        topRecipients: topRecipients.map(r => ({
          userId: r.userId,
          name: userNameMap.get(r.userId) || 'Unknown User',
          count: r.count,
        })),
        badgeBreakdown,
        pointsDistributed: pointsStats[0].total_points || 0,
      };
    }, context);
  }
}

// Export singleton instance
export const recognitionAdapter = new RecognitionAdapter();