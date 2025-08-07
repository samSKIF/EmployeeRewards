// Recognition System Domain Events
// Defines all events related to recognition, rewards, and points

import { z } from 'zod';
import { TypedEvent } from './event-system';

// Recognition data schema for events
const recognitionDataSchema = z.object({
  id: z.number(),
  giver_id: z.number(),
  recipient_id: z.number(),
  badge_type: z.string(),
  message: z.string(),
  points: z.number(),
  status: z.enum(['pending', 'approved', 'rejected']),
  organization_id: z.number(),
  created_at: z.date(),
});

const pointsTransactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  amount: z.number(),
  type: z.enum(['earned', 'spent', 'adjusted']),
  reference_type: z.string(),
  reference_id: z.number(),
  description: z.string(),
});

// Event schemas
export const recognitionGivenSchema = z.object({
  recognition: recognitionDataSchema,
  pointsTransaction: pointsTransactionSchema,
  requiresApproval: z.boolean(),
  socialPostCreated: z.boolean().default(false),
});

export const recognitionApprovedSchema = z.object({
  recognition: recognitionDataSchema,
  approvedBy: z.number(),
  approvalNotes: z.string().optional(),
  pointsAwarded: z.boolean(),
  socialPostVisible: z.boolean(),
});

export const recognitionRejectedSchema = z.object({
  recognition: recognitionDataSchema,
  rejectedBy: z.number(),
  rejectionReason: z.string(),
  pointsRefunded: z.boolean(),
});

export const pointsEarnedSchema = z.object({
  transaction: pointsTransactionSchema,
  newBalance: z.number(),
  milestone: z.object({
    reached: z.boolean(),
    level: z.string().optional(),
    badge: z.string().optional(),
  }).optional(),
});

export const pointsSpentSchema = z.object({
  transaction: pointsTransactionSchema,
  newBalance: z.number(),
  item: z.object({
    id: z.number(),
    name: z.string(),
    category: z.string(),
    pointsCost: z.number(),
  }),
  fulfillmentRequired: z.boolean(),
});

export const recognitionSettingsUpdatedSchema = z.object({
  organizationId: z.number(),
  updatedBy: z.number(),
  previousSettings: z.record(z.any()),
  newSettings: z.record(z.any()),
  changedFields: z.array(z.string()),
  affectsExistingRecognitions: z.boolean(),
});

// Event types
export type RecognitionGivenEvent = TypedEvent<z.infer<typeof recognitionGivenSchema>>;
export type RecognitionApprovedEvent = TypedEvent<z.infer<typeof recognitionApprovedSchema>>;
export type RecognitionRejectedEvent = TypedEvent<z.infer<typeof recognitionRejectedSchema>>;
export type PointsEarnedEvent = TypedEvent<z.infer<typeof pointsEarnedSchema>>;
export type PointsSpentEvent = TypedEvent<z.infer<typeof pointsSpentSchema>>;
export type RecognitionSettingsUpdatedEvent = TypedEvent<z.infer<typeof recognitionSettingsUpdatedSchema>>;

// Event type constants
export const RECOGNITION_EVENTS = {
  GIVEN: 'recognition.given',
  APPROVED: 'recognition.approved',
  REJECTED: 'recognition.rejected',
  POINTS_EARNED: 'points.earned',
  POINTS_SPENT: 'points.spent',
  SETTINGS_UPDATED: 'recognition.settings_updated',
} as const;

// Event factory functions
export const createRecognitionGivenEvent = (
  data: z.infer<typeof recognitionGivenSchema>,
  correlationId?: string,
  metadata?: Record<string, any>
): Omit<RecognitionGivenEvent, 'id' | 'timestamp'> => ({
  type: RECOGNITION_EVENTS.GIVEN,
  source: 'recognition-system',
  version: '1.0',
  correlationId,
  userId: data.recognition.giver_id,
  organizationId: data.recognition.organization_id,
  data,
  metadata,
});

export const createRecognitionApprovedEvent = (
  data: z.infer<typeof recognitionApprovedSchema>,
  correlationId?: string,
  metadata?: Record<string, any>
): Omit<RecognitionApprovedEvent, 'id' | 'timestamp'> => ({
  type: RECOGNITION_EVENTS.APPROVED,
  source: 'recognition-system',
  version: '1.0',
  correlationId,
  userId: data.approvedBy,
  organizationId: data.recognition.organization_id,
  data,
  metadata,
});

export const createPointsEarnedEvent = (
  data: z.infer<typeof pointsEarnedSchema>,
  correlationId?: string,
  metadata?: Record<string, any>
): Omit<PointsEarnedEvent, 'id' | 'timestamp'> => ({
  type: RECOGNITION_EVENTS.POINTS_EARNED,
  source: 'recognition-system',
  version: '1.0',
  correlationId,
  userId: data.transaction.user_id,
  organizationId: metadata?.organizationId,
  data,
  metadata,
});

export const createPointsSpentEvent = (
  data: z.infer<typeof pointsSpentSchema>,
  correlationId?: string,
  metadata?: Record<string, any>
): Omit<PointsSpentEvent, 'id' | 'timestamp'> => ({
  type: RECOGNITION_EVENTS.POINTS_SPENT,
  source: 'recognition-system',
  version: '1.0',
  correlationId,
  userId: data.transaction.user_id,
  organizationId: metadata?.organizationId,
  data,
  metadata,
});

export const createRecognitionSettingsUpdatedEvent = (
  data: z.infer<typeof recognitionSettingsUpdatedSchema>,
  correlationId?: string,
  metadata?: Record<string, any>
): Omit<RecognitionSettingsUpdatedEvent, 'id' | 'timestamp'> => ({
  type: RECOGNITION_EVENTS.SETTINGS_UPDATED,
  source: 'recognition-system',
  version: '1.0',
  correlationId,
  userId: data.updatedBy,
  organizationId: data.organizationId,
  data,
  metadata,
});