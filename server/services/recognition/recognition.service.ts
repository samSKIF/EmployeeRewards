import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { db } from '../../db';
import { desc, eq } from 'drizzle-orm';
import { recognitions, users, posts } from '@shared/schema';

@Injectable()
export class RecognitionService {
  constructor(
    private readonly recognitionGateway: RecognitionGateway,
    @Inject('RECOGNITION_SERVICE') private readonly client: ClientProxy,
  ) {}

  @MessagePattern('recognition.create')
  async handleRecognitionCreate(data: any) {
    return await this.createRecognition(data.userId, data.recognitionData);
  }

  @MessagePattern('recognition.get')
  async handleGetRecognitions(data: any) {
    return await this.getRecognitionsReceived(data.userId);
  }

  async getRecognitionsReceived(userId: number) {
    const recognitionsData = await db.select({
      recognition: recognitions,
      recognizer: users,
    })
    .from(recognitions)
    .leftJoin(users, eq(recognitions.recognizerId, users.id))
    .where(eq(recognitions.recipientId, userId))
    .orderBy(desc(recognitions.createdAt));

    return recognitionsData.map(r => ({
      ...r.recognition,
      recognizer: {
        id: r.recognizer.id,
        name: r.recognizer.name,
        avatarUrl: r.recognizer.avatarUrl
      }
    }));
  }

  async getRecognitionsGiven(userId: number) {
    return await db.select()
      .from(recognitions)
      .where(eq(recognitions.recognizerId, userId))
      .orderBy(desc(recognitions.createdAt));
  }

  async createRecognition(recognizerId: number, data: { 
    recipientId: number,
    badgeType: string,
    message: string,
    points: number
  }) {
    const [post] = await db.insert(posts)
      .values({
        userId: recognizerId,
        type: 'recognition',
        content: `Recognition for ${data.message}`
      })
      .returning();

    const [recognition] = await db.insert(recognitions)
      .values({
        recognizerId,
        recipientId: data.recipientId,
        postId: post.id,
        badgeType: data.badgeType,
        message: data.message,
        points: data.points
      })
      .returning();

    // Notify through WebSocket
    this.recognitionGateway.notifyNewRecognition({ ...recognition, post });
    return { post, recognition };
  }

  async updatePoints(userId: number, points: number) {
    // Update points in database
    await db.update(users)
      .set({ points: points })
      .where(eq(users.id, userId));

    // Notify through WebSocket
    this.recognitionGateway.notifyPointsUpdate(userId, points);
  }
}