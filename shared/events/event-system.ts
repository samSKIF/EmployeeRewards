// Event-Driven Communication System
// Provides centralized event bus for decoupled feature communication

import { EventEmitter } from 'events';
import { z } from 'zod';
import { logger } from '@shared/logger';
import { featureFlagService } from '../services/feature-flags.service';

// Base event schema
export const baseEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  source: z.string(),
  timestamp: z.date(),
  version: z.string().default('1.0'),
  correlationId: z.string().optional(),
  userId: z.number().optional(),
  organizationId: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export type BaseEvent = z.infer<typeof baseEventSchema>;

// Event with typed payload
export interface TypedEvent<T = any> extends BaseEvent {
  data: T;
}

// Event handler type
export type EventHandler<T = any> = (event: TypedEvent<T>) => Promise<void> | void;

// Event subscription
export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  source: string;
  options: {
    priority?: number;
    retries?: number;
    timeout?: number;
    deadLetterQueue?: boolean;
  };
}

// Event processing result
export interface EventProcessingResult {
  success: boolean;
  handlerResults: Array<{
    subscriptionId: string;
    success: boolean;
    error?: string;
    executionTime: number;
  }>;
  totalExecutionTime: number;
}

// Dead letter queue entry
export interface DeadLetterEntry {
  event: TypedEvent;
  subscription: EventSubscription;
  error: string;
  attempts: number;
  lastAttempt: Date;
  nextRetry?: Date;
}

export class EventSystem {
  private static instance: EventSystem;
  private eventEmitter: EventEmitter;
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private deadLetterQueue: DeadLetterEntry[] = [];
  private eventHistory: TypedEvent[] = [];
  private maxHistorySize = 1000;
  private processingMetrics: Map<string, {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    averageProcessingTime: number;
  }> = new Map();

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(100); // Support many subscriptions
    
    // Setup periodic dead letter queue processing
    setInterval(() => this.processDeadLetterQueue(), 30000); // Every 30 seconds
    
    logger.info('🎯 Event System initialized');
  }

  public static getInstance(): EventSystem {
    if (!EventSystem.instance) {
      EventSystem.instance = new EventSystem();
    }
    return EventSystem.instance;
  }

  /**
   * Subscribe to events by type
   */
  subscribe<T>(
    eventType: string,
    handler: EventHandler<T>,
    source: string,
    options: EventSubscription['options'] = {}
  ): string {
    const subscription: EventSubscription = {
      id: `${source}_${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      handler: handler as EventHandler,
      source,
      options: {
        priority: 0,
        retries: 3,
        timeout: 5000,
        deadLetterQueue: true,
        ...options,
      },
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const typeSubscriptions = this.subscriptions.get(eventType)!;
    typeSubscriptions.push(subscription);
    
    // Sort by priority (higher priority first)
    typeSubscriptions.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));

    logger.debug(`📝 Event subscription registered: ${subscription.id}`, {
      eventType,
      source,
      options,
    });

    return subscription.id;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        if (subscriptions.length === 0) {
          this.subscriptions.delete(eventType);
        }
        
        logger.debug(`🗑️ Event subscription removed: ${subscriptionId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Publish an event to all subscribers
   */
  async publish<T>(event: Omit<TypedEvent<T>, 'id' | 'timestamp'>): Promise<EventProcessingResult> {
    const fullEvent: TypedEvent<T> = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event,
    };

    // Validate event structure
    try {
      baseEventSchema.parse(fullEvent);
    } catch (error: any) {
      logger.error('❌ Invalid event structure:', error?.message || 'unknown_error');
      throw new Error(`Invalid event structure: ${error?.message}`);
    }

    // Check if event processing is enabled via feature flags
    try {
      const isEnabled = await featureFlagService.evaluateFlag('event_driven_communication', {
        organizationId: fullEvent.organizationId,
        userId: fullEvent.userId,
      });

      if (!Boolean(isEnabled.value)) {
        logger.warn('⚠️ Event processing disabled via feature flag', {
          eventType: fullEvent.type,
          eventId: fullEvent.id,
        });
        return {
          success: true,
          handlerResults: [],
          totalExecutionTime: 0,
        };
      }
    } catch (error: any) {
      // Continue processing if feature flag evaluation fails
      logger.warn('⚠️ Feature flag evaluation failed, continuing with event processing');
    }

    // Add to event history
    this.addToHistory(fullEvent);

    logger.info(`🚀 Publishing event: ${fullEvent.type}`, {
      eventId: fullEvent.id,
      source: fullEvent.source,
      correlationId: fullEvent.correlationId,
    });

    const startTime = Date.now();
    const handlerResults: EventProcessingResult['handlerResults'] = [];

    // Get subscriptions for this event type
    const subscriptions = this.subscriptions.get(fullEvent.type) || [];
    
    if (subscriptions.length === 0) {
      logger.debug(`📭 No subscribers for event: ${fullEvent.type}`);
    }

    // Process each subscription
    for (const subscription of subscriptions) {
      const handlerStartTime = Date.now();
      
      try {
        // Set timeout for handler execution
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Handler timeout after ${subscription.options.timeout}ms`));
          }, subscription.options.timeout);
        });

        const handlerPromise = Promise.resolve(subscription.handler(fullEvent));
        await Promise.race([handlerPromise, timeoutPromise]);

        const executionTime = Date.now() - handlerStartTime;
        handlerResults.push({
          subscriptionId: subscription.id,
          success: true,
          executionTime,
        });

        logger.debug(`✅ Event handler completed: ${subscription.id}`, {
          eventType: fullEvent.type,
          executionTime,
        });

      } catch (error: any) {
        const executionTime = Date.now() - handlerStartTime;
        const errorMessage = error?.message || 'unknown_error';

        handlerResults.push({
          subscriptionId: subscription.id,
          success: false,
          error: errorMessage,
          executionTime,
        });

        logger.error(`❌ Event handler failed: ${subscription.id}`, {
          eventType: fullEvent.type,
          error: errorMessage,
          executionTime,
        });

        // Add to dead letter queue if enabled
        if (subscription.options.deadLetterQueue) {
          this.addToDeadLetterQueue(fullEvent, subscription, errorMessage);
        }
      }
    }

    const totalExecutionTime = Date.now() - startTime;
    const successCount = handlerResults.filter(r => r.success).length;
    const failureCount = handlerResults.length - successCount;

    // Update metrics
    this.updateMetrics(fullEvent.type, handlerResults.length > 0, totalExecutionTime);

    logger.info(`📊 Event processing completed: ${fullEvent.type}`, {
      eventId: fullEvent.id,
      totalHandlers: handlerResults.length,
      successful: successCount,
      failed: failureCount,
      totalExecutionTime,
    });

    return {
      success: failureCount === 0,
      handlerResults,
      totalExecutionTime,
    };
  }

  /**
   * Get event processing metrics
   */
  getMetrics(): Record<string, {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    averageProcessingTime: number;
    successRate: number;
  }> {
    const result: Record<string, any> = {};
    
    for (const [eventType, metrics] of this.processingMetrics.entries()) {
      result[eventType] = {
        ...metrics,
        successRate: metrics.totalEvents > 0 
          ? Math.round((metrics.successfulEvents / metrics.totalEvents) * 100 * 100) / 100
          : 0,
      };
    }

    return result;
  }

  /**
   * Get recent event history
   */
  getEventHistory(limit = 50): TypedEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get dead letter queue entries
   */
  getDeadLetterQueue(): DeadLetterEntry[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Get active subscriptions by event type
   */
  getSubscriptions(eventType?: string): Record<string, EventSubscription[]> {
    if (eventType) {
      return {
        [eventType]: this.subscriptions.get(eventType) || [],
      };
    }

    const result: Record<string, EventSubscription[]> = {};
    for (const [type, subs] of this.subscriptions.entries()) {
      result[type] = [...subs];
    }
    return result;
  }

  /**
   * Clear dead letter queue (admin function)
   */
  clearDeadLetterQueue(): number {
    const count = this.deadLetterQueue.length;
    this.deadLetterQueue = [];
    logger.info(`🗑️ Dead letter queue cleared: ${count} entries removed`);
    return count;
  }

  // Private methods

  private addToHistory(event: TypedEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  private addToDeadLetterQueue(
    event: TypedEvent,
    subscription: EventSubscription,
    error: string
  ): void {
    const existingEntry = this.deadLetterQueue.find(
      entry => entry.event.id === event.id && entry.subscription.id === subscription.id
    );

    if (existingEntry) {
      existingEntry.attempts += 1;
      existingEntry.error = error;
      existingEntry.lastAttempt = new Date();
      existingEntry.nextRetry = new Date(Date.now() + (60000 * existingEntry.attempts)); // Exponential backoff
    } else {
      this.deadLetterQueue.push({
        event,
        subscription,
        error,
        attempts: 1,
        lastAttempt: new Date(),
        nextRetry: new Date(Date.now() + 60000), // 1 minute
      });
    }

    // Keep dead letter queue size manageable
    if (this.deadLetterQueue.length > 1000) {
      this.deadLetterQueue.shift();
    }
  }

  private async processDeadLetterQueue(): Promise<void> {
    const now = new Date();
    const entriesToRetry = this.deadLetterQueue.filter(
      entry => entry.nextRetry && entry.nextRetry <= now && 
                entry.attempts <= (entry.subscription.options.retries || 3)
    );

    for (const entry of entriesToRetry) {
      try {
        logger.info(`🔄 Retrying dead letter entry: ${entry.subscription.id}`, {
          eventId: entry.event.id,
          attempts: entry.attempts,
        });

        await entry.subscription.handler(entry.event);
        
        // Remove from dead letter queue on success
        const index = this.deadLetterQueue.indexOf(entry);
        if (index !== -1) {
          this.deadLetterQueue.splice(index, 1);
        }

        logger.info(`✅ Dead letter retry successful: ${entry.subscription.id}`);

      } catch (error: any) {
        entry.attempts += 1;
        entry.error = error?.message || 'unknown_error';
        entry.lastAttempt = new Date();
        entry.nextRetry = new Date(Date.now() + (60000 * entry.attempts));

        logger.error(`❌ Dead letter retry failed: ${entry.subscription.id}`, {
          error: entry.error,
          attempts: entry.attempts,
        });
      }
    }

    // Clean up entries that have exceeded max retries
    const maxRetries = 3;
    const expiredEntries = this.deadLetterQueue.filter(
      entry => entry.attempts > maxRetries
    );

    for (const entry of expiredEntries) {
      const index = this.deadLetterQueue.indexOf(entry);
      if (index !== -1) {
        this.deadLetterQueue.splice(index, 1);
        logger.warn(`🗑️ Dead letter entry expired: ${entry.subscription.id}`, {
          eventId: entry.event.id,
          finalError: entry.error,
          totalAttempts: entry.attempts,
        });
      }
    }
  }

  private updateMetrics(eventType: string, success: boolean, processingTime: number): void {
    if (!this.processingMetrics.has(eventType)) {
      this.processingMetrics.set(eventType, {
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        averageProcessingTime: 0,
      });
    }

    const metrics = this.processingMetrics.get(eventType)!;
    metrics.totalEvents += 1;
    
    if (success) {
      metrics.successfulEvents += 1;
    } else {
      metrics.failedEvents += 1;
    }

    // Update rolling average
    metrics.averageProcessingTime = Math.round(
      (metrics.averageProcessingTime * (metrics.totalEvents - 1) + processingTime) / metrics.totalEvents
    );
  }
}

// Export singleton instance
export const eventSystem = EventSystem.getInstance();

// Convenience functions for common usage
export const subscribe = <T>(
  eventType: string,
  handler: EventHandler<T>,
  source: string,
  options?: EventSubscription['options']
): string => eventSystem.subscribe(eventType, handler, source, options);

export const publish = <T>(event: Omit<TypedEvent<T>, 'id' | 'timestamp'>): Promise<EventProcessingResult> =>
  eventSystem.publish(event);

export const unsubscribe = (subscriptionId: string): boolean => eventSystem.unsubscribe(subscriptionId);