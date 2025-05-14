
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(express.json({ limit: '10mb' }));
  
  await app.listen(5000, '0.0.0.0');
  console.log('Application running on port 5000');
}
bootstrap();
