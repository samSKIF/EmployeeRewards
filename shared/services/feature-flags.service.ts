// Feature Flags Service for Gradual Decoupling
// Provides centralized feature flag evaluation with organization and user context

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../server/db';
import {
  feature_flags,
  organization_feature_flags,
  user_feature_flag_overrides,
  feature_flag_evaluations,
  FeatureFlag,
  OrganizationFeatureFlag,
  UserFeatureFlagOverride,
  InsertFeatureFlagEvaluation,
} from '../schema';

export interface FeatureFlagContext {
  userId?: number;
  organizationId?: number;
  environment?: string;
  requestContext?: {
    ip?: string;
    userAgent?: string;
    route?: string;
    [key: string]: any;
  };
}

export interface FeatureFlagEvaluationResult {
  value: boolean | string | number;
  reason: 'default' | 'rollout' | 'override' | 'disabled';
  metadata?: {
    rolloutPercentage?: number;
    strategy?: string;
    overrideReason?: string;
  };
}

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flagCache: Map<string, FeatureFlag> = new Map();
  private cacheExpiryTime = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  public static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  /**
   * Evaluate a feature flag for given context
   */
  async evaluateFlag(
    flagKey: string,
    context: FeatureFlagContext
  ): Promise<FeatureFlagEvaluationResult> {
    try {
      // Get flag definition
      const flag = await this.getFlag(flagKey);
      if (!flag) {
        return {
          value: false,
          reason: 'disabled',
          metadata: { overrideReason: 'Flag not found' },
        };
      }

      if (!flag.is_active) {
        return {
          value: this.parseValue(flag.default_value, flag.flag_type),
          reason: 'disabled',
          metadata: { overrideReason: 'Flag is disabled' },
        };
      }

      // Check user override first
      if (context.userId) {
        const userOverride = await this.getUserOverride(flagKey, context.userId);
        if (userOverride) {
          const result = {
            value: this.parseValue(userOverride.override_value, flag.flag_type),
            reason: 'override' as const,
            metadata: { overrideReason: userOverride.reason || 'User override' },
          };

          await this.logEvaluation(flagKey, context, result.value, 'override');
          return result;
        }
      }

      // Check organization rollout configuration
      if (context.organizationId) {
        const orgFlag = await this.getOrganizationFlag(flagKey, context.organizationId);
        if (orgFlag && orgFlag.is_enabled) {
          const rolloutResult = await this.evaluateRollout(orgFlag, context);
          if (rolloutResult.enabled) {
            const result = {
              value: this.parseValue('true', flag.flag_type),
              reason: 'rollout' as const,
              metadata: {
                rolloutPercentage: orgFlag.rollout_percentage,
                strategy: orgFlag.rollout_strategy,
              },
            };

            await this.logEvaluation(flagKey, context, result.value, 'rollout');
            return result;
          }
        }
      }

      // Default value
      const result = {
        value: this.parseValue(flag.default_value, flag.flag_type),
        reason: 'default' as const,
      };

      await this.logEvaluation(flagKey, context, result.value, 'default');
      return result;
    } catch (error: any) {
      console.error(`Feature flag evaluation error for ${flagKey}:`, error?.message || 'unknown_error');
      
      // Fail safe - return false for boolean flags, default for others
      return {
        value: false,
        reason: 'default',
        metadata: { overrideReason: `Error: ${error?.message || 'unknown_error'}` },
      };
    }
  }

  /**
   * Convenience method for boolean flags
   */
  async isEnabled(flagKey: string, context: FeatureFlagContext): Promise<boolean> {
    const result = await this.evaluateFlag(flagKey, context);
    return Boolean(result.value);
  }

  /**
   * Get string value for string flags
   */
  async getStringValue(
    flagKey: string,
    context: FeatureFlagContext,
    defaultValue: string = ''
  ): Promise<string> {
    const result = await this.evaluateFlag(flagKey, context);
    return String(result.value || defaultValue);
  }

  /**
   * Get numeric value for number flags
   */
  async getNumericValue(
    flagKey: string,
    context: FeatureFlagContext,
    defaultValue: number = 0
  ): Promise<number> {
    const result = await this.evaluateFlag(flagKey, context);
    const numValue = Number(result.value);
    return isNaN(numValue) ? defaultValue : numValue;
  }

  /**
   * Bulk evaluation for multiple flags
   */
  async evaluateFlags(
    flagKeys: string[],
    context: FeatureFlagContext
  ): Promise<Record<string, FeatureFlagEvaluationResult>> {
    const results: Record<string, FeatureFlagEvaluationResult> = {};

    // Evaluate flags in parallel for better performance
    const evaluationPromises = flagKeys.map(async (flagKey) => {
      try {
        const result = await this.evaluateFlag(flagKey, context);
        return { flagKey, result };
      } catch (error: any) {
        console.error(`Error evaluating flag ${flagKey}:`, error?.message || 'unknown_error');
        return {
          flagKey,
          result: {
            value: false,
            reason: 'default' as const,
            metadata: { overrideReason: `Error: ${error?.message || 'unknown_error'}` },
          },
        };
      }
    });

    const evaluations = await Promise.all(evaluationPromises);
    evaluations.forEach(({ flagKey, result }) => {
      results[flagKey] = result;
    });

    return results;
  }

  /**
   * Create or update a feature flag
   */
  async upsertFlag(flag: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>): Promise<FeatureFlag> {
    try {
      const existingFlag = await db
        .select()
        .from(feature_flags)
        .where(eq(feature_flags.flag_key, flag.flag_key))
        .limit(1);

      if (existingFlag.length > 0) {
        // Update existing flag
        const [updatedFlag] = await db
          .update(feature_flags)
          .set({
            ...flag,
            updated_at: new Date(),
          })
          .where(eq(feature_flags.flag_key, flag.flag_key))
          .returning();

        this.invalidateCache();
        return updatedFlag;
      } else {
        // Create new flag
        const [newFlag] = await db.insert(feature_flags).values(flag).returning();
        this.invalidateCache();
        return newFlag;
      }
    } catch (error: any) {
      throw new Error(`Failed to upsert feature flag: ${error?.message || 'unknown_error'}`);
    }
  }

  /**
   * Enable/disable flag for organization with rollout configuration
   */
  async setOrganizationFlag(
    flagKey: string,
    organizationId: number,
    config: {
      isEnabled: boolean;
      rolloutPercentage?: number;
      rolloutStrategy?: string;
      rolloutConfig?: any;
      environment?: string;
      enabledBy?: number;
    }
  ): Promise<OrganizationFeatureFlag> {
    try {
      const existingOrgFlag = await db
        .select()
        .from(organization_feature_flags)
        .where(
          and(
            eq(organization_feature_flags.flag_key, flagKey),
            eq(organization_feature_flags.organization_id, organizationId)
          )
        )
        .limit(1);

      const flagData = {
        organization_id: organizationId,
        flag_key: flagKey,
        is_enabled: config.isEnabled,
        rollout_percentage: config.rolloutPercentage || 0,
        rollout_strategy: config.rolloutStrategy || 'percentage',
        rollout_config: config.rolloutConfig || null,
        environment: config.environment || 'production',
        enabled_by: config.enabledBy,
        enabled_at: config.isEnabled ? new Date() : null,
        updated_at: new Date(),
      };

      if (existingOrgFlag.length > 0) {
        // Update existing
        const [updatedOrgFlag] = await db
          .update(organization_feature_flags)
          .set(flagData)
          .where(
            and(
              eq(organization_feature_flags.flag_key, flagKey),
              eq(organization_feature_flags.organization_id, organizationId)
            )
          )
          .returning();

        return updatedOrgFlag;
      } else {
        // Create new
        const [newOrgFlag] = await db
          .insert(organization_feature_flags)
          .values(flagData)
          .returning();

        return newOrgFlag;
      }
    } catch (error: any) {
      throw new Error(`Failed to set organization feature flag: ${error?.message || 'unknown_error'}`);
    }
  }

  /**
   * Set user override for a flag
   */
  async setUserOverride(
    flagKey: string,
    userId: number,
    overrideValue: string,
    reason?: string,
    expiresAt?: Date,
    createdBy?: number
  ): Promise<UserFeatureFlagOverride> {
    try {
      const existingOverride = await db
        .select()
        .from(user_feature_flag_overrides)
        .where(
          and(
            eq(user_feature_flag_overrides.flag_key, flagKey),
            eq(user_feature_flag_overrides.user_id, userId)
          )
        )
        .limit(1);

      const overrideData = {
        user_id: userId,
        flag_key: flagKey,
        override_value: overrideValue,
        reason: reason || 'Manual override',
        expires_at: expiresAt,
        created_by: createdBy,
      };

      if (existingOverride.length > 0) {
        // Update existing
        const [updatedOverride] = await db
          .update(user_feature_flag_overrides)
          .set({
            ...overrideData,
            created_at: new Date(), // Reset creation time for new override
          })
          .where(
            and(
              eq(user_feature_flag_overrides.flag_key, flagKey),
              eq(user_feature_flag_overrides.user_id, userId)
            )
          )
          .returning();

        return updatedOverride;
      } else {
        // Create new
        const [newOverride] = await db
          .insert(user_feature_flag_overrides)
          .values(overrideData)
          .returning();

        return newOverride;
      }
    } catch (error: any) {
      throw new Error(`Failed to set user override: ${error?.message || 'unknown_error'}`);
    }
  }

  // Private helper methods

  private async getFlag(flagKey: string): Promise<FeatureFlag | null> {
    try {
      // Check cache first
      const now = Date.now();
      if (now - this.lastCacheUpdate < this.cacheExpiryTime && this.flagCache.has(flagKey)) {
        return this.flagCache.get(flagKey) || null;
      }

      // Fetch from database
      const flags = await db
        .select()
        .from(feature_flags)
        .where(eq(feature_flags.flag_key, flagKey))
        .limit(1);

      const flag = flags[0] || null;
      
      // Update cache
      if (flag) {
        this.flagCache.set(flagKey, flag);
        this.lastCacheUpdate = now;
      }

      return flag;
    } catch (error: any) {
      console.error(`Error fetching flag ${flagKey}:`, error?.message || 'unknown_error');
      return null;
    }
  }

  private async getUserOverride(
    flagKey: string,
    userId: number
  ): Promise<UserFeatureFlagOverride | null> {
    try {
      const overrides = await db
        .select()
        .from(user_feature_flag_overrides)
        .where(
          and(
            eq(user_feature_flag_overrides.flag_key, flagKey),
            eq(user_feature_flag_overrides.user_id, userId)
          )
        )
        .limit(1);

      const override = overrides[0] || null;

      // Check if override has expired
      if (override && override.expires_at && new Date() > override.expires_at) {
        // Remove expired override
        await db
          .delete(user_feature_flag_overrides)
          .where(
            and(
              eq(user_feature_flag_overrides.flag_key, flagKey),
              eq(user_feature_flag_overrides.user_id, userId)
            )
          );
        return null;
      }

      return override;
    } catch (error: any) {
      console.error(`Error fetching user override:`, error?.message || 'unknown_error');
      return null;
    }
  }

  private async getOrganizationFlag(
    flagKey: string,
    organizationId: number
  ): Promise<OrganizationFeatureFlag | null> {
    try {
      const orgFlags = await db
        .select()
        .from(organization_feature_flags)
        .where(
          and(
            eq(organization_feature_flags.flag_key, flagKey),
            eq(organization_feature_flags.organization_id, organizationId)
          )
        )
        .limit(1);

      return orgFlags[0] || null;
    } catch (error: any) {
      console.error(`Error fetching organization flag:`, error?.message || 'unknown_error');
      return null;
    }
  }

  private async evaluateRollout(
    orgFlag: OrganizationFeatureFlag,
    context: FeatureFlagContext
  ): Promise<{ enabled: boolean; reason?: string }> {
    try {
      switch (orgFlag.rollout_strategy) {
        case 'all':
          return { enabled: true, reason: 'All users enabled' };

        case 'whitelist':
          const whitelistConfig = orgFlag.rollout_config as { user_ids?: number[] } | null;
          const whitelistUserIds = whitelistConfig?.user_ids || [];
          const isWhitelisted = context.userId ? whitelistUserIds.includes(context.userId) : false;
          return { 
            enabled: isWhitelisted, 
            reason: isWhitelisted ? 'User in whitelist' : 'User not in whitelist' 
          };

        case 'percentage':
        default:
          // Use deterministic hash based on user ID or session to ensure consistent rollout
          const identifier = context.userId?.toString() || 
                           context.requestContext?.ip || 
                           'anonymous';
          
          const hash = this.hashString(`${orgFlag.flag_key}:${identifier}`);
          const percentage = hash % 100;
          const enabled = percentage < orgFlag.rollout_percentage;
          
          return { 
            enabled, 
            reason: `Percentage rollout: ${percentage}% < ${orgFlag.rollout_percentage}%` 
          };
      }
    } catch (error: any) {
      console.error(`Error evaluating rollout:`, error?.message || 'unknown_error');
      return { enabled: false, reason: `Error: ${error?.message || 'unknown_error'}` };
    }
  }

  private parseValue(value: string, type: string): boolean | string | number {
    switch (type) {
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'number':
        const numValue = Number(value);
        return isNaN(numValue) ? 0 : numValue;
      case 'string':
      default:
        return value;
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private async logEvaluation(
    flagKey: string,
    context: FeatureFlagContext,
    value: boolean | string | number,
    reason: string
  ): Promise<void> {
    try {
      // Only log evaluations in development or when explicitly requested
      if (process.env.NODE_ENV === 'development' || process.env.LOG_FEATURE_FLAGS === 'true') {
        const evaluation: InsertFeatureFlagEvaluation = {
          flag_key: flagKey,
          user_id: context.userId || null,
          organization_id: context.organizationId || null,
          evaluated_value: String(value),
          evaluation_reason: reason,
          request_context: context.requestContext || null,
        };

        await db.insert(feature_flag_evaluations).values(evaluation);
      }
    } catch (error: any) {
      // Don't fail the request if logging fails
      console.error(`Error logging feature flag evaluation:`, error?.message || 'unknown_error');
    }
  }

  private invalidateCache(): void {
    this.flagCache.clear();
    this.lastCacheUpdate = 0;
  }
}

// Export singleton instance
export const featureFlagService = FeatureFlagService.getInstance();

// Convenience functions for common use cases
export const isFeatureEnabled = (flagKey: string, context: FeatureFlagContext): Promise<boolean> =>
  featureFlagService.isEnabled(flagKey, context);

export const getFeatureValue = (flagKey: string, context: FeatureFlagContext) =>
  featureFlagService.evaluateFlag(flagKey, context);

export const evaluateFeatures = (flagKeys: string[], context: FeatureFlagContext) =>
  featureFlagService.evaluateFlags(flagKeys, context);