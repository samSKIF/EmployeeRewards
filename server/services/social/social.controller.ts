
/**
 * Social Controller
 * Handles HTTP requests for social features
 */
import { Controller, Get, Post, Body, UseGuards, Query, Inject } from '@nestjs/common';
import { SocialService } from './social.service';
import { AuthGuard } from '../auth/auth.guard';
import { ClientProxy } from '@nestjs/microservices';

@Controller('social')
@UseGuards(AuthGuard)
export class SocialController {
  constructor(
    private readonly socialService: SocialService,
    @Inject('SOCIAL_SERVICE') private readonly client: ClientProxy,
  ) {}

  /**
   * Get paginated posts
   */
  @Get('posts')
  async getPosts(
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0
  ) {
    console.log('Social microservice: Handling get posts request');
    return this.client.send('social.post.get', { limit, offset }).toPromise();
  }

  /**
   * Create new post
   */
  @Post('posts') 
  async createPost(@Body() data: any) {
    console.log('Controller: Sending post creation to microservice');
    const postData = {
      userId: data.userId,
      content: data.content,
      type: data.type || 'standard',
      imageUrl: data.imageUrl
    };
    return this.client.send('social.post.create', postData).toPromise();
  }
}
