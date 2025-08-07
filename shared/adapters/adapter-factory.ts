// Adapter Factory for Dependency Injection and Feature Flag Integration
// Provides centralized adapter management with gradual rollout capabilities

import { BaseAdapter } from './base-adapter';
import { EmployeeAdapter, employeeAdapter } from './employee-adapter';
import { RecognitionAdapter, recognitionAdapter } from './recognition-adapter';
import { SocialAdapter, socialAdapter } from './social-adapter';
import { featureFlagService } from '../services/feature-flags.service';
import { logger } from '@shared/logger';

// Adapter type definitions
export type AdapterType = 'employee' | 'recognition' | 'social';
export type AdapterInstance = EmployeeAdapter | RecognitionAdapter | SocialAdapter;

// Adapter registry interface
export interface AdapterRegistry {
  employee: EmployeeAdapter;
  recognition: RecognitionAdapter;
  social: SocialAdapter;
}

class AdapterFactory {
  private static instance: AdapterFactory;
  private adapters: AdapterRegistry;
  private fallbackEnabled: boolean = true;

  private constructor() {
    this.adapters = {
      employee: employeeAdapter,
      recognition: recognitionAdapter,
      social: socialAdapter,
    };

    logger.info('🏭 Adapter Factory initialized with adapters:', Object.keys(this.adapters));
  }

  public static getInstance(): AdapterFactory {
    if (!AdapterFactory.instance) {
      AdapterFactory.instance = new AdapterFactory();
    }
    return AdapterFactory.instance;
  }

  /**
   * Get adapter by type with feature flag evaluation
   */
  async getAdapter<T extends AdapterType>(
    adapterType: T,
    context: {
      userId?: number;
      organizationId?: number;
      environment?: string;
    }
  ): Promise<AdapterRegistry[T] | null> {
    try {
      const adapter = this.adapters[adapterType];
      if (!adapter) {
        logger.error(`❌ Adapter not found: ${adapterType}`);
        return null;
      }

      // Check if adapter is enabled via feature flags
      const isEnabled = await this.isAdapterEnabled(adapterType, context);
      if (!isEnabled) {
        logger.warn(`⚠️  Adapter disabled via feature flag: ${adapterType}`, {
          organizationId: context.organizationId,
          userId: context.userId,
        });
        return null;
      }

      logger.debug(`✅ Adapter enabled and ready: ${adapterType}`, {
        organizationId: context.organizationId,
        version: 'v1.0.0',
      });

      return adapter;
    } catch (error: any) {
      logger.error(`❌ Failed to get adapter ${adapterType}:`, error?.message || 'unknown_error');
      return null;
    }
  }

  /**
   * Get employee adapter with feature flag check
   */
  async getEmployeeAdapter(context: {
    userId?: number;
    organizationId?: number;
    environment?: string;
  }): Promise<EmployeeAdapter | null> {
    return this.getAdapter('employee', context);
  }

  /**
   * Get recognition adapter with feature flag check
   */
  async getRecognitionAdapter(context: {
    userId?: number;
    organizationId?: number;
    environment?: string;
  }): Promise<RecognitionAdapter | null> {
    return this.getAdapter('recognition', context);
  }

  /**
   * Get social adapter with feature flag check
   */
  async getSocialAdapter(context: {
    userId?: number;
    organizationId?: number;
    environment?: string;
  }): Promise<SocialAdapter | null> {
    return this.getAdapter('social', context);
  }

  /**
   * Check if adapter is enabled via feature flags
   */
  private async isAdapterEnabled(
    adapterType: AdapterType,
    context: {
      userId?: number;
      organizationId?: number;
      environment?: string;
    }
  ): Promise<boolean> {
    try {
      const flagKey = `${adapterType}_adapter_enabled`;
      
      const result = await featureFlagService.evaluateFlag(flagKey, {
        userId: context.userId,
        organizationId: context.organizationId,
        environment: context.environment || process.env.NODE_ENV || 'development',
      });

      return Boolean(result.value);
    } catch (error: any) {
      logger.error(`Failed to evaluate feature flag for ${adapterType} adapter:`, error?.message || 'unknown_error');
      
      // Fail open for development, fail closed for production
      const defaultEnabled = process.env.NODE_ENV === 'development';
      logger.warn(`Using default enabled state for ${adapterType}: ${defaultEnabled}`);
      return defaultEnabled;
    }
  }

  /**
   * Get all adapter health statuses
   */
  getAllAdapterHealth(): Record<AdapterType, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    adapterName: string;
    version: string;
    uptime: number;
    operationCount: number;
    averageResponseTime: number;
    errorRate: number;
  }> {
    const health: any = {};
    
    for (const [type, adapter] of Object.entries(this.adapters)) {
      health[type] = adapter.getHealthStatus();
    }

    return health;
  }

  /**
   * Get adapter performance metrics
   */
  getAdapterMetrics(adapterType: AdapterType): Record<string, {
    operationCount: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    lastExecutionTime: number;
  }> | null {
    const adapter = this.adapters[adapterType];
    if (!adapter) {
      return null;
    }

    return adapter.getPerformanceMetrics();
  }

  /**
   * Enable adapter for specific organization (admin function)
   */
  async enableAdapterForOrganization(
    adapterType: AdapterType,
    organizationId: number,
    rolloutPercentage: number = 100,
    enabledBy?: number
  ): Promise<void> {
    try {
      logger.info(`🔄 Enabling ${adapterType} adapter for organization ${organizationId} at ${rolloutPercentage}% rollout`);

      const flagKey = `${adapterType}_adapter_enabled`;
      
      await featureFlagService.setOrganizationFlag(flagKey, organizationId, {
        isEnabled: true,
        rolloutPercentage,
        rolloutStrategy: 'percentage',
        environment: process.env.NODE_ENV || 'development',
        enabledBy,
      });

      logger.info(`✅ ${adapterType} adapter enabled for organization ${organizationId}`);
    } catch (error: any) {
      logger.error(`❌ Failed to enable ${adapterType} adapter for organization ${organizationId}:`, error?.message || 'unknown_error');
      throw error;
    }
  }

  /**
   * Disable adapter for specific organization (admin function)
   */
  async disableAdapterForOrganization(
    adapterType: AdapterType,
    organizationId: number,
    disabledBy?: number
  ): Promise<void> {
    try {
      logger.info(`🛑 Disabling ${adapterType} adapter for organization ${organizationId}`);

      const flagKey = `${adapterType}_adapter_enabled`;
      
      await featureFlagService.setOrganizationFlag(flagKey, organizationId, {
        isEnabled: false,
        rolloutPercentage: 0,
        rolloutStrategy: 'percentage',
        environment: process.env.NODE_ENV || 'development',
        enabledBy: disabledBy,
      });

      logger.info(`✅ ${adapterType} adapter disabled for organization ${organizationId}`);
    } catch (error: any) {
      logger.error(`❌ Failed to disable ${adapterType} adapter for organization ${organizationId}:`, error?.message || 'unknown_error');
      throw error;
    }
  }

  /**
   * Batch enable/disable adapters for organization
   */
  async configureOrganizationAdapters(
    organizationId: number,
    config: Record<AdapterType, {
      enabled: boolean;
      rolloutPercentage?: number;
    }>,
    configuredBy?: number
  ): Promise<void> {
    const promises = Object.entries(config).map(async ([adapterType, settings]) => {
      if (settings.enabled) {
        return this.enableAdapterForOrganization(
          adapterType as AdapterType,
          organizationId,
          settings.rolloutPercentage || 100,
          configuredBy
        );
      } else {
        return this.disableAdapterForOrganization(
          adapterType as AdapterType,
          organizationId,
          configuredBy
        );
      }
    });

    await Promise.all(promises);
    
    logger.info(`🎯 Adapter configuration completed for organization ${organizationId}`, {
      config,
      configuredBy,
    });
  }

  /**
   * Migrate organization from direct access to adapter pattern
   */
  async migrateOrganizationToAdapters(
    organizationId: number,
    migrationStrategy: {
      employee: boolean;
      recognition: boolean;
      social: boolean;
    },
    rolloutPercentage: number = 10, // Start with 10% rollout
    migratedBy?: number
  ): Promise<void> {
    logger.info(`🚀 Starting adapter migration for organization ${organizationId}`, {
      migrationStrategy,
      rolloutPercentage,
      migratedBy,
    });

    const config: Record<AdapterType, { enabled: boolean; rolloutPercentage?: number }> = {
      employee: {
        enabled: migrationStrategy.employee,
        rolloutPercentage: migrationStrategy.employee ? rolloutPercentage : 0,
      },
      recognition: {
        enabled: migrationStrategy.recognition,
        rolloutPercentage: migrationStrategy.recognition ? rolloutPercentage : 0,
      },
      social: {
        enabled: migrationStrategy.social,
        rolloutPercentage: migrationStrategy.social ? rolloutPercentage : 0,
      },
    };

    await this.configureOrganizationAdapters(organizationId, config, migratedBy);

    logger.info(`✅ Adapter migration completed for organization ${organizationId}`);
  }
}

// Export singleton instance
export const adapterFactory = AdapterFactory.getInstance();

// Convenience functions for common usage
export const getEmployeeAdapter = (context: { userId?: number; organizationId?: number; environment?: string }) =>
  adapterFactory.getEmployeeAdapter(context);

export const getRecognitionAdapter = (context: { userId?: number; organizationId?: number; environment?: string }) =>
  adapterFactory.getRecognitionAdapter(context);

export const getSocialAdapter = (context: { userId?: number; organizationId?: number; environment?: string }) =>
  adapterFactory.getSocialAdapter(context);

// Export factory class for advanced usage
export { AdapterFactory };