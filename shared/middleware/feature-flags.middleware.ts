// Feature Flag Middleware for Express.js
// Provides request-level feature flag evaluation and route protection

import { Request, Response, NextFunction } from 'express';
import { featureFlagService, FeatureFlagContext } from '../services/feature-flags.service';
import { User } from '../schema';

// Interface extending AuthenticatedRequest for feature flag context
export interface FeatureFlagRequest extends Request {
  user?: Omit<User, 'password'>;
  featureFlags?: {
    isEnabled: (flagKey: string) => Promise<boolean>;
    getValue: (flagKey: string) => Promise<any>;
    getStringValue: (flagKey: string, defaultValue?: string) => Promise<string>;
    getNumericValue: (flagKey: string, defaultValue?: number) => Promise<number>;
    context: FeatureFlagContext;
    evaluatedFlags: Record<string, any>;
  };
}

/**
 * Initialize feature flag context for the request
 * Should be used early in the middleware chain
 */
export function initializeFeatureFlags() {
  return (req: FeatureFlagRequest, res: Response, next: NextFunction) => {
    try {
      // Extract context from request
      const context: FeatureFlagContext = {
        userId: req.user?.id,
        organizationId: req.user?.organization_id || req.headers['x-organization-id'] as any,
        environment: process.env.NODE_ENV || 'development',
        requestContext: {
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          route: req.path,
          method: req.method,
        },
      };

      // Add feature flag utilities to request object
      req.featureFlags = {
        context,
        evaluatedFlags: {},
        
        isEnabled: async (flagKey: string): Promise<boolean> => {
          if (req.featureFlags!.evaluatedFlags[flagKey] !== undefined) {
            return Boolean(req.featureFlags!.evaluatedFlags[flagKey]);
          }
          
          const result = await featureFlagService.isEnabled(flagKey, context);
          req.featureFlags!.evaluatedFlags[flagKey] = result;
          return result;
        },

        getValue: async (flagKey: string): Promise<any> => {
          if (req.featureFlags!.evaluatedFlags[flagKey] !== undefined) {
            return req.featureFlags!.evaluatedFlags[flagKey];
          }
          
          const result = await featureFlagService.evaluateFlag(flagKey, context);
          req.featureFlags!.evaluatedFlags[flagKey] = result.value;
          return result.value;
        },

        getStringValue: async (flagKey: string, defaultValue: string = ''): Promise<string> => {
          const value = await req.featureFlags!.getValue(flagKey);
          return String(value || defaultValue);
        },

        getNumericValue: async (flagKey: string, defaultValue: number = 0): Promise<number> => {
          const value = await req.featureFlags!.getValue(flagKey);
          const numValue = Number(value);
          return isNaN(numValue) ? defaultValue : numValue;
        },
      };

      next();
    } catch (error: any) {
      console.error('Feature flags middleware error:', error?.message || 'unknown_error');
      // Don't fail the request if feature flags fail - continue without them
      next();
    }
  };
}

/**
 * Middleware to require a feature flag to be enabled for route access
 * Returns 404 if flag is disabled to avoid exposing feature existence
 */
export function requireFeatureFlag(flagKey: string) {
  return async (req: FeatureFlagRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.featureFlags) {
        console.warn('Feature flags not initialized - ensure initializeFeatureFlags() is used first');
        return res.status(500).json({
          success: false,
          error: 'Feature flags not initialized',
        });
      }

      const isEnabled = await req.featureFlags.isEnabled(flagKey);
      
      if (!isEnabled) {
        // Return 404 to avoid exposing the existence of experimental features
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'The requested resource was not found',
        });
      }

      next();
    } catch (error: any) {
      console.error(`Feature flag check error for ${flagKey}:`, error?.message || 'unknown_error');
      
      // Fail-safe: if feature flag service is down, allow access to avoid breaking existing functionality
      console.warn(`Feature flag service unavailable, allowing access to ${flagKey}`);
      next();
    }
  };
}

/**
 * Middleware to conditionally execute different handlers based on feature flag
 */
export function conditionalHandler(
  flagKey: string,
  enabledHandler: (req: FeatureFlagRequest, res: Response, next: NextFunction) => void,
  disabledHandler?: (req: FeatureFlagRequest, res: Response, next: NextFunction) => void
) {
  return async (req: FeatureFlagRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.featureFlags) {
        console.warn('Feature flags not initialized - ensure initializeFeatureFlags() is used first');
        return next();
      }

      const isEnabled = await req.featureFlags.isEnabled(flagKey);
      
      if (isEnabled) {
        return enabledHandler(req, res, next);
      } else if (disabledHandler) {
        return disabledHandler(req, res, next);
      } else {
        // If no disabled handler, just continue to next middleware
        return next();
      }
    } catch (error: any) {
      console.error(`Conditional handler error for ${flagKey}:`, error?.message || 'unknown_error');
      // On error, use the disabled handler or continue
      if (disabledHandler) {
        return disabledHandler(req, res, next);
      }
      return next();
    }
  };
}

/**
 * Middleware to pre-load multiple feature flags for better performance
 */
export function preloadFeatureFlags(flagKeys: string[]) {
  return async (req: FeatureFlagRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.featureFlags) {
        console.warn('Feature flags not initialized - ensure initializeFeatureFlags() is used first');
        return next();
      }

      // Evaluate all flags in parallel
      const results = await featureFlagService.evaluateFlags(flagKeys, req.featureFlags.context);
      
      // Store results in request context
      Object.keys(results).forEach(flagKey => {
        req.featureFlags!.evaluatedFlags[flagKey] = results[flagKey].value;
      });

      next();
    } catch (error: any) {
      console.error('Error preloading feature flags:', error?.message || 'unknown_error');
      // Continue without preloaded flags
      next();
    }
  };
}

/**
 * Utility function to check if a feature is enabled from within route handlers
 */
export async function checkFeatureFlag(req: FeatureFlagRequest, flagKey: string): Promise<boolean> {
  if (!req.featureFlags) {
    console.warn('Feature flags not initialized in request');
    return false;
  }
  
  return await req.featureFlags.isEnabled(flagKey);
}

/**
 * Middleware to add feature flag information to response headers (for debugging)
 * Only active in development environment
 */
export function debugFeatureFlags() {
  return (req: FeatureFlagRequest, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development' && req.featureFlags) {
      // Add evaluated flags to response headers for debugging
      const originalSend = res.send;
      res.send = function (data) {
        if (req.featureFlags && Object.keys(req.featureFlags.evaluatedFlags).length > 0) {
          res.setHeader('X-Feature-Flags', JSON.stringify(req.featureFlags.evaluatedFlags));
        }
        return originalSend.call(this, data);
      };
    }
    next();
  };
}

/**
 * Express error handler for feature flag related errors
 */
export function handleFeatureFlagErrors() {
  return (error: Error, req: FeatureFlagRequest, res: Response, next: NextFunction) => {
    if (error.message.includes('feature flag') || error.message.includes('Feature flag')) {
      console.error('Feature flag error:', error.message);
      
      return res.status(500).json({
        success: false,
        error: 'Feature configuration error',
        message: 'There was an issue with the feature configuration. Please try again later.',
      });
    }
    
    // Pass to next error handler if not feature flag related
    next(error);
  };
}