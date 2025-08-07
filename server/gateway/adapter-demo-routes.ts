// Adapter Layer Demo Routes
// Demonstrates the adapter pattern working with feature flags

import express, { Request, Response } from 'express';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { adapterFactory } from '../../shared/adapters';

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

/**
 * GET /api/v2/demo/employees
 * Demonstrate employee adapter with feature flag control
 */
router.get('/employees', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const context = {
      userId: req.user?.id,
      organizationId: req.user?.organization_id || undefined,
      environment: process.env.NODE_ENV,
    };

    // Get employee adapter with feature flag check
    const employeeAdapter = await adapterFactory.getEmployeeAdapter(context);
    
    if (!employeeAdapter) {
      return res.status(200).json({
        success: true,
        message: 'Employee adapter is disabled via feature flag - using fallback',
        data: [],
        adapterUsed: false,
      });
    }

    // Use the adapter to get employees
    const result = await employeeAdapter.getEmployees(
      { page: 1, limit: 10 },
      {},
      {
        userId: context.userId,
        organizationId: context.organizationId || undefined,
        requestId: `demo_${Date.now()}`,
        operationTimestamp: new Date(),
      }
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        adapterUsed: true,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: (result as any).pagination,
      adapterUsed: true,
      metadata: result.metadata,
    });
  } catch (error: any) {
    console.error('Adapter demo error:', error?.message || 'unknown_error');
    return res.status(500).json({
      success: false,
      error: 'Adapter demo failed',
      message: error?.message || 'Unknown error',
    });
  }
});

/**
 * GET /api/v2/demo/recognition/settings
 * Demonstrate recognition adapter with feature flag control
 */
router.get('/recognition/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const context = {
      userId: req.user?.id,
      organizationId: req.user?.organization_id || undefined,
      environment: process.env.NODE_ENV,
    };

    const recognitionAdapter = await adapterFactory.getRecognitionAdapter(context);
    
    if (!recognitionAdapter) {
      return res.status(200).json({
        success: true,
        message: 'Recognition adapter is disabled via feature flag - using fallback',
        data: null,
        adapterUsed: false,
      });
    }

    const result = await recognitionAdapter.getRecognitionSettings({
      userId: context.userId,
      organizationId: context.organizationId,
      requestId: `demo_${Date.now()}`,
      operationTimestamp: new Date(),
    });

    return res.status(200).json({
      success: result.success,
      data: result.data,
      error: result.error,
      adapterUsed: true,
      metadata: result.metadata,
    });
  } catch (error: any) {
    console.error('Recognition adapter demo error:', error?.message || 'unknown_error');
    return res.status(500).json({
      success: false,
      error: 'Recognition adapter demo failed',
      message: error?.message || 'Unknown error',
    });
  }
});

/**
 * GET /api/v2/demo/social/feed
 * Demonstrate social adapter with feature flag control
 */
router.get('/social/feed', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const context = {
      userId: req.user?.id,
      organizationId: req.user?.organization_id || undefined,
      environment: process.env.NODE_ENV,
    };

    const socialAdapter = await adapterFactory.getSocialAdapter(context);
    
    if (!socialAdapter) {
      return res.status(200).json({
        success: true,
        message: 'Social adapter is disabled via feature flag - using fallback',
        data: [],
        adapterUsed: false,
      });
    }

    const result = await socialAdapter.getFeedPosts(
      { page: 1, limit: 5 },
      {
        userId: context.userId,
        organizationId: context.organizationId || undefined,
        requestId: `demo_${Date.now()}`,
        operationTimestamp: new Date(),
      }
    );

    return res.status(200).json({
      success: result.success,
      data: result.data,
      pagination: (result as any).pagination,
      error: result.error,
      adapterUsed: true,
      metadata: result.metadata,
    });
  } catch (error: any) {
    console.error('Social adapter demo error:', error?.message || 'unknown_error');
    return res.status(500).json({
      success: false,
      error: 'Social adapter demo failed',
      message: error?.message || 'Unknown error',
    });
  }
});

/**
 * GET /api/v2/demo/adapter-health
 * Show health status of all adapters
 */
router.get('/adapter-health', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const health = adapterFactory.getAllAdapterHealth();
    
    return res.status(200).json({
      success: true,
      data: {
        adapters: health,
        timestamp: new Date().toISOString(),
        systemUptime: process.uptime(),
      },
    });
  } catch (error: any) {
    console.error('Adapter health check error:', error?.message || 'unknown_error');
    return res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error?.message || 'Unknown error',
    });
  }
});

/**
 * GET /api/v2/demo/adapter-metrics/:adapterType
 * Show performance metrics for specific adapter
 */
router.get('/adapter-metrics/:adapterType', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adapterType } = req.params;
    
    if (!['employee', 'recognition', 'social'].includes(adapterType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid adapter type',
        validTypes: ['employee', 'recognition', 'social'],
      });
    }

    const metrics = adapterFactory.getAdapterMetrics(adapterType as any);
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Adapter not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        adapterType,
        metrics,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Adapter metrics error:', error?.message || 'unknown_error');
    return res.status(500).json({
      success: false,
      error: 'Metrics retrieval failed',
      message: error?.message || 'Unknown error',
    });
  }
});

/**
 * POST /api/v2/demo/enable-adapters
 * Enable adapters for current organization (admin only)
 */
router.post('/enable-adapters', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.is_admin && req.user?.role_type !== 'corporate_admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const { adapters = ['employee'], rolloutPercentage = 10 } = req.body;
    const organizationId = req.user.organization_id;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required',
      });
    }

    const migrationStrategy = {
      employee: adapters.includes('employee'),
      recognition: adapters.includes('recognition'),
      social: adapters.includes('social'),
    };

    await adapterFactory.migrateOrganizationToAdapters(
      organizationId,
      migrationStrategy,
      rolloutPercentage,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: `Adapters enabled for organization ${organizationId}`,
      data: {
        organizationId,
        adapters: migrationStrategy,
        rolloutPercentage,
        enabledBy: req.user.id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Adapter enable error:', error?.message || 'unknown_error');
    return res.status(500).json({
      success: false,
      error: 'Failed to enable adapters',
      message: error?.message || 'Unknown error',
    });
  }
});

export default router;