import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { WebSocketModule } from '@nestjs/websockets';
import { RecognitionController } from './recognition.controller';
import { RecognitionService } from './recognition.service';
import { RecognitionGateway } from './recognition.gateway';
import { auth } from '../../firebase-admin';

@Module({
  imports: [
    WebSocketModule,
    ClientsModule.register([
      {
        name: 'RECOGNITION_SERVICE',
        transport: Transport.TCP,
        options: {
          host: '0.0.0.0',
          port: 3001,
        },
      },
    ]),
  ],
  controllers: [RecognitionController],
  providers: [RecognitionService, RecognitionGateway],
  exports: [RecognitionService],
})
export class RecognitionModule {}