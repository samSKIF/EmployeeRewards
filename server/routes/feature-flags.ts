// Feature Flags API Routes
// Provides REST endpoints for managing feature flags, organization settings, and user overrides

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  feature_flags,
  organization_feature_flags,
  user_feature_flag_overrides,
  feature_flag_evaluations,
  insertFeatureFlagSchema,
  insertOrganizationFeatureFlagSchema,
  insertUserFeatureFlagOverrideSchema,
} from '../../shared/schema';
import { featureFlagService } from '../../shared/services/feature-flags.service';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const evaluateRequestSchema = z.object({
  flagKeys: z.array(z.string()).min(1),
  context: z.object({
    userId: z.number().optional(),
    organizationId: z.number().optional(),
    environment: z.string().optional(),
  }).optional(),
});

const organizationFlagUpdateSchema = z.object({
  isEnabled: z.boolean(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  rolloutStrategy: z.enum(['percentage', 'whitelist', 'all']).optional(),
  rolloutConfig: z.any().optional(),
  environment: z.string().optional(),
});

const userOverrideSchema = z.object({
  overrideValue: z.string(),
  reason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

// Apply auth middleware to all feature flag routes
router.use(verifyToken);

// Middleware to check admin permissions for management endpoints
function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user?.is_admin && req.user?.role_type !== 'corporate_admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      message: 'You need administrator privileges to manage feature flags',
    });
  }
  next();
}

/**
 * GET /api/feature-flags/evaluate
 * Evaluate feature flags for current user context
 */
router.post('/evaluate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { flagKeys, context: additionalContext } = evaluateRequestSchema.parse(req.body);
    
    const context = {
      userId: additionalContext?.userId || req.user?.id,
      organizationId: additionalContext?.organizationId || req.user?.organization_id || undefined,
      environment: additionalContext?.environment || process.env.NODE_ENV || 'development',
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        route: req.path,
      },
    };

    const results = await featureFlagService.evaluateFlags(flagKeys, context);

    res.json({
      success: true,
      data: results,
      context: {
        userId: context.userId,
        organizationId: context.organizationId,
        environment: context.environment,
      },
    });
  } catch (error: any) {
    console.error('Feature flag evaluation error:', error?.message || 'unknown_error');
    res.status(400).json({
      success: false,
      error: 'Evaluation failed',
      message: error?.message || 'Failed to evaluate feature flags',
    });
  }
});

/**
 * GET /api/feature-flags
 * List all feature flags (admin only)
 */
router.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    const flags = await db
      .select()
      .from(feature_flags)
      .orderBy(desc(feature_flags.created_at))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(feature_flags);

    res.json({
      success: true,
      data: flags,
      pagination: {
        currentPage: page,
        totalCount: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit),
        limit,
      },
    });
  } catch (error: any) {
    console.error('Error fetching feature flags:', error?.message || 'unknown_error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feature flags',
      message: error?.message || 'Database error occurred',
    });
  }
});

/**
 * POST /api/feature-flags
 * Create new feature flag (admin only)
 */
router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { created_by: _, ...bodyData } = req.body;
    const flagData = {
      ...bodyData,
      created_by: req.user?.id ?? null,
    };

    const parsedFlagData = insertFeatureFlagSchema.parse(flagData);

    const newFlag = await featureFlagService.upsertFlag(parsedFlagData);

    res.status(201).json({
      success: true,
      data: newFlag,
      message: 'Feature flag created successfully',
    });
  } catch (error: any) {
    console.error('Error creating feature flag:', error?.message || 'unknown_error');
    res.status(400).json({
      success: false,
      error: 'Failed to create feature flag',
      message: error?.message || 'Validation error occurred',
    });
  }
});

/**
 * PUT /api/feature-flags/:flagKey
 * Update feature flag (admin only)
 */
router.put('/:flagKey', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const flagKey = req.params.flagKey;
    const { created_by: _, ...bodyData } = req.body;
    const flagData = {
      ...bodyData,
      flag_key: flagKey,
      created_by: req.user?.id ?? null,
    };

    const parsedFlagData = insertFeatureFlagSchema.parse(flagData);

    const updatedFlag = await featureFlagService.upsertFlag(parsedFlagData);

    res.json({
      success: true,
      data: updatedFlag,
      message: 'Feature flag updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating feature flag:', error?.message || 'unknown_error');
    res.status(400).json({
      success: false,
      error: 'Failed to update feature flag',
      message: error?.message || 'Validation error occurred',
    });
  }
});

/**
 * GET /api/feature-flags/organization/:organizationId
 * Get organization's feature flag configuration (admin only)
 */
router.get('/organization/:organizationId', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    
    if (isNaN(organizationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid organization ID',
        message: 'Organization ID must be a number',
      });
    }

    const orgFlags = await db
      .select({
        flag_key: organization_feature_flags.flag_key,
        is_enabled: organization_feature_flags.is_enabled,
        rollout_percentage: organization_feature_flags.rollout_percentage,
        rollout_strategy: organization_feature_flags.rollout_strategy,
        rollout_config: organization_feature_flags.rollout_config,
        environment: organization_feature_flags.environment,
        enabled_at: organization_feature_flags.enabled_at,
        flag_name: feature_flags.name,
        flag_description: feature_flags.description,
        flag_type: feature_flags.flag_type,
        flag_default_value: feature_flags.default_value,
      })
      .from(organization_feature_flags)
      .leftJoin(
        feature_flags,
        eq(organization_feature_flags.flag_key, feature_flags.flag_key)
      )
      .where(eq(organization_feature_flags.organization_id, organizationId))
      .orderBy(organization_feature_flags.flag_key);

    res.json({
      success: true,
      data: orgFlags,
      organizationId,
    });
  } catch (error: any) {
    console.error('Error fetching organization flags:', error?.message || 'unknown_error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organization flags',
      message: error?.message || 'Database error occurred',
    });
  }
});

/**
 * PUT /api/feature-flags/organization/:organizationId/:flagKey
 * Update organization feature flag configuration (admin only)
 */
router.put('/organization/:organizationId/:flagKey', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    const flagKey = req.params.flagKey;
    
    if (isNaN(organizationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid organization ID',
        message: 'Organization ID must be a number',
      });
    }

    const updateData = organizationFlagUpdateSchema.parse(req.body);

    const updatedOrgFlag = await featureFlagService.setOrganizationFlag(
      flagKey,
      organizationId,
      {
        isEnabled: updateData.isEnabled,
        rolloutPercentage: updateData.rolloutPercentage,
        rolloutStrategy: updateData.rolloutStrategy,
        rolloutConfig: updateData.rolloutConfig,
        environment: updateData.environment,
        enabledBy: req.user?.id,
      }
    );

    res.json({
      success: true,
      data: updatedOrgFlag,
      message: 'Organization feature flag updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating organization flag:', error?.message || 'unknown_error');
    res.status(400).json({
      success: false,
      error: 'Failed to update organization flag',
      message: error?.message || 'Validation error occurred',
    });
  }
});

/**
 * GET /api/feature-flags/user/:userId/overrides
 * Get user's feature flag overrides (admin only)
 */
router.get('/user/:userId/overrides', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID must be a number',
      });
    }

    const userOverrides = await db
      .select({
        flag_key: user_feature_flag_overrides.flag_key,
        override_value: user_feature_flag_overrides.override_value,
        reason: user_feature_flag_overrides.reason,
        expires_at: user_feature_flag_overrides.expires_at,
        created_at: user_feature_flag_overrides.created_at,
        flag_name: feature_flags.name,
        flag_description: feature_flags.description,
        flag_type: feature_flags.flag_type,
      })
      .from(user_feature_flag_overrides)
      .leftJoin(
        feature_flags,
        eq(user_feature_flag_overrides.flag_key, feature_flags.flag_key)
      )
      .where(eq(user_feature_flag_overrides.user_id, userId))
      .orderBy(user_feature_flag_overrides.created_at);

    res.json({
      success: true,
      data: userOverrides,
      userId,
    });
  } catch (error: any) {
    console.error('Error fetching user overrides:', error?.message || 'unknown_error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user overrides',
      message: error?.message || 'Database error occurred',
    });
  }
});

/**
 * PUT /api/feature-flags/user/:userId/:flagKey/override
 * Set user feature flag override (admin only)
 */
router.put('/user/:userId/:flagKey/override', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const flagKey = req.params.flagKey;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID must be a number',
      });
    }

    const overrideData = userOverrideSchema.parse(req.body);

    const expiresAt = overrideData.expiresAt ? new Date(overrideData.expiresAt) : undefined;

    const userOverride = await featureFlagService.setUserOverride(
      flagKey,
      userId,
      overrideData.overrideValue,
      overrideData.reason,
      expiresAt,
      req.user?.id
    );

    res.json({
      success: true,
      data: userOverride,
      message: 'User feature flag override set successfully',
    });
  } catch (error: any) {
    console.error('Error setting user override:', error?.message || 'unknown_error');
    res.status(400).json({
      success: false,
      error: 'Failed to set user override',
      message: error?.message || 'Validation error occurred',
    });
  }
});

/**
 * DELETE /api/feature-flags/user/:userId/:flagKey/override
 * Remove user feature flag override (admin only)
 */
router.delete('/user/:userId/:flagKey/override', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const flagKey = req.params.flagKey;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID must be a number',
      });
    }

    await db
      .delete(user_feature_flag_overrides)
      .where(
        and(
          eq(user_feature_flag_overrides.user_id, userId),
          eq(user_feature_flag_overrides.flag_key, flagKey)
        )
      );

    res.json({
      success: true,
      message: 'User feature flag override removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing user override:', error?.message || 'unknown_error');
    res.status(500).json({
      success: false,
      error: 'Failed to remove user override',
      message: error?.message || 'Database error occurred',
    });
  }
});

/**
 * GET /api/feature-flags/analytics/:flagKey
 * Get feature flag usage analytics (admin only)
 */
router.get('/analytics/:flagKey', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const flagKey = req.params.flagKey;
    const days = parseInt(req.query.days as string) || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get evaluation stats
    const evaluationStats = await db
      .select({
        evaluated_value: feature_flag_evaluations.evaluated_value,
        evaluation_reason: feature_flag_evaluations.evaluation_reason,
        count: sql<number>`count(*)`,
      })
      .from(feature_flag_evaluations)
      .where(
        and(
          eq(feature_flag_evaluations.flag_key, flagKey),
          sql`${feature_flag_evaluations.created_at} >= ${startDate}`
        )
      )
      .groupBy(
        feature_flag_evaluations.evaluated_value,
        feature_flag_evaluations.evaluation_reason
      );

    // Get daily evaluation counts
    const dailyStats = await db
      .select({
        date: sql<string>`DATE(${feature_flag_evaluations.created_at})`,
        count: sql<number>`count(*)`,
        unique_users: sql<number>`count(DISTINCT ${feature_flag_evaluations.user_id})`,
      })
      .from(feature_flag_evaluations)
      .where(
        and(
          eq(feature_flag_evaluations.flag_key, flagKey),
          sql`${feature_flag_evaluations.created_at} >= ${startDate}`
        )
      )
      .groupBy(sql`DATE(${feature_flag_evaluations.created_at})`)
      .orderBy(sql`DATE(${feature_flag_evaluations.created_at})`);

    res.json({
      success: true,
      data: {
        flagKey,
        period: `${days} days`,
        evaluationStats,
        dailyStats,
      },
    });
  } catch (error: any) {
    console.error('Error fetching flag analytics:', error?.message || 'unknown_error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error?.message || 'Database error occurred',
    });
  }
});

export default router;