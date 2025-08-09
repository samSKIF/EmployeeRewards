// Survey System Infrastructure Layer
// Implements data access operations for survey domain using PostgreSQL with Drizzle ORM

import { eq, and, gte, lte, desc, sql, or, inArray } from 'drizzle-orm';
import { db } from '../../../db';
import {
  surveys,
  surveyQuestions,
  surveyResponses,
  surveyAnswers,
  users,
  organizations,
} from '@shared/schema';
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
import type {
  CreateSurveyData,
  UpdateSurveyData,
  SurveyFilters,
  CreateSurveyResponseData,
} from '../domain/survey.domain';
import { logger } from '@platform/sdk';

/**
 * Survey Repository
 * Handles all database operations for survey management
 */
export class SurveyRepository {
  /**
   * Create a new survey with questions
   */
  async createSurveyWithQuestions(
    data: CreateSurveyData,
    organizationId: number,
    createdBy: number
  ): Promise<Survey & { questions: SurveyQuestion[] }> {
    try {
      // Start a transaction to ensure consistency
      const result = await db.transaction(async (tx) => {
        // Create the survey
        const surveyData: InsertSurvey = {
          title: data.title,
          description: data.description,
          status: 'draft',
          isAnonymous: data.isAnonymous ?? false,
          isMandatory: data.isMandatory ?? false,
          startDate: data.startDate,
          endDate: data.endDate,
          templateType: data.templateType,
          totalRecipients: 0, // Will be calculated when publishing
          createdBy,
        };

        const [survey] = await tx.insert(surveys).values(surveyData).returning();

        // Create the questions
        const questionData: InsertSurveyQuestion[] = data.questions.map((q) => ({
          surveyId: survey.id,
          questionText: q.questionText,
          questionType: q.questionType,
          isRequired: q.isRequired ?? true,
          options: q.options,
          order: q.order,
          branchingLogic: q.branchingLogic,
        }));

        const createdQuestions = await tx
          .insert(surveyQuestions)
          .values(questionData)
          .returning();

        return { ...survey, questions: createdQuestions };
      });

      logger.info('✅ Survey created with questions in database', {
        surveyId: result.id,
        questionsCount: result.questions.length,
        organizationId,
        createdBy,
      });

      return result;
    } catch (error: any) {
      logger.error('❌ Error creating survey with questions in database', {
        error: error?.message || 'unknown_error',
        title: data.title,
        organizationId,
        createdBy,
      });
      throw error;
    }
  }

  /**
   * Get survey by ID with organization filtering
   */
  async getSurveyById(surveyId: number, organizationId?: number): Promise<Survey | null> {
    try {
      const conditions = [eq(surveys.id, surveyId)];
      
      // Note: Surveys don't have direct organization_id field, but are scoped by creator
      // For now, we'll fetch by ID and validate organization through creator
      const [survey] = await db
        .select()
        .from(surveys)
        .leftJoin(users, eq(surveys.createdBy, users.id))
        .where(and(...conditions))
        .limit(1);

      if (!survey) return null;

      // If organization filtering is required, check creator's organization
      if (organizationId && survey.users?.organization_id !== organizationId) {
        return null;
      }

      return survey.surveys;
    } catch (error: any) {
      logger.error('❌ Error getting survey by ID', {
        error: error?.message || 'unknown_error',
        surveyId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get surveys by organization with filtering
   */
  async getSurveysByOrganization(
    organizationId: number,
    filters?: SurveyFilters
  ): Promise<Survey[]> {
    try {
      const conditions = [];

      // Apply filters
      if (filters?.status) {
        conditions.push(eq(surveys.status, filters.status));
      }

      if (filters?.isAnonymous !== undefined) {
        conditions.push(eq(surveys.isAnonymous, filters.isAnonymous));
      }

      if (filters?.isMandatory !== undefined) {
        conditions.push(eq(surveys.isMandatory, filters.isMandatory));
      }

      if (filters?.templateType) {
        conditions.push(eq(surveys.templateType, filters.templateType));
      }

      if (filters?.createdBy) {
        conditions.push(eq(surveys.createdBy, filters.createdBy));
      }

      if (filters?.startDateFrom) {
        conditions.push(gte(surveys.startDate, filters.startDateFrom));
      }

      if (filters?.startDateTo) {
        conditions.push(lte(surveys.startDate, filters.startDateTo));
      }

      if (filters?.endDateFrom) {
        conditions.push(gte(surveys.endDate, filters.endDateFrom));
      }

      if (filters?.endDateTo) {
        conditions.push(lte(surveys.endDate, filters.endDateTo));
      }

      const query = db
        .select({ surveys: surveys })
        .from(surveys)
        .leftJoin(users, eq(surveys.createdBy, users.id))
        .where(
          and(
            eq(users.organization_id, organizationId),
            ...conditions
          )
        )
        .orderBy(desc(surveys.createdAt));

      const results = await query;
      return results.map(r => r.surveys);
    } catch (error: any) {
      logger.error('❌ Error getting surveys by organization', {
        error: error?.message || 'unknown_error',
        organizationId,
        filters,
      });
      throw error;
    }
  }

  /**
   * Update survey
   */
  async updateSurvey(
    surveyId: number,
    data: UpdateSurveyData,
    organizationId?: number
  ): Promise<Survey | null> {
    try {
      // First verify the survey exists and belongs to the organization
      const existingSurvey = await this.getSurveyById(surveyId, organizationId);
      if (!existingSurvey) return null;

      const [updatedSurvey] = await db
        .update(surveys)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(surveys.id, surveyId))
        .returning();

      logger.info('✅ Survey updated in database', {
        surveyId,
        updatedFields: Object.keys(data),
        organizationId,
      });

      return updatedSurvey || null;
    } catch (error: any) {
      logger.error('❌ Error updating survey in database', {
        error: error?.message || 'unknown_error',
        surveyId,
        data,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Delete survey (soft delete)
   */
  async deleteSurvey(surveyId: number, organizationId?: number): Promise<boolean> {
    try {
      // Verify the survey exists and belongs to the organization
      const existingSurvey = await this.getSurveyById(surveyId, organizationId);
      if (!existingSurvey) return false;

      // Soft delete by updating status
      const [deletedSurvey] = await db
        .update(surveys)
        .set({ 
          status: 'deleted',
          updatedAt: new Date(),
        })
        .where(eq(surveys.id, surveyId))
        .returning();

      const success = !!deletedSurvey;

      if (success) {
        logger.info('✅ Survey soft deleted in database', {
          surveyId,
          organizationId,
        });
      }

      return success;
    } catch (error: any) {
      logger.error('❌ Error deleting survey in database', {
        error: error?.message || 'unknown_error',
        surveyId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get survey questions
   */
  async getSurveyQuestions(surveyId: number): Promise<SurveyQuestion[]> {
    try {
      const questions = await db
        .select()
        .from(surveyQuestions)
        .where(eq(surveyQuestions.surveyId, surveyId))
        .orderBy(surveyQuestions.order);

      return questions;
    } catch (error: any) {
      logger.error('❌ Error getting survey questions', {
        error: error?.message || 'unknown_error',
        surveyId,
      });
      throw error;
    }
  }

  /**
   * Create survey response with answers
   */
  async createSurveyResponseWithAnswers(
    data: CreateSurveyResponseData,
    userId?: number
  ): Promise<SurveyResponse & { answers: SurveyAnswer[] }> {
    try {
      const startTime = Date.now();

      const result = await db.transaction(async (tx) => {
        // Create the response
        const responseData: InsertSurveyResponse = {
          surveyId: data.surveyId,
          userId: userId,
          completedAt: new Date(),
          timeToComplete: null, // Will calculate after answers are created
        };

        const [response] = await tx
          .insert(surveyResponses)
          .values(responseData)
          .returning();

        // Create the answers
        const answerData: InsertSurveyAnswer[] = data.answers.map((a) => ({
          responseId: response.id,
          questionId: a.questionId,
          answerValue: a.answerValue,
        }));

        const createdAnswers = await tx
          .insert(surveyAnswers)
          .values(answerData)
          .returning();

        // Update response with completion time
        const completionTime = Math.round((Date.now() - startTime) / 1000);
        const [updatedResponse] = await tx
          .update(surveyResponses)
          .set({ timeToComplete: completionTime })
          .where(eq(surveyResponses.id, response.id))
          .returning();

        return { ...updatedResponse, answers: createdAnswers };
      });

      logger.info('✅ Survey response created with answers in database', {
        responseId: result.id,
        surveyId: data.surveyId,
        userId: userId || 'anonymous',
        answersCount: result.answers.length,
        timeToComplete: result.timeToComplete,
      });

      return result;
    } catch (error: any) {
      logger.error('❌ Error creating survey response with answers', {
        error: error?.message || 'unknown_error',
        surveyId: data.surveyId,
        userId: userId || 'anonymous',
        answersCount: data.answers.length,
      });
      throw error;
    }
  }

  /**
   * Get user's survey response
   */
  async getUserSurveyResponse(
    surveyId: number,
    userId: number
  ): Promise<SurveyResponse | null> {
    try {
      const [response] = await db
        .select()
        .from(surveyResponses)
        .where(
          and(
            eq(surveyResponses.surveyId, surveyId),
            eq(surveyResponses.userId, userId)
          )
        )
        .limit(1);

      return response || null;
    } catch (error: any) {
      logger.error('❌ Error getting user survey response', {
        error: error?.message || 'unknown_error',
        surveyId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get survey responses by survey
   */
  async getSurveyResponses(
    surveyId: number,
    includeAnonymous = true
  ): Promise<(SurveyResponse & { user?: { id: number; name: string; email: string } })[]> {
    try {
      const conditions = [eq(surveyResponses.surveyId, surveyId)];
      
      if (!includeAnonymous) {
        conditions.push(sql`${surveyResponses.userId} IS NOT NULL`);
      }

      const responses = await db
        .select({
          response: surveyResponses,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(surveyResponses)
        .leftJoin(users, eq(surveyResponses.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(surveyResponses.completedAt));

      return responses.map(r => ({
        ...r.response,
        user: r.user?.id ? r.user : undefined,
      }));
    } catch (error: any) {
      logger.error('❌ Error getting survey responses', {
        error: error?.message || 'unknown_error',
        surveyId,
        includeAnonymous,
      });
      throw error;
    }
  }

  /**
   * Get survey response with answers
   */
  async getSurveyResponseWithAnswers(
    responseId: number
  ): Promise<(SurveyResponse & { answers: (SurveyAnswer & { question: SurveyQuestion })[] }) | null> {
    try {
      const [response] = await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.id, responseId))
        .limit(1);

      if (!response) return null;

      const answers = await db
        .select({
          answer: surveyAnswers,
          question: surveyQuestions,
        })
        .from(surveyAnswers)
        .leftJoin(surveyQuestions, eq(surveyAnswers.questionId, surveyQuestions.id))
        .where(eq(surveyAnswers.responseId, responseId))
        .orderBy(surveyQuestions.order);

      return {
        ...response,
        answers: answers.map(a => ({ ...a.answer, question: a.question! })),
      };
    } catch (error: any) {
      logger.error('❌ Error getting survey response with answers', {
        error: error?.message || 'unknown_error',
        responseId,
      });
      throw error;
    }
  }

  /**
   * Get survey analytics
   */
  async getSurveyAnalytics(surveyId: number): Promise<{
    totalResponses: number;
    completionRate: number;
    averageCompletionTime: number;
    responsesByDate: { date: string; count: number }[];
  }> {
    try {
      // Get total responses
      const [totalResponsesResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(surveyResponses)
        .where(eq(surveyResponses.surveyId, surveyId));

      const totalResponses = totalResponsesResult?.count || 0;

      // Get survey total recipients (for completion rate)
      const [survey] = await db
        .select({ totalRecipients: surveys.totalRecipients })
        .from(surveys)
        .where(eq(surveys.id, surveyId));

      const completionRate = survey?.totalRecipients 
        ? (totalResponses / survey.totalRecipients) * 100 
        : 0;

      // Get average completion time
      const [avgTimeResult] = await db
        .select({ 
          avgTime: sql<number>`avg(${surveyResponses.timeToComplete})` 
        })
        .from(surveyResponses)
        .where(
          and(
            eq(surveyResponses.surveyId, surveyId),
            sql`${surveyResponses.timeToComplete} IS NOT NULL`
          )
        );

      const averageCompletionTime = avgTimeResult?.avgTime || 0;

      // Get responses by date
      const responsesByDate = await db
        .select({
          date: sql<string>`date(${surveyResponses.completedAt})`,
          count: sql<number>`count(*)`,
        })
        .from(surveyResponses)
        .where(eq(surveyResponses.surveyId, surveyId))
        .groupBy(sql`date(${surveyResponses.completedAt})`)
        .orderBy(sql`date(${surveyResponses.completedAt})`);

      return {
        totalResponses,
        completionRate,
        averageCompletionTime,
        responsesByDate: responsesByDate.map(r => ({
          date: r.date,
          count: r.count,
        })),
      };
    } catch (error: any) {
      logger.error('❌ Error getting survey analytics', {
        error: error?.message || 'unknown_error',
        surveyId,
      });
      throw error;
    }
  }

  /**
   * Update survey question
   */
  async updateSurveyQuestion(
    questionId: number,
    data: Partial<InsertSurveyQuestion>
  ): Promise<SurveyQuestion | null> {
    try {
      const [updatedQuestion] = await db
        .update(surveyQuestions)
        .set(data)
        .where(eq(surveyQuestions.id, questionId))
        .returning();

      return updatedQuestion || null;
    } catch (error: any) {
      logger.error('❌ Error updating survey question', {
        error: error?.message || 'unknown_error',
        questionId,
        data,
      });
      throw error;
    }
  }

  /**
   * Delete survey question
   */
  async deleteSurveyQuestion(questionId: number): Promise<boolean> {
    try {
      const [deletedQuestion] = await db
        .delete(surveyQuestions)
        .where(eq(surveyQuestions.id, questionId))
        .returning();

      return !!deletedQuestion;
    } catch (error: any) {
      logger.error('❌ Error deleting survey question', {
        error: error?.message || 'unknown_error',
        questionId,
      });
      throw error;
    }
  }
}