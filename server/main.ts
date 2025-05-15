import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3001,
    },
  });

  app.connectMicroservice({
    transport: Transport.TCP, 
    options: {
      host: '0.0.0.0',
      port: 3002,
    },
  });

  app.use(express.json({ limit: '10mb' }));

  await app.startAllMicroservices();
  await app.listen(5000, '0.0.0.0');
  console.log('Application and microservices running');
}

bootstrap();