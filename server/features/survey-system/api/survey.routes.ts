// Survey System API Routes
// Defines all HTTP routes for survey management operations

import { Router } from 'express';
import { verifyToken, verifyAdmin } from '../../../middleware/auth';
import { SurveyController } from './survey.controller';

const router = Router();

/**
 * Survey Management Routes
 * /api/survey/*
 */

// Get all surveys for organization
router.get('/', verifyToken, SurveyController.getSurveys);

// Get survey by ID (public endpoint for taking surveys)
router.get('/:id', verifyToken, SurveyController.getSurveyById);

// Create new survey (admin only)
router.post('/', verifyToken, verifyAdmin, SurveyController.createSurvey);

// Update survey (admin only)
router.patch('/:id', verifyToken, verifyAdmin, SurveyController.updateSurvey);

// Delete survey (admin only)
router.delete('/:id', verifyToken, verifyAdmin, SurveyController.deleteSurvey);

// Publish survey (admin only)
router.post('/:id/publish', verifyToken, verifyAdmin, SurveyController.publishSurvey);

/**
 * Survey Response Routes
 * /api/survey/responses/*
 */

// Submit survey response
router.post('/responses', verifyToken, SurveyController.submitSurveyResponse);

// Get survey responses (admin only)
router.get('/:id/responses', verifyToken, verifyAdmin, SurveyController.getSurveyResponses);

// Get survey analytics (admin only)
router.get('/:id/analytics', verifyToken, verifyAdmin, SurveyController.getSurveyAnalytics);

export default router;