// API Gateway - Single entry point for all microservices
// Routes requests to appropriate services based on path

import express, { Request, Response, NextFunction } from 'express';
import httpProxy from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import { eventBus } from '../shared/event-bus';

export interface ServiceRegistry {
  name: string;
  url: string;
  healthCheck: string;
  version: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
}

export interface GatewayConfig {
  port: number;
  services: ServiceRegistry[];
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  enableMetrics?: boolean;
  enableHealthChecks?: boolean;
}

export class APIGateway {
  private app: express.Application;
  private services: Map<string, ServiceRegistry> = new Map();
  private config: GatewayConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: GatewayConfig) {
    this.app = express();
    this.config = config;
    this.setupMiddleware();
    this.registerServices(config.services);
    this.setupRoutes();
    this.startHealthChecks();
  }

  private setupMiddleware(): void {
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

    // Rate limiting
    if (this.config.rateLimitMax) {
      const limiter = rateLimit({
        windowMs: this.config.rateLimitWindowMs || 15 * 60 * 1000, // 15 minutes default
        max: this.config.rateLimitMax,
        message: 'Too many requests from this IP, please try again later.',
      });
      this.app.use(limiter);
    }

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[GATEWAY] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
        
        // Publish request metrics as events
        eventBus.publish({
          type: 'gateway.request_processed',
          version: '1.0',
          source: 'api-gateway',
          data: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            timestamp: new Date().toISOString(),
          },
        });
      });
      next();
    });

    // Body parsing for gateway-level operations
    this.app.use(express.json());
  }

  private registerServices(services: ServiceRegistry[]): void {
    services.forEach(service => {
      this.services.set(service.name, service);
      console.log(`[GATEWAY] Registered service: ${service.name} at ${service.url}`);
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const services = Array.from(this.services.values()).map(s => ({
        name: s.name,
        status: s.status,
        version: s.version,
      }));

      const overallHealth = services.every(s => s.status === 'healthy') ? 'healthy' : 'degraded';

      res.json({
        status: overallHealth,
        timestamp: new Date().toISOString(),
        services,
      });
    });

    // Metrics endpoint
    if (this.config.enableMetrics) {
      this.app.get('/metrics', async (req, res) => {
        const metrics = eventBus.getMetrics();
        res.json({
          gateway: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
          },
          events: metrics,
          services: Array.from(this.services.values()),
        });
      });
    }

    // Service discovery endpoint
    this.app.get('/services', (req, res) => {
      const services = Array.from(this.services.values()).map(s => ({
        name: s.name,
        version: s.version,
        status: s.status,
        endpoints: this.getServiceEndpoints(s.name),
      }));
      res.json(services);
    });

    // Route to services based on path prefix
    this.setupServiceProxies();

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Route not found',
        message: `No service registered for path: ${req.path}`,
      });
    });

    // Error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('[GATEWAY] Error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
      });
    });
  }

  private setupServiceProxies(): void {
    // Employee Core Service routes
    this.app.use('/api/v1/employees', this.createProxy('employee-core'));
    this.app.use('/api/v1/auth', this.createProxy('employee-core'));
    this.app.use('/api/v1/departments', this.createProxy('employee-core'));
    
    // HR Operations Service routes
    this.app.use('/api/v1/leave', this.createProxy('hr-operations'));
    this.app.use('/api/v1/performance', this.createProxy('hr-operations'));
    
    // Recognition & Rewards Service routes
    this.app.use('/api/v1/recognition', this.createProxy('recognition-rewards'));
    this.app.use('/api/v1/rewards', this.createProxy('recognition-rewards'));
    this.app.use('/api/v1/points', this.createProxy('recognition-rewards'));
    
    // Social Engagement Service routes
    this.app.use('/api/v1/social', this.createProxy('social-engagement'));
    this.app.use('/api/v1/channels', this.createProxy('social-engagement'));
    this.app.use('/api/v1/interests', this.createProxy('social-engagement'));
  }

  private createProxy(serviceName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const service = this.services.get(serviceName);
      
      if (!service) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: `Service ${serviceName} is not registered`,
        });
      }

      if (service.status !== 'healthy') {
        return res.status(503).json({
          error: 'Service unhealthy',
          message: `Service ${serviceName} is currently ${service.status}`,
        });
      }

      // Forward the request to the service
      const targetUrl = `${service.url}${req.path}`;
      
      // For now, we'll use a simple proxy. In production, use http-proxy-middleware
      // This is a placeholder for the actual proxy implementation
      console.log(`[GATEWAY] Proxying ${req.method} ${req.path} to ${targetUrl}`);
      
      // In real implementation, forward the request and return response
      res.json({
        message: `Request would be forwarded to ${serviceName}`,
        targetUrl,
        service: service.name,
      });
    };
  }

  private async checkServiceHealth(service: ServiceRegistry): Promise<void> {
    try {
      // In production, make actual HTTP request to health endpoint
      const healthUrl = `${service.url}${service.healthCheck}`;
      // const response = await fetch(healthUrl, { timeout: 5000 });
      // service.status = response.ok ? 'healthy' : 'unhealthy';
      
      // For now, mark as healthy
      service.status = 'healthy';
    } catch (error) {
      service.status = 'unhealthy';
      console.error(`[GATEWAY] Health check failed for ${service.name}:`, error);
    }
  }

  private startHealthChecks(): void {
    if (!this.config.enableHealthChecks) return;

    // Initial health check
    this.services.forEach(service => {
      this.checkServiceHealth(service);
    });

    // Periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.services.forEach(service => {
        this.checkServiceHealth(service);
      });
    }, 30000); // Every 30 seconds
  }

  private getServiceEndpoints(serviceName: string): string[] {
    // Return the API endpoints this service handles
    const endpoints: Record<string, string[]> = {
      'employee-core': ['/api/v1/employees', '/api/v1/auth', '/api/v1/departments'],
      'hr-operations': ['/api/v1/leave', '/api/v1/performance'],
      'recognition-rewards': ['/api/v1/recognition', '/api/v1/rewards', '/api/v1/points'],
      'social-engagement': ['/api/v1/social', '/api/v1/channels', '/api/v1/interests'],
    };
    
    return endpoints[serviceName] || [];
  }

  public start(): void {
    this.app.listen(this.config.port, () => {
      console.log(`[GATEWAY] API Gateway running on port ${this.config.port}`);
      console.log(`[GATEWAY] Managing ${this.services.size} services`);
      
      // Publish gateway started event
      eventBus.publish({
        type: 'gateway.started',
        version: '1.0',
        source: 'api-gateway',
        data: {
          port: this.config.port,
          services: Array.from(this.services.keys()),
        },
      });
    });
  }

  public stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    eventBus.publish({
      type: 'gateway.stopped',
      version: '1.0',
      source: 'api-gateway',
      data: {
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Configuration for services
const gatewayConfig: GatewayConfig = {
  port: 3000,
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // 100 requests per window
  enableMetrics: true,
  enableHealthChecks: true,
  services: [
    {
      name: 'employee-core',
      url: 'http://localhost:3001',
      healthCheck: '/health',
      version: '1.0.0',
      status: 'unknown',
    },
    {
      name: 'hr-operations',
      url: 'http://localhost:3004',
      healthCheck: '/health',
      version: '1.0.0',
      status: 'unknown',
    },
    {
      name: 'recognition-rewards',
      url: 'http://localhost:3003',
      healthCheck: '/health',
      version: '1.0.0',
      status: 'unknown',
    },
    {
      name: 'social-engagement',
      url: 'http://localhost:3002',
      healthCheck: '/health',
      version: '1.0.0',
      status: 'unknown',
    },
  ],
};

// Export for use in migration
export const gateway = new APIGateway(gatewayConfig);