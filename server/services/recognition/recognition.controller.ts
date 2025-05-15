
import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { RecognitionService } from './recognition.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('recognition')
@UseGuards(AuthGuard)
export class RecognitionController {
  constructor(private readonly recognitionService: RecognitionService) {}

  @Get('received')
  async getRecognitionsReceived(@Req() req: any) {
    return this.recognitionService.getRecognitionsReceived(req.user.id);
  }

  @Get('given') 
  async getRecognitionsGiven(@Req() req: any) {
    return this.recognitionService.getRecognitionsGiven(req.user.id);
  }

  @Post()
  async createRecognition(@Req() req: any, @Body() data: {
    recipientId: number,
    badgeType: string,
    message: string,
    points: number
  }) {
    return this.recognitionService.createRecognition(req.user.id, data);
  }
}
