/**
 * Dual-Write Adapter
 * Ensures data consistency between monolith and Employee Core service
 * Implements the Strangler Fig pattern for gradual migration
 */

import { logger } from '@shared/logger';
import { employeeCoreProxy } from './employee-core-proxy';
import { eventBus } from '../../services/shared/event-bus';
import { migrationPhaseManager } from './migration-phases';
import { migrationAlertManager } from './migration-alerts';

export interface DualWriteConfig {
  enableDualWrite: boolean;
  readFromNewService: boolean;
  writePercentage: number; // 0-100, percentage of writes to new service
  syncMode: 'async' | 'sync';
}

export class DualWriteAdapter {
  private config: DualWriteConfig;
  private metrics = {
    totalWrites: 0,
    successfulDualWrites: 0,
    failedDualWrites: 0,
    newServiceReads: 0,
    legacyReads: 0
  };

  constructor(config?: Partial<DualWriteConfig>) {
    // Initialize with phase configuration if not provided
    const currentPhase = migrationPhaseManager.getCurrentPhase();
    this.config = {
      enableDualWrite: config?.enableDualWrite ?? currentPhase.config.enableDualWrite,
      readFromNewService: config?.readFromNewService ?? currentPhase.config.readFromNewService,
      writePercentage: config?.writePercentage ?? currentPhase.config.writePercentage,
      syncMode: config?.syncMode ?? currentPhase.config.syncMode
    };

    logger.info('[DualWrite] Adapter initialized with config:', this.config);
    logger.info('[DualWrite] Current migration phase:', currentPhase.name);
    this.startMetricsReporting();
  }

  private startMetricsReporting(): void {
    // Report metrics every 5 minutes
    setInterval(() => {
      if (this.metrics.totalWrites > 0) {
        const successRate = (this.metrics.successfulDualWrites / this.metrics.totalWrites) * 100;
        logger.info('[DualWrite] Metrics:', {
          ...this.metrics,
          successRate: `${successRate.toFixed(2)}%`
        });

        // Publish metrics event
        eventBus.publish({
          type: 'dual_write.metrics',
          source: 'dual-write-adapter',
          data: this.metrics
        });

        // Check if we should progress to next phase
        const progression = migrationPhaseManager.checkPhaseProgression(this.metrics);
        if (progression.shouldProgress) {
          logger.info('[DualWrite] Ready for phase progression:', progression.reason);
          eventBus.publish({
            type: 'migration.ready_for_progression',
            source: 'dual-write-adapter',
            data: { reason: progression.reason, metrics: this.metrics }
          });
        }

        // Check for alerts
        migrationAlertManager.checkMetrics(this.metrics);
      }
    }, 300000); // 5 minutes
  }

  /**
   * Handle user authentication with dual-write pattern
   */
  public async handleLogin(
    credentials: { username?: string; email?: string; password: string },
    legacyLoginFn: () => Promise<any>
  ): Promise<any> {
    // For login, we can try both services and compare results
    if (this.config.enableDualWrite && this.shouldWriteToNewService()) {
      try {
        // Try login via Employee Core first (non-blocking)
        const newServicePromise = employeeCoreProxy.login(credentials);
        
        // Always perform legacy login
        const legacyResult = await legacyLoginFn();

        // Check new service result asynchronously
        if (this.config.syncMode === 'sync') {
          const newServiceResult = await newServicePromise;
          if (newServiceResult) {
            logger.info('[DualWrite] Login successful in both services');
            this.metrics.successfulDualWrites++;
          } else {
            logger.warn('[DualWrite] Login succeeded in legacy but failed in new service');
            this.metrics.failedDualWrites++;
            migrationAlertManager.recordFailure();
          }
        } else {
          // Fire and forget for async mode
          newServicePromise.then(result => {
            if (result) {
              this.metrics.successfulDualWrites++;
            } else {
              this.metrics.failedDualWrites++;
              migrationAlertManager.recordFailure();
            }
          }).catch(error => {
            logger.error('[DualWrite] Async login error:', error);
            this.metrics.failedDualWrites++;
            migrationAlertManager.recordFailure();
          });
        }

        this.metrics.totalWrites++;
        return legacyResult;
      } catch (error: any) {
        logger.error('[DualWrite] Error during dual-write login:', error.message);
        // Fall back to legacy only
        return legacyLoginFn();
      }
    }

    // Legacy only
    return legacyLoginFn();
  }

  /**
   * Handle user creation with dual-write pattern
   */
  public async handleUserCreation(
    userData: any,
    legacyCreateFn: () => Promise<any>
  ): Promise<any> {
    // Create in legacy first to get the ID
    const legacyUser = await legacyCreateFn();

    if (this.config.enableDualWrite && this.shouldWriteToNewService()) {
      try {
        // Async write to new service
        const writeToNewService = async () => {
          const newUser = await employeeCoreProxy.createUser({
            ...userData,
            id: legacyUser.id // Use same ID for consistency
          });

          if (newUser) {
            logger.info('[DualWrite] User created in Employee Core:', newUser.id);
            this.metrics.successfulDualWrites++;
            
            // Publish sync event
            eventBus.publish({
              type: 'dual_write.user_synced',
              source: 'dual-write-adapter',
              data: { userId: legacyUser.id, service: 'employee-core' }
            });
          } else {
            logger.warn('[DualWrite] Failed to create user in Employee Core');
            this.metrics.failedDualWrites++;
          }
        };

        if (this.config.syncMode === 'sync') {
          await writeToNewService();
        } else {
          // Fire and forget
          writeToNewService().catch(error => {
            logger.error('[DualWrite] Async user creation error:', error);
            this.metrics.failedDualWrites++;
          });
        }

        this.metrics.totalWrites++;
      } catch (error: any) {
        logger.error('[DualWrite] Error creating user in new service:', error.message);
        this.metrics.failedDualWrites++;
      }
    }

    return legacyUser;
  }

  /**
   * Handle user updates with dual-write pattern
   */
  public async handleUserUpdate(
    userId: number,
    updates: any,
    legacyUpdateFn: () => Promise<any>
  ): Promise<any> {
    // Update legacy first
    const result = await legacyUpdateFn();

    if (this.config.enableDualWrite && this.shouldWriteToNewService()) {
      try {
        const updateNewService = async () => {
          const updated = await employeeCoreProxy.updateUser(userId, updates);
          if (updated) {
            logger.info('[DualWrite] User updated in Employee Core:', userId);
            this.metrics.successfulDualWrites++;
          } else {
            logger.warn('[DualWrite] Failed to update user in Employee Core:', userId);
            this.metrics.failedDualWrites++;
          }
        };

        if (this.config.syncMode === 'sync') {
          await updateNewService();
        } else {
          updateNewService().catch(error => {
            logger.error('[DualWrite] Async user update error:', error);
            this.metrics.failedDualWrites++;
          });
        }

        this.metrics.totalWrites++;
      } catch (error: any) {
        logger.error('[DualWrite] Error updating user in new service:', error.message);
        this.metrics.failedDualWrites++;
      }
    }

    return result;
  }

  /**
   * Handle user deletion with dual-write pattern
   */
  public async handleUserDeletion(
    userId: number,
    legacyDeleteFn: () => Promise<any>
  ): Promise<any> {
    // Delete from legacy first
    const result = await legacyDeleteFn();

    if (this.config.enableDualWrite && this.shouldWriteToNewService()) {
      try {
        const deleteFromNewService = async () => {
          const deleted = await employeeCoreProxy.deleteUser(userId);
          if (deleted) {
            logger.info('[DualWrite] User deleted from Employee Core:', userId);
            this.metrics.successfulDualWrites++;
          } else {
            logger.warn('[DualWrite] Failed to delete user from Employee Core:', userId);
            this.metrics.failedDualWrites++;
          }
        };

        if (this.config.syncMode === 'sync') {
          await deleteFromNewService();
        } else {
          deleteFromNewService().catch(error => {
            logger.error('[DualWrite] Async user deletion error:', error);
            this.metrics.failedDualWrites++;
          });
        }

        this.metrics.totalWrites++;
      } catch (error: any) {
        logger.error('[DualWrite] Error deleting user from new service:', error.message);
        this.metrics.failedDualWrites++;
      }
    }

    return result;
  }

  /**
   * Handle password changes with dual-write pattern
   */
  public async handlePasswordChange(
    userId: number,
    newPassword: string,
    legacyChangeFn: () => Promise<any>
  ): Promise<any> {
    // Change in legacy first
    const result = await legacyChangeFn();

    if (this.config.enableDualWrite && this.shouldWriteToNewService()) {
      try {
        const changeInNewService = async () => {
          const changed = await employeeCoreProxy.changePassword(userId, newPassword);
          if (changed) {
            logger.info('[DualWrite] Password changed in Employee Core for user:', userId);
            this.metrics.successfulDualWrites++;
          } else {
            logger.warn('[DualWrite] Failed to change password in Employee Core:', userId);
            this.metrics.failedDualWrites++;
          }
        };

        if (this.config.syncMode === 'sync') {
          await changeInNewService();
        } else {
          changeInNewService().catch(error => {
            logger.error('[DualWrite] Async password change error:', error);
            this.metrics.failedDualWrites++;
          });
        }

        this.metrics.totalWrites++;
      } catch (error: any) {
        logger.error('[DualWrite] Error changing password in new service:', error.message);
        this.metrics.failedDualWrites++;
      }
    }

    return result;
  }

  /**
   * Determine if a write should go to the new service based on percentage
   */
  private shouldWriteToNewService(): boolean {
    if (this.config.writePercentage === 0) return false;
    if (this.config.writePercentage === 100) return true;
    
    // Random percentage-based routing
    return Math.random() * 100 < this.config.writePercentage;
  }

  /**
   * Update configuration dynamically
   */
  public updateConfig(updates: Partial<DualWriteConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('[DualWrite] Configuration updated:', this.config);
    
    // Publish configuration change event
    eventBus.publish({
      type: 'dual_write.config_updated',
      source: 'dual-write-adapter',
      data: this.config
    });
  }

  /**
   * Get current configuration and metrics
   */
  public getStatus(): { config: DualWriteConfig; metrics: typeof this.metrics; serviceStatus: any; migrationPhase: any } {
    return {
      config: this.config,
      metrics: this.metrics,
      serviceStatus: employeeCoreProxy.getStatus(),
      migrationPhase: migrationPhaseManager.getPhaseStatus()
    };
  }

  /**
   * Apply phase configuration
   */
  public applyPhaseConfig(phaseConfig: Partial<DualWriteConfig>): void {
    this.config = { ...this.config, ...phaseConfig };
    logger.info('[DualWrite] Applied phase configuration:', this.config);
  }
}

// Singleton instance - initialized with current phase config if env vars not set
const envConfig = process.env.ENABLE_DUAL_WRITE ? {
  enableDualWrite: process.env.ENABLE_DUAL_WRITE === 'true',
  readFromNewService: process.env.READ_FROM_NEW_SERVICE === 'true',
  writePercentage: parseInt(process.env.DUAL_WRITE_PERCENTAGE || '0'),
  syncMode: (process.env.DUAL_WRITE_MODE || 'async') as 'async' | 'sync'
} : undefined;

export const dualWriteAdapter = new DualWriteAdapter(envConfig);