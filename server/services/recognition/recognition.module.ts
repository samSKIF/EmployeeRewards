
import { Module } from '@nestjs/common';
import { RecognitionController } from './recognition.controller';
import { RecognitionService } from './recognition.service';
import { initializeFirebase } from '../../firebase-admin';

// Ensure Firebase is initialized
initializeFirebase();

@Module({
  controllers: [RecognitionController],
  providers: [RecognitionService],
})
export class RecognitionModule {}
