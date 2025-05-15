
import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { SocialGateway } from './social.gateway';
import { initializeFirebase } from '../../firebase-admin';

// Ensure Firebase is initialized
initializeFirebase();

@Module({
  controllers: [SocialController],
  providers: [SocialService, SocialGateway],
  exports: [SocialService],
})
export class SocialModule {}
