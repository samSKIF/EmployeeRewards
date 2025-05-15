
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { LeaveModule } from './leave.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(LeaveModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3003,
    },
  });

  await app.listen();
  console.log('Leave Management Microservice is listening on port 3003');
}
bootstrap();
