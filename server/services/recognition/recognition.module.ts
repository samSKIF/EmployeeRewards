
import { Module } from '@nestjs/common';
import { RecognitionController } from './recognition.controller';
import { RecognitionService } from './recognition.service';
import { RecognitionGateway } from './recognition.gateway';
import { initializeFirebase } from '../../firebase-admin';

// Ensure Firebase is initialized
initializeFirebase();

@Module({
  controllers: [RecognitionController],
  providers: [RecognitionService, RecognitionGateway],
  exports: [RecognitionService],
})
export class RecognitionModule {}
