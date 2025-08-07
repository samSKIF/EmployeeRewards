// API Gateway Initialization
// Sets up the centralized API gateway with all route definitions and middleware

import { Express } from 'express';
import { apiGateway, registerGatewayRoutes } from '../../shared/gateway/api-gateway.service';
import { allGatewayRoutes } from './route-definitions';
import { featureFlagService } from '../../shared/services/feature-flags.service';
import { logger } from '@shared/logger';

/**
 * Initialize the API Gateway with all route configurations
 */
export async function initializeApiGateway(app: Express): Promise<void> {
  try {
    logger.info('🚀 Initializing API Gateway...');

    // Create initial feature flags for gradual rollout
    await setupApiGatewayFeatureFlags();

    // Register all gateway routes
    registerGatewayRoutes(allGatewayRoutes);

    // Mount the gateway router under /api/v2 prefix (parallel to existing /api routes)
    app.use('/api/v2', apiGateway.getRouter());

    // Log registered routes for debugging
    const routes = apiGateway.getRoutes();
    logger.info(`✅ API Gateway initialized with ${routes.length} routes`);
    
    if (process.env.NODE_ENV === 'development') {
      logger.info('📋 Registered Gateway Routes:');
      routes.forEach(route => {
        const authInfo = route.auth?.required ? 
          `[Auth: ${route.auth.adminRequired ? 'Admin' : 'User'}${route.auth.roles ? ` | Roles: ${route.auth.roles.join(', ')}` : ''}]` : 
          '[Public]';
        const flagInfo = route.featureFlag ? `[Flag: ${route.featureFlag.flagKey}]` : '';
        logger.info(`  ${route.method} /api/v2${route.path} ${authInfo}${flagInfo} - ${route.description}`);
      });
    }

    logger.info('🎯 API Gateway ready for gradual feature rollout');
  } catch (error: any) {
    logger.error('❌ Failed to initialize API Gateway:', error?.message || 'unknown_error');
    throw error;
  }
}

/**
 * Set up feature flags for API Gateway rollout
 */
async function setupApiGatewayFeatureFlags(): Promise<void> {
  try {
    logger.info('🏁 Setting up API Gateway feature flags...');

    // Main API Gateway routing flag
    await featureFlagService.upsertFlag({
      flag_key: 'api_gateway_routing',
      name: 'API Gateway Routing',
      description: 'Enable routing through the new API Gateway instead of direct routes',
      category: 'architecture',
      flag_type: 'boolean',
      default_value: 'false',
      is_active: true,
      created_by: null, // System-created
    });

    // Adapter layer integration flag
    await featureFlagService.upsertFlag({
      flag_key: 'adapter_layer_integration',
      name: 'Adapter Layer Integration',
      description: 'Enable adapter pattern for decoupled feature communication',
      category: 'architecture',
      flag_type: 'boolean',
      default_value: 'false',
      is_active: true,
      created_by: null,
    });

    // Employee management adapter flag
    await featureFlagService.upsertFlag({
      flag_key: 'employee_adapter_enabled',
      name: 'Employee Management Adapter',
      description: 'Use adapter layer for employee management operations',
      category: 'feature',
      flag_type: 'boolean',
      default_value: 'false',
      is_active: true,
      created_by: null,
    });

    // Recognition system adapter flag
    await featureFlagService.upsertFlag({
      flag_key: 'recognition_adapter_enabled',
      name: 'Recognition System Adapter',
      description: 'Use adapter layer for recognition system operations',
      category: 'feature',
      flag_type: 'boolean',
      default_value: 'false',
      is_active: true,
      created_by: null,
    });

    // Social features adapter flag
    await featureFlagService.upsertFlag({
      flag_key: 'social_adapter_enabled',
      name: 'Social Features Adapter',
      description: 'Use adapter layer for social features operations',
      category: 'feature',
      flag_type: 'boolean',
      default_value: 'false',
      is_active: true,
      created_by: null,
    });

    // Centralized error handling flag
    await featureFlagService.upsertFlag({
      flag_key: 'centralized_error_handling',
      name: 'Centralized Error Handling',
      description: 'Use API Gateway for standardized error handling and responses',
      category: 'architecture',
      flag_type: 'boolean',
      default_value: 'true', // This can be enabled immediately as it's non-breaking
      is_active: true,
      created_by: null,
    });

    // Rate limiting enhancement flag
    await featureFlagService.upsertFlag({
      flag_key: 'enhanced_rate_limiting',
      name: 'Enhanced Rate Limiting',
      description: 'Use API Gateway for advanced rate limiting and request throttling',
      category: 'security',
      flag_type: 'boolean',
      default_value: 'false',
      is_active: true,
      created_by: null,
    });

    logger.info('✅ API Gateway feature flags configured successfully');
  } catch (error: any) {
    logger.error('❌ Failed to setup API Gateway feature flags:', error?.message || 'unknown_error');
    // Don't throw here - gateway can still work without feature flags
  }
}

/**
 * Get API Gateway health status
 */
export function getApiGatewayHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  routes: number;
  uptime: number;
  version: string;
} {
  const routes = apiGateway.getRoutes();
  
  return {
    status: 'healthy',
    routes: routes.length,
    uptime: process.uptime(),
    version: '1.0.0',
  };
}

/**
 * Enable API Gateway for specific organization with gradual rollout
 */
export async function enableApiGatewayForOrganization(
  organizationId: number,
  rolloutPercentage: number = 0,
  enabledBy?: number
): Promise<void> {
  try {
    logger.info(`🔄 Enabling API Gateway for organization ${organizationId} at ${rolloutPercentage}% rollout`);

    await featureFlagService.setOrganizationFlag(
      'api_gateway_routing',
      organizationId,
      {
        isEnabled: true,
        rolloutPercentage,
        rolloutStrategy: 'percentage',
        environment: process.env.NODE_ENV || 'development',
        enabledBy,
      }
    );

    logger.info(`✅ API Gateway enabled for organization ${organizationId}`);
  } catch (error: any) {
    logger.error(`❌ Failed to enable API Gateway for organization ${organizationId}:`, error?.message || 'unknown_error');
    throw error;
  }
}

/**
 * Disable API Gateway for specific organization
 */
export async function disableApiGatewayForOrganization(
  organizationId: number,
  disabledBy?: number
): Promise<void> {
  try {
    logger.info(`🛑 Disabling API Gateway for organization ${organizationId}`);

    await featureFlagService.setOrganizationFlag(
      'api_gateway_routing',
      organizationId,
      {
        isEnabled: false,
        rolloutPercentage: 0,
        rolloutStrategy: 'percentage',
        environment: process.env.NODE_ENV || 'development',
        enabledBy: disabledBy,
      }
    );

    logger.info(`✅ API Gateway disabled for organization ${organizationId}`);
  } catch (error: any) {
    logger.error(`❌ Failed to disable API Gateway for organization ${organizationId}:`, error?.message || 'unknown_error');
    throw error;
  }
}

export { apiGateway };