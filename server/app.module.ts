
import { Module } from '@nestjs/common';
import { SocialModule } from './services/social/social.module';
import { RecognitionModule } from './services/recognition/recognition.module';
// Firebase admin removed - using PostgreSQL authentication only

@Module({
  imports: [SocialModule, RecognitionModule],
})
export class AppModule {}
