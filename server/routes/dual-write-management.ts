/**
 * Dual-Write Management API
 * Provides endpoints to control and monitor the dual-write migration
 */

import { Router } from 'express';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';

// Admin check middleware
const requireAdmin = (req: AuthenticatedRequest, res: any, next: any) => {
  if (!(req.user as any)?.is_admin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
import { dualWriteAdapter } from '../dual-write/dual-write-adapter';
import { employeeCoreProxy } from '../dual-write/employee-core-proxy';
import { migrationPhaseManager } from '../dual-write/migration-phases';
import { logger } from '@shared/logger';
import { eventBus } from '../../services/shared/event-bus';

const router = Router();

// Get dual-write status and metrics
router.get('/status', verifyToken, requireAdmin, (req, res) => {
  try {
    const status = dualWriteAdapter.getStatus();
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error getting dual-write status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dual-write status'
    });
  }
});

// Update dual-write configuration
router.post('/config', verifyToken, requireAdmin, (req, res) => {
  try {
    const { enableDualWrite, readFromNewService, writePercentage, syncMode } = req.body;

    // Validate writePercentage
    if (writePercentage !== undefined) {
      if (typeof writePercentage !== 'number' || writePercentage < 0 || writePercentage > 100) {
        return res.status(400).json({
          success: false,
          message: 'writePercentage must be a number between 0 and 100'
        });
      }
    }

    // Validate syncMode
    if (syncMode !== undefined && !['async', 'sync'].includes(syncMode)) {
      return res.status(400).json({
        success: false,
        message: 'syncMode must be either "async" or "sync"'
      });
    }

    // Update configuration
    const updates: any = {};
    if (enableDualWrite !== undefined) updates.enableDualWrite = enableDualWrite;
    if (readFromNewService !== undefined) updates.readFromNewService = readFromNewService;
    if (writePercentage !== undefined) updates.writePercentage = writePercentage;
    if (syncMode !== undefined) updates.syncMode = syncMode;

    dualWriteAdapter.updateConfig(updates);

    // Log configuration change
    logger.info('[DualWrite] Configuration updated by admin:', {
      adminId: (req as any).user?.id,
      updates
    });

    // Publish event
    eventBus.publish({
      type: 'dual_write.config_changed',
      source: 'dual-write-management',
      data: {
        adminId: (req as any).user?.id,
        updates,
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'Dual-write configuration updated',
      config: dualWriteAdapter.getStatus().config
    });
  } catch (error: any) {
    logger.error('Error updating dual-write config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration'
    });
  }
});

// Test Employee Core service connectivity
router.get('/test-connection', verifyToken, requireAdmin, async (req, res) => {
  try {
    const status = employeeCoreProxy.getStatus();
    
    // Try a health check
    let healthCheckResult = false;
    try {
      const response = await fetch(`${status.url}/health`);
      healthCheckResult = response.ok;
    } catch (error) {
      healthCheckResult = false;
    }

    res.json({
      success: true,
      employeeCoreService: {
        ...status,
        healthCheck: healthCheckResult
      }
    });
  } catch (error: any) {
    logger.error('Error testing Employee Core connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test connection'
    });
  }
});

// Get migration phases
router.get('/phases', verifyToken, requireAdmin, (req, res) => {
  try {
    const phases = migrationPhaseManager.getAllPhases();
    const status = migrationPhaseManager.getPhaseStatus();
    
    res.json({
      success: true,
      phases,
      currentPhase: status.currentPhase,
      overallProgress: status.progress,
      timeInCurrentPhase: status.timeInPhase,
      estimatedCompletion: status.estimatedCompletion
    });
  } catch (error: any) {
    logger.error('Error getting migration phases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get migration phases'
    });
  }
});

// Progress to next phase
router.post('/phases/progress', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { force = false } = req.body;
    const result = await migrationPhaseManager.progressToNextPhase(force);
    
    if (result.success && result.newPhase) {
      // Apply the new phase configuration
      dualWriteAdapter.applyPhaseConfig(result.newPhase.config);
      
      logger.info('[DualWrite] Phase progression:', {
        adminId: (req as any).user?.id,
        newPhase: result.newPhase.name,
        forced: force
      });
    }
    
    res.json(result);
  } catch (error: any) {
    logger.error('Error progressing phase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to progress phase'
    });
  }
});

// Rollback to previous phase
router.post('/phases/rollback', verifyToken, requireAdmin, (req, res) => {
  try {
    const result = migrationPhaseManager.rollbackPhase();
    
    if (result.success) {
      const currentPhase = migrationPhaseManager.getCurrentPhase();
      dualWriteAdapter.applyPhaseConfig(currentPhase.config);
      
      logger.warn('[DualWrite] Phase rollback:', {
        adminId: (req as any).user?.id,
        newPhase: currentPhase.name
      });
    }
    
    res.json(result);
  } catch (error: any) {
    logger.error('Error rolling back phase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rollback phase'
    });
  }
});

// Check phase progression readiness
router.get('/phases/check-progression', verifyToken, requireAdmin, (req, res) => {
  try {
    const status = dualWriteAdapter.getStatus();
    const check = migrationPhaseManager.checkPhaseProgression(status.metrics);
    const phaseStatus = migrationPhaseManager.getPhaseStatus();
    
    res.json({
      success: true,
      canProgress: check.shouldProgress,
      reason: check.reason,
      currentPhase: phaseStatus.currentPhase,
      metrics: status.metrics
    });
  } catch (error: any) {
    logger.error('Error checking phase progression:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check phase progression'
    });
  }
});

// Migration progress endpoint
router.get('/migration-progress', verifyToken, requireAdmin, async (req, res) => {
  try {
    const status = dualWriteAdapter.getStatus();
    const { metrics } = status;
    
    // Calculate migration progress
    const totalOperations = metrics.totalWrites;
    const successfulOperations = metrics.successfulDualWrites;
    const successRate = totalOperations > 0 
      ? (successfulOperations / totalOperations) * 100 
      : 0;

    res.json({
      success: true,
      progress: {
        totalOperations,
        successfulOperations,
        failedOperations: metrics.failedDualWrites,
        successRate: `${successRate.toFixed(2)}%`,
        currentWritePercentage: status.config.writePercentage,
        dualWriteEnabled: status.config.enableDualWrite,
        readFromNewService: status.config.readFromNewService,
        serviceHealthy: status.serviceStatus.healthy
      },
      recommendation: generateMigrationRecommendation(successRate, status)
    });
  } catch (error: any) {
    logger.error('Error getting migration progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get migration progress'
    });
  }
});

// Enable/disable dual-write quickly
router.post('/toggle', verifyToken, requireAdmin, (req, res) => {
  try {
    const currentStatus = dualWriteAdapter.getStatus();
    const newState = !currentStatus.config.enableDualWrite;
    
    dualWriteAdapter.updateConfig({ enableDualWrite: newState });
    
    logger.info(`[DualWrite] Dual-write ${newState ? 'enabled' : 'disabled'} by admin:`, (req as any).user?.id);
    
    res.json({
      success: true,
      message: `Dual-write ${newState ? 'enabled' : 'disabled'}`,
      enabled: newState
    });
  } catch (error: any) {
    logger.error('Error toggling dual-write:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle dual-write'
    });
  }
});

// Gradually increase write percentage
router.post('/increase-percentage', verifyToken, requireAdmin, (req, res) => {
  try {
    const { increment = 10 } = req.body;
    const currentStatus = dualWriteAdapter.getStatus();
    const currentPercentage = currentStatus.config.writePercentage;
    const newPercentage = Math.min(100, currentPercentage + increment);
    
    dualWriteAdapter.updateConfig({ writePercentage: newPercentage });
    
    logger.info(`[DualWrite] Write percentage increased from ${currentPercentage}% to ${newPercentage}% by admin:`, (req as any).user?.id);
    
    res.json({
      success: true,
      message: `Write percentage increased to ${newPercentage}%`,
      previousPercentage: currentPercentage,
      newPercentage
    });
  } catch (error: any) {
    logger.error('Error increasing write percentage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to increase write percentage'
    });
  }
});

// Helper function to generate migration recommendations
function generateMigrationRecommendation(successRate: number, status: any): string {
  if (!status.config.enableDualWrite) {
    return 'Dual-write is disabled. Enable it to start the migration process.';
  }
  
  if (!status.serviceStatus.healthy) {
    return 'Employee Core service is not healthy. Check the service before proceeding.';
  }
  
  if (successRate >= 99 && status.config.writePercentage < 100) {
    return `Excellent success rate (${successRate.toFixed(1)}%). Consider increasing write percentage from ${status.config.writePercentage}% to ${Math.min(100, status.config.writePercentage + 20)}%.`;
  }
  
  if (successRate >= 95 && status.config.writePercentage < 50) {
    return `Good success rate (${successRate.toFixed(1)}%). You can safely increase write percentage from ${status.config.writePercentage}% to ${status.config.writePercentage + 10}%.`;
  }
  
  if (successRate < 90) {
    return `Success rate is below 90% (${successRate.toFixed(1)}%). Investigate failures before increasing write percentage.`;
  }
  
  if (status.config.writePercentage === 100 && successRate >= 99) {
    return 'All writes are going to Employee Core with excellent success rate. Consider enabling read from new service.';
  }
  
  return `Current success rate: ${successRate.toFixed(1)}%. Monitor for stability before making changes.`;
}

export default router;