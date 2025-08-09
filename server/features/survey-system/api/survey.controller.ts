// Survey System API Controller
// Handles HTTP requests and responses for survey management operations

import { Request, Response } from 'express';
import { SurveyDomain } from '../domain/survey.domain';
import { SurveyRepository } from '../infrastructure/survey.repository';
import { AuthenticatedRequest } from '../../../middleware/auth';
import { logger } from '@platform/sdk';
import type {
  CreateSurveyData,
  UpdateSurveyData,
  CreateSurveyResponseData,
  SurveyFilters,
} from '../domain/survey.domain';

// Initialize repository
const surveyRepository = new SurveyRepository();

/**
 * Survey Controller
 */
export class SurveyController {
  /**
   * Get all surveys for organization
   */
  static async getSurveys(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      if (!user.organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }

      const filters: SurveyFilters = {
        status: req.query.status as string,
        isAnonymous: req.query.isAnonymous === 'true' ? true : req.query.isAnonymous === 'false' ? false : undefined,
        isMandatory: req.query.isMandatory === 'true' ? true : req.query.isMandatory === 'false' ? false : undefined,
        templateType: req.query.templateType as string,
        createdBy: req.query.createdBy ? parseInt(req.query.createdBy as string) : undefined,
      };

      const surveys = await surveyRepository.getSurveysByOrganization(user.organization_id, filters);

      logger.info('✅ Surveys retrieved', {
        organization_id: user.organization_id,
        count: surveys.length,
        userId: user.id,
        filters,
      });

      res.json({
        success: true,
        data: surveys,
        message: `Retrieved ${surveys.length} surveys`,
      });
    } catch (error: any) {
      logger.error('❌ Error retrieving surveys', {
        error: error?.message || 'unknown_error',
        organization_id: req.user!.organization_id,
        userId: req.user!.id,
        filters: req.query,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve surveys',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * Get survey by ID
   */
  static async getSurveyById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const surveyId = parseInt(id);

      if (isNaN(surveyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid survey ID',
          message: 'Survey ID must be a valid number',
        });
        return;
      }

      const survey = await surveyRepository.getSurveyById(surveyId, user.organization_id);

      if (!survey) {
        res.status(404).json({
          success: false,
          error: 'Survey not found',
          message: 'Survey not found or not accessible in your organization',
        });
        return;
      }

      // Get questions for the survey
      const questions = await surveyRepository.getSurveyQuestions(surveyId);

      logger.info('✅ Survey retrieved by ID', {
        surveyId,
        title: survey.title,
        questionsCount: questions.length,
        userId: user.id,
      });

      res.json({
        success: true,
        data: {
          ...survey,
          questions,
        },
        message: 'Survey retrieved successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error retrieving survey by ID', {
        error: error?.message || 'unknown_error',
        surveyId: req.params.id,
        userId: req.user!.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve survey',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * Create a new survey
   */
  static async createSurvey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      if (!user.organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }

      const data: CreateSurveyData = req.body;

      const survey = await SurveyDomain.createSurvey(
        data,
        user.organization_id,
        user.id,
        surveyRepository
      );

      logger.info('✅ Survey created via controller', {
        surveyId: survey.id,
        title: survey.title,
        questionsCount: survey.questions.length,
        organization_id: user.organization_id,
        createdBy: user.id,
      });

      res.status(201).json({
        success: true,
        data: survey,
        message: 'Survey created successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error creating survey via controller', {
        error: error?.message || 'unknown_error',
        organization_id: req.user!.organization_id,
        createdBy: req.user!.id,
        data: req.body,
      });

      res.status(400).json({
        success: false,
        error: 'Failed to create survey',
        message: error?.message || 'Validation failed',
      });
    }
  }

  /**
   * Update a survey
   */
  static async updateSurvey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      if (!user.organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }

      const { id } = req.params;
      const surveyId = parseInt(id);
      const updateData: UpdateSurveyData = req.body;

      if (isNaN(surveyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid survey ID',
          message: 'Survey ID must be a valid number',
        });
        return;
      }

      const updatedSurvey = await SurveyDomain.updateSurvey(
        surveyId,
        updateData,
        user.organization_id,
        user.id,
        surveyRepository
      );

      logger.info('✅ Survey updated via controller', {
        surveyId: updatedSurvey.id,
        title: updatedSurvey.title,
        status: updatedSurvey.status,
        organization_id: user.organization_id,
        userId: user.id,
      });

      res.json({
        success: true,
        data: updatedSurvey,
        message: 'Survey updated successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error updating survey via controller', {
        error: error?.message || 'unknown_error',
        surveyId: req.params.id,
        organization_id: req.user!.organization_id,
        userId: req.user!.id,
        data: req.body,
      });

      const statusCode = error?.message?.includes('not found') ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        error: 'Failed to update survey',
        message: error?.message || 'Validation failed',
      });
    }
  }

  /**
   * Delete a survey
   */
  static async deleteSurvey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      if (!user.organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }

      const { id } = req.params;
      const surveyId = parseInt(id);

      if (isNaN(surveyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid survey ID',
          message: 'Survey ID must be a valid number',
        });
        return;
      }

      const deleted = await SurveyDomain.deleteSurvey(
        surveyId,
        user.organization_id,
        user.id,
        surveyRepository
      );

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Survey not found or cannot be deleted',
          message: 'Survey may be published or not found in your organization',
        });
        return;
      }

      logger.info('✅ Survey deleted via controller', {
        surveyId,
        organization_id: user.organization_id,
        userId: user.id,
      });

      res.status(204).send();
    } catch (error: any) {
      logger.error('❌ Error deleting survey via controller', {
        error: error?.message || 'unknown_error',
        surveyId: req.params.id,
        organization_id: req.user!.organization_id,
        userId: req.user!.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to delete survey',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * Publish a survey
   */
  static async publishSurvey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      if (!user.organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }

      const { id } = req.params;
      const surveyId = parseInt(id);

      if (isNaN(surveyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid survey ID',
          message: 'Survey ID must be a valid number',
        });
        return;
      }

      const publishedSurvey = await SurveyDomain.publishSurvey(
        surveyId,
        user.organization_id,
        user.id,
        surveyRepository
      );

      logger.info('✅ Survey published via controller', {
        surveyId: publishedSurvey.id,
        title: publishedSurvey.title,
        organization_id: user.organization_id,
        userId: user.id,
      });

      res.json({
        success: true,
        data: publishedSurvey,
        message: 'Survey published successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error publishing survey via controller', {
        error: error?.message || 'unknown_error',
        surveyId: req.params.id,
        organization_id: req.user!.organization_id,
        userId: req.user!.id,
      });

      const statusCode = error?.message?.includes('not found') ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        error: 'Failed to publish survey',
        message: error?.message || 'Validation failed',
      });
    }
  }

  /**
   * Submit survey response
   */
  static async submitSurveyResponse(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const data: CreateSurveyResponseData = req.body;

      const response = await SurveyDomain.submitSurveyResponse(
        data,
        user.id,
        user.organization_id,
        surveyRepository
      );

      logger.info('✅ Survey response submitted via controller', {
        responseId: response.id,
        surveyId: data.surveyId,
        userId: user.id,
        answersCount: response.answers.length,
        organization_id: user.organization_id,
      });

      res.status(201).json({
        success: true,
        data: response,
        message: 'Survey response submitted successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error submitting survey response via controller', {
        error: error?.message || 'unknown_error',
        surveyId: req.body?.surveyId,
        userId: req.user!.id,
        organization_id: req.user!.organization_id,
        data: req.body,
      });

      const statusCode = error?.message?.includes('not found') ? 404 :
                        error?.message?.includes('not available') ? 400 :
                        error?.message?.includes('already responded') ? 409 : 400;

      res.status(statusCode).json({
        success: false,
        error: 'Failed to submit survey response',
        message: error?.message || 'Validation failed',
      });
    }
  }

  /**
   * Get survey responses (admin only)
   */
  static async getSurveyResponses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const surveyId = parseInt(id);

      if (isNaN(surveyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid survey ID',
          message: 'Survey ID must be a valid number',
        });
        return;
      }

      // Verify survey belongs to organization
      const survey = await surveyRepository.getSurveyById(surveyId, user.organization_id);
      if (!survey) {
        res.status(404).json({
          success: false,
          error: 'Survey not found',
          message: 'Survey not found or not accessible in your organization',
        });
        return;
      }

      const includeAnonymous = req.query.includeAnonymous !== 'false';
      const responses = await surveyRepository.getSurveyResponses(surveyId, includeAnonymous);

      logger.info('✅ Survey responses retrieved', {
        surveyId,
        count: responses.length,
        includeAnonymous,
        userId: user.id,
        organization_id: user.organization_id,
      });

      res.json({
        success: true,
        data: responses,
        message: `Retrieved ${responses.length} survey responses`,
      });
    } catch (error: any) {
      logger.error('❌ Error retrieving survey responses', {
        error: error?.message || 'unknown_error',
        surveyId: req.params.id,
        userId: req.user!.id,
        organization_id: req.user!.organization_id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve survey responses',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * Get survey analytics (admin only)
   */
  static async getSurveyAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const surveyId = parseInt(id);

      if (isNaN(surveyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid survey ID',
          message: 'Survey ID must be a valid number',
        });
        return;
      }

      // Verify survey belongs to organization
      const survey = await surveyRepository.getSurveyById(surveyId, user.organization_id);
      if (!survey) {
        res.status(404).json({
          success: false,
          error: 'Survey not found',
          message: 'Survey not found or not accessible in your organization',
        });
        return;
      }

      const analytics = await surveyRepository.getSurveyAnalytics(surveyId);

      logger.info('✅ Survey analytics retrieved', {
        surveyId,
        totalResponses: analytics.totalResponses,
        completionRate: analytics.completionRate,
        userId: user.id,
        organization_id: user.organization_id,
      });

      res.json({
        success: true,
        data: analytics,
        message: 'Survey analytics retrieved successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error retrieving survey analytics', {
        error: error?.message || 'unknown_error',
        surveyId: req.params.id,
        userId: req.user!.id,
        organization_id: req.user!.organization_id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve survey analytics',
        message: error?.message || 'Internal server error',
      });
    }
  }
}