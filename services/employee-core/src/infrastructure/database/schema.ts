// Employee Core Service Database Schema
// Owns all user, authentication, department, and organization data

import { pgTable, serial, varchar, text, boolean, timestamp, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ==================== USERS TABLE ====================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  surname: varchar('surname', { length: 100 }),
  sex: varchar('sex', { length: 10 }),
  avatar_url: text('avatar_url'),
  phone: varchar('phone', { length: 20 }),
  
  // Employment details
  employee_code: varchar('employee_code', { length: 50 }).unique(),
  job_title: varchar('job_title', { length: 100 }),
  department_id: integer('department_id').references(() => departments.id),
  organization_id: integer('organization_id').references(() => organizations.id),
  manager_id: integer('manager_id').references(() => users.id),
  
  // Authentication & Status
  is_active: boolean('is_active').notNull().default(true),
  is_admin: boolean('is_admin').notNull().default(false),
  role_type: varchar('role_type', { length: 50 }).default('employee'),
  last_login: timestamp('last_login'),
  password_changed_at: timestamp('password_changed_at'),
  
  // Metadata
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  created_by: integer('created_by').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  deleted_by: integer('deleted_by').references(() => users.id),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  usernameIdx: index('users_username_idx').on(table.username),
  orgIdx: index('users_org_idx').on(table.organization_id),
  deptIdx: index('users_dept_idx').on(table.department_id),
  managerIdx: index('users_manager_idx').on(table.manager_id),
  activeIdx: index('users_active_idx').on(table.is_active),
  employeeCodeIdx: uniqueIndex('users_employee_code_idx').on(table.employee_code),
}));

// ==================== DEPARTMENTS TABLE ====================
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).unique(),
  description: text('description'),
  parent_id: integer('parent_id').references(() => departments.id),
  organization_id: integer('organization_id').references(() => organizations.id).notNull(),
  manager_id: integer('manager_id').references(() => users.id),
  
  // Metadata
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  created_by: integer('created_by').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  deleted_by: integer('deleted_by').references(() => users.id),
}, (table) => ({
  orgIdx: index('departments_org_idx').on(table.organization_id),
  parentIdx: index('departments_parent_idx').on(table.parent_id),
  codeIdx: uniqueIndex('departments_code_idx').on(table.code),
}));

// ==================== ORGANIZATIONS TABLE ====================
export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).unique(),
  domain: varchar('domain', { length: 255 }),
  logo_url: text('logo_url'),
  
  // Settings
  settings: jsonb('settings').default({}),
  max_users: integer('max_users').default(500),
  subscription_tier: varchar('subscription_tier', { length: 50 }).default('basic'),
  subscription_expires_at: timestamp('subscription_expires_at'),
  
  // Metadata
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),
}, (table) => ({
  codeIdx: uniqueIndex('organizations_code_idx').on(table.code),
  domainIdx: index('organizations_domain_idx').on(table.domain),
}));

// ==================== TEAMS TABLE ====================
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }),
  description: text('description'),
  department_id: integer('department_id').references(() => departments.id).notNull(),
  organization_id: integer('organization_id').references(() => organizations.id).notNull(),
  lead_id: integer('lead_id').references(() => users.id),
  
  // Metadata
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  created_by: integer('created_by').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  deleted_by: integer('deleted_by').references(() => users.id),
}, (table) => ({
  deptIdx: index('teams_dept_idx').on(table.department_id),
  orgIdx: index('teams_org_idx').on(table.organization_id),
  leadIdx: index('teams_lead_idx').on(table.lead_id),
}));

// ==================== TEAM MEMBERS TABLE ====================
export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  team_id: integer('team_id').references(() => teams.id).notNull(),
  user_id: integer('user_id').references(() => users.id).notNull(),
  role: varchar('role', { length: 50 }).default('member'),
  joined_at: timestamp('joined_at').notNull().defaultNow(),
  left_at: timestamp('left_at'),
}, (table) => ({
  teamUserIdx: uniqueIndex('team_members_team_user_idx').on(table.team_id, table.user_id),
  userIdx: index('team_members_user_idx').on(table.user_id),
}));

// ==================== SESSIONS TABLE ====================
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id).notNull(),
  token: text('token').notNull().unique(),
  refresh_token: text('refresh_token'),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex('sessions_token_idx').on(table.token),
  userIdx: index('sessions_user_idx').on(table.user_id),
  expiresIdx: index('sessions_expires_idx').on(table.expires_at),
}));

// ==================== AUDIT LOG TABLE ====================
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entity_type: varchar('entity_type', { length: 50 }).notNull(),
  entity_id: integer('entity_id').notNull(),
  organization_id: integer('organization_id').references(() => organizations.id),
  
  // Change details
  old_values: jsonb('old_values'),
  new_values: jsonb('new_values'),
  
  // Request context
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  request_id: varchar('request_id', { length: 100 }),
  
  // Metadata
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('audit_logs_user_idx').on(table.user_id),
  entityIdx: index('audit_logs_entity_idx').on(table.entity_type, table.entity_id),
  orgIdx: index('audit_logs_org_idx').on(table.organization_id),
  createdIdx: index('audit_logs_created_idx').on(table.created_at),
}));

// ==================== RELATIONS ====================
export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.department_id],
    references: [departments.id],
  }),
  organization: one(organizations, {
    fields: [users.organization_id],
    references: [organizations.id],
  }),
  manager: one(users, {
    fields: [users.manager_id],
    references: [users.id],
    relationName: 'manager',
  }),
  subordinates: many(users, {
    relationName: 'manager',
  }),
  teamMemberships: many(teamMembers),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [departments.organization_id],
    references: [organizations.id],
  }),
  parent: one(departments, {
    fields: [departments.parent_id],
    references: [departments.id],
    relationName: 'parent',
  }),
  children: many(departments, {
    relationName: 'parent',
  }),
  manager: one(users, {
    fields: [departments.manager_id],
    references: [users.id],
  }),
  employees: many(users),
  teams: many(teams),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  departments: many(departments),
  users: many(users),
  teams: many(teams),
  auditLogs: many(auditLogs),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  department: one(departments, {
    fields: [teams.department_id],
    references: [departments.id],
  }),
  organization: one(organizations, {
    fields: [teams.organization_id],
    references: [organizations.id],
  }),
  lead: one(users, {
    fields: [teams.lead_id],
    references: [users.id],
  }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.team_id],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.user_id],
    references: [users.id],
  }),
}));

// ==================== SCHEMAS FOR VALIDATION ====================
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateUserSchema = insertUserSchema.partial().omit({
  password: true, // Password update requires separate endpoint
});

export const selectUserSchema = createSelectSchema(users);

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateDepartmentSchema = insertDepartmentSchema.partial();
export const selectDepartmentSchema = createSelectSchema(departments);

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateOrganizationSchema = insertOrganizationSchema.partial();
export const selectOrganizationSchema = createSelectSchema(organizations);

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateTeamSchema = insertTeamSchema.partial();
export const selectTeamSchema = createSelectSchema(teams);

// Type exports
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type Department = z.infer<typeof selectDepartmentSchema>;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type UpdateDepartment = z.infer<typeof updateDepartmentSchema>;

export type Organization = z.infer<typeof selectOrganizationSchema>;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>;

export type Team = z.infer<typeof selectTeamSchema>;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type UpdateTeam = z.infer<typeof updateTeamSchema>;