#!/usr/bin/env tsx

/**
 * HR Operations Service
 * Handles leave management, performance reviews, and HR workflows
 */

import dotenv from 'dotenv';
dotenv.config();

import { BaseService } from '../../shared/base-service';
import { eventBus } from '../../shared/event-bus';
import { setupRoutes } from './api/routes';
import { checkDatabaseHealth } from './infrastructure/database/connection';

class HROperationsService extends BaseService {
  constructor() {
    super({
      name: 'hr-operations',
      version: '1.0.0',
      port: parseInt(process.env.HR_OPERATIONS_PORT || '3004'),
      dependencies: ['employee-core']
    });
  }

  protected setupRoutes(): void {
    setupRoutes(this.app);
    console.log(`[hr-operations] Routes configured:
      - /api/v1/leave/* (Leave Management)
      - /api/v1/performance/* (Performance Reviews)
      - /api/v1/holidays/* (Holiday Calendar)
      - /api/v1/policies/* (HR Policies)
      - /health (Health Check)
      - /metrics (Service Metrics)
    `);
  }

  protected registerEventHandlers(): void {
    // Subscribe to employee events
    eventBus.subscribe('employee.created', this.handleEmployeeCreated.bind(this));
    eventBus.subscribe('employee.updated', this.handleEmployeeUpdated.bind(this));
    eventBus.subscribe('employee.deleted', this.handleEmployeeDeleted.bind(this));
    
    // Subscribe to organization events
    eventBus.subscribe('organization.policy_updated', this.handlePolicyUpdated.bind(this));
    
    console.log('[hr-operations] Event handlers registered');
  }

  private async handleEmployeeCreated(event: any): Promise<void> {
    console.log('[hr-operations] Processing employee.created event:', event.data.employeeId);
    // Initialize leave entitlements for new employee
    try {
      // Create default leave entitlements
      eventBus.publish({
        type: 'leave.entitlement_created',
        source: 'hr-operations',
        correlationId: event.correlationId,
        data: {
          employeeId: event.data.employeeId,
          entitlements: {
            annual: 21,
            sick: 10,
            personal: 3
          }
        }
      });
    } catch (error) {
      console.error('[hr-operations] Error processing employee.created:', error);
    }
  }

  private async handleEmployeeUpdated(event: any): Promise<void> {
    console.log('[hr-operations] Processing employee.updated event:', event.data.employeeId);
    // Update leave entitlements if department changed
  }

  private async handleEmployeeDeleted(event: any): Promise<void> {
    console.log('[hr-operations] Processing employee.deleted event:', event.data.employeeId);
    // Archive leave records and performance reviews
  }

  private async handlePolicyUpdated(event: any): Promise<void> {
    console.log('[hr-operations] Processing organization.policy_updated event');
    // Update leave policies
  }

  protected async checkDatabase(): Promise<boolean> {
    return checkDatabaseHealth();
  }
}

// Start the service
if (require.main === module) {
  const service = new HROperationsService();
  service.start().catch(error => {
    console.error('[hr-operations] Failed to start service:', error);
    process.exit(1);
  });
}