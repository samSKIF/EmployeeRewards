// Employee Core Service - Main Entry Point
import { BaseService } from '../../shared/base-service';
import { ServiceConfig } from '../../shared/base-service';
import { checkDatabaseHealth, closeDatabaseConnection } from './infrastructure/database/connection';
import { employeeRoutes } from './api/routes/employee.routes';
import { authRoutes } from './api/routes/auth.routes';
import { departmentRoutes } from './api/routes/department.routes';
import { eventBus, EventTypes } from '../../shared/event-bus';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class EmployeeCoreService extends BaseService {
  constructor() {
    const config: ServiceConfig = {
      name: 'employee-core',
      port: parseInt(process.env.EMPLOYEE_CORE_PORT || '3001'),
      version: '1.0.0',
      databaseUrl: process.env.EMPLOYEE_CORE_DB_URL || process.env.DATABASE_URL,
      dependencies: [], // No dependencies - this is the core service
    };
    
    super(config);
  }

  /**
   * Setup service-specific routes
   */
  protected setupRoutes(): void {
    // Health check is already set up in base class
    
    // Authentication routes
    this.app.use('/api/v1/auth', authRoutes);
    
    // Employee management routes
    this.app.use('/api/v1/employees', employeeRoutes);
    
    // Department management routes
    this.app.use('/api/v1/departments', departmentRoutes);
    
    // Organization chart endpoint
    this.app.get('/api/v1/org-chart', async (req, res) => {
      try {
        // TODO: Implement org chart logic
        res.json(this.successResponse({
          message: 'Org chart endpoint - to be implemented',
        }));
      } catch (error: any) {
        res.status(500).json(this.errorResponse(
          'INTERNAL_ERROR',
          error?.message || 'Failed to get org chart'
        ));
      }
    });
    
    console.log(`[${this.config.name}] Routes configured:
      - /api/v1/auth/* (Authentication)
      - /api/v1/employees/* (Employee Management)
      - /api/v1/departments/* (Department Management)
      - /api/v1/org-chart (Organization Chart)
      - /health (Health Check)
      - /metrics (Service Metrics)
    `);
  }

  /**
   * Register event handlers for this service
   */
  protected registerEventHandlers(): void {
    // Listen for events from other services that might affect users
    
    // Example: When a leave request is approved, update user's leave balance
    this.subscribeToEvent('leave.request_approved', async (event) => {
      console.log(`[${this.config.name}] Received leave approval event:`, event.data);
      // TODO: Update user's leave balance or status if needed
    });
    
    // Example: When recognition is given, we might want to update user stats
    this.subscribeToEvent('recognition.given', async (event) => {
      console.log(`[${this.config.name}] Received recognition event:`, event.data);
      // TODO: Update user's recognition count or badges
    });
    
    // Example: When a post is created, track user activity
    this.subscribeToEvent('social.post_created', async (event) => {
      console.log(`[${this.config.name}] User created a post:`, event.data);
      // TODO: Update user's activity metrics
    });
    
    console.log(`[${this.config.name}] Event handlers registered`);
  }

  /**
   * Check database health
   */
  protected async checkDatabase(): Promise<boolean> {
    return checkDatabaseHealth();
  }

  /**
   * Perform custom health checks
   */
  protected async performCustomHealthChecks(): Promise<Record<string, boolean>> {
    const checks: Record<string, boolean> = {};
    
    // Check if JWT secret is configured
    checks.jwt_configured = !!process.env.JWT_SECRET;
    
    // Check if we can query users table
    try {
      const dbHealthy = await checkDatabaseHealth();
      checks.users_table = dbHealthy;
    } catch (error) {
      checks.users_table = false;
    }
    
    return checks;
  }

  /**
   * Collect custom metrics
   */
  protected collectCustomMetrics(): any {
    return {
      total_events_published: 0, // TODO: Track events
      total_logins_today: 0, // TODO: Track logins
      active_sessions: 0, // TODO: Track sessions
    };
  }

  /**
   * Cleanup on shutdown
   */
  protected async cleanup(): Promise<void> {
    console.log(`[${this.config.name}] Performing cleanup...`);
    
    // Close database connection
    await closeDatabaseConnection();
    
    // Unsubscribe from events
    eventBus.unsubscribe('leave.request_approved', this.config.name);
    eventBus.unsubscribe('recognition.given', this.config.name);
    eventBus.unsubscribe('social.post_created', this.config.name);
    
    console.log(`[${this.config.name}] Cleanup complete`);
  }
}

// Create and start the service
const service = new EmployeeCoreService();

// Start the service
service.start().catch((error) => {
  console.error('[Employee Core] Failed to start service:', error);
  process.exit(1);
});

// Export for testing
export default service;