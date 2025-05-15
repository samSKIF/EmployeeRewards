
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SocialService } from './social.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('social')
@UseGuards(AuthGuard)
export class SocialController {
  constructor(
    private readonly socialService: SocialService,
    @Inject('SOCIAL_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Get('posts')
  async getPosts(@Query('limit') limit: number, @Query('offset') offset: number) {
    return this.client.send('social.post.get', { limit, offset }).toPromise();
  }

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
