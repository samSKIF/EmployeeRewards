// Main route configuration for HR Operations Service
import { Express } from 'express';
import leaveRoutes from './leave.routes';
import performanceRoutes from './performance.routes';
import holidayRoutes from './holiday.routes';
import policyRoutes from './policy.routes';

export function setupRoutes(app: Express): void {
  // Health check
  app.get('/health', async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        service: 'hr-operations',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
      res.json(health);
    } catch (error: any) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  });

  // Metrics endpoint
  app.get('/metrics', (req, res) => {
    res.json({
      service: 'hr-operations',
      metrics: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    });
  });

  // API routes
  app.use('/api/v1/leave', leaveRoutes);
  app.use('/api/v1/performance', performanceRoutes);
  app.use('/api/v1/holidays', holidayRoutes);
  app.use('/api/v1/policies', policyRoutes);
}