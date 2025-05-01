import { pgTable, serial, text, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for mission action types
export const actionTypeEnum = pgEnum('action_type', [
  'POST_RECOGNITION',
  'UPDATE_PROFILE',
  'REDEEM_REWARD',
  'FOLLOW_COLLEAGUE',
  'VIEW_CONTENT'
]);

// Enum for onboarding assignment status
export const onboardingStatusEnum = pgEnum('onboarding_status', [
  'in_progress',
  'completed'
]);

// Onboarding Plans Table
export const onboardingPlans = pgTable('onboarding_plans', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  createdBy: integer('created_by').notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Onboarding Missions Table
export const onboardingMissions = pgTable('onboarding_missions', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').notNull().references(() => onboardingPlans.id, { onDelete: 'cascade' }),
  actionType: actionTypeEnum('action_type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  points: integer('points').default(0),
  order: integer('order').default(1)
});

// Onboarding Assignments Table
export const onboardingAssignments = pgTable('onboarding_assignments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  planId: integer('plan_id').notNull().references(() => onboardingPlans.id),
  status: onboardingStatusEnum('status').default('in_progress'),
  assignedAt: timestamp('assigned_at').defaultNow(),
  completedAt: timestamp('completed_at')
});

// Onboarding Progress Table
export const onboardingProgress = pgTable('onboarding_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  missionId: integer('mission_id').notNull().references(() => onboardingMissions.id),
  completedAt: timestamp('completed_at').defaultNow(),
  pointsAwarded: integer('points_awarded').default(0)
});

// Relations
export const onboardingPlansRelations = relations(onboardingPlans, ({ many }) => ({
  missions: many(onboardingMissions),
  assignments: many(onboardingAssignments)
}));

export const onboardingMissionsRelations = relations(onboardingMissions, ({ one, many }) => ({
  plan: one(onboardingPlans, {
    fields: [onboardingMissions.planId],
    references: [onboardingPlans.id]
  }),
  progress: many(onboardingProgress)
}));

export const onboardingAssignmentsRelations = relations(onboardingAssignments, ({ one }) => ({
  plan: one(onboardingPlans, {
    fields: [onboardingAssignments.planId],
    references: [onboardingPlans.id]
  })
}));

export const onboardingProgressRelations = relations(onboardingProgress, ({ one }) => ({
  mission: one(onboardingMissions, {
    fields: [onboardingProgress.missionId],
    references: [onboardingMissions.id]
  })
}));

// Zod Schemas for validation
export const insertOnboardingPlanSchema = createInsertSchema(onboardingPlans)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertOnboardingMissionSchema = createInsertSchema(onboardingMissions)
  .omit({ id: true });

export const insertOnboardingAssignmentSchema = createInsertSchema(onboardingAssignments)
  .omit({ id: true, assignedAt: true, completedAt: true });

export const insertOnboardingProgressSchema = createInsertSchema(onboardingProgress)
  .omit({ id: true, completedAt: true });

// Types
export type OnboardingPlan = typeof onboardingPlans.$inferSelect;
export type InsertOnboardingPlan = z.infer<typeof insertOnboardingPlanSchema>;

export type OnboardingMission = typeof onboardingMissions.$inferSelect;
export type InsertOnboardingMission = z.infer<typeof insertOnboardingMissionSchema>;

export type OnboardingAssignment = typeof onboardingAssignments.$inferSelect;
export type InsertOnboardingAssignment = z.infer<typeof insertOnboardingAssignmentSchema>;

export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type InsertOnboardingProgress = z.infer<typeof insertOnboardingProgressSchema>;

// Extended types for frontend use
export interface OnboardingPlanWithMissions extends OnboardingPlan {
  missions: OnboardingMission[];
}

export interface UserOnboardingStatus {
  plan: OnboardingPlan;
  missions: Array<OnboardingMission & { completed: boolean }>;
  progress: number; // Percentage or fraction
  completed: boolean;
}