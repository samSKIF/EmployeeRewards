// Organization Types Package - Multi-tenant organization types
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { organizations, departments, locations } from '../schema';
import type { InferSelectModel } from 'drizzle-orm';

// Core Organization Type
export type Organization = InferSelectModel<typeof organizations>;
export type Department = InferSelectModel<typeof departments>;
export type Location = InferSelectModel<typeof locations>;

// Organization with subscription details (used in billing)
export interface OrganizationWithSubscription extends Organization {
  subscriptionPlan?: string;
  userLimit?: number;
  currentUserCount?: number;
  billingStatus?: string;
  subscriptionExpiry?: Date;
}

// Organization creation schema
export const organizationInsertSchema = createInsertSchema(organizations).omit({ id: true });
export type OrganizationInsert = z.infer<typeof organizationInsertSchema>;

// Department and Location schemas
export const departmentInsertSchema = createInsertSchema(departments).omit({ id: true });
export const locationInsertSchema = createInsertSchema(locations).omit({ id: true });

export type DepartmentInsert = z.infer<typeof departmentInsertSchema>;
export type LocationInsert = z.infer<typeof locationInsertSchema>;

// Organization settings (commonly used)
export interface OrganizationSettings {
  features: {
    social: boolean;
    recognition: boolean;
    leave: boolean;
    shop: boolean;
    surveys: boolean;
    analytics: boolean;
  };
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    organizationName?: string;
  };
  policies: {
    recognition?: {
      peerEnabled: boolean;
      managerEnabled: boolean;
      approvalRequired: boolean;
    };
    leave?: {
      autoApproval: boolean;
      maxDaysPerRequest: number;
    };
  };
}

// Organization statistics (used in admin dashboards)
export interface OrganizationStats {
  totalUsers: number;
  activeUsers: number;
  totalDepartments: number;
  totalLocations: number;
  subscription: {
    plan: string;
    userLimit: number;
    usage: number;
    expiryDate?: Date;
  };
}

// Multi-tenant context (used throughout app)
export interface TenantContext {
  organizationId: number;
  organizationName: string;
  userRole: string;
  permissions: string[];
  features: string[];
}
