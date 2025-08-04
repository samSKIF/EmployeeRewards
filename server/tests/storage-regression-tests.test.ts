// Storage Regression Test Suite
// BUSINESS CRITICAL: Prevents harmful storage method failures
// Gold standard compliance: Comprehensive testing for data consistency

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { DatabaseStorage } from '../storage/database-storage';
import { UserStorage } from '../storage/user-storage';
import { OrganizationStorage } from '../storage/organization-storage';
import type { IStorage } from '../storage/interfaces';

describe('Storage Regression Tests - BUSINESS CRITICAL', () => {
  let storage: IStorage;
  let userStorage: UserStorage;
  let orgStorage: OrganizationStorage;

  beforeAll(async () => {
    storage = new DatabaseStorage();
    userStorage = new UserStorage();
    orgStorage = new OrganizationStorage();
  });

  describe('User Storage Interface Completeness', () => {
    test('ALL required user methods must exist and be callable', async () => {
      // CRITICAL: These method failures cause API 500 errors
      expect(typeof storage.getUsers).toBe('function');
      expect(typeof storage.getUserCount).toBe('function');
      expect(typeof storage.getUsersByOrganization).toBe('function');
      expect(typeof storage.getAllUsersWithBalance).toBe('function');
      expect(typeof storage.getUser).toBe('function');
      expect(typeof storage.getUserByEmail).toBe('function');
      expect(typeof storage.createUser).toBe('function');
      expect(typeof storage.verifyPassword).toBe('function');
    });

    test('User count consistency across all methods', async () => {
      try {
        // Test all user counting methods return consistent data
        const allUsers = await storage.getUsers();
        const userCount = await storage.getUserCount();
        const canvaUsers = await storage.getUsersByOrganization(1); // Canva org ID
        
        console.log('User Count Test Results:');
        console.log(`- getUsers() returned: ${allUsers?.length || 0} users`);
        console.log(`- getUserCount() returned: ${userCount} count`);
        console.log(`- getUsersByOrganization(1) returned: ${canvaUsers?.length || 0} users`);

        // Data consistency validation
        expect(allUsers).toBeDefined();
        expect(Array.isArray(allUsers)).toBe(true);
        expect(userCount).toBeGreaterThan(0);
        expect(canvaUsers).toBeDefined();
        expect(Array.isArray(canvaUsers)).toBe(true);

        // Business rule: Canva should have 400+ employees
        expect(canvaUsers.length).toBeGreaterThan(400);
        
      } catch (error: any) {
        console.error('CRITICAL STORAGE FAILURE:', error?.message);
        throw new Error(`Storage method failed: ${error?.message || 'unknown_error'}`);
      }
    });
  });

  describe('Organization Storage Interface Completeness', () => {
    test('ALL required organization methods must exist', async () => {
      expect(typeof storage.createOrganization).toBe('function');
      expect(typeof storage.getOrganizationById).toBe('function');
      expect(typeof storage.getOrganizationBySlug).toBe('function');
      expect(typeof storage.updateOrganization).toBe('function');
      expect(typeof storage.getOrganizationFeatures).toBe('function');
    });

    test('Organization data consistency', async () => {
      try {
        const canvaOrg = await storage.getOrganizationById(1);
        const canvaFeatures = await storage.getOrganizationFeatures(1);
        
        expect(canvaOrg).toBeDefined();
        expect(canvaOrg?.name).toBe('Canva');
        expect(canvaFeatures).toBeDefined();
        expect(Array.isArray(canvaFeatures)).toBe(true);
        
      } catch (error: any) {
        console.error('ORGANIZATION STORAGE FAILURE:', error?.message);
        throw new Error(`Organization method failed: ${error?.message || 'unknown_error'}`);
      }
    });
  });

  describe('Social Storage Interface Completeness', () => {
    test('ALL required social methods must exist', async () => {
      expect(typeof storage.getTrendingChannels).toBe('function');
      expect(typeof storage.getChannelSuggestions).toBe('function');
      expect(typeof storage.getUserChannels).toBe('function');
    });

    test('Social methods return valid data structures', async () => {
      try {
        const trending = await storage.getTrendingChannels();
        const suggestions = await storage.getChannelSuggestions();
        const userChannels = await storage.getUserChannels(1);
        
        expect(Array.isArray(trending)).toBe(true);
        expect(Array.isArray(suggestions)).toBe(true);
        expect(Array.isArray(userChannels)).toBe(true);
        
      } catch (error: any) {
        console.error('SOCIAL STORAGE FAILURE:', error?.message);
        throw new Error(`Social method failed: ${error?.message || 'unknown_error'}`);
      }
    });
  });

  describe('API Route Compatibility Tests', () => {
    test('Storage methods match API route expectations', async () => {
      // These are the exact methods called by API routes that were failing
      const criticalMethods = [
        'getUsers',
        'getUserCount', 
        'getUsersByOrganization',
        'getAllUsersWithBalance',
        'getOrganizationFeatures',
        'getTrendingChannels',
        'getChannelSuggestions'
      ];

      for (const methodName of criticalMethods) {
        expect(typeof (storage as any)[methodName]).toBe('function');
        
        try {
          // Test that method can be called without throwing
          const result = await (storage as any)[methodName](1);
          expect(result).toBeDefined();
        } catch (error: any) {
          throw new Error(`CRITICAL API COMPATIBILITY FAILURE: ${methodName} - ${error?.message}`);
        }
      }
    });
  });

  describe('Data Integrity Cross-Validation', () => {
    test('Employee counts must be consistent across all interfaces', async () => {
      try {
        // Get data from multiple sources that should match
        const directUserCount = await userStorage.getUserCount();
        const storageUserCount = await storage.getUserCount();
        const canvaUsers = await storage.getUsersByOrganization(1);
        const allUsers = await storage.getUsers();
        
        console.log('=== DATA CONSISTENCY REPORT ===');
        console.log(`Direct UserStorage.getUserCount(): ${directUserCount}`);
        console.log(`DatabaseStorage.getUserCount(): ${storageUserCount}`);
        console.log(`Canva organization users: ${canvaUsers?.length || 0}`);
        console.log(`Total users in system: ${allUsers?.length || 0}`);
        
        // Business validation: These should all be consistent
        expect(directUserCount).toBe(storageUserCount);
        expect(canvaUsers.length).toBeGreaterThan(400);
        expect(canvaUsers.length).toBeLessThan(410); // Reasonable upper bound
        
        // Flag discrepancy if found
        if (Math.abs(directUserCount - storageUserCount) > 1) {
          throw new Error(`CRITICAL DATA INCONSISTENCY: Direct count ${directUserCount} vs Storage count ${storageUserCount}`);
        }
        
      } catch (error: any) {
        console.error('DATA INTEGRITY FAILURE:', error?.message);
        throw error;
      }
    });
  });
});