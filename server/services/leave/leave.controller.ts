
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
  async createLeaveRequest(@Body() data: any, @Request() req: any) {
    try {
      console.log('Leave microservice: Handling leave request creation');
      const result = await this.client.send('leave.request.create', { ...data, userId: req.user.id }).toPromise();
      console.log('Leave microservice: Leave request created successfully:', result?.id);
      return result;
    } catch (error) {
      console.error('Leave microservice: Error creating leave request:', error);
      throw error;
    }
  }

  @Get('requests')
  async getLeaveRequests(@Request() req: any) {
    try {
      console.log('Leave microservice: Fetching leave requests');
      const result = await this.client.send('leave.request.get', { userId: req.user.id }).toPromise();
      console.log(`Leave microservice: Retrieved ${result?.length} leave requests`);
      return result;
    } catch (error) {
      console.error('Leave microservice: Error fetching leave requests:', error);
      throw error;
    }
  }

  @Get('types')
  async getLeaveTypes(@Request() req: any) {
    try {
      return await this.client.send('leave.types.get', { organizationId: req.user.organizationId }).toPromise();
    } catch (error) {
      console.error('Leave microservice: Error fetching leave types:', error);
      throw error;
    }
  }
}
