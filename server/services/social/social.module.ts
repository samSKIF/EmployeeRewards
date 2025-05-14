
import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import * as admin from 'firebase-admin';

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

@Module({
  controllers: [SocialController],
  providers: [SocialService],
})
export class SocialModule {}
