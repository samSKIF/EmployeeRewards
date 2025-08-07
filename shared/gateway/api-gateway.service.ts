// API Gateway Service for Standardized Routing and Request Handling
// Provides centralized routing, authentication, error handling, and feature flag integration

import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z, ZodSchema } from 'zod';
import { verifyToken, AuthenticatedRequest } from '../../server/middleware/auth';
import { 
  initializeFeatureFlags, 
  requireFeatureFlag, 
  FeatureFlagRequest 
} from '../middleware/feature-flags.middleware';
import { featureFlagService } from '../services/feature-flags.service';

// Standard API response interfaces
export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  version?: string;
  requestId?: string;
}

export interface PaginatedApiResponse<T = any> extends StandardApiResponse<T[]> {
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Route configuration interface
export interface RouteConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: FeatureFlagRequest & AuthenticatedRequest, res: Response) => Promise<void> | void;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  auth?: {
    required: boolean;
    roles?: string[];
    adminRequired?: boolean;
  };
  validation?: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
  };
  rateLimit?: {
    windowMs?: number;
    max?: number;
    message?: string;
  };
  featureFlag?: {
    flagKey: string;
    required?: boolean; // If true, returns 404 when flag is off
  };
  cache?: {
    ttl: number; // Cache TTL in seconds
    key?: (req: Request) => string; // Custom cache key generator
  };
  description?: string;
}

// Gateway configuration
export interface GatewayConfig {
  version: string;
  rateLimit: {
    windowMs: number;
    max: number;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
  requestTimeout: number;
  maxRequestSize: string;
}

export class ApiGatewayService {
  private router: Router;
  private routes: RouteConfig[] = [];
  private responseCache: Map<string, { data: any; expires: number }> = new Map();
  private config: GatewayConfig;

  constructor(config: Partial<GatewayConfig> = {}) {
    this.router = Router();
    this.config = {
      version: '1.0.0',
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
      },
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:5000'],
        credentials: true,
      },
      requestTimeout: 30000, // 30 seconds
      maxRequestSize: '10mb',
      ...config,
    };

    this.setupGlobalMiddleware();
    this.setupErrorHandling();
  }

  /**
   * Register a new route with the gateway
   */
  registerRoute(routeConfig: RouteConfig): void {
    this.routes.push(routeConfig);
    this.setupRoute(routeConfig);
  }

  /**
   * Register multiple routes at once
   */
  registerRoutes(routeConfigs: RouteConfig[]): void {
    routeConfigs.forEach(config => this.registerRoute(config));
  }

  /**
   * Get the configured router instance
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Get all registered routes (for documentation/debugging)
   */
  getRoutes(): RouteConfig[] {
    return [...this.routes];
  }

  /**
   * Create a standardized success response
   */
  static successResponse<T>(
    data: T,
    message?: string,
    pagination?: PaginatedApiResponse<T>['pagination']
  ): StandardApiResponse<T> | PaginatedApiResponse<T> {
    const response: StandardApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    if (pagination) {
      return { ...response, pagination } as PaginatedApiResponse<T>;
    }

    return response;
  }

  /**
   * Create a standardized error response
   */
  static errorResponse(
    error: string,
    message?: string,
    statusCode: number = 400
  ): StandardApiResponse {
    return {
      success: false,
      error,
      message: message || error,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  /**
   * Middleware to send standardized responses
   */
  static sendResponse = (
    res: Response,
    data: any,
    statusCode: number = 200,
    message?: string,
    pagination?: any
  ): void => {
    const response = ApiGatewayService.successResponse(data, message, pagination);
    res.status(statusCode).json(response);
  };

  /**
   * Middleware to send standardized error responses
   */
  static sendError = (
    res: Response,
    error: string,
    statusCode: number = 400,
    message?: string
  ): void => {
    const response = ApiGatewayService.errorResponse(error, message, statusCode);
    res.status(statusCode).json(response);
  };

  // Private methods

  private setupGlobalMiddleware(): void {
    // Request ID middleware
    this.router.use((req: Request, res: Response, next: NextFunction) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);
      next();
    });

    // Initialize feature flags for all gateway requests
    this.router.use(initializeFeatureFlags());

    // Global rate limiting
    this.router.use(rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      standardHeaders: this.config.rateLimit.standardHeaders,
      legacyHeaders: this.config.rateLimit.legacyHeaders,
      message: {
        success: false,
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        timestamp: new Date().toISOString(),
      },
    }));

    // Request timeout middleware
    this.router.use((req: Request, res: Response, next: NextFunction) => {
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          ApiGatewayService.sendError(res, 'Request timeout', 408, 'The request took too long to process');
        }
      }, this.config.requestTimeout);

      res.on('finish', () => clearTimeout(timeout));
      res.on('close', () => clearTimeout(timeout));
      next();
    });
  }

  private setupRoute(config: RouteConfig): void {
    const middleware: Array<(req: any, res: Response, next: NextFunction) => void> = [];

    // Add custom middleware first
    if (config.middleware) {
      middleware.push(...config.middleware);
    }

    // Add route-specific rate limiting
    if (config.rateLimit) {
      middleware.push(rateLimit({
        windowMs: config.rateLimit.windowMs || this.config.rateLimit.windowMs,
        max: config.rateLimit.max || this.config.rateLimit.max,
        message: ApiGatewayService.errorResponse(
          'Route rate limit exceeded',
          config.rateLimit.message || 'Too many requests to this endpoint'
        ),
      }));
    }

    // Add authentication if required
    if (config.auth?.required) {
      middleware.push(verifyToken);
      
      if (config.auth.adminRequired) {
        middleware.push(this.requireAdmin);
      }

      if (config.auth.roles && config.auth.roles.length > 0) {
        middleware.push(this.requireRoles(config.auth.roles));
      }
    }

    // Add feature flag check
    if (config.featureFlag) {
      if (config.featureFlag.required) {
        middleware.push(requireFeatureFlag(config.featureFlag.flagKey));
      } else {
        // Just preload the flag for use in handler
        middleware.push(async (req: any, res: Response, next: NextFunction) => {
          if (req.featureFlags) {
            await req.featureFlags.isEnabled(config.featureFlag!.flagKey);
          }
          next();
        });
      }
    }

    // Add request validation
    if (config.validation) {
      middleware.push(this.createValidationMiddleware(config.validation));
    }

    // Add cache check (for GET requests)
    if (config.cache && config.method === 'GET') {
      middleware.push(this.createCacheMiddleware(config.cache));
    }

    // Create the final handler with error catching
    const finalHandler = async (req: any, res: Response, next: NextFunction) => {
      try {
        await config.handler(req, res);
      } catch (error: any) {
        console.error(`Route handler error for ${config.method} ${config.path}:`, error?.message || 'unknown_error');
        next(error);
      }
    };

    // Register the route
    const method = config.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
    (this.router as any)[method](config.path, ...middleware, finalHandler);
  }

  private requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.is_admin && req.user?.role_type !== 'corporate_admin') {
      return ApiGatewayService.sendError(
        res,
        'Access denied',
        403,
        'Administrator privileges required'
      );
    }
    next();
  };

  private requireRoles = (requiredRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const userRole = req.user?.role_type || 'employee';
      if (!requiredRoles.includes(userRole)) {
        return ApiGatewayService.sendError(
          res,
          'Access denied',
          403,
          `Required roles: ${requiredRoles.join(', ')}`
        );
      }
      next();
    };
  };

  private createValidationMiddleware(validation: RouteConfig['validation']) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (validation?.body) {
          req.body = validation.body.parse(req.body);
        }
        if (validation?.query) {
          req.query = validation.query.parse(req.query);
        }
        if (validation?.params) {
          req.params = validation.params.parse(req.params);
        }
        next();
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return ApiGatewayService.sendError(
            res,
            'Validation error',
            400,
            error.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
          );
        }
        next(error);
      }
    };
  }

  private createCacheMiddleware(cacheConfig: RouteConfig['cache']) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!cacheConfig) return next();

      const cacheKey = cacheConfig.key ? cacheConfig.key(req) : `${req.method}:${req.originalUrl}`;
      const cached = this.responseCache.get(cacheKey);

      if (cached && cached.expires > Date.now()) {
        return ApiGatewayService.sendResponse(res, cached.data, 200, 'Cached response');
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data: any) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const expires = Date.now() + (cacheConfig!.ttl * 1000);
          const cacheEntry = { data, expires };
          (req as any).gateway?.responseCache.set(cacheKey, cacheEntry);
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('API Gateway Error:', error?.message || 'unknown_error', {
        path: req.path,
        method: req.method,
        requestId: req.headers['x-request-id'],
      });

      // Don't send error response if headers already sent
      if (res.headersSent) {
        return next(error);
      }

      // Handle specific error types
      if (error.name === 'ValidationError') {
        return ApiGatewayService.sendError(res, 'Validation error', 400, error.message);
      }

      if (error.message.includes('jwt')) {
        return ApiGatewayService.sendError(res, 'Authentication error', 401, 'Invalid or expired token');
      }

      if (error.message.includes('rate limit')) {
        return ApiGatewayService.sendError(res, 'Rate limit exceeded', 429, error.message);
      }

      // Generic server error
      return ApiGatewayService.sendError(
        res,
        'Internal server error',
        500,
        process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      );
    });

    // 404 handler for unmatched routes
    this.router.use('*', (req: Request, res: Response) => {
      ApiGatewayService.sendError(
        res,
        'Route not found',
        404,
        `The endpoint ${req.method} ${req.originalUrl} does not exist`
      );
    });
  }
}

// Export singleton instance
export const apiGateway = new ApiGatewayService();

// Helper functions for route registration
export const registerGatewayRoute = (config: RouteConfig) => apiGateway.registerRoute(config);
export const registerGatewayRoutes = (configs: RouteConfig[]) => apiGateway.registerRoutes(configs);
export const getGatewayRouter = () => apiGateway.getRouter();