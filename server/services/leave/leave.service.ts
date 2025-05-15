
import { Injectable } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { leaveRequests, leaveTypes } from '../../db/schema';

@Injectable()
export class LeaveService {
  @MessagePattern('leave.request.create')
  async createLeaveRequest(data: any) {
    return await db.transaction().execute(async (trx) => {
      const [request] = await db.insert(leaveRequests).values({
        userId: data.userId,
        leaveTypeId: data.leaveTypeId,
        startDate: data.startDate,
        endDate: data.endDate,
        startHalfDay: data.startHalfDay,
        endHalfDay: data.endHalfDay,
        notes: data.notes,
        approverId: data.approverId,
        status: 'PENDING'
      }).returning();
      return request;
    });
  }

  @MessagePattern('leave.request.get')
  async getLeaveRequests(data: { userId: number }) {
    return await db.query.leaveRequests.findMany({
      where: (leave, { eq }) => eq(leave.userId, data.userId),
      with: {
        leaveType: true,
        approver: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  @MessagePattern('leave.types.get')
  async getLeaveTypes(data: { organizationId: number }) {
    return await db.query.leaveTypes.findMany({
      where: (type, { eq }) => eq(type.organizationId, data.organizationId)
    });
  }

  @MessagePattern('leave.request.update')
  async updateLeaveRequest(data: { id: number; status: string; rejectionReason?: string }) {
    const [updated] = await db.update(leaveRequests)
      .set({
        status: data.status,
        rejectionReason: data.rejectionReason,
        approvedAt: data.status === 'APPROVED' ? new Date() : null
      })
      .where(eq(leaveRequests.id, data.id))
      .returning();
    return updated;
  }
}
