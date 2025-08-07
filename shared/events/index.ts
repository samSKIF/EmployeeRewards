// Events System Main Export
// Centralized exports for all event types and utilities

// Core event system
export * from './event-system';

// Domain events
export * from './employee-events';
export * from './recognition-events';
export * from './social-events';
export * from './leave-events';
export * from './survey-events';

// Re-export key instances and functions
export { eventSystem, subscribe, publish, unsubscribe } from './event-system';