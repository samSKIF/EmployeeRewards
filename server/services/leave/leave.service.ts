
import { Injectable } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { db } from '../../db';

@Injectable()
export class LeaveService {
  @MessagePattern('leave.request.create')
  async handleLeaveRequest(data: any) {
    // Handle leave request creation
    return await this.createLeaveRequest(data);
  }

  @MessagePattern('leave.request.get')
  async handleGetLeaveRequests(data: any) {
    // Get leave requests for user
    return await this.getLeaveRequests(data.userId);
  }

  private async createLeaveRequest(data: any) {
    // Implementation
    return await db.transaction().execute(async (trx) => {
      // Create leave request logic
    });
  }

  private async getLeaveRequests(userId: number) {
    // Implementation
    return await db.query.leaveRequests.findMany({
      where: (leave, { eq }) => eq(leave.userId, userId)
    });
  }
}
