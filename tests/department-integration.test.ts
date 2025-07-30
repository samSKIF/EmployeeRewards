import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DatabaseStorage } from '../server/storage';

// Integration tests for department management system
// These tests verify end-to-end functionality with real database operations

describe('Department Management Integration Tests', () => {
  let storage: DatabaseStorage;
  let testOrganizationId: number;
  let testUserId: number;
  let createdDepartmentIds: number[] = [];

  beforeAll(async () => {
    storage = new DatabaseStorage();
    
    // Create test organization and user for isolation
    testOrganizationId = 999; // Use high ID to avoid conflicts
    testUserId = 999;
  });

  beforeEach(() => {
    createdDepartmentIds = [];
  });

  afterAll(async () => {
    // Cleanup: Remove all test departments
    for (const id of createdDepartmentIds) {
      try {
        await storage.deleteDepartment(id);
      } catch (error) {
        console.warn(`Failed to cleanup department ${id}:`, error);
      }
    }
  });

  describe('Complete Department Workflow', () => {
    it('should create, read, update, and delete department successfully', async () => {
      // 1. CREATE: Create a new department
      const newDepartmentData = {
        name: 'Integration Test Department',
        description: 'Test department for integration testing',
        organization_id: testOrganizationId,
        color: '#3B82F6',
        created_by: testUserId,
      };

      const createdDepartment = await storage.createDepartment(newDepartmentData);
      createdDepartmentIds.push(createdDepartment.id);

      expect(createdDepartment).toBeDefined();
      expect(createdDepartment.id).toBeDefined();
      expect(createdDepartment.name).toBe('Integration Test Department');
      expect(createdDepartment.color).toBe('#3B82F6');
      expect(createdDepartment.is_active).toBe(true);
      expect(createdDepartment.created_at).toBeDefined();

      // 2. READ: Verify department appears in organization list
      const departments = await storage.getDepartmentsByOrganization(testOrganizationId);
      const foundDepartment = departments.find(dept => dept.id === createdDepartment.id);
      
      expect(foundDepartment).toBeDefined();
      expect(foundDepartment?.name).toBe('Integration Test Department');

      // 3. READ: Get department by ID
      const departmentById = await storage.getDepartmentById(createdDepartment.id);
      expect(departmentById).toBeDefined();
      expect(departmentById?.id).toBe(createdDepartment.id);

      // 4. READ: Get department by name
      const departmentByName = await storage.getDepartmentByName(
        testOrganizationId, 
        'Integration Test Department'
      );
      expect(departmentByName).toBeDefined();
      expect(departmentByName?.id).toBe(createdDepartment.id);

      // 5. UPDATE: Modify department
      const updateData = {
        name: 'Updated Integration Test Department',
        description: 'Updated description for testing',
        color: '#EC4899',
      };

      const updatedDepartment = await storage.updateDepartment(createdDepartment.id, updateData);
      
      expect(updatedDepartment.name).toBe('Updated Integration Test Department');
      expect(updatedDepartment.description).toBe('Updated description for testing');
      expect(updatedDepartment.color).toBe('#EC4899');

      // 6. READ: Verify update persisted
      const verifyUpdate = await storage.getDepartmentById(createdDepartment.id);
      expect(verifyUpdate?.name).toBe('Updated Integration Test Department');
      expect(verifyUpdate?.color).toBe('#EC4899');

      // 7. DELETE: Remove department
      const deleteResult = await storage.deleteDepartment(createdDepartment.id);
      expect(deleteResult).toBe(true);

      // 8. VERIFY DELETE: Ensure department no longer exists
      const deletedDepartment = await storage.getDepartmentById(createdDepartment.id);
      expect(deletedDepartment).toBeUndefined();

      const departmentsAfterDelete = await storage.getDepartmentsByOrganization(testOrganizationId);
      const shouldNotExist = departmentsAfterDelete.find(dept => dept.id === createdDepartment.id);
      expect(shouldNotExist).toBeUndefined();

      // Remove from cleanup list since it's already deleted
      createdDepartmentIds = createdDepartmentIds.filter(id => id !== createdDepartment.id);
    });

    it('should handle multiple departments with unique names', async () => {
      const departments = [
        {
          name: 'Engineering Team',
          description: 'Software development',
          organization_id: testOrganizationId,
          color: '#3B82F6',
          created_by: testUserId,
        },
        {
          name: 'Marketing Team',
          description: 'Brand and communications',
          organization_id: testOrganizationId,
          color: '#EC4899',
          created_by: testUserId,
        },
        {
          name: 'Sales Team',
          description: 'Revenue generation',
          organization_id: testOrganizationId,
          color: '#10B981',
          created_by: testUserId,
        },
      ];

      const createdDepartments = [];

      // Create all departments
      for (const dept of departments) {
        const created = await storage.createDepartment(dept);
        createdDepartments.push(created);
        createdDepartmentIds.push(created.id);
      }

      // Verify all departments exist
      const allDepartments = await storage.getDepartmentsByOrganization(testOrganizationId);
      
      expect(allDepartments.length).toBeGreaterThanOrEqual(3);
      
      for (const created of createdDepartments) {
        const found = allDepartments.find(dept => dept.id === created.id);
        expect(found).toBeDefined();
        expect(found?.name).toBe(created.name);
      }

      // Verify unique colors
      const colors = createdDepartments.map(dept => dept.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(3); // All colors should be different

      // Test department name uniqueness within organization
      const duplicateNameDept = {
        name: 'Engineering Team', // Duplicate name
        description: 'Another engineering team',
        organization_id: testOrganizationId,
        color: '#8B5CF6',
        created_by: testUserId,
      };

      // This should be handled at application level, but we can test storage behavior
      const existingDept = await storage.getDepartmentByName(testOrganizationId, 'Engineering Team');
      expect(existingDept).toBeDefined();
      expect(existingDept?.name).toBe('Engineering Team');
    });

    it('should maintain data isolation between organizations', async () => {
      const org1Id = testOrganizationId;
      const org2Id = testOrganizationId + 1;

      // Create departments in different organizations
      const org1Dept = await storage.createDepartment({
        name: 'Org1 Engineering',
        description: 'Engineering team for org 1',
        organization_id: org1Id,
        color: '#3B82F6',
        created_by: testUserId,
      });
      createdDepartmentIds.push(org1Dept.id);

      const org2Dept = await storage.createDepartment({
        name: 'Org2 Engineering',
        description: 'Engineering team for org 2',
        organization_id: org2Id,
        color: '#3B82F6',
        created_by: testUserId,
      });
      createdDepartmentIds.push(org2Dept.id);

      // Verify isolation
      const org1Departments = await storage.getDepartmentsByOrganization(org1Id);
      const org2Departments = await storage.getDepartmentsByOrganization(org2Id);

      const org1HasOrg2Dept = org1Departments.some(dept => dept.id === org2Dept.id);
      const org2HasOrg1Dept = org2Departments.some(dept => dept.id === org1Dept.id);

      expect(org1HasOrg2Dept).toBe(false);
      expect(org2HasOrg1Dept).toBe(false);

      // Verify each organization only sees its own departments
      expect(org1Departments.every(dept => dept.organization_id === org1Id)).toBe(true);
      expect(org2Departments.every(dept => dept.organization_id === org2Id)).toBe(true);
    });

    it('should handle employee count tracking accurately', async () => {
      // Create a test department
      const testDept = await storage.createDepartment({
        name: 'Employee Count Test Dept',
        description: 'Testing employee count functionality',
        organization_id: testOrganizationId,
        color: '#F59E0B',
        created_by: testUserId,
      });
      createdDepartmentIds.push(testDept.id);

      // Get initial employee count (should be 0 for new department)
      const initialCount = await storage.getEmployeeCountByDepartment(
        testOrganizationId, 
        'Employee Count Test Dept'
      );

      expect(initialCount).toBe(0);

      // Note: In a full integration test, we would create test employees
      // and assign them to this department, then verify the count increases
      // For now, we're testing the basic functionality works
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent department gracefully', async () => {
      const nonExistentId = 99999;
      
      const department = await storage.getDepartmentById(nonExistentId);
      expect(department).toBeUndefined();

      // Updating non-existent department should throw error
      await expect(
        storage.updateDepartment(nonExistentId, { name: 'Updated Name' })
      ).rejects.toThrow();
    });

    it('should handle invalid organization ID', async () => {
      const invalidOrgId = -1;
      
      const departments = await storage.getDepartmentsByOrganization(invalidOrgId);
      expect(departments).toEqual([]);
    });

    it('should handle department with null description', async () => {
      const deptWithoutDescription = await storage.createDepartment({
        name: 'No Description Dept',
        organization_id: testOrganizationId,
        color: '#6B7280',
        created_by: testUserId,
      });
      createdDepartmentIds.push(deptWithoutDescription.id);

      expect(deptWithoutDescription.description).toBeNull();
      
      const retrieved = await storage.getDepartmentById(deptWithoutDescription.id);
      expect(retrieved?.description).toBeNull();
    });

    it('should maintain referential integrity', async () => {
      // Test that departments are properly linked to organizations
      const testDept = await storage.createDepartment({
        name: 'Referential Test Dept',
        description: 'Testing referential integrity',
        organization_id: testOrganizationId,
        color: '#8B5CF6',
        created_by: testUserId,
      });
      createdDepartmentIds.push(testDept.id);

      expect(testDept.organization_id).toBe(testOrganizationId);
      
      const retrieved = await storage.getDepartmentById(testDept.id);
      expect(retrieved?.organization_id).toBe(testOrganizationId);
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain consistent timestamps', async () => {
      const beforeCreate = new Date();
      
      const testDept = await storage.createDepartment({
        name: 'Timestamp Test Dept',
        description: 'Testing timestamp consistency',
        organization_id: testOrganizationId,
        color: '#14B8A6',
        created_by: testUserId,
      });
      createdDepartmentIds.push(testDept.id);

      const afterCreate = new Date();

      expect(testDept.created_at).toBeDefined();
      const createdAt = new Date(testDept.created_at);
      
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

      // Test update timestamp
      const beforeUpdate = new Date();
      
      const updated = await storage.updateDepartment(testDept.id, {
        description: 'Updated description with timestamp test'
      });

      if (updated.updated_at) {
        const updatedAt = new Date(updated.updated_at);
        expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      }
    });

    it('should preserve data types correctly', async () => {
      const testDept = await storage.createDepartment({
        name: 'Data Type Test Dept',
        description: 'Testing data type preservation',
        organization_id: testOrganizationId,
        color: '#F97316',
        created_by: testUserId,
      });
      createdDepartmentIds.push(testDept.id);

      // Verify data types
      expect(typeof testDept.id).toBe('number');
      expect(typeof testDept.name).toBe('string');
      expect(typeof testDept.organization_id).toBe('number');
      expect(typeof testDept.is_active).toBe('boolean');
      expect(typeof testDept.created_by).toBe('number');
      
      if (testDept.description !== null) {
        expect(typeof testDept.description).toBe('string');
      }
    });

    it('should handle color validation properly', async () => {
      const validColors = [
        '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
        '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#84CC16'
      ];

      for (let i = 0; i < validColors.length; i++) {
        const color = validColors[i];
        const testDept = await storage.createDepartment({
          name: `Color Test Dept ${i + 1}`,
          description: `Testing color ${color}`,
          organization_id: testOrganizationId,
          color: color,
          created_by: testUserId,
        });
        createdDepartmentIds.push(testDept.id);

        expect(testDept.color).toBe(color);
      }
    });

    it('should maintain proper sorting order', async () => {
      const deptNames = ['Alpha Dept', 'Beta Dept', 'Charlie Dept', 'Delta Dept'];
      
      // Create departments in random order
      const shuffledNames = [...deptNames].sort(() => Math.random() - 0.5);
      
      for (const name of shuffledNames) {
        const dept = await storage.createDepartment({
          name: name,
          description: `Department ${name}`,
          organization_id: testOrganizationId,
          color: '#6B7280',
          created_by: testUserId,
        });
        createdDepartmentIds.push(dept.id);
      }

      // Retrieve departments and verify they're sorted by name
      const departments = await storage.getDepartmentsByOrganization(testOrganizationId);
      const ourDepartments = departments.filter(dept => 
        deptNames.some(name => dept.name.includes(name.split(' ')[0]))
      );

      expect(ourDepartments.length).toBe(4);
      
      // Verify sorting (should be alphabetical by name)
      for (let i = 1; i < ourDepartments.length; i++) {
        expect(ourDepartments[i].name >= ourDepartments[i - 1].name).toBe(true);
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk department operations efficiently', async () => {
      const startTime = Date.now();
      const bulkDepartments = [];

      // Create 50 departments
      for (let i = 1; i <= 50; i++) {
        const dept = await storage.createDepartment({
          name: `Bulk Test Dept ${i.toString().padStart(2, '0')}`,
          description: `Bulk created department number ${i}`,
          organization_id: testOrganizationId,
          color: '#6B7280',
          created_by: testUserId,
        });
        bulkDepartments.push(dept);
        createdDepartmentIds.push(dept.id);
      }

      const createTime = Date.now() - startTime;
      console.log(`Created 50 departments in ${createTime}ms`);

      // Retrieve all departments
      const retrievalStart = Date.now();
      const allDepartments = await storage.getDepartmentsByOrganization(testOrganizationId);
      const retrievalTime = Date.now() - retrievalStart;
      
      console.log(`Retrieved ${allDepartments.length} departments in ${retrievalTime}ms`);

      expect(allDepartments.length).toBeGreaterThanOrEqual(50);
      
      // Verify all our departments are present
      const ourDepartments = allDepartments.filter(dept => 
        dept.name.startsWith('Bulk Test Dept')
      );
      expect(ourDepartments.length).toBe(50);

      // Performance should be reasonable (adjust thresholds as needed)
      expect(createTime).toBeLessThan(10000); // 10 seconds for 50 creates
      expect(retrievalTime).toBeLessThan(1000); // 1 second for retrieval
    });
  });
});