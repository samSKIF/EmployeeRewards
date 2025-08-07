#!/usr/bin/env tsx

/**
 * Recognition & Rewards Service
 * Handles points system, badges, achievements, and employee recognition
 */

import dotenv from 'dotenv';
dotenv.config();

import { BaseService } from '../../shared/base-service';
import { eventBus } from '../../shared/event-bus';
import { setupRoutes } from './api/routes';
import { checkDatabaseHealth } from './infrastructure/database/connection';

class RecognitionRewardsService extends BaseService {
  constructor() {
    super({
      name: 'recognition-rewards',
      version: '1.0.0',
      port: parseInt(process.env.RECOGNITION_PORT || '3003'),
      dependencies: ['employee-core']
    });
  }

  protected setupRoutes(): void {
    setupRoutes(this.app);
    console.log(`[recognition-rewards] Routes configured:
      - /api/v1/points/* (Points Management)
      - /api/v1/badges/* (Badge System)
      - /api/v1/achievements/* (Achievement Tracking)
      - /api/v1/recognition/* (Employee Recognition)
      - /api/v1/leaderboard/* (Leaderboard & Rankings)
      - /health (Health Check)
      - /metrics (Service Metrics)
    `);
  }

  protected registerEventHandlers(): void {
    // Subscribe to employee events
    eventBus.subscribe('employee.created', this.handleEmployeeCreated.bind(this));
    eventBus.subscribe('employee.milestone_reached', this.handleMilestoneReached.bind(this));
    
    // Subscribe to social events
    eventBus.subscribe('post.created', this.handlePostCreated.bind(this));
    eventBus.subscribe('post.liked', this.handlePostLiked.bind(this));
    eventBus.subscribe('comment.created', this.handleCommentCreated.bind(this));
    
    // Subscribe to leave events
    eventBus.subscribe('leave.request_approved', this.handleLeaveApproved.bind(this));
    
    // Subscribe to performance events
    eventBus.subscribe('performance.review_completed', this.handlePerformanceReviewCompleted.bind(this));
    
    console.log('[recognition-rewards] Event handlers registered');
  }

  private async handleEmployeeCreated(event: any): Promise<void> {
    console.log('[recognition-rewards] Processing employee.created event:', event.data.employeeId);
    try {
      // Initialize points balance for new employee
      eventBus.publish({
        type: 'points.balance_initialized',
        source: 'recognition-rewards',
        correlationId: event.correlationId,
        data: {
          employeeId: event.data.employeeId,
          initialBalance: 100,
          welcomeBonus: true
        }
      });
      
      // Award welcome badge
      eventBus.publish({
        type: 'badge.awarded',
        source: 'recognition-rewards',
        correlationId: event.correlationId,
        data: {
          employeeId: event.data.employeeId,
          badgeType: 'welcome',
          badgeName: 'New Team Member'
        }
      });
    } catch (error) {
      console.error('[recognition-rewards] Error processing employee.created:', error);
    }
  }

  private async handleMilestoneReached(event: any): Promise<void> {
    console.log('[recognition-rewards] Processing employee.milestone_reached event');
    // Award milestone badges and points
  }

  private async handlePostCreated(event: any): Promise<void> {
    console.log('[recognition-rewards] Processing post.created event');
    // Award points for creating content
  }

  private async handlePostLiked(event: any): Promise<void> {
    console.log('[recognition-rewards] Processing post.liked event');
    // Award points for engagement
  }

  private async handleCommentCreated(event: any): Promise<void> {
    console.log('[recognition-rewards] Processing comment.created event');
    // Award points for participation
  }

  private async handleLeaveApproved(event: any): Promise<void> {
    console.log('[recognition-rewards] Processing leave.request_approved event');
    // Track leave patterns for rewards
  }

  private async handlePerformanceReviewCompleted(event: any): Promise<void> {
    console.log('[recognition-rewards] Processing performance.review_completed event');
    // Award performance-based points and badges
    if (event.data.overallRating >= 4) {
      eventBus.publish({
        type: 'badge.awarded',
        source: 'recognition-rewards',
        correlationId: event.correlationId,
        data: {
          employeeId: event.data.employeeId,
          badgeType: 'performance',
          badgeName: 'High Performer'
        }
      });
    }
  }

  protected async checkDatabase(): Promise<boolean> {
    return checkDatabaseHealth();
  }
}

// Start the service
if (require.main === module) {
  const service = new RecognitionRewardsService();
  service.start().catch(error => {
    console.error('[recognition-rewards] Failed to start service:', error);
    process.exit(1);
  });
}