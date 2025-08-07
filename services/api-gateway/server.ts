#!/usr/bin/env tsx

/**
 * API Gateway Server
 * Routes requests to microservices based on path patterns
 */

import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import gatewayConfig from './gateway-config';

class APIGatewayServer {
  private app: express.Application;
  private activeServices: Set<string> = new Set();

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupHealthChecks();
    this.setupServiceRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(cors(gatewayConfig.cors));

    // Security headers
    this.app.use((req, res, next) => {
      Object.entries(gatewayConfig.securityHeaders).forEach(([header, value]) => {
        res.setHeader(header, value);
      });
      next();
    });

    // Rate limiting
    const limiter = rateLimit({
      windowMs: gatewayConfig.rateLimitWindowMs,
      max: gatewayConfig.rateLimitMax,
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use('/api/', limiter);

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[Gateway] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      next();
    });

    // Parse JSON bodies for non-proxy routes
    this.app.use(express.json());
  }

  private setupHealthChecks(): void {
    // Gateway health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        activeServices: Array.from(this.activeServices),
        uptime: process.uptime()
      });
    });

    // Service discovery endpoint
    this.app.get('/services', (req, res) => {
      const services = gatewayConfig.services.reduce((acc, service) => {
        if (!acc[service.name]) {
          acc[service.name] = {
            name: service.name,
            url: service.url,
            version: service.version,
            endpoints: []
          };
        }
        acc[service.name].endpoints.push(service.prefix);
        return acc;
      }, {} as Record<string, any>);

      res.json({
        services: Object.values(services),
        timestamp: new Date().toISOString()
      });
    });

    // Check service health periodically
    if (gatewayConfig.enableHealthChecks) {
      this.checkServiceHealth();
      setInterval(() => this.checkServiceHealth(), 30000);
    }
  }

  private async checkServiceHealth(): Promise<void> {
    const uniqueServices = new Map<string, typeof gatewayConfig.services[0]>();
    
    gatewayConfig.services.forEach(service => {
      if (!uniqueServices.has(service.name)) {
        uniqueServices.set(service.name, service);
      }
    });

    for (const [name, service] of uniqueServices) {
      try {
        const response = await fetch(`${service.url}${service.healthCheck}`);
        if (response.ok) {
          this.activeServices.add(name);
        } else {
          this.activeServices.delete(name);
          console.warn(`[Gateway] Service ${name} health check failed`);
        }
      } catch (error) {
        this.activeServices.delete(name);
        // Service is not available yet
      }
    }
  }

  private setupServiceRoutes(): void {
    // Create proxy middleware for each service route
    gatewayConfig.services.forEach(service => {
      const proxyOptions = {
        target: service.url,
        changeOrigin: true,
        pathRewrite: service.rewrite ? { [`^${service.prefix}`]: '' } : undefined,
        onProxyReq: (proxyReq: any, req: Request) => {
          // Add service headers
          proxyReq.setHeader('X-Service-Name', service.name);
          proxyReq.setHeader('X-Service-Version', service.version);
          proxyReq.setHeader('X-Request-ID', this.generateRequestId());
        },
        onProxyRes: (proxyRes: any, req: Request, res: Response) => {
          // Add response headers
          proxyRes.headers['X-Service-Name'] = service.name;
        },
        onError: (err: Error, req: Request, res: Response) => {
          console.error(`[Gateway] Proxy error for ${service.name}:`, err.message);
          res.status(503).json({
            error: 'Service Unavailable',
            message: `The ${service.name} service is currently unavailable`,
            service: service.name
          });
        }
      };

      this.app.use(service.prefix, createProxyMiddleware(proxyOptions));
      console.log(`[Gateway] Route ${service.prefix} -> ${service.url}`);
    });

    // Fallback route for the monolith during migration
    const monolithProxy = createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true
    });
    
    this.app.use('/api', (req, res, next) => {
      monolithProxy(req, res, (err) => {
        if (err) {
          console.error('[Gateway] Monolith proxy error:', err.message);
          res.status(503).json({
            error: 'Service Unavailable',
            message: 'The requested service is temporarily unavailable'
          });
        }
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.path} not found`,
        availableServices: '/services'
      });
    });

    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('[Gateway] Unhandled error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      });
    });
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public start(): void {
    const port = gatewayConfig.port || 3000;
    
    this.app.listen(port, () => {
      console.log(`
========================================
🌐 API Gateway Started
========================================
Port: ${port}
Health: http://localhost:${port}/health
Services: http://localhost:${port}/services
========================================
Registered Routes:
${gatewayConfig.services.map(s => `  ${s.prefix} -> ${s.name}`).join('\n')}
========================================
      `);
    });
  }
}

// Start the server
if (require.main === module) {
  const server = new APIGatewayServer();
  server.start();
}