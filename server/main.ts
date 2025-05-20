
/**
 * Main Application Entry Point
 * This file bootstraps the NestJS application and sets up microservices
 */
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  // Create main NestJS application instance
  const app = await NestFactory.create(AppModule);

  // Configure microservices
  // Recognition Service - Handles employee recognition and rewards
  app.connectMicroservice({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: 3001 }
  });

  // Social Service - Handles social feed and interactions
  app.connectMicroservice({
    transport: Transport.TCP, 
    options: { host: '0.0.0.0', port: 3002 }
  });

  // Configure JSON parsing limit for large payloads (e.g. image uploads)
  app.use(express.json({ limit: '10mb' }));

  // Start all microservices and main application
  await app.startAllMicroservices();
  await app.listen(5000, '0.0.0.0');
  
  console.log('Main application listening on http://0.0.0.0:5000');
  console.log('All microservices started');
}

bootstrap();
