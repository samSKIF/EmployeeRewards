
import { mysqlTable, serial, varchar, text, timestamp, int, boolean, decimal, date, mysqlEnum } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// Organizations table
export const organizations = mysqlTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).unique(),
  subscriptionTier: mysqlEnum("subscription_tier", ["basic", "premium", "enterprise"]).default("basic"),
  maxEmployees: int("max_employees").default(50),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Users table
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: varchar("firebase_uid", { length: 255 }).unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  jobTitle: varchar("job_title", { length: 255 }),
  department: varchar("department", { length: 255 }),
  location: varchar("location", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  birthday: date("birthday"),
  hireDate: date("hire_date"),
  organizationId: int("organization_id").references(() => organizations.id),
  managerId: int("manager_id").references(() => users.id),
  isAdmin: boolean("is_admin").default(false),
  isActive: boolean("is_active").default(true),
  points: int("points").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Leave management tables
export const leaveTypes = mysqlTable("leave_types", {
  id: serial("id").primaryKey(),
  organizationId: int("organization_id").references(() => organizations.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  maxDaysPerYear: int("max_days_per_year"),
  carryOverDays: int("carry_over_days").default(0),
  requiresApproval: boolean("requires_approval").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leaveRequests = mysqlTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: int("user_id").references(() => users.id).notNull(),
  leaveTypeId: int("leave_type_id").references(() => leaveTypes.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: int("total_days").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending"),
  approvedBy: int("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Recognition settings
export const recognitionSettings = mysqlTable("recognition_settings", {
  id: serial("id").primaryKey(),
  organizationId: int("organization_id").references(() => organizations.id).notNull(),
  costPerPoint: decimal("cost_per_point", { precision: 10, scale: 2 }).default("0.10"),
  peerEnabled: boolean("peer_enabled").default(true),
  peerRequiresApproval: boolean("peer_requires_approval").default(true),
  peerPointsPerRecognition: int("peer_points_per_recognition").default(10),
  peerMaxRecognitionsPerMonth: int("peer_max_recognitions_per_month").default(5),
  managerEnabled: boolean("manager_enabled").default(true),
  managerRequiresApproval: boolean("manager_requires_approval").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Manager budgets
export const managerBudgets = mysqlTable("manager_budgets", {
  id: serial("id").primaryKey(),
  managerId: int("manager_id").references(() => users.id).notNull(),
  organizationId: int("organization_id").references(() => organizations.id).notNull(),
  monthlyBudget: int("monthly_budget").notNull(),
  currentSpent: int("current_spent").default(0),
  year: int("year").notNull(),
  month: int("month").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Point transactions
export const pointTransactions = mysqlTable("point_transactions", {
  id: serial("id").primaryKey(),
  userId: int("user_id").references(() => users.id).notNull(),
  amount: int("amount").notNull(),
  type: mysqlEnum("type", ["earned", "spent", "adjustment"]).notNull(),
  description: varchar("description", { length: 500 }),
  relatedEntityType: varchar("related_entity_type", { length: 50 }),
  relatedEntityId: int("related_entity_id"),
  createdBy: int("created_by").references(() => users.id),
  organizationId: int("organization_id").references(() => organizations.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  leaveTypes: many(leaveTypes),
  recognitionSettings: many(recognitionSettings),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
  }),
  leaveRequests: many(leaveRequests),
  managerBudgets: many(managerBudgets),
  pointTransactions: many(pointTransactions),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  user: one(users, {
    fields: [leaveRequests.userId],
    references: [users.id],
  }),
  leaveType: one(leaveTypes, {
    fields: [leaveRequests.leaveTypeId],
    references: [leaveTypes.id],
  }),
  approver: one(users, {
    fields: [leaveRequests.approvedBy],
    references: [users.id],
  }),
}));
