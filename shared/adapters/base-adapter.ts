// Base Adapter Interface and Abstract Classes
// Provides standardized patterns for feature communication and data access

import { z } from 'zod';
import { featureFlagService } from '../services/feature-flags.service';
import { logger } from '@shared/logger';

// Base context for all adapter operations
export interface AdapterContext {
  userId?: number;
  organizationId?: number;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  operationTimestamp: Date;
}

// Standard result wrapper for adapter operations
export interface AdapterResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    executionTime?: number;
    cacheHit?: boolean;
    fallbackUsed?: boolean;
    adapterVersion?: string;
  };
}

// Pagination interface for list operations
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginatedResult<T> extends AdapterResult<T[]> {
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Base adapter configuration
export interface AdapterConfig {
  adapterName: string;
  version: string;
  featureFlag?: string;
  cacheEnabled?: boolean;
  cacheTtl?: number;
  fallbackEnabled?: boolean;
  fallbackAdapter?: string;
  rateLimitEnabled?: boolean;
  rateLimitMax?: number;
  rateLimitWindow?: number;
}

// Abstract base adapter class
export abstract class BaseAdapter {
  protected config: AdapterConfig;
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor(config: AdapterConfig) {
    this.config = {
      cacheEnabled: false,
      cacheTtl: 300, // 5 minutes default
      fallbackEnabled: false,
      rateLimitEnabled: false,
      rateLimitMax: 100,
      rateLimitWindow: 60000, // 1 minute
      ...config,
    };
  }

  /**
   * Check if the adapter is enabled via feature flags
   */
  protected async isEnabled(context: AdapterContext): Promise<boolean> {
    if (!this.config.featureFlag) {
      return true; // No feature flag means always enabled
    }

    try {
      const result = await featureFlagService.evaluateFlag(
        this.config.featureFlag,
        {
          userId: context.userId,
          organizationId: context.organizationId,
          environment: process.env.NODE_ENV || 'development',
        }
      );
      return Boolean(result.value);
    } catch (error: any) {
      logger.error(`Failed to evaluate feature flag ${this.config.featureFlag}:`, error?.message || 'unknown_error');
      return false; // Fail closed
    }
  }

  /**
   * Execute an adapter operation with standardized error handling and metrics
   */
  protected async executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context: AdapterContext
  ): Promise<AdapterResult<T>> {
    const startTime = Date.now();
    const operationId = `${this.config.adapterName}.${operationName}`;

    try {
      logger.info(`🔧 Adapter operation started: ${operationId}`, {
        userId: context.userId,
        organizationId: context.organizationId,
        requestId: context.requestId,
      });

      // Check if adapter is enabled
      const isEnabled = await this.isEnabled(context);
      if (!isEnabled) {
        throw new Error(`Adapter ${this.config.adapterName} is disabled via feature flag`);
      }

      // Execute the operation
      const result = await operation();
      const executionTime = Date.now() - startTime;

      // Record performance metrics
      this.recordPerformanceMetric(operationId, executionTime);

      logger.info(`✅ Adapter operation completed: ${operationId}`, {
        executionTime,
        userId: context.userId,
        organizationId: context.organizationId,
      });

      return {
        success: true,
        data: result,
        metadata: {
          executionTime,
          cacheHit: false,
          fallbackUsed: false,
          adapterVersion: this.config.version,
        },
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      logger.error(`❌ Adapter operation failed: ${operationId}`, {
        error: error?.message || 'unknown_error',
        executionTime,
        userId: context.userId,
        organizationId: context.organizationId,
      });

      // Try fallback if enabled
      if (this.config.fallbackEnabled && this.config.fallbackAdapter) {
        try {
          logger.info(`🔄 Attempting fallback for ${operationId}`);
          // Fallback logic would be implemented by specific adapters
          // For now, just return the error with fallback metadata
        } catch (fallbackError: any) {
          logger.error(`❌ Fallback failed for ${operationId}:`, fallbackError?.message || 'unknown_error');
        }
      }

      return {
        success: false,
        error: {
          code: error.code || 'ADAPTER_ERROR',
          message: error.message || 'Unknown adapter error',
          details: {
            operation: operationId,
            adapter: this.config.adapterName,
            version: this.config.version,
          },
        },
        metadata: {
          executionTime,
          cacheHit: false,
          fallbackUsed: false,
          adapterVersion: this.config.version,
        },
      };
    }
  }

  /**
   * Create operation context from request data
   */
  protected createContext(
    userId?: number,
    organizationId?: number,
    requestId?: string,
    ipAddress?: string,
    userAgent?: string
  ): AdapterContext {
    return {
      userId,
      organizationId,
      requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ipAddress,
      userAgent,
      operationTimestamp: new Date(),
    };
  }

  /**
   * Record performance metrics for monitoring
   */
  private recordPerformanceMetric(operationId: string, executionTime: number): void {
    if (!this.performanceMetrics.has(operationId)) {
      this.performanceMetrics.set(operationId, []);
    }

    const metrics = this.performanceMetrics.get(operationId)!;
    metrics.push(executionTime);

    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Get performance metrics for this adapter
   */
  public getPerformanceMetrics(): Record<string, {
    operationCount: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    lastExecutionTime: number;
  }> {
    const result: Record<string, any> = {};

    const entries = Array.from(this.performanceMetrics.entries());
    for (const [operationId, times] of entries) {
      if (times.length === 0) continue;

      result[operationId] = {
        operationCount: times.length,
        averageTime: Math.round(times.reduce((sum: number, time: number) => sum + time, 0) / times.length),
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        lastExecutionTime: times[times.length - 1],
      };
    }

    return result;
  }

  /**
   * Get adapter health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    adapterName: string;
    version: string;
    uptime: number;
    operationCount: number;
    averageResponseTime: number;
    errorRate: number;
  } {
    const metrics = this.getPerformanceMetrics();
    const totalOperations = Object.values(metrics).reduce((sum, metric) => sum + metric.operationCount, 0);
    const averageResponseTime = totalOperations > 0
      ? Object.values(metrics).reduce((sum, metric) => sum + (metric.averageTime * metric.operationCount), 0) / totalOperations
      : 0;

    return {
      status: averageResponseTime < 1000 ? 'healthy' : averageResponseTime < 5000 ? 'degraded' : 'unhealthy',
      adapterName: this.config.adapterName,
      version: this.config.version,
      uptime: process.uptime(),
      operationCount: totalOperations,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: 0, // TODO: Implement error tracking
    };
  }
}

// Validation helper for adapter input/output
export class AdapterValidator {
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error: any) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  }

  static optional<T>(schema: z.ZodSchema<T>, data: unknown): T | undefined {
    if (data === undefined || data === null) {
      return undefined;
    }
    return AdapterValidator.validate(schema, data);
  }
}

// Common validation schemas
export const commonSchemas = {
  id: z.number().int().positive(),
  organizationId: z.number().int().positive(),
  userId: z.number().int().positive(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  timestamp: z.date(),
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(50),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
    filters: z.record(z.any()).optional(),
  }).partial(),
};

// Types are already exported above as interfaces