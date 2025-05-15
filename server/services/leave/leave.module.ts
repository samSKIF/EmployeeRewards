
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'LEAVE_SERVICE',
        transport: Transport.TCP,
        options: {
          host: '0.0.0.0',
          port: 3004
        }
      }
    ])
  ],
  controllers: [LeaveController],
  providers: [LeaveService],
})
export class LeaveModule {}
