// Recognition Domain Events
// Handles all recognition lifecycle events and cross-cutting concerns

import { z } from 'zod';
import { type TypedEvent } from './event-system';

/**
 * Recognition Created Event
 * Triggered when a new recognition is created
 */
export const recognitionCreatedSchema = z.object({
  recognition: z.object({
    id: z.number(),
    recognizerId: z.number(),
    recipientId: z.number(),
    badgeType: z.string(),
    message: z.string(),
    points: z.number(),
    status: z.enum(['pending', 'approved', 'rejected']),
    createdAt: z.date(),
  }),
  organization: z.object({
    id: z.number(),
    name: z.string(),
  }),
  recognizer: z.object({
    id: z.number(),
    name: z.string(),
    department: z.string().nullable(),
  }),
  recipient: z.object({
    id: z.number(),
    name: z.string(),
    department: z.string().nullable(),
  }),
  createdBy: z.number(),
});

export type RecognitionCreatedEvent = TypedEvent<z.infer<typeof recognitionCreatedSchema>>;

/**
 * Recognition Approved Event
 * Triggered when a recognition is approved and points are awarded
 */
export const recognitionApprovedSchema = z.object({
  recognition: z.object({
    id: z.number(),
    recognizerId: z.number(),
    recipientId: z.number(),
    badgeType: z.string(),
    points: z.number(),
    approvedAt: z.date(),
  }),
  transaction: z.object({
    id: z.number(),
    userId: z.number(),
    amount: z.number(),
    type: z.enum(['earned', 'redeemed']),
    reason: z.string(),
    description: z.string(),
  }),
  approvedBy: z.number(),
  previousBalance: z.number(),
  newBalance: z.number(),
});

export type RecognitionApprovedEvent = TypedEvent<z.infer<typeof recognitionApprovedSchema>>;

/**
 * Recognition Points Awarded Event
 * Triggered when points are awarded for any reason
 */
export const pointsAwardedSchema = z.object({
  transaction: z.object({
    id: z.number(),
    userId: z.number(),
    amount: z.number(),
    type: z.enum(['earned', 'redeemed']),
    reason: z.string(),
    description: z.string(),
    createdAt: z.date(),
  }),
  user: z.object({
    id: z.number(),
    name: z.string(),
    department: z.string().nullable(),
  }),
  awardedBy: z.number(),
  previousBalance: z.number(),
  newBalance: z.number(),
  context: z.object({
    source: z.enum(['recognition', 'admin_award', 'bonus', 'achievement']),
    sourceId: z.number().nullable(),
  }),
});

export type PointsAwardedEvent = TypedEvent<z.infer<typeof pointsAwardedSchema>>;

/**
 * Recognition Rejected Event
 * Triggered when a recognition is rejected
 */
export const recognitionRejectedSchema = z.object({
  recognition: z.object({
    id: z.number(),
    recognizerId: z.number(),
    recipientId: z.number(),
    badgeType: z.string(),
    message: z.string(),
    rejectedAt: z.date(),
  }),
  rejectedBy: z.number(),
  reason: z.string(),
});

export type RecognitionRejectedEvent = TypedEvent<z.infer<typeof recognitionRejectedSchema>>;

/**
 * Manager Budget Updated Event
 * Triggered when manager budgets are modified
 */
export const managerBudgetUpdatedSchema = z.object({
  budget: z.object({
    id: z.number(),
    managerId: z.number(),
    organizationId: z.number(),
    totalPoints: z.number(),
    remainingPoints: z.number(),
    month: z.number(),
    year: z.number(),
  }),
  manager: z.object({
    id: z.number(),
    name: z.string(),
    department: z.string().nullable(),
  }),
  updatedBy: z.number(),
  previousBudget: z.number().nullable(),
  newBudget: z.number(),
});

export type ManagerBudgetUpdatedEvent = TypedEvent<z.infer<typeof managerBudgetUpdatedSchema>>;

/**
 * Event Factory Functions
 * Convenient functions to create properly typed events
 */

export const createRecognitionCreatedEvent = (
  data: z.infer<typeof recognitionCreatedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<RecognitionCreatedEvent, 'id' | 'timestamp'> => ({
  type: 'recognition.created',
  data,
  organizationId,
  source: 'recognition-system',
  correlationId: `recognition-${data.recognition.id}-${Date.now()}`,
  metadata: metadata || {},
});

export const createRecognitionApprovedEvent = (
  data: z.infer<typeof recognitionApprovedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<RecognitionApprovedEvent, 'id' | 'timestamp'> => ({
  type: 'recognition.approved',
  data,
  organizationId,
  source: 'recognition-system',
  correlationId: `recognition-approved-${data.recognition.id}-${Date.now()}`,
  metadata: metadata || {},
});

export const createPointsAwardedEvent = (
  data: z.infer<typeof pointsAwardedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<PointsAwardedEvent, 'id' | 'timestamp'> => ({
  type: 'points.awarded',
  data,
  organizationId,
  source: 'recognition-system',
  correlationId: `points-${data.transaction.id}-${Date.now()}`,
  metadata: metadata || {},
});

export const createRecognitionRejectedEvent = (
  data: z.infer<typeof recognitionRejectedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<RecognitionRejectedEvent, 'id' | 'timestamp'> => ({
  type: 'recognition.rejected',
  data,
  organizationId,
  source: 'recognition-system',
  correlationId: `recognition-rejected-${data.recognition.id}-${Date.now()}`,
  metadata: metadata || {},
});

export const createManagerBudgetUpdatedEvent = (
  data: z.infer<typeof managerBudgetUpdatedSchema>,
  organizationId: number,
  metadata?: Record<string, any>
): Omit<ManagerBudgetUpdatedEvent, 'id' | 'timestamp'> => ({
  type: 'manager.budget_updated',
  data,
  organizationId,
  source: 'recognition-system',
  correlationId: `budget-${data.budget.id}-${Date.now()}`,
  metadata: metadata || {},
});