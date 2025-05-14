
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { RecognitionService } from './recognition.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('recognition')
@UseGuards(AuthGuard)
export class RecognitionController {
  constructor(private readonly recognitionService: RecognitionService) {}

  @Get('received')
  async getRecognitionsReceived() {
    return this.recognitionService.getRecognitionsReceived();
  }

  @Get('given') 
  async getRecognitionsGiven() {
    return this.recognitionService.getRecognitionsGiven();
  }
}
