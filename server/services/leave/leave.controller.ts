
import { Controller, Get, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '../auth/auth.guard';

@Controller('leave')
@UseGuards(AuthGuard)
export class LeaveController {
  constructor(
    @Inject('LEAVE_SERVICE') private readonly client: ClientProxy
  ) {}

  @Post('request')
  async createLeaveRequest(@Body() data: any) {
    return this.client.send('leave.request.create', data).toPromise();
  }

  @Get('requests')
  async getLeaveRequests() {
    return this.client.send('leave.request.get', {}).toPromise();
  }
}
