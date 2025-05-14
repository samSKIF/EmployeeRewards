
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SocialService } from './social.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('social')
@UseGuards(AuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('posts')
  async getPosts(@Query('limit') limit: number, @Query('offset') offset: number) {
    return this.socialService.getPosts(limit, offset);
  }

  @Post('posts')
  async createPost(@Body() data: any) {
    return this.socialService.createPost(data);
  }
}
