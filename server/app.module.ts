
import { Module } from '@nestjs/common';
import { SocialModule } from './services/social/social.module';
import { RecognitionModule } from './services/recognition/recognition.module';
import { auth } from './firebase-admin';

@Module({
  imports: [SocialModule, RecognitionModule],
})
export class AppModule {}
