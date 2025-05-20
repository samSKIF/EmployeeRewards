
/**
 * Recognition Microservice Entry Point
 * Handles employee recognition features, point awards, and achievements
 */
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { RecognitionModule } from './recognition.module';

async function bootstrap() {
  // Create microservice instance
  const app = await NestFactory.createMicroservice(RecognitionModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3001 // Recognition service port
    },
  });

  await app.listen();
  console.log('Recognition Microservice is listening on port 3001');
}

bootstrap();
