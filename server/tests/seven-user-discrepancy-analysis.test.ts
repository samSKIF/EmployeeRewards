// SEVEN USER DISCREPANCY ANALYSIS
// Identifies the exact 7 users causing Employee Directory (408) vs Management Dashboard (401) difference

import { describe, test, expect } from '@jest/globals';
import { DatabaseStorage } from '../storage/database-storage';
import { getCreditableUserCount, getCreditableUsers } from '../utils/user-counting-rule';

describe('Seven User Discrepancy Analysis', () => {
  test('Identify exact 7 users causing 408 vs 401 discrepancy', async () => {
    const storage = new DatabaseStorage();
    const allCanvaUsers = await storage.getUsersByOrganization(1);
    
    console.log('=== SEVEN USER DISCREPANCY ANALYSIS ===');
    console.log(`Total Canva users in database: ${allCanvaUsers.length}`);
    
    // Employee Directory logic (shows 408)
    const employeeDirectoryUsers = allCanvaUsers.filter(user => 
      user.status === 'active' || user.status === 'pending'
    );
    
    // Management Dashboard logic (shows 401) 
    const managementDashboardUsers = allCanvaUsers.filter(user => 
      user.status === 'active' && 
      user.role_type !== 'admin' && 
      user.admin_scope === 'none'
    );
    
    console.log(`Employee Directory count: ${employeeDirectoryUsers.length}`);
    console.log(`Management Dashboard count: ${managementDashboardUsers.length}`);
    
    // Find the exact 7 missing users
    const missingUsers = employeeDirectoryUsers.filter(user => 
      !managementDashboardUsers.some(dashUser => dashUser.id === user.id)
    );
    
    console.log('\n=== THE 7 MISSING USERS ARE: ===');
    missingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Status: ${user.status}`);  
      console.log(`   Role: ${user.role_type || 'employee'}`);
      console.log(`   Admin: ${user.is_admin}`);
      console.log(`   Admin Scope: ${user.admin_scope || 'none'}`);
      console.log('');
    });
    
    // Categorize the missing users
    const pendingUsers = missingUsers.filter(u => u.status === 'pending');
    const adminUsers = missingUsers.filter(u => u.is_admin === true);
    const specialRoleUsers = missingUsers.filter(u => u.role_type === 'admin');
    const superScopeUsers = missingUsers.filter(u => u.admin_scope === 'super');
    
    console.log('=== CATEGORIZATION ===');
    console.log(`Pending users: ${pendingUsers.length}`);
    console.log(`Admin users: ${adminUsers.length}`);
    console.log(`Special role users: ${specialRoleUsers.length}`);
    console.log(`Super scope users: ${superScopeUsers.length}`);
    
    // Apply new business rule
    const creditableCount = getCreditableUserCount(allCanvaUsers);
    console.log(`\n=== NEW BUSINESS RULE RESULT ===`);
    console.log(`Creditable users (active + pending, excl. super admins): ${creditableCount}`);
    
    // Validation
    expect(missingUsers.length).toBe(7);
    expect(employeeDirectoryUsers.length).toBe(408);
    expect(managementDashboardUsers.length).toBe(401);
    
    return {
      missingUsers,
      employeeDirectoryCount: employeeDirectoryUsers.length,
      managementDashboardCount: managementDashboardUsers.length,
      creditableCount
    };
  });
  
  test('Validate business rule implementation gives consistent results', async () => {
    const storage = new DatabaseStorage();
    const canvaUsers = await storage.getUsersByOrganization(1);
    
    // Apply business rule to get creditable users
    const creditableUsers = getCreditableUsers(canvaUsers);
    const creditableCount = getCreditableUserCount(canvaUsers);
    
    console.log('=== BUSINESS RULE VALIDATION ===');
    console.log(`Total users: ${canvaUsers.length}`);
    console.log(`Creditable users: ${creditableCount}`);
    console.log(`Should match between corporate and organization views`);
    
    // This should be the consistent number across all interfaces
    expect(creditableCount).toBeGreaterThan(400);
    expect(creditableUsers.length).toBe(creditableCount);
    
    // Status breakdown of creditable users
    const statusBreakdown = creditableUsers.reduce((acc: any, user: any) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Creditable users status breakdown:', statusBreakdown);
    
    return { creditableCount, statusBreakdown };
  });
});