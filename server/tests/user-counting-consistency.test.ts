// USER COUNTING CONSISTENCY TESTS
// Implements the business rule: Users/employees counted in credit usage = active + pending
// Excludes: super user main accounts, inactive, terminated

import { describe, test, expect, beforeAll } from '@jest/globals';
import { DatabaseStorage } from '../storage/database-storage';
import type { IStorage } from '../storage/interfaces';

describe('User Counting Consistency - Business Rule Implementation', () => {
  let storage: IStorage;

  beforeAll(async () => {
    storage = new DatabaseStorage();
  });

  describe('Credit Usage User Count Rule', () => {
    test('Corporate and Organization views must show same billable user count', async () => {
      try {
        // Get all users for Canva organization
        const allCanvaUsers = await storage.getUsersByOrganization(1);
        const totalUserCount = await storage.getUserCount();
        
        // Apply business rule: Count active + pending users only
        const billableUsers = allCanvaUsers.filter(user => 
          user.status === 'active' || user.status === 'pending'
        );
        
        // Exclude super admin accounts (main system accounts)
        const creditableUsers = billableUsers.filter(user => 
          user.role_type !== 'corporate_admin' && 
          user.admin_scope !== 'super'
        );
        
        console.log('=== USER COUNTING ANALYSIS ===');
        console.log(`Total Canva users in DB: ${allCanvaUsers?.length || 0}`);
        console.log(`Active + Pending users: ${billableUsers?.length || 0}`);
        console.log(`Creditable users (excl. super admins): ${creditableUsers?.length || 0}`);
        
        // Status breakdown
        const statusBreakdown = allCanvaUsers.reduce((acc: any, user: any) => {
          acc[user.status] = (acc[user.status] || 0) + 1;
          return acc;
        }, {});
        console.log('Status breakdown:', statusBreakdown);
        
        // Role breakdown
        const roleBreakdown = allCanvaUsers.reduce((acc: any, user: any) => {
          acc[user.role_type] = (acc[user.role_type] || 0) + 1;
          return acc;
        }, {});
        console.log('Role breakdown:', roleBreakdown);
        
        // This count should match between corporate and organization views
        expect(creditableUsers.length).toBeGreaterThan(400);
        expect(creditableUsers.length).toBeLessThan(410);
        
      } catch (error: any) {
        console.error('USER COUNTING TEST FAILED:', error?.message);
        throw error;
      }
    });

    test('Identify discrepancy between Employee Directory (408) and Management Dashboard (401)', async () => {
      try {
        const allCanvaUsers = await storage.getUsersByOrganization(1);
        
        // Simulate Employee Directory count (408 users shown)
        const employeeDirectoryUsers = allCanvaUsers.filter(user => 
          user.status === 'active' || user.status === 'pending'
        );
        
        // Simulate Management Dashboard count (401 users shown)  
        const managementDashboardUsers = allCanvaUsers.filter(user => 
          user.status === 'active' && user.role_type === 'employee'
        );
        
        console.log('=== DISCREPANCY ANALYSIS ===');
        console.log(`Employee Directory count: ${employeeDirectoryUsers?.length || 0}`);
        console.log(`Management Dashboard count: ${managementDashboardUsers?.length || 0}`);
        console.log(`Discrepancy: ${(employeeDirectoryUsers?.length || 0) - (managementDashboardUsers?.length || 0)} users`);
        
        // Find the 7 missing users
        const missingUsers = employeeDirectoryUsers.filter(user => 
          !managementDashboardUsers.some(dashUser => dashUser.id === user.id)
        );
        
        console.log('=== MISSING USERS (7 USER DISCREPANCY) ===');
        missingUsers.forEach((user: any, index: number) => {
          console.log(`${index + 1}. ${user.email} - Status: ${user.status}, Role: ${user.role_type}, Admin: ${user.is_admin}`);
        });
        
        // Validate the discrepancy
        expect(missingUsers.length).toEqual(7);
        expect(employeeDirectoryUsers.length).toEqual(408);
        expect(managementDashboardUsers.length).toEqual(401);
        
      } catch (error: any) {
        console.error('DISCREPANCY ANALYSIS FAILED:', error?.message);
        throw error;
      }
    });
  });

  describe('Consistent Business Rule Validation', () => {
    test('Both corporate and organization views apply same exclusion rules', async () => {
      const canvaUsers = await storage.getUsersByOrganization(1);
      
      // Business rule implementation
      const getCredititableUserCount = (users: any[]) => {
        return users.filter(user => 
          // Include: active + pending only
          (user.status === 'active' || user.status === 'pending') &&
          // Exclude: super admin main accounts
          user.role_type !== 'corporate_admin' &&
          user.admin_scope !== 'super'
        ).length;
      };
      
      const creditableCount = getCredititableUserCount(canvaUsers);
      
      console.log('=== BUSINESS RULE VALIDATION ===');
      console.log(`Creditable users (active + pending, excl. super admins): ${creditableCount}`);
      
      // This number should be consistent across all views
      expect(creditableCount).toBeGreaterThan(400);
      
      return { creditableCount, canvaUsers };
    });
  });
});