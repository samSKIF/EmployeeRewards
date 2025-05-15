
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { RecognitionModule } from './recognition.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(RecognitionModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3001,
    },
  });

  await app.listen();
  console.log('Recognition Microservice is listening');
}
bootstrap();
