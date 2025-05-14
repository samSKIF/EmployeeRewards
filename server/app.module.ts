
import { Module } from '@nestjs/common';
import { SocialModule } from './services/social/social.module';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

@Module({
  imports: [SocialModule],
})
export class AppModule {}
