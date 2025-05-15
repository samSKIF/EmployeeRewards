
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { SocialModule } from './social.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(SocialModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3002,
    },
  });

  await app.listen();
  console.log('Social Microservice is listening on port 3002');
}
bootstrap();
