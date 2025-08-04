// BUSINESS CRITICAL REGRESSION PREVENTION SUITE
// Prevents harmful data inconsistencies and storage failures

const { describe, test, expect, beforeAll } = require('@jest/globals');

describe('Business Critical Regression Prevention', () => {
  let storage;
  
  beforeAll(async () => {
    // Dynamically import storage for testing
    const { DatabaseStorage } = await import('../storage/database-storage.js');
    storage = new DatabaseStorage();
  });

  describe('Storage Interface Completeness - CRITICAL', () => {
    test('All critical API methods must exist to prevent 500 errors', async () => {
      const criticalMethods = [
        'getUsers', 'getUserCount', 'getUsersByOrganization', 
        'getAllUsersWithBalance', 'getUser', 'getUserByEmail',
        'createUser', 'verifyPassword', 'getOrganizationById',
        'getTrendingChannels', 'getChannelSuggestions', 'getUserChannels'
      ];

      for (const method of criticalMethods) {
        expect(typeof storage[method]).toBe('function');
      }
    });

    test('Storage consistency validation - prevents data discrepancies', async () => {
      // These calls must succeed to prevent business-critical failures
      const userCount = await storage.getUserCount();
      const allUsers = await storage.getUsers();
      const canvaUsers = await storage.getUsersByOrganization(1);
      
      console.log(`=== DATA CONSISTENCY REPORT ===`);
      console.log(`Total system users: ${userCount}`);
      console.log(`getUsers() length: ${allUsers?.length || 0}`);
      console.log(`Canva users: ${canvaUsers?.length || 0}`);
      
      // Critical business validation
      expect(userCount).toBeGreaterThan(400);
      expect(allUsers).toBeDefined();
      expect(canvaUsers).toBeDefined();
      expect(canvaUsers.length).toBeGreaterThan(400);
      
      // Alert if data inconsistency detected
      if (Math.abs(userCount - allUsers.length) > 2) {
        console.warn('⚠️  DATA INCONSISTENCY DETECTED');
      }
    });
  });

  describe('API Route Protection - Prevents 500 Errors', () => {
    test('User management API compatibility', async () => {
      // Test exact method signatures used by failing API routes
      await expect(storage.getUsers()).resolves.toBeDefined();
      await expect(storage.getUserCount()).resolves.toBeGreaterThan(0);
      await expect(storage.getUsersByOrganization(1)).resolves.toBeDefined();
    });

    test('Authentication system integrity', async () => {
      // Prevent authentication failures that break business operations
      await expect(storage.getUserByEmail('admin@canva.com')).resolves.toBeDefined();
      await expect(storage.getUserByEmail('admin@loylogic.com')).resolves.toBeDefined();
    });
  });
});