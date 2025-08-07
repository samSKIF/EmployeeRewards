// Survey System Domain Layer
// Contains business logic, validation, and domain events for survey operations

import { z } from 'zod';
import { eventSystem } from '@shared/events';
import { logger } from '@shared/logger';
import type { SurveyRepository } from '../infrastructure/survey.repository';
import type {
  Survey,
  SurveyQuestion,
  SurveyResponse,
  SurveyAnswer,
  InsertSurvey,
  InsertSurveyQuestion,
  InsertSurveyResponse,
  InsertSurveyAnswer,
} from '@shared/schema';

// Domain Data Transfer Objects
export interface CreateSurveyData {
  title: string;
  description?: string;
  isAnonymous?: boolean;
  isMandatory?: boolean;
  startDate?: Date;
  endDate?: Date;
  templateType?: string;
  questions: CreateSurveyQuestionData[];
}

export interface CreateSurveyQuestionData {
  questionText: string;
  questionType: string;
  isRequired?: boolean;
  options?: any;
  order: number;
  branchingLogic?: any;
}

export interface CreateSurveyResponseData {
  surveyId: number;
  userId?: number;
  answers: CreateSurveyAnswerData[];
}

export interface CreateSurveyAnswerData {
  questionId: number;
  answerValue: any;
}

export interface UpdateSurveyData {
  title?: string;
  description?: string;
  status?: string;
  isAnonymous?: boolean;
  isMandatory?: boolean;
  startDate?: Date;
  endDate?: Date;
  templateType?: string;
}

export interface SurveyFilters {
  status?: string;
  isAnonymous?: boolean;
  isMandatory?: boolean;
  templateType?: string;
  createdBy?: number;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
}

// Validation Schemas
export const createSurveyQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required'),
  questionType: z.enum([
    'nps', 'single', 'multiple', 'scale', 'likert', 'dropdown', 
    'ranking', 'slider', 'matrix', 'semantic', 'star', 'numeric', 
    'datetime', 'toggle', 'text', 'file', 'image', 'constant-sum', 'heatmap'
  ]),
  isRequired: z.boolean().optional().default(true),
  options: z.any().optional(),
  order: z.number().min(1, 'Question order must be at least 1'),
  branchingLogic: z.any().optional(),
});

export const createSurveySchema = z.object({
  title: z.string().min(1, 'Survey title is required').max(255, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  isAnonymous: z.boolean().optional().default(false),
  isMandatory: z.boolean().optional().default(false),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  templateType: z.string().optional(),
  questions: z.array(createSurveyQuestionSchema).min(1, 'At least one question is required'),
});

export const createSurveyAnswerSchema = z.object({
  questionId: z.number().min(1, 'Question ID is required'),
  answerValue: z.any(),
});

export const createSurveyResponseSchema = z.object({
  surveyId: z.number().min(1, 'Survey ID is required'),
  userId: z.number().optional(),
  answers: z.array(createSurveyAnswerSchema).min(1, 'At least one answer is required'),
});

export const updateSurveySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
  isAnonymous: z.boolean().optional(),
  isMandatory: z.boolean().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  templateType: z.string().optional(),
});

/**
 * Survey Domain Service
 * Handles business logic for survey management
 */
export class SurveyDomain {
  /**
   * Create a new survey with questions
   */
  static async createSurvey(
    data: CreateSurveyData,
    organizationId: number,
    createdBy: number,
    repository: SurveyRepository
  ): Promise<Survey & { questions: SurveyQuestion[] }> {
    try {
      // Validate input data
      const validatedData = createSurveySchema.parse(data);
      
      // Additional business validation
      if (validatedData.endDate && validatedData.startDate && validatedData.endDate <= validatedData.startDate) {
        throw new Error('End date must be after start date');
      }

      // Check for duplicate question orders
      const orders = validatedData.questions.map(q => q.order);
      const uniqueOrders = new Set(orders);
      if (orders.length !== uniqueOrders.size) {
        throw new Error('Question orders must be unique within the survey');
      }

      logger.info('🎯 Creating survey', {
        title: validatedData.title,
        questionsCount: validatedData.questions.length,
        organizationId,
        createdBy,
      });

      // Create survey with questions
      const survey = await repository.createSurveyWithQuestions(
        validatedData,
        organizationId,
        createdBy
      );

      // Publish domain event
      await eventSystem.publishEvent('survey.survey_created', {
        survey,
        organization: { id: organizationId },
        creator: { id: createdBy },
        questionsCount: validatedData.questions.length,
      });

      logger.info('✅ Survey created successfully', {
        surveyId: survey.id,
        title: survey.title,
        questionsCount: validatedData.questions.length,
        organizationId,
        createdBy,
      });

      return survey;
    } catch (error: any) {
      logger.error('❌ Error creating survey', {
        error: error?.message || 'unknown_error',
        title: data.title,
        organizationId,
        createdBy,
      });
      throw error;
    }
  }

  /**
   * Update survey information
   */
  static async updateSurvey(
    surveyId: number,
    data: UpdateSurveyData,
    organizationId: number,
    updatedBy: number,
    repository: SurveyRepository
  ): Promise<Survey> {
    try {
      // Validate input data
      const validatedData = updateSurveySchema.parse(data);

      // Additional business validation
      if (validatedData.endDate && validatedData.startDate && validatedData.endDate <= validatedData.startDate) {
        throw new Error('End date must be after start date');
      }

      logger.info('🎯 Updating survey', {
        surveyId,
        updateFields: Object.keys(validatedData),
        organizationId,
        updatedBy,
      });

      // Get current survey for comparison
      const currentSurvey = await repository.getSurveyById(surveyId, organizationId);
      if (!currentSurvey) {
        throw new Error('Survey not found');
      }

      // Business rule: Can't modify published surveys
      if (currentSurvey.status === 'published' && validatedData.status !== 'closed') {
        throw new Error('Cannot modify published surveys except to close them');
      }

      // Update survey
      const updatedSurvey = await repository.updateSurvey(surveyId, validatedData, organizationId);
      
      if (!updatedSurvey) {
        throw new Error('Survey not found or update failed');
      }

      // Publish domain event
      await eventSystem.publishEvent('survey.survey_updated', {
        survey: updatedSurvey,
        previousSurvey: currentSurvey,
        updater: { id: updatedBy },
        organization: { id: organizationId },
        updatedFields: Object.keys(validatedData),
      });

      logger.info('✅ Survey updated successfully', {
        surveyId,
        title: updatedSurvey.title,
        status: updatedSurvey.status,
        organizationId,
        updatedBy,
      });

      return updatedSurvey;
    } catch (error: any) {
      logger.error('❌ Error updating survey', {
        error: error?.message || 'unknown_error',
        surveyId,
        organizationId,
        updatedBy,
      });
      throw error;
    }
  }

  /**
   * Submit survey response
   */
  static async submitSurveyResponse(
    data: CreateSurveyResponseData,
    userId?: number,
    organizationId?: number,
    repository?: SurveyRepository
  ): Promise<SurveyResponse & { answers: SurveyAnswer[] }> {
    if (!repository) {
      throw new Error('Repository is required');
    }

    try {
      // Validate input data
      const validatedData = createSurveyResponseSchema.parse(data);
      
      logger.info('🎯 Submitting survey response', {
        surveyId: validatedData.surveyId,
        userId: userId || 'anonymous',
        answersCount: validatedData.answers.length,
        organizationId,
      });

      // Get survey to validate business rules
      const survey = await repository.getSurveyById(validatedData.surveyId, organizationId);
      if (!survey) {
        throw new Error('Survey not found');
      }

      // Business validations
      if (survey.status !== 'published') {
        throw new Error('Survey is not available for responses');
      }

      if (survey.startDate && new Date() < survey.startDate) {
        throw new Error('Survey has not started yet');
      }

      if (survey.endDate && new Date() > survey.endDate) {
        throw new Error('Survey has ended');
      }

      // Check for duplicate response (if not anonymous)
      if (userId && !survey.isAnonymous) {
        const existingResponse = await repository.getUserSurveyResponse(validatedData.surveyId, userId);
        if (existingResponse) {
          throw new Error('User has already responded to this survey');
        }
      }

      // Get survey questions to validate answers
      const questions = await repository.getSurveyQuestions(validatedData.surveyId);
      const questionMap = new Map(questions.map(q => [q.id, q]));

      // Validate all required questions are answered
      const requiredQuestions = questions.filter((q: any) => q.isRequired);
      const answeredQuestions = new Set(validatedData.answers.map((a: any) => a.questionId));
      
      for (const required of requiredQuestions) {
        if (!answeredQuestions.has(required.id)) {
          throw new Error(`Required question "${required.questionText}" must be answered`);
        }
      }

      // Validate each answer
      for (const answer of validatedData.answers) {
        const question = questionMap.get(answer.questionId);
        if (!question) {
          throw new Error(`Question with ID ${answer.questionId} not found in survey`);
        }
        // Additional answer validation could be added here based on question type
      }

      // Create survey response with answers
      const response = await repository.createSurveyResponseWithAnswers(
        validatedData,
        userId
      );

      // Publish domain event
      await eventSystem.publishEvent('survey.response_submitted', {
        response,
        survey,
        user: userId ? { id: userId } : null,
        organization: organizationId ? { id: organizationId } : null,
        answersCount: validatedData.answers.length,
        isAnonymous: !userId || survey.isAnonymous,
      });

      logger.info('✅ Survey response submitted successfully', {
        responseId: response.id,
        surveyId: validatedData.surveyId,
        userId: userId || 'anonymous',
        answersCount: validatedData.answers.length,
        organizationId,
      });

      return response;
    } catch (error: any) {
      logger.error('❌ Error submitting survey response', {
        error: error?.message || 'unknown_error',
        surveyId: data.surveyId,
        userId: userId || 'anonymous',
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Delete survey (soft delete by changing status)
   */
  static async deleteSurvey(
    surveyId: number,
    organizationId: number,
    deletedBy: number,
    repository: SurveyRepository
  ): Promise<boolean> {
    try {
      logger.info('🎯 Deleting survey', {
        surveyId,
        organizationId,
        deletedBy,
      });

      // Get current survey
      const survey = await repository.getSurveyById(surveyId, organizationId);
      if (!survey) {
        throw new Error('Survey not found');
      }

      // Business rule: Can only delete draft surveys
      if (survey.status !== 'draft') {
        throw new Error('Only draft surveys can be deleted');
      }

      // Soft delete by updating status to 'deleted'
      const deleted = await repository.deleteSurvey(surveyId, organizationId);

      if (deleted) {
        // Publish domain event
        await eventSystem.publishEvent('survey.survey_deleted', {
          survey,
          deletedBy: { id: deletedBy },
          organization: { id: organizationId },
        });

        logger.info('✅ Survey deleted successfully', {
          surveyId,
          title: survey.title,
          organizationId,
          deletedBy,
        });
      }

      return deleted;
    } catch (error: any) {
      logger.error('❌ Error deleting survey', {
        error: error?.message || 'unknown_error',
        surveyId,
        organizationId,
        deletedBy,
      });
      throw error;
    }
  }

  /**
   * Publish survey (change status from draft to published)
   */
  static async publishSurvey(
    surveyId: number,
    organizationId: number,
    publishedBy: number,
    repository: SurveyRepository
  ): Promise<Survey> {
    try {
      logger.info('🎯 Publishing survey', {
        surveyId,
        organizationId,
        publishedBy,
      });

      // Get current survey
      const survey = await repository.getSurveyById(surveyId, organizationId);
      if (!survey) {
        throw new Error('Survey not found');
      }

      // Business validations
      if (survey.status !== 'draft') {
        throw new Error('Only draft surveys can be published');
      }

      // Validate survey has questions
      const questions = await repository.getSurveyQuestions(surveyId);
      if (questions.length === 0) {
        throw new Error('Survey must have at least one question to be published');
      }

      // Update status to published
      const publishedSurvey = await repository.updateSurvey(
        surveyId,
        { status: 'published' },
        organizationId
      );

      if (!publishedSurvey) {
        throw new Error('Failed to publish survey');
      }

      // Publish domain event
      await eventSystem.publishEvent('survey.survey_published', {
        survey: publishedSurvey,
        publisher: { id: publishedBy },
        organization: { id: organizationId },
        questionsCount: questions.length,
      });

      logger.info('✅ Survey published successfully', {
        surveyId,
        title: publishedSurvey.title,
        organizationId,
        publishedBy,
      });

      return publishedSurvey;
    } catch (error: any) {
      logger.error('❌ Error publishing survey', {
        error: error?.message || 'unknown_error',
        surveyId,
        organizationId,
        publishedBy,
      });
      throw error;
    }
  }
}