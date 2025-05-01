import { pgTable, text, serial, integer, timestamp, boolean, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { employees, users } from "./schema";

// Onboarding plans table (templates for onboarding processes)
export const onboardingPlans = pgTable("onboarding_plans", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  departmentId: integer("department_id"),
  jobTitleId: integer("job_title_id"),
  locationId: integer("location_id"),
  duration: integer("duration_days"), // Duration in days
  isActive: boolean("is_active").default(true),
  isTemplate: boolean("is_template").default(false),
  organizationId: integer("organization_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

// Missions are groups of tasks (Orientation, Training, etc.)
export const onboardingMissions = pgTable("onboarding_missions", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").references(() => onboardingPlans.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").default(0),
  daysFromStart: integer("days_from_start").default(0), // When mission should start
  duration: integer("duration_days"), // Duration in days
  isRequired: boolean("is_required").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Assignments are individual onboarding assignments for specific employees
export const onboardingAssignments = pgTable("onboarding_assignments", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  planId: integer("plan_id").references(() => onboardingPlans.id).notNull(),
  startDate: date("start_date").notNull(),
  dueDate: date("due_date"),
  status: text("status").default("in_progress").notNull(), // in_progress, completed, overdue
  progress: integer("progress").default(0), // Percentage complete
  mentorId: integer("mentor_id").references(() => employees.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

// Track progress of individual tasks for each mission
export const onboardingProgress = pgTable("onboarding_progress", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => onboardingAssignments.id).notNull(),
  missionId: integer("mission_id").references(() => onboardingMissions.id).notNull(),
  status: text("status").default("not_started").notNull(), // not_started, in_progress, completed
  completedAt: timestamp("completed_at"),
  feedback: text("feedback"),
  rating: integer("rating"), // Optional rating (1-5)
  completedBy: integer("completed_by").references(() => employees.id),
  verifiedBy: integer("verified_by").references(() => employees.id),
  attachments: jsonb("attachments"), // URLs to any uploaded documents
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relationships
export const onboardingPlansRelations = relations(onboardingPlans, ({ many }) => ({
  missions: many(onboardingMissions),
  assignments: many(onboardingAssignments),
}));

export const onboardingMissionsRelations = relations(onboardingMissions, ({ one, many }) => ({
  plan: one(onboardingPlans, {
    fields: [onboardingMissions.planId],
    references: [onboardingPlans.id],
  }),
  progress: many(onboardingProgress),
}));

export const onboardingAssignmentsRelations = relations(onboardingAssignments, ({ one, many }) => ({
  employee: one(employees, {
    fields: [onboardingAssignments.employeeId],
    references: [employees.id],
  }),
  plan: one(onboardingPlans, {
    fields: [onboardingAssignments.planId],
    references: [onboardingPlans.id],
  }),
  mentor: one(employees, {
    fields: [onboardingAssignments.mentorId],
    references: [employees.id],
  }),
  progress: many(onboardingProgress),
}));

export const onboardingProgressRelations = relations(onboardingProgress, ({ one }) => ({
  assignment: one(onboardingAssignments, {
    fields: [onboardingProgress.assignmentId],
    references: [onboardingAssignments.id],
  }),
  mission: one(onboardingMissions, {
    fields: [onboardingProgress.missionId],
    references: [onboardingMissions.id],
  }),
}));

// Create schemas for validation and type inference
export const insertOnboardingPlanSchema = createInsertSchema(onboardingPlans)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertOnboardingMissionSchema = createInsertSchema(onboardingMissions)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertOnboardingAssignmentSchema = createInsertSchema(onboardingAssignments)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertOnboardingProgressSchema = createInsertSchema(onboardingProgress)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Define types for use in the application
export type OnboardingPlan = typeof onboardingPlans.$inferSelect;
export type InsertOnboardingPlan = z.infer<typeof insertOnboardingPlanSchema>;

export type OnboardingMission = typeof onboardingMissions.$inferSelect;
export type InsertOnboardingMission = z.infer<typeof insertOnboardingMissionSchema>;

export type OnboardingAssignment = typeof onboardingAssignments.$inferSelect;
export type InsertOnboardingAssignment = z.infer<typeof insertOnboardingAssignmentSchema>;

export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type InsertOnboardingProgress = z.infer<typeof insertOnboardingProgressSchema>;