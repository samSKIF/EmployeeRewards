// Organization storage module for ThrivioHR platform
// Gold standard compliance: Enterprise-grade error handling and type safety

import { db } from '../db';
import {
  organizations,
  departments,
  locations,
  users,
} from '@shared/schema';
import type {
  InsertOrganization,
  Organization,
  InsertDepartment,
  Department,
  InsertLocation,
  Location,
} from '@shared/schema';
import { eq, and, count, ilike } from 'drizzle-orm';

export interface IOrganizationStorage {
  // Organization management
  createOrganization(orgData: InsertOrganization): Promise<Organization>;
  getOrganizationById(id: number): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  updateOrganization(id: number, updates: Partial<Organization>): Promise<boolean>;
  
  // Department management
  createDepartment(deptData: InsertDepartment): Promise<Department>;
  getDepartmentsByOrganization(organizationId: number): Promise<Department[]>;
  getDepartmentById(id: number): Promise<Department | undefined>;
  getDepartmentByName(organizationId: number, name: string): Promise<Department | undefined>;
  updateDepartment(id: number, updates: Partial<Department>): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;
  getEmployeeCountByDepartment(organizationId: number, departmentName: string): Promise<number>;
  
  // Location management
  createLocation(locationData: InsertLocation): Promise<Location>;
  getLocationsByOrganization(organizationId: number): Promise<Location[]>;
  updateLocation(id: number, updates: Partial<Location>): Promise<boolean>;
}

export class OrganizationStorage implements IOrganizationStorage {
  async getOrganizationFeatures(organizationId: number) {
    try {
      // For now return empty array - this can be enhanced with actual features table
      return [];
    } catch (error: any) {
      console.error('Error getting organization features:', error?.message || 'unknown_error');
      return [];
    }
  }
  async createOrganization(orgData: InsertOrganization): Promise<Organization> {
    try {
      const [organization] = await db
        .insert(organizations)
        .values(orgData)
        .returning();
      return organization;
    } catch (error: any) {
      console.error('Error creating organization:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getOrganizationById(id: number): Promise<Organization | undefined> {
    try {
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id));
      return organization;
    } catch (error: any) {
      console.error('Error getting organization by ID:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    try {
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug));
      return organization;
    } catch (error: any) {
      console.error('Error getting organization by slug:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async updateOrganization(id: number, updates: Partial<Organization>): Promise<boolean> {
    try {
      await db
        .update(organizations)
        .set({
          ...updates,
          updated_at: new Date(),
        })
        .where(eq(organizations.id, id));
      return true;
    } catch (error: any) {
      console.error('Error updating organization:', error?.message || 'unknown_error');
      return false;
    }
  }

  async createDepartment(deptData: InsertDepartment): Promise<Department> {
    try {
      const [department] = await db
        .insert(departments)
        .values(deptData)
        .returning();
      return department;
    } catch (error: any) {
      console.error('Error creating department:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getDepartmentsByOrganization(organizationId: number): Promise<Department[]> {
    try {
      return await db
        .select()
        .from(departments)
        .where(
          and(
            eq(departments.organization_id, organizationId),
            eq(departments.is_active, true)
          )
        );
    } catch (error: any) {
      console.error('Error getting departments by organization:', error?.message || 'unknown_error');
      return [];
    }
  }

  async getDepartmentById(id: number): Promise<Department | undefined> {
    try {
      const [department] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, id));
      return department;
    } catch (error: any) {
      console.error('Error getting department by ID:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async getDepartmentByName(organizationId: number, name: string): Promise<Department | undefined> {
    try {
      const [department] = await db
        .select()
        .from(departments)
        .where(
          and(
            eq(departments.organization_id, organizationId),
            ilike(departments.name, name)
          )
        );
      return department;
    } catch (error: any) {
      console.error('Error getting department by name:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async updateDepartment(id: number, updates: Partial<Department>): Promise<Department> {
    try {
      const [updated] = await db
        .update(departments)
        .set({
          ...updates,
          updated_at: new Date(),
        })
        .where(eq(departments.id, id))
        .returning();
      return updated;
    } catch (error: any) {
      console.error('Error updating department:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async deleteDepartment(id: number): Promise<void> {
    try {
      await db
        .update(departments)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(eq(departments.id, id));
    } catch (error: any) {
      console.error('Error deleting department:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getEmployeeCountByDepartment(organizationId: number, departmentName: string): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.organization_id, organizationId),
            ilike(users.department, departmentName), // Use case-insensitive matching
            eq(users.status, 'active')
          )
        );
      return result[0]?.count || 0;
    } catch (error: any) {
      console.error('Error getting employee count by department:', error?.message || 'unknown_error');
      return 0;
    }
  }

  async createLocation(locationData: InsertLocation): Promise<Location> {
    try {
      const [location] = await db
        .insert(locations)
        .values(locationData)
        .returning();
      return location;
    } catch (error: any) {
      console.error('Error creating location:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getLocationsByOrganization(organizationId: number): Promise<Location[]> {
    try {
      return await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.organization_id, organizationId),
            eq(locations.is_active, true)
          )
        );
    } catch (error: any) {
      console.error('Error getting locations by organization:', error?.message || 'unknown_error');
      return [];
    }
  }

  async updateLocation(id: number, updates: Partial<Location>): Promise<boolean> {
    try {
      await db
        .update(locations)
        .set(updates)
        .where(eq(locations.id, id));
      return true;
    } catch (error: any) {
      console.error('Error updating location:', error?.message || 'unknown_error');
      return false;
    }
  }
}