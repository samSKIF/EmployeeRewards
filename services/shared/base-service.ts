// Base Service Class - All microservices inherit from this
// Provides common functionality like health checks, metrics, event handling

import express, { Application, Request, Response } from 'express';
import { eventBus, DomainEvent } from './event-bus';

export interface ServiceConfig {
  name: string;
  port: number;
  version: string;
  databaseUrl?: string;
  dependencies?: string[]; // Other services this service depends on
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    database?: boolean;
    dependencies?: Record<string, boolean>;
    custom?: Record<string, boolean>;
  };
}

export abstract class BaseService {
  protected app: Application;
  protected config: ServiceConfig;
  protected isShuttingDown: boolean = false;
  private startTime: Date;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.app = express();
    this.startTime = new Date();
    
    this.setupBaseMiddleware();
    this.setupHealthCheck();
    this.setupMetrics();
    this.registerEventHandlers();
  }

  private setupBaseMiddleware(): void {
    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${this.config.name}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
        
        // Publish metrics event
        if (duration > 200) { // Log slow requests
          eventBus.publish({
            type: 'service.slow_request',
            version: '1.0',
            source: this.config.name,
            data: {
              method: req.method,
              path: req.path,
              duration,
              statusCode: res.statusCode,
            },
          });
        }
      });
      
      next();
    });

    // Error handling
    this.app.use((err: Error, req: Request, res: Response, next: any) => {
      console.error(`[${this.config.name}] Error:`, err);
      
      // Publish error event
      eventBus.publish({
        type: 'service.error',
        version: '1.0',
        source: this.config.name,
        data: {
          error: err.message,
          stack: err.stack,
          path: req.path,
          method: req.method,
        },
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message,
      });
    });
  }

  private setupHealthCheck(): void {
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.performHealthCheck();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error: any) {
        res.status(503).json({
          status: 'unhealthy',
          error: error?.message || 'Health check failed',
        });
      }
    });
  }

  private setupMetrics(): void {
    this.app.get('/metrics', (req, res) => {
      const metrics = this.collectMetrics();
      res.json(metrics);
    });
  }

  protected async performHealthCheck(): Promise<HealthCheckResult> {
    const uptime = (Date.now() - this.startTime.getTime()) / 1000;
    
    const health: HealthCheckResult = {
      status: 'healthy',
      version: this.config.version,
      uptime,
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // Check database if configured
    if (this.config.databaseUrl) {
      try {
        const dbHealthy = await this.checkDatabase();
        health.checks.database = dbHealthy;
        if (!dbHealthy) health.status = 'degraded';
      } catch (error) {
        health.checks.database = false;
        health.status = 'unhealthy';
      }
    }

    // Check dependencies
    if (this.config.dependencies && this.config.dependencies.length > 0) {
      health.checks.dependencies = {};
      for (const dep of this.config.dependencies) {
        try {
          const depHealthy = await this.checkDependency(dep);
          health.checks.dependencies[dep] = depHealthy;
          if (!depHealthy) health.status = 'degraded';
        } catch (error) {
          health.checks.dependencies[dep] = false;
          health.status = 'degraded';
        }
      }
    }

    // Custom health checks (implemented by subclasses)
    const customChecks = await this.performCustomHealthChecks();
    if (customChecks && Object.keys(customChecks).length > 0) {
      health.checks.custom = customChecks;
      if (Object.values(customChecks).some(check => !check)) {
        health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded';
      }
    }

    return health;
  }

  protected collectMetrics(): any {
    return {
      service: this.config.name,
      version: this.config.version,
      uptime: (Date.now() - this.startTime.getTime()) / 1000,
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      custom: this.collectCustomMetrics(),
    };
  }

  // Abstract methods to be implemented by subclasses
  protected abstract setupRoutes(): void;
  protected abstract registerEventHandlers(): void;
  protected abstract checkDatabase(): Promise<boolean>;
  protected abstract performCustomHealthChecks(): Promise<Record<string, boolean>>;
  protected abstract collectCustomMetrics(): any;

  // Helper method to check service dependencies
  protected async checkDependency(serviceName: string): Promise<boolean> {
    // In production, make actual HTTP request to dependency's health endpoint
    // For now, return true
    return true;
  }

  // Publish domain events
  protected async publishEvent(
    type: string,
    data: any,
    metadata?: any
  ): Promise<void> {
    await eventBus.publish({
      type,
      version: '1.0',
      source: this.config.name,
      data,
      metadata,
    });
  }

  // Subscribe to domain events
  protected subscribeToEvent(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>,
    priority: number = 999
  ): void {
    eventBus.subscribe(eventType, handler, this.config.name, priority);
  }

  // Graceful shutdown
  protected setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      
      console.log(`[${this.config.name}] Received ${signal}, starting graceful shutdown...`);
      this.isShuttingDown = true;

      // Publish shutdown event
      await this.publishEvent('service.shutting_down', {
        service: this.config.name,
        signal,
      });

      // Stop accepting new requests
      this.app.set('isShuttingDown', true);

      // Wait for existing requests to complete (max 30 seconds)
      setTimeout(() => {
        console.log(`[${this.config.name}] Shutdown complete`);
        process.exit(0);
      }, 30000);

      // Perform cleanup
      await this.cleanup();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  // Cleanup method to be overridden by subclasses
  protected async cleanup(): Promise<void> {
    // Override in subclasses to close database connections, etc.
  }

  // Start the service
  public async start(): Promise<void> {
    // Setup routes (implemented by subclass)
    this.setupRoutes();

    // Setup graceful shutdown
    this.setupGracefulShutdown();

    // Start listening
    this.app.listen(this.config.port, () => {
      console.log(`[${this.config.name}] Service running on port ${this.config.port}`);
      console.log(`[${this.config.name}] Version: ${this.config.version}`);
      
      // Publish service started event
      this.publishEvent('service.started', {
        service: this.config.name,
        port: this.config.port,
        version: this.config.version,
      });
    });
  }

  // Standard response formats
  protected successResponse(data: any, message?: string): any {
    return {
      success: true,
      data,
      message: message || 'Operation successful',
      timestamp: new Date().toISOString(),
    };
  }

  protected errorResponse(error: string, message?: string, statusCode: number = 400): any {
    return {
      success: false,
      error,
      message: message || error,
      timestamp: new Date().toISOString(),
    };
  }

  // Pagination helper
  protected paginateResponse(
    data: any[],
    page: number,
    limit: number,
    total: number
  ): any {
    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      timestamp: new Date().toISOString(),
    };
  }
}