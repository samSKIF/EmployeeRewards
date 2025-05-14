
import { Module } from '@nestjs/common';
import { SocialModule } from './services/social/social.module';
import { RecognitionModule } from './services/recognition/recognition.module';
import { initializeFirebase } from './firebase-admin';

// Initialize Firebase
initializeFirebase();

@Module({
  imports: [SocialModule, RecognitionModule],
})
export class AppModule {}
