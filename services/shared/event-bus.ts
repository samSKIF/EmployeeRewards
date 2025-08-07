// Centralized Event Bus for Microservices Communication
// This replaces direct service-to-service calls with event-driven architecture

import { EventEmitter } from 'events';
// Logger interface - will be injected by each service
interface Logger {
  info: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
}

// Default console logger for development
const logger: Logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
};

export interface DomainEvent {
  id: string;
  type: string;
  version: string;
  timestamp: string;
  source: string;
  correlationId?: string;
  data: any;
  metadata?: {
    userId?: number;
    organizationId?: number;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface EventHandler {
  eventType: string;
  handler: (event: DomainEvent) => Promise<void>;
  service: string;
  priority?: number;
}

class ServiceEventBus extends EventEmitter {
  private handlers: Map<string, EventHandler[]> = new Map();
  private deadLetterQueue: DomainEvent[] = [];
  private eventStore: DomainEvent[] = []; // In production, this would be a persistent store

  constructor() {
    super();
    this.setMaxListeners(100); // Support many service listeners
  }

  /**
   * Publish an event to the bus
   */
  async publish(event: Omit<DomainEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: DomainEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
    };

    // Store event for event sourcing
    this.eventStore.push(fullEvent);

    logger.info('📤 Publishing event', {
      eventId: fullEvent.id,
      type: fullEvent.type,
      source: fullEvent.source,
      correlationId: fullEvent.correlationId,
    });

    // Get handlers for this event type
    const handlers = this.handlers.get(event.type) || [];
    
    // Sort by priority (lower number = higher priority)
    const sortedHandlers = handlers.sort((a, b) => (a.priority || 999) - (b.priority || 999));

    // Execute handlers
    for (const handler of sortedHandlers) {
      try {
        await handler.handler(fullEvent);
        logger.info('✅ Event handled successfully', {
          eventId: fullEvent.id,
          handler: handler.service,
        });
      } catch (error: any) {
        logger.error('❌ Event handler failed', {
          eventId: fullEvent.id,
          handler: handler.service,
          error: error?.message || 'unknown_error',
        });
        
        // Add to dead letter queue for retry
        this.deadLetterQueue.push(fullEvent);
      }
    }

    // Emit for legacy compatibility during migration
    this.emit(event.type, fullEvent);
  }

  /**
   * Subscribe to events
   */
  subscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>,
    service: string,
    priority: number = 999
  ): void {
    const eventHandler: EventHandler = {
      eventType,
      handler,
      service,
      priority,
    };

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(eventHandler);

    logger.info('📥 Event subscription registered', {
      eventType,
      service,
      priority,
    });
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventType: string, service: string): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const filtered = handlers.filter(h => h.service !== service);
      this.handlers.set(eventType, filtered);
      
      logger.info('📤 Event subscription removed', {
        eventType,
        service,
      });
    }
  }

  /**
   * Get events from the event store (for event sourcing)
   */
  getEvents(filters?: {
    type?: string;
    source?: string;
    startTime?: string;
    endTime?: string;
  }): DomainEvent[] {
    let events = [...this.eventStore];

    if (filters?.type) {
      events = events.filter(e => e.type === filters.type);
    }
    if (filters?.source) {
      events = events.filter(e => e.source === filters.source);
    }
    if (filters?.startTime) {
      events = events.filter(e => e.timestamp >= filters.startTime!);
    }
    if (filters?.endTime) {
      events = events.filter(e => e.timestamp <= filters.endTime!);
    }

    return events;
  }

  /**
   * Replay events (for rebuilding state)
   */
  async replayEvents(
    fromTimestamp: string,
    toTimestamp: string,
    eventTypes?: string[]
  ): Promise<void> {
    const events = this.eventStore.filter(e => {
      const inTimeRange = e.timestamp >= fromTimestamp && e.timestamp <= toTimestamp;
      const matchesType = !eventTypes || eventTypes.includes(e.type);
      return inTimeRange && matchesType;
    });

    logger.info('🔄 Replaying events', {
      count: events.length,
      fromTimestamp,
      toTimestamp,
    });

    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Process dead letter queue
   */
  async processDeadLetterQueue(): Promise<void> {
    const events = [...this.deadLetterQueue];
    this.deadLetterQueue = [];

    logger.info('🔄 Processing dead letter queue', {
      count: events.length,
    });

    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service health metrics
   */
  getMetrics() {
    return {
      totalEvents: this.eventStore.length,
      deadLetterQueueSize: this.deadLetterQueue.length,
      registeredHandlers: Array.from(this.handlers.entries()).map(([type, handlers]) => ({
        eventType: type,
        handlerCount: handlers.length,
        services: handlers.map(h => h.service),
      })),
    };
  }
}

// Export singleton instance
export const eventBus = new ServiceEventBus();

// Standard event types for the system
export const EventTypes = {
  // Employee Events
  EMPLOYEE_CREATED: 'employee.created',
  EMPLOYEE_UPDATED: 'employee.updated',
  EMPLOYEE_DELETED: 'employee.deleted',
  EMPLOYEE_DEPARTMENT_CHANGED: 'employee.department_changed',
  
  // Authentication Events
  USER_LOGGED_IN: 'auth.user_logged_in',
  USER_LOGGED_OUT: 'auth.user_logged_out',
  PASSWORD_CHANGED: 'auth.password_changed',
  
  // Leave Events
  LEAVE_REQUEST_CREATED: 'leave.request_created',
  LEAVE_REQUEST_APPROVED: 'leave.request_approved',
  LEAVE_REQUEST_REJECTED: 'leave.request_rejected',
  LEAVE_REQUEST_CANCELLED: 'leave.request_cancelled',
  LEAVE_BALANCE_UPDATED: 'leave.balance_updated',
  
  // Recognition Events
  RECOGNITION_GIVEN: 'recognition.given',
  POINTS_AWARDED: 'recognition.points_awarded',
  BADGE_EARNED: 'recognition.badge_earned',
  
  // Social Events
  POST_CREATED: 'social.post_created',
  POST_LIKED: 'social.post_liked',
  COMMENT_ADDED: 'social.comment_added',
  
  // Channel Events
  CHANNEL_CREATED: 'channel.created',
  MEMBER_JOINED_CHANNEL: 'channel.member_joined',
  MEMBER_LEFT_CHANNEL: 'channel.member_left',
} as const;