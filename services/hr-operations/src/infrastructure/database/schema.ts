// HR Operations Database Schema
import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  boolean,
  text,
  json,
  date,
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums
export const leaveTypeEnum = pgEnum('leave_type', [
  'annual',
  'sick',
  'personal',
  'maternity',
  'paternity',
  'bereavement',
  'unpaid',
  'other'
]);

export const leaveStatusEnum = pgEnum('leave_status', [
  'draft',
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'taken'
]);

export const performanceRatingEnum = pgEnum('performance_rating', [
  'exceeds_expectations',
  'meets_expectations',
  'needs_improvement',
  'unsatisfactory'
]);

// Leave Requests Table
export const leaveRequests = pgTable('leave_requests', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull(),
  leaveType: leaveTypeEnum('leave_type').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  reason: text('reason'),
  status: leaveStatusEnum('status').notNull().default('pending'),
  approverId: integer('approver_id'),
  approverComments: text('approver_comments'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Leave Entitlements Table
export const leaveEntitlements = pgTable('leave_entitlements', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull(),
  year: integer('year').notNull(),
  leaveType: leaveTypeEnum('leave_type').notNull(),
  entitledDays: integer('entitled_days').notNull().default(0),
  usedDays: integer('used_days').notNull().default(0),
  remainingDays: integer('remaining_days').notNull().default(0),
  carryOverDays: integer('carry_over_days').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Performance Reviews Table
export const performanceReviews = pgTable('performance_reviews', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull(),
  reviewerId: integer('reviewer_id').notNull(),
  reviewPeriodStart: date('review_period_start').notNull(),
  reviewPeriodEnd: date('review_period_end').notNull(),
  overallRating: performanceRatingEnum('overall_rating'),
  goals: json('goals'),
  achievements: json('achievements'),
  areasForImprovement: json('areas_for_improvement'),
  comments: text('comments'),
  employeeFeedback: text('employee_feedback'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Holiday Calendar Table
export const holidays = pgTable('holidays', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  date: date('date').notNull(),
  organizationId: integer('organization_id'),
  departmentId: integer('department_id'),
  locationId: integer('location_id'),
  isMandatory: boolean('is_mandatory').notNull().default(true),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// HR Policies Table
export const hrPolicies = pgTable('hr_policies', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').notNull(),
  policyType: varchar('policy_type', { length: 100 }).notNull(),
  policyName: varchar('policy_name', { length: 255 }).notNull(),
  policyContent: json('policy_content'),
  effectiveDate: date('effective_date').notNull(),
  expiryDate: date('expiry_date'),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Audit Logs for HR Operations
export const hrAuditLogs = pgTable('hr_audit_logs', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: integer('entity_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  userId: integer('user_id'),
  changes: json('changes'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Relations
export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  employee: one(leaveRequests, {
    fields: [leaveRequests.employeeId],
    references: [leaveRequests.id]
  }),
  approver: one(leaveRequests, {
    fields: [leaveRequests.approverId],
    references: [leaveRequests.id]
  })
}));

export const leaveEntitlementsRelations = relations(leaveEntitlements, ({ one }) => ({
  employee: one(leaveEntitlements, {
    fields: [leaveEntitlements.employeeId],
    references: [leaveEntitlements.id]
  })
}));

export const performanceReviewsRelations = relations(performanceReviews, ({ one }) => ({
  employee: one(performanceReviews, {
    fields: [performanceReviews.employeeId],
    references: [performanceReviews.id]
  }),
  reviewer: one(performanceReviews, {
    fields: [performanceReviews.reviewerId],
    references: [performanceReviews.id]
  })
}));

// Zod Schemas
export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({ id: true });
export const selectLeaveRequestSchema = createSelectSchema(leaveRequests);
export type LeaveRequest = z.infer<typeof selectLeaveRequestSchema>;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;

export const insertLeaveEntitlementSchema = createInsertSchema(leaveEntitlements).omit({ id: true });
export const selectLeaveEntitlementSchema = createSelectSchema(leaveEntitlements);
export type LeaveEntitlement = z.infer<typeof selectLeaveEntitlementSchema>;
export type InsertLeaveEntitlement = z.infer<typeof insertLeaveEntitlementSchema>;

export const insertPerformanceReviewSchema = createInsertSchema(performanceReviews).omit({ id: true });
export const selectPerformanceReviewSchema = createSelectSchema(performanceReviews);
export type PerformanceReview = z.infer<typeof selectPerformanceReviewSchema>;
export type InsertPerformanceReview = z.infer<typeof insertPerformanceReviewSchema>;

export const insertHolidaySchema = createInsertSchema(holidays).omit({ id: true });
export const selectHolidaySchema = createSelectSchema(holidays);
export type Holiday = z.infer<typeof selectHolidaySchema>;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;

export const insertHrPolicySchema = createInsertSchema(hrPolicies).omit({ id: true });
export const selectHrPolicySchema = createSelectSchema(hrPolicies);
export type HrPolicy = z.infer<typeof selectHrPolicySchema>;
export type InsertHrPolicy = z.infer<typeof insertHrPolicySchema>;