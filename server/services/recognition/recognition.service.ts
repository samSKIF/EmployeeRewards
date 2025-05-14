
import { Injectable } from '@nestjs/common';
import { db } from '../../db';
import { desc, eq } from 'drizzle-orm';
import { recognitions, users } from '@shared/schema';

@Injectable()
export class RecognitionService {
  async getRecognitionsReceived(userId: number) {
    return await db.select()
      .from(recognitions)
      .where(eq(recognitions.recipientId, userId))
      .orderBy(desc(recognitions.createdAt));
  }

  async getRecognitionsGiven(userId: number) {
    return await db.select()
      .from(recognitions)
      .where(eq(recognitions.recognizerId, userId))
      .orderBy(desc(recognitions.createdAt));
  }
}
