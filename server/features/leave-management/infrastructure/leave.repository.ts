// Leave Management Infrastructure Layer
// Implements data access operations for leave domain using PostgreSQL with Drizzle ORM

import { eq, and, gte, lte, desc, sql, or } from 'drizzle-orm';
import { db } from '../../../db';
import {
  leaveTypes,
  leaveRequests, 
  leaveEntitlements,
  leavePolicies,
  holidays,
  users,
} from '@shared/schema';
import type {
  LeaveType,
  LeaveRequest,
  LeaveEntitlement,
  LeavePolicy,
  Holiday,
  User,
  LeaveDependencies,
} from '../domain/leave.domain';
import { logger } from '@platform/sdk';

/**
 * Leave Repository
 * Provides data access operations for leave management features
 * Implements the LeaveDependencies interface from domain layer
 */
export class LeaveRepository implements LeaveDependencies {
  // Leave Type operations
  async persistLeaveType(data: Partial<LeaveType>): Promise<LeaveType> {
    try {
      const [leaveType] = await db
        .insert(leaveTypes)
        .values({
          name: data.name!,
          description: data.description,
          organization_id: data.organization_id!,
          color: data.color,
          icon: data.icon,
          is_paid: data.is_paid ?? true,
          requires_approval: data.requires_approval ?? true,
          max_consecutive_days: data.max_consecutive_days,
          max_days_per_year: data.max_days_per_year,
          created_by: data.created_by!,
        })
        .returning();

      return this.mapLeaveTypeFromDb(leaveType);
    } catch (error: any) {
      logger.error('❌ Error persisting leave type', {
        error: error?.message || 'unknown_error',
        data,
      });
      throw error;
    }
  }

  async updateLeaveType(id: number, data: Partial<LeaveType>, organizationId: number): Promise<LeaveType | null> {
    try {
      const [updatedType] = await db
        .update(leaveTypes)
        .set({
          name: data.name,
          description: data.description,
          color: data.color,
          icon: data.icon,
          is_paid: data.is_paid,
          requires_approval: data.requires_approval,
          max_consecutive_days: data.max_consecutive_days,
          max_days_per_year: data.max_days_per_year,
          updated_at: new Date(),
        })
        .where(and(
          eq(leaveTypes.id, id),
          eq(leaveTypes.organization_id, organizationId)
        ))
        .returning();

      return updatedType ? this.mapLeaveTypeFromDb(updatedType) : null;
    } catch (error: any) {
      logger.error('❌ Error updating leave type', {
        error: error?.message || 'unknown_error',
        id,
        organizationId,
        data,
      });
      throw error;
    }
  }

  async getLeaveTypeById(id: number, organizationId: number): Promise<LeaveType | null> {
    try {
      const [leaveType] = await db
        .select()
        .from(leaveTypes)
        .where(and(
          eq(leaveTypes.id, id),
          eq(leaveTypes.organization_id, organizationId)
        ));

      return leaveType ? this.mapLeaveTypeFromDb(leaveType) : null;
    } catch (error: any) {
      logger.error('❌ Error getting leave type by ID', {
        error: error?.message || 'unknown_error',
        id,
        organizationId,
      });
      throw error;
    }
  }

  async getLeaveTypesByOrganization(organizationId: number): Promise<LeaveType[]> {
    try {
      const types = await db
        .select()
        .from(leaveTypes)
        .where(eq(leaveTypes.organization_id, organizationId))
        .orderBy(leaveTypes.name);

      return types.map(this.mapLeaveTypeFromDb);
    } catch (error: any) {
      logger.error('❌ Error getting leave types by organization', {
        error: error?.message || 'unknown_error',
        organizationId,
      });
      throw error;
    }
  }

  async deleteLeaveType(id: number, organizationId: number): Promise<boolean> {
    try {
      // Check if leave type is in use
      const [entitlementCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(leaveEntitlements)
        .where(eq(leaveEntitlements.leave_type_id, id));

      if (entitlementCount.count > 0) {
        throw new Error('Leave type is in use and cannot be deleted');
      }

      const result = await db
        .delete(leaveTypes)
        .where(and(
          eq(leaveTypes.id, id),
          eq(leaveTypes.organization_id, organizationId)
        ));

      return result.rowCount > 0;
    } catch (error: any) {
      logger.error('❌ Error deleting leave type', {
        error: error?.message || 'unknown_error',
        id,
        organizationId,
      });
      throw error;
    }
  }

  // Leave Request operations
  async persistLeaveRequest(data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    try {
      const [request] = await db
        .insert(leaveRequests)
        .values({
          user_id: data.user_id!,
          leave_type_id: data.leave_type_id!,
          start_date: data.start_date!,
          end_date: data.end_date!,
          days_requested: data.days_requested!,
          status: data.status as any || 'PENDING',
          reason: data.reason,
          approver_id: data.approver_id,
        })
        .returning();

      return this.mapLeaveRequestFromDb(request);
    } catch (error: any) {
      logger.error('❌ Error persisting leave request', {
        error: error?.message || 'unknown_error',
        data,
      });
      throw error;
    }
  }

  async updateLeaveRequest(id: number, data: Partial<LeaveRequest>, userId: number, isAdmin: boolean): Promise<LeaveRequest | null> {
    try {
      // Authorization check - user can only update their own requests unless admin
      let whereCondition = eq(leaveRequests.id, id);
      
      if (!isAdmin) {
        whereCondition = and(
          eq(leaveRequests.id, id),
          or(
            eq(leaveRequests.user_id, userId),
            eq(leaveRequests.approver_id, userId)
          )
        );
      }

      const [updatedRequest] = await db
        .update(leaveRequests)
        .set({
          status: data.status as any,
          approver_comments: data.approver_comments,
          approved_at: data.approved_at,
          updated_at: new Date(),
        })
        .where(whereCondition)
        .returning();

      return updatedRequest ? this.mapLeaveRequestFromDb(updatedRequest) : null;
    } catch (error: any) {
      logger.error('❌ Error updating leave request', {
        error: error?.message || 'unknown_error',
        id,
        userId,
        isAdmin,
        data,
      });
      throw error;
    }
  }

  async getLeaveRequestById(id: number): Promise<LeaveRequest | null> {
    try {
      const [request] = await db
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.id, id));

      return request ? this.mapLeaveRequestFromDb(request) : null;
    } catch (error: any) {
      logger.error('❌ Error getting leave request by ID', {
        error: error?.message || 'unknown_error',
        id,
      });
      throw error;
    }
  }

  async getLeaveRequestsByUser(userId: number): Promise<LeaveRequest[]> {
    try {
      const requests = await db
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.user_id, userId))
        .orderBy(desc(leaveRequests.created_at));

      return requests.map(this.mapLeaveRequestFromDb);
    } catch (error: any) {
      logger.error('❌ Error getting leave requests by user', {
        error: error?.message || 'unknown_error',
        userId,
      });
      throw error;
    }
  }

  async getLeaveRequestsByOrganization(organizationId: number, filters?: any): Promise<LeaveRequest[]> {
    try {
      // Join with users to filter by organization
      let query = db
        .select({
          id: leaveRequests.id,
          user_id: leaveRequests.user_id,
          leave_type_id: leaveRequests.leave_type_id,
          start_date: leaveRequests.start_date,
          end_date: leaveRequests.end_date,
          days_requested: leaveRequests.days_requested,
          status: leaveRequests.status,
          reason: leaveRequests.reason,
          approver_id: leaveRequests.approver_id,
          approver_comments: leaveRequests.approver_comments,
          approved_at: leaveRequests.approved_at,
          created_at: leaveRequests.created_at,
          updated_at: leaveRequests.updated_at,
        })
        .from(leaveRequests)
        .innerJoin(users, eq(leaveRequests.user_id, users.id))
        .where(eq(users.organization_id, organizationId));

      // Apply filters
      if (filters?.status) {
        query = query.where(eq(leaveRequests.status, filters.status));
      }

      if (filters?.leaveTypeId) {
        query = query.where(eq(leaveRequests.leave_type_id, filters.leaveTypeId));
      }

      if (filters?.startDate) {
        query = query.where(gte(leaveRequests.start_date, new Date(filters.startDate)));
      }

      if (filters?.endDate) {
        query = query.where(lte(leaveRequests.end_date, new Date(filters.endDate)));
      }

      const requests = await query.orderBy(desc(leaveRequests.created_at));
      return requests.map(this.mapLeaveRequestFromDb);
    } catch (error: any) {
      logger.error('❌ Error getting leave requests by organization', {
        error: error?.message || 'unknown_error',
        organizationId,
        filters,
      });
      throw error;
    }
  }

  async deleteLeaveRequest(id: number, userId: number): Promise<boolean> {
    try {
      // Users can only delete their own pending requests
      const result = await db
        .delete(leaveRequests)
        .where(and(
          eq(leaveRequests.id, id),
          eq(leaveRequests.user_id, userId),
          eq(leaveRequests.status, 'PENDING')
        ));

      return result.rowCount > 0;
    } catch (error: any) {
      logger.error('❌ Error deleting leave request', {
        error: error?.message || 'unknown_error',
        id,
        userId,
      });
      throw error;
    }
  }

  // Leave Entitlement operations
  async persistLeaveEntitlement(data: Partial<LeaveEntitlement>): Promise<LeaveEntitlement> {
    try {
      const [entitlement] = await db
        .insert(leaveEntitlements)
        .values({
          user_id: data.user_id!,
          leave_type_id: data.leave_type_id!,
          year: data.year!,
          total_days: data.total_days!,
          used_days: data.used_days || 0,
          pending_days: data.pending_days || 0,
          remaining_days: data.remaining_days!,
          carried_forward: data.carried_forward || 0,
          expires_at: data.expires_at,
        })
        .returning();

      return this.mapLeaveEntitlementFromDb(entitlement);
    } catch (error: any) {
      logger.error('❌ Error persisting leave entitlement', {
        error: error?.message || 'unknown_error',
        data,
      });
      throw error;
    }
  }

  async updateLeaveEntitlement(id: number, data: Partial<LeaveEntitlement>): Promise<LeaveEntitlement | null> {
    try {
      const [updatedEntitlement] = await db
        .update(leaveEntitlements)
        .set({
          total_days: data.total_days,
          used_days: data.used_days,
          pending_days: data.pending_days,
          remaining_days: data.remaining_days,
          carried_forward: data.carried_forward,
          expires_at: data.expires_at,
          updated_at: new Date(),
        })
        .where(eq(leaveEntitlements.id, id))
        .returning();

      return updatedEntitlement ? this.mapLeaveEntitlementFromDb(updatedEntitlement) : null;
    } catch (error: any) {
      logger.error('❌ Error updating leave entitlement', {
        error: error?.message || 'unknown_error',
        id,
        data,
      });
      throw error;
    }
  }

  async getLeaveEntitlementsByUser(userId: number): Promise<LeaveEntitlement[]> {
    try {
      const entitlements = await db
        .select()
        .from(leaveEntitlements)
        .where(eq(leaveEntitlements.user_id, userId))
        .orderBy(leaveEntitlements.year, leaveEntitlements.leave_type_id);

      return entitlements.map(this.mapLeaveEntitlementFromDb);
    } catch (error: any) {
      logger.error('❌ Error getting leave entitlements by user', {
        error: error?.message || 'unknown_error',
        userId,
      });
      throw error;
    }
  }

  async getLeaveEntitlementsByOrganization(organizationId: number): Promise<LeaveEntitlement[]> {
    try {
      const entitlements = await db
        .select({
          id: leaveEntitlements.id,
          user_id: leaveEntitlements.user_id,
          leave_type_id: leaveEntitlements.leave_type_id,
          year: leaveEntitlements.year,
          total_days: leaveEntitlements.total_days,
          used_days: leaveEntitlements.used_days,
          pending_days: leaveEntitlements.pending_days,
          remaining_days: leaveEntitlements.remaining_days,
          carried_forward: leaveEntitlements.carried_forward,
          expires_at: leaveEntitlements.expires_at,
          created_at: leaveEntitlements.created_at,
          updated_at: leaveEntitlements.updated_at,
        })
        .from(leaveEntitlements)
        .innerJoin(users, eq(leaveEntitlements.user_id, users.id))
        .where(eq(users.organization_id, organizationId));

      return entitlements.map(this.mapLeaveEntitlementFromDb);
    } catch (error: any) {
      logger.error('❌ Error getting leave entitlements by organization', {
        error: error?.message || 'unknown_error',
        organizationId,
      });
      throw error;
    }
  }

  // Leave Policy operations
  async persistLeavePolicy(data: Partial<LeavePolicy>): Promise<LeavePolicy> {
    try {
      const [policy] = await db
        .insert(leavePolicies)
        .values({
          organization_id: data.organization_id!,
          country: data.country!,
          annual_leave_days: data.annual_leave_days!,
          sick_leave_days: data.sick_leave_days!,
          maternity_leave_days: data.maternity_leave_days!,
          paternity_leave_days: data.paternity_leave_days!,
          carryover_max_days: data.carryover_max_days!,
          carryover_expiry_months: data.carryover_expiry_months!,
          notice_period_days: data.notice_period_days!,
          created_by: data.created_by!,
        })
        .returning();

      return this.mapLeavePolicyFromDb(policy);
    } catch (error: any) {
      logger.error('❌ Error persisting leave policy', {
        error: error?.message || 'unknown_error',
        data,
      });
      throw error;
    }
  }

  async updateLeavePolicy(organizationId: number, country: string, data: Partial<LeavePolicy>): Promise<LeavePolicy> {
    try {
      const [updatedPolicy] = await db
        .update(leavePolicies)
        .set({
          annual_leave_days: data.annual_leave_days,
          sick_leave_days: data.sick_leave_days,
          maternity_leave_days: data.maternity_leave_days,
          paternity_leave_days: data.paternity_leave_days,
          carryover_max_days: data.carryover_max_days,
          carryover_expiry_months: data.carryover_expiry_months,
          notice_period_days: data.notice_period_days,
          updated_at: new Date(),
          updated_by: data.updated_by,
        })
        .where(and(
          eq(leavePolicies.organization_id, organizationId),
          eq(leavePolicies.country, country)
        ))
        .returning();

      return this.mapLeavePolicyFromDb(updatedPolicy);
    } catch (error: any) {
      logger.error('❌ Error updating leave policy', {
        error: error?.message || 'unknown_error',
        organizationId,
        country,
        data,
      });
      throw error;
    }
  }

  async getLeavePolicyByCountry(organizationId: number, country: string): Promise<LeavePolicy | null> {
    try {
      const [policy] = await db
        .select()
        .from(leavePolicies)
        .where(and(
          eq(leavePolicies.organization_id, organizationId),
          eq(leavePolicies.country, country)
        ));

      return policy ? this.mapLeavePolicyFromDb(policy) : null;
    } catch (error: any) {
      logger.error('❌ Error getting leave policy by country', {
        error: error?.message || 'unknown_error',
        organizationId,
        country,
      });
      throw error;
    }
  }

  async getLeavePoliciesByOrganization(organizationId: number): Promise<LeavePolicy[]> {
    try {
      const policies = await db
        .select()
        .from(leavePolicies)
        .where(eq(leavePolicies.organization_id, organizationId))
        .orderBy(leavePolicies.country);

      return policies.map(this.mapLeavePolicyFromDb);
    } catch (error: any) {
      logger.error('❌ Error getting leave policies by organization', {
        error: error?.message || 'unknown_error',
        organizationId,
      });
      throw error;
    }
  }

  // Holiday operations
  async persistHoliday(data: Partial<Holiday>): Promise<Holiday> {
    try {
      const [holiday] = await db
        .insert(holidays)
        .values({
          organization_id: data.organization_id!,
          name: data.name!,
          date: data.date!,
          country: data.country!,
          is_recurring: data.is_recurring || false,
          created_by: data.created_by!,
        })
        .returning();

      return this.mapHolidayFromDb(holiday);
    } catch (error: any) {
      logger.error('❌ Error persisting holiday', {
        error: error?.message || 'unknown_error',
        data,
      });
      throw error;
    }
  }

  async getHolidaysByOrganization(organizationId: number, filters?: { country?: string; year?: number }): Promise<Holiday[]> {
    try {
      let query = db
        .select()
        .from(holidays)
        .where(eq(holidays.organization_id, organizationId));

      if (filters?.country) {
        query = query.where(eq(holidays.country, filters.country));
      }

      if (filters?.year) {
        const yearStart = new Date(`${filters.year}-01-01`);
        const yearEnd = new Date(`${filters.year}-12-31`);
        query = query.where(and(
          gte(holidays.date, yearStart),
          lte(holidays.date, yearEnd)
        ));
      }

      const holidayList = await query.orderBy(holidays.date);
      return holidayList.map(this.mapHolidayFromDb);
    } catch (error: any) {
      logger.error('❌ Error getting holidays by organization', {
        error: error?.message || 'unknown_error',
        organizationId,
        filters,
      });
      throw error;
    }
  }

  async deleteHoliday(id: number, organizationId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(holidays)
        .where(and(
          eq(holidays.id, id),
          eq(holidays.organization_id, organizationId)
        ));

      return result.rowCount > 0;
    } catch (error: any) {
      logger.error('❌ Error deleting holiday', {
        error: error?.message || 'unknown_error',
        id,
        organizationId,
      });
      throw error;
    }
  }

  // User operations
  async getUserById(userId: number): Promise<User | null> {
    try {
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          department: users.department,
          organization_id: users.organization_id,
        })
        .from(users)
        .where(eq(users.id, userId));

      return user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department || undefined,
        organization_id: user.organization_id || 1,
      } : null;
    } catch (error: any) {
      logger.error('❌ Error getting user by ID', {
        error: error?.message || 'unknown_error',
        userId,
      });
      throw error;
    }
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    try {
      const usersList = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          department: users.department,
          organization_id: users.organization_id,
        })
        .from(users)
        .where(eq(users.organization_id, organizationId));

      return usersList.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department || undefined,
        organization_id: user.organization_id || 1,
      }));
    } catch (error: any) {
      logger.error('❌ Error getting users by organization', {
        error: error?.message || 'unknown_error',
        organizationId,
      });
      throw error;
    }
  }

  // Utility operations
  calculateWorkingDays(startDate: Date, endDate: Date, holidays: Holiday[]): number {
    let workingDays = 0;
    const currentDate = new Date(startDate);
    const holidayDates = new Set(holidays.map(h => h.date.toDateString()));

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
      const isHoliday = holidayDates.has(currentDate.toDateString());

      if (!isWeekend && !isHoliday) {
        workingDays++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  }

  async validateLeaveAvailability(userId: number, leaveTypeId: number, daysRequested: number): Promise<boolean> {
    try {
      const currentYear = new Date().getFullYear();
      
      const [entitlement] = await db
        .select()
        .from(leaveEntitlements)
        .where(and(
          eq(leaveEntitlements.user_id, userId),
          eq(leaveEntitlements.leave_type_id, leaveTypeId),
          eq(leaveEntitlements.year, currentYear)
        ));

      if (!entitlement) {
        return false; // No entitlement found
      }

      return entitlement.remaining_days >= daysRequested;
    } catch (error: any) {
      logger.error('❌ Error validating leave availability', {
        error: error?.message || 'unknown_error',
        userId,
        leaveTypeId,
        daysRequested,
      });
      return false;
    }
  }

  async checkLeaveConflicts(userId: number, startDate: Date, endDate: Date): Promise<boolean> {
    try {
      const [conflictingRequest] = await db
        .select()
        .from(leaveRequests)
        .where(and(
          eq(leaveRequests.user_id, userId),
          or(
            eq(leaveRequests.status, 'APPROVED'),
            eq(leaveRequests.status, 'PENDING')
          ),
          or(
            and(
              gte(leaveRequests.start_date, startDate),
              lte(leaveRequests.start_date, endDate)
            ),
            and(
              gte(leaveRequests.end_date, startDate),
              lte(leaveRequests.end_date, endDate)
            ),
            and(
              lte(leaveRequests.start_date, startDate),
              gte(leaveRequests.end_date, endDate)
            )
          )
        ))
        .limit(1);

      return !!conflictingRequest;
    } catch (error: any) {
      logger.error('❌ Error checking leave conflicts', {
        error: error?.message || 'unknown_error',
        userId,
        startDate,
        endDate,
      });
      return true; // Assume conflict if error
    }
  }

  async updateLeaveBalances(userId: number, leaveTypeId: number, daysUsed: number): Promise<void> {
    try {
      const currentYear = new Date().getFullYear();
      
      await db
        .update(leaveEntitlements)
        .set({
          used_days: sql`${leaveEntitlements.used_days} + ${daysUsed}`,
          remaining_days: sql`${leaveEntitlements.remaining_days} - ${daysUsed}`,
          updated_at: new Date(),
        })
        .where(and(
          eq(leaveEntitlements.user_id, userId),
          eq(leaveEntitlements.leave_type_id, leaveTypeId),
          eq(leaveEntitlements.year, currentYear)
        ));
    } catch (error: any) {
      logger.error('❌ Error updating leave balances', {
        error: error?.message || 'unknown_error',
        userId,
        leaveTypeId,
        daysUsed,
      });
      throw error;
    }
  }

  // Private mapping methods
  private mapLeaveTypeFromDb(dbType: any): LeaveType {
    return {
      id: dbType.id,
      name: dbType.name,
      description: dbType.description,
      organization_id: dbType.organization_id,
      color: dbType.color,
      icon: dbType.icon,
      is_paid: dbType.is_paid,
      requires_approval: dbType.requires_approval,
      max_consecutive_days: dbType.max_consecutive_days,
      max_days_per_year: dbType.max_days_per_year,
      created_at: dbType.created_at,
      updated_at: dbType.updated_at,
      created_by: dbType.created_by,
    };
  }

  private mapLeaveRequestFromDb(dbRequest: any): LeaveRequest {
    return {
      id: dbRequest.id,
      user_id: dbRequest.user_id,
      leave_type_id: dbRequest.leave_type_id,
      start_date: dbRequest.start_date,
      end_date: dbRequest.end_date,
      days_requested: dbRequest.days_requested,
      status: dbRequest.status,
      reason: dbRequest.reason,
      approver_id: dbRequest.approver_id,
      approver_comments: dbRequest.approver_comments,
      approved_at: dbRequest.approved_at,
      created_at: dbRequest.created_at,
      updated_at: dbRequest.updated_at,
    };
  }

  private mapLeaveEntitlementFromDb(dbEntitlement: any): LeaveEntitlement {
    return {
      id: dbEntitlement.id,
      user_id: dbEntitlement.user_id,
      leave_type_id: dbEntitlement.leave_type_id,
      year: dbEntitlement.year,
      total_days: dbEntitlement.total_days,
      used_days: dbEntitlement.used_days,
      pending_days: dbEntitlement.pending_days,
      remaining_days: dbEntitlement.remaining_days,
      carried_forward: dbEntitlement.carried_forward,
      expires_at: dbEntitlement.expires_at,
      created_at: dbEntitlement.created_at,
      updated_at: dbEntitlement.updated_at,
    };
  }

  private mapLeavePolicyFromDb(dbPolicy: any): LeavePolicy {
    return {
      id: dbPolicy.id,
      organization_id: dbPolicy.organization_id,
      country: dbPolicy.country,
      annual_leave_days: dbPolicy.annual_leave_days,
      sick_leave_days: dbPolicy.sick_leave_days,
      maternity_leave_days: dbPolicy.maternity_leave_days,
      paternity_leave_days: dbPolicy.paternity_leave_days,
      carryover_max_days: dbPolicy.carryover_max_days,
      carryover_expiry_months: dbPolicy.carryover_expiry_months,
      notice_period_days: dbPolicy.notice_period_days,
      created_at: dbPolicy.created_at,
      updated_at: dbPolicy.updated_at,
      created_by: dbPolicy.created_by,
    };
  }

  private mapHolidayFromDb(dbHoliday: any): Holiday {
    return {
      id: dbHoliday.id,
      organization_id: dbHoliday.organization_id,
      name: dbHoliday.name,
      date: dbHoliday.date,
      country: dbHoliday.country,
      is_recurring: dbHoliday.is_recurring,
      created_at: dbHoliday.created_at,
      created_by: dbHoliday.created_by,
    };
  }
}