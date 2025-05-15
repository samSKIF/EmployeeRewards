
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { SocialGateway } from './social.gateway';
import { initializeFirebase } from '../../firebase-admin';

// Ensure Firebase is initialized
initializeFirebase();

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'SOCIAL_SERVICE',
        transport: Transport.TCP,
        options: {
          host: '0.0.0.0',
          port: 3002,
        },
      },
    ]),
  ],
  controllers: [SocialController],
  providers: [SocialService, SocialGateway],
  exports: [SocialService],
})
export class SocialModule {}
