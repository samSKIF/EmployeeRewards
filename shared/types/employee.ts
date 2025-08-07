// Employee Types Package - Extracted to reduce coupling across 15+ features
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { users } from '../schema';
import type { InferSelectModel } from 'drizzle-orm';

// Core Employee Type (used by 15+ features)
export type Employee = InferSelectModel<typeof users>;

// Employee with computed fields (commonly used across features)
export type EmployeeWithDetails = Employee & {
  fullName: string;
  departmentName?: string;
  locationName?: string;
  managerName?: string;
  isCurrentUser?: boolean;
};

// Employee creation schema (standardized across features)
export const employeeInsertSchema = createInsertSchema(users).omit({ id: true });
export type EmployeeInsert = z.infer<typeof employeeInsertSchema>;

// Employee update schema (partial for updates)
export const employeeUpdateSchema = employeeInsertSchema.partial();
export type EmployeeUpdate = z.infer<typeof employeeUpdateSchema>;

// Employee status types (used in multiple modules)
export type EmployeeStatus = 'active' | 'inactive' | 'pending' | 'terminated';

// Employee role types (used across authorization)
export type EmployeeRoleType = 'corporate_admin' | 'client_admin' | 'seller_admin' | 'employee';

// Employee filter types (used in search and listing)
export interface EmployeeFilters {
  status?: EmployeeStatus[];
  departments?: string[];
  locations?: string[];
  roles?: EmployeeRoleType[];
  searchQuery?: string;
  isAdmin?: boolean;
}

// Employee search result (used in multiple features)
export interface EmployeeSearchResult {
  employees: EmployeeWithDetails[];
  totalCount: number;
  hasMore: boolean;
}

// Bulk operations types (used in admin features)
export interface BulkEmployeeAction {
  action: 'delete' | 'update_status' | 'update_department' | 'export';
  employeeIds: number[];
  payload?: {
    status?: EmployeeStatus;
    departmentId?: number;
    locationId?: number;
  };
}

// Employee statistics (used in dashboards and analytics)
export interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  terminated: number;
  byDepartment: Record<string, number>;
  byLocation: Record<string, number>;
}
