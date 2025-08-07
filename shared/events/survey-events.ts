// Survey Domain Events
// Defines all events related to survey lifecycle and management

import { z } from 'zod';
import { type TypedEvent } from './event-system';

/**
 * Survey Created Event
 * Triggered when a new survey is created
 */
export const surveyCreatedSchema = z.object({
  survey: z.object({
    id: z.number(),
    title: z.string(),
    description: z.string().optional(),
    status: z.string(),
    isAnonymous: z.boolean(),
    isMandatory: z.boolean(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    templateType: z.string().optional(),
    createdBy: z.number(),
    createdAt: z.date(),
  }),
  organization: z.object({
    id: z.number(),
  }),
  creator: z.object({
    id: z.number(),
  }),
  questionsCount: z.number(),
});

export type SurveyCreatedEvent = TypedEvent<z.infer<typeof surveyCreatedSchema>>;

/**
 * Survey Updated Event
 * Triggered when survey information is modified
 */
export const surveyUpdatedSchema = z.object({
  survey: z.object({
    id: z.number(),
    title: z.string(),
    status: z.string(),
    updatedAt: z.date(),
  }),
  previousSurvey: z.object({
    id: z.number(),
    status: z.string(),
  }),
  updater: z.object({
    id: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
  updatedFields: z.array(z.string()),
});

export type SurveyUpdatedEvent = TypedEvent<z.infer<typeof surveyUpdatedSchema>>;

/**
 * Survey Published Event
 * Triggered when a survey is published and becomes available for responses
 */
export const surveyPublishedSchema = z.object({
  survey: z.object({
    id: z.number(),
    title: z.string(),
    status: z.string(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    isAnonymous: z.boolean(),
    isMandatory: z.boolean(),
  }),
  publisher: z.object({
    id: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
  questionsCount: z.number(),
});

export type SurveyPublishedEvent = TypedEvent<z.infer<typeof surveyPublishedSchema>>;

/**
 * Survey Response Submitted Event
 * Triggered when a user submits a survey response
 */
export const surveyResponseSubmittedSchema = z.object({
  response: z.object({
    id: z.number(),
    surveyId: z.number(),
    userId: z.number().optional(),
    startedAt: z.date(),
    completedAt: z.date().optional(),
    timeToComplete: z.number().optional(),
  }),
  survey: z.object({
    id: z.number(),
    title: z.string(),
    isAnonymous: z.boolean(),
    isMandatory: z.boolean(),
  }),
  user: z.object({
    id: z.number(),
  }).optional(),
  organization: z.object({
    id: z.number(),
  }).optional(),
  answersCount: z.number(),
  isAnonymous: z.boolean(),
});

export type SurveyResponseSubmittedEvent = TypedEvent<z.infer<typeof surveyResponseSubmittedSchema>>;

/**
 * Survey Deleted Event
 * Triggered when a survey is soft-deleted
 */
export const surveyDeletedSchema = z.object({
  survey: z.object({
    id: z.number(),
    title: z.string(),
    status: z.string(),
  }),
  deletedBy: z.object({
    id: z.number(),
  }),
  organization: z.object({
    id: z.number(),
  }),
});

export type SurveyDeletedEvent = TypedEvent<z.infer<typeof surveyDeletedSchema>>;

/**
 * Survey Analytics Generated Event
 * Triggered when survey analytics are computed
 */
export const surveyAnalyticsGeneratedSchema = z.object({
  survey: z.object({
    id: z.number(),
    title: z.string(),
  }),
  analytics: z.object({
    totalResponses: z.number(),
    completionRate: z.number(),
    averageCompletionTime: z.number(),
    lastUpdated: z.date(),
  }),
  organization: z.object({
    id: z.number(),
  }),
  generatedBy: z.object({
    id: z.number(),
  }),
});

export type SurveyAnalyticsGeneratedEvent = TypedEvent<z.infer<typeof surveyAnalyticsGeneratedSchema>>;

// Event factory functions
export const createSurveyCreatedEvent = (
  data: z.infer<typeof surveyCreatedSchema>
): SurveyCreatedEvent => ({
  ...eventSystem.createBaseEvent('survey.survey_created'),
  data,
});

export const createSurveyUpdatedEvent = (
  data: z.infer<typeof surveyUpdatedSchema>
): SurveyUpdatedEvent => ({
  ...eventSystem.createBaseEvent('survey.survey_updated'),
  data,
});

export const createSurveyPublishedEvent = (
  data: z.infer<typeof surveyPublishedSchema>
): SurveyPublishedEvent => ({
  ...eventSystem.createBaseEvent('survey.survey_published'),
  data,
});

export const createSurveyResponseSubmittedEvent = (
  data: z.infer<typeof surveyResponseSubmittedSchema>
): SurveyResponseSubmittedEvent => ({
  ...eventSystem.createBaseEvent('survey.response_submitted'),
  data,
});

export const createSurveyDeletedEvent = (
  data: z.infer<typeof surveyDeletedSchema>
): SurveyDeletedEvent => ({
  ...eventSystem.createBaseEvent('survey.survey_deleted'),
  data,
});

export const createSurveyAnalyticsGeneratedEvent = (
  data: z.infer<typeof surveyAnalyticsGeneratedSchema>
): SurveyAnalyticsGeneratedEvent => ({
  ...eventSystem.createBaseEvent('survey.analytics_generated'),
  data,
});