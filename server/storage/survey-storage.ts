// Survey storage module for ThrivioHR platform
// Gold standard compliance: Enterprise-grade error handling and type safety

import { db } from '../db';
import {
  surveys,
  surveyQuestions,
  surveyResponses,
  surveyAnswers,
  type Survey,
  type InsertSurvey,
  type SurveyQuestion,
  type InsertSurveyQuestion,
  type SurveyResponse,
  type InsertSurveyResponse,
  type SurveyAnswer,
  type InsertSurveyAnswer,
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import type { ISurveyStorage } from './interfaces';

export class SurveyStorage implements ISurveyStorage {
  async createSurvey(surveyData: InsertSurvey): Promise<Survey> {
    try {
      const [survey] = await db.insert(surveys).values(surveyData).returning();
      return survey;
    } catch (error: any) {
      console.error('Error creating survey:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getSurveys(): Promise<Survey[]> {
    try {
      return await db.select().from(surveys).orderBy(desc(surveys.createdAt));
    } catch (error: any) {
      console.error('Error getting surveys:', error?.message || 'unknown_error');
      return [];
    }
  }

  async getSurveyById(id: number): Promise<Survey | undefined> {
    try {
      const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
      return survey;
    } catch (error: any) {
      console.error('Error getting survey by ID:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async createSurveyQuestion(questionData: InsertSurveyQuestion): Promise<SurveyQuestion> {
    try {
      const [question] = await db
        .insert(surveyQuestions)
        .values(questionData)
        .returning();
      return question;
    } catch (error: any) {
      console.error('Error creating survey question:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getSurveyQuestions(surveyId: number): Promise<SurveyQuestion[]> {
    try {
      return await db
        .select()
        .from(surveyQuestions)
        .where(eq(surveyQuestions.surveyId, surveyId))
        .orderBy(surveyQuestions.order);
    } catch (error: any) {
      console.error('Error getting survey questions:', error?.message || 'unknown_error');
      return [];
    }
  }

  async createSurveyResponse(responseData: InsertSurveyResponse): Promise<SurveyResponse> {
    try {
      const [response] = await db
        .insert(surveyResponses)
        .values(responseData)
        .returning();
      return response;
    } catch (error: any) {
      console.error('Error creating survey response:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getSurveyResponses(surveyId: number): Promise<SurveyResponse[]> {
    try {
      return await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.surveyId, surveyId))
        .orderBy(desc(surveyResponses.startedAt));
    } catch (error: any) {
      console.error('Error getting survey responses:', error?.message || 'unknown_error');
      return [];
    }
  }

  async createSurveyAnswer(answerData: InsertSurveyAnswer): Promise<SurveyAnswer> {
    try {
      const [answer] = await db.insert(surveyAnswers).values(answerData).returning();
      return answer;
    } catch (error: any) {
      console.error('Error creating survey answer:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getSurveyAnswers(responseId: number): Promise<SurveyAnswer[]> {
    try {
      return await db
        .select()
        .from(surveyAnswers)
        .where(eq(surveyAnswers.responseId, responseId));
    } catch (error: any) {
      console.error('Error getting survey answers:', error?.message || 'unknown_error');
      return [];
    }
  }
}