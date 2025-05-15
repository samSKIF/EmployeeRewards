import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { posts, comments, reactions } from '@shared/schema';

@Injectable()
export class SocialService {
  constructor(
    private readonly socialGateway: SocialGateway,
    @Inject('SOCIAL_SERVICE') private readonly client: ClientProxy,
  ) {}

  @MessagePattern('social.post.create')
  async handlePostCreate(data: any) {
    return await this.createPost(data.userId, data.postData);
  }

  @MessagePattern('social.post.get')
  async handleGetPosts(data: any) {
    return await this.getPosts(data.filters);
  }

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