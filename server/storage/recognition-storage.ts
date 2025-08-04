// Recognition storage module for ThrivioHR platform
// Gold standard compliance: Enterprise-grade error handling and type safety

import { db } from '../db';
import {
  recognitions,
  users,
  type Recognition,
  type InsertRecognition,
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import type { RecognitionWithDetails } from '@shared/types';
import type { IRecognitionStorage } from './interfaces';

export class RecognitionStorage implements IRecognitionStorage {
  async createRecognition(recognitionData: InsertRecognition): Promise<Recognition> {
    try {
      const [recognition] = await db
        .insert(recognitions)
        .values(recognitionData)
        .returning();

      return recognition;
    } catch (error: any) {
      console.error('Error creating recognition:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getRecognitionById(id: number): Promise<RecognitionWithDetails | undefined> {
    try {
      const [recognitionData] = await db
        .select({
          recognition: recognitions,
          recognizer: users,
          recipient: users,
        })
        .from(recognitions)
        .leftJoin(users, eq(recognitions.recognizerId, users.id))
        .leftJoin(users, eq(recognitions.recipientId, users.id))
        .where(eq(recognitions.id, id));

      if (!recognitionData) return undefined;

      return {
        ...recognitionData.recognition,
        recognizer: recognitionData.recognizer ? {
          ...recognitionData.recognizer,
          createdAt: recognitionData.recognizer.created_at || new Date(),
        } : null,
        recipient: recognitionData.recipient ? {
          ...recognitionData.recipient,
          createdAt: recognitionData.recipient.created_at || new Date(),
        } : null,
        transaction: null,
      } as RecognitionWithDetails;
    } catch (error: any) {
      console.error('Error getting recognition by ID:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async getRecognitions(): Promise<RecognitionWithDetails[]> {
    try {
      const recognitionsData = await db
        .select({
          recognition: recognitions,
          recognizer: users,
          recipient: users,
        })
        .from(recognitions)
        .leftJoin(users, eq(recognitions.recognizerId, users.id))
        .leftJoin(users, eq(recognitions.recipientId, users.id))
        .orderBy(desc(recognitions.createdAt));

      return recognitionsData.map((r) => ({
        ...r.recognition,
        recognizer: r.recognizer ? {
          ...r.recognizer,
          createdAt: r.recognizer.created_at || new Date(),
        } : null,
        recipient: r.recipient ? {
          ...r.recipient,
          createdAt: r.recipient.created_at || new Date(),
        } : null,
        transaction: null,
      })) as RecognitionWithDetails[];
    } catch (error: any) {
      console.error('Error getting recognitions:', error?.message || 'unknown_error');
      return [];
    }
  }

  async updateRecognitionStatus(
    id: number,
    status: string,
    transactionId?: number
  ): Promise<boolean> {
    try {
      await db
        .update(recognitions)
        .set({
          status: status as 'pending' | 'approved' | 'rejected',
          transactionId,
        })
        .where(eq(recognitions.id, id));

      return true;
    } catch (error: any) {
      console.error('Error updating recognition status:', error?.message || 'unknown_error');
      return false;
    }
  }
}