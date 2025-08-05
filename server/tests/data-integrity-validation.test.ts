// DATA INTEGRITY VALIDATION TESTS
// Ensures clean user organization assignments after fixes

import { describe, test, expect } from '@jest/globals';
import { DatabaseStorage } from '../storage/database-storage';

describe('Data Integrity Validation After Fixes', () => {
  test('All users should have proper organization assignments', async () => {
    const storage = new DatabaseStorage();
    
    // Get all users and categorize them
    const allUsers = await storage.getUsers();
    const canvaUsers = await storage.getUsersByOrganization(1);
    const loylogicUsers = await storage.getUsersByOrganization(6);
    
    console.log('=== DATA INTEGRITY VALIDATION ===');
    console.log(`Total users in system: ${allUsers.length}`);
    console.log(`Canva users: ${canvaUsers.length}`);
    console.log(`Loylogic users: ${loylogicUsers.length}`);
    
    // Validate Canva organization
    expect(canvaUsers.length).toBe(402); // 401 active + 1 pending
    
    // Validate Loylogic organization  
    expect(loylogicUsers.length).toBe(2); // admin@loylogic.com + Admin@loylogic.com
    
    // Check for corporate admin (should not be in any organization)
    const corporateAdmins = allUsers.filter((user: any) => 
      user.role_type === 'corporate_admin' && !user.organization_id
    );
    console.log(`Corporate admins: ${corporateAdmins.length}`);
    expect(corporateAdmins.length).toBe(1); // admin@thriviohr.com
    
    // Validate no invalid emails remain
    const invalidEmails = [
      'admin@democorp.com',
      'admin@monday.com', 
      'test@company.com',
      'admin@empulse.com'
    ];
    
    const foundInvalidUsers = allUsers.filter((user: any) => 
      invalidEmails.includes(user.email)
    );
    expect(foundInvalidUsers.length).toBe(0);
    
    console.log('✅ All data integrity issues resolved');
  });
  
  test('User counting should now be consistent', async () => {
    const storage = new DatabaseStorage();
    const canvaUsers = await storage.getUsersByOrganization(1);
    
    // Apply business rule: active + pending, exclude super admins
    const creditableUsers = canvaUsers.filter((user: any) => 
      (user.status === 'active' || user.status === 'pending') &&
      user.admin_scope !== 'super'
    );
    
    console.log('=== CONSISTENT COUNTING VALIDATION ===');
    console.log(`Total Canva users: ${canvaUsers.length}`);
    console.log(`Creditable users: ${creditableUsers.length}`);
    
    // This should now match between all interfaces
    expect(creditableUsers.length).toBe(401); // Consistent across corporate and org views
    
    console.log('✅ User counting is now consistent');
  });
});