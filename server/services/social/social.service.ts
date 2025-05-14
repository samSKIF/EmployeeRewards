
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { db } from '../../db';
import { posts, comments, reactions } from '@shared/schema';

@Injectable()
export class SocialService {
  constructor() {}

  async getPosts(limit: number = 20, offset: number = 0) {
    return await db.select().from(posts)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(posts.createdAt));
  }

  async createPost(data: any) {
    const [post] = await db.insert(posts)
      .values(data)
      .returning();
    return post;
  }

  async getComments(postId: number) {
    return await db.select().from(comments)
      .where(eq(comments.postId, postId));
  }
}
