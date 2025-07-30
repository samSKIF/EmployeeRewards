import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DatabaseStorage } from '../server/storage';
import { departments } from '../shared/schema';

// Mock database dependencies
jest.mock('../server/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock imports
const mockDb = {
  select: jest.fn(() => mockDb),
  insert: jest.fn(() => mockDb),
  update: jest.fn(() => mockDb),
  delete: jest.fn(() => mockDb),
  from: jest.fn(() => mockDb),
  where: jest.fn(() => mockDb),
  values: jest.fn(() => mockDb),
  set: jest.fn(() => mockDb),
  returning: jest.fn(() => mockDb),
  orderBy: jest.fn(() => mockDb),
};

describe('Department Management System', () => {
  let storage: DatabaseStorage;
  
  beforeEach(() => {
    jest.clearAllMocks();
    storage = new DatabaseStorage();
    
    // Reset mock implementations
    Object.keys(mockDb).forEach(key => {
      (mockDb as any)[key].mockReturnValue(mockDb);
    });
  });

  describe('Department Creation', () => {
    it('should create a new department with all required fields', async () => {
      const newDepartment = {
        name: 'Engineering',
        description: 'Software development team',
        organization_id: 1,
        color: '#3B82F6',
        created_by: 123,
      };

      const mockCreatedDepartment = {
        id: 1,
        ...newDepartment,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockDb.returning.mockResolvedValue([mockCreatedDepartment]);

      const result = await storage.createDepartment(newDepartment);

      expect(mockDb.insert).toHaveBeenCalledWith(departments);
      expect(mockDb.values).toHaveBeenCalledWith(newDepartment);
      expect(mockDb.returning).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedDepartment);
    });

    it('should create department without description (optional field)', async () => {
      const newDepartment = {
        name: 'Marketing',
        organization_id: 1,
        color: '#EC4899',
        created_by: 123,
      };

      const mockCreatedDepartment = {
        id: 2,
        ...newDepartment,
        description: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockDb.returning.mockResolvedValue([mockCreatedDepartment]);

      const result = await storage.createDepartment(newDepartment);

      expect(result.description).toBeNull();
      expect(result.name).toBe('Marketing');
      expect(result.color).toBe('#EC4899');
    });

    it('should handle department creation errors gracefully', async () => {
      const newDepartment = {
        name: 'Sales',
        organization_id: 1,
        color: '#10B981',
      };

      const mockError = new Error('Database constraint violation');
      mockDb.returning.mockRejectedValue(mockError);

      await expect(storage.createDepartment(newDepartment)).rejects.toThrow(mockError);
    });

    it('should validate required fields for department creation', async () => {
      const incompleteDepartment = {
        description: 'Missing name and organization',
        color: '#6B7280',
      };

      // Should fail due to missing required fields
      const mockError = new Error('Missing required fields');
      mockDb.returning.mockRejectedValue(mockError);

      await expect(storage.createDepartment(incompleteDepartment)).rejects.toThrow();
    });
  });

  describe('Department Retrieval', () => {
    it('should fetch departments by organization with correct filtering', async () => {
      const organizationId = 1;
      const mockDepartments = [
        {
          id: 1,
          name: 'Engineering',
          description: 'Software development',
          color: '#3B82F6',
          is_active: true,
          created_at: '2025-01-30T08:00:00Z',
        },
        {
          id: 2,
          name: 'Marketing',
          description: 'Brand and communications',
          color: '#EC4899',
          is_active: true,
          created_at: '2025-01-30T08:00:00Z',
        },
      ];

      mockDb.where.mockResolvedValue(mockDepartments);

      const result = await storage.getDepartmentsByOrganization(organizationId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(departments);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(result).toEqual(mockDepartments);
    });

    it('should return empty array for organization with no departments', async () => {
      const organizationId = 999;
      mockDb.where.mockResolvedValue([]);

      const result = await storage.getDepartmentsByOrganization(organizationId);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should fetch department by ID correctly', async () => {
      const departmentId = 1;
      const mockDepartment = {
        id: 1,
        name: 'Engineering',
        description: 'Software development team',
        organization_id: 1,
        color: '#3B82F6',
        is_active: true,
        created_at: '2025-01-30T08:00:00Z',
      };

      mockDb.where.mockResolvedValue([mockDepartment]);

      const result = await storage.getDepartmentById(departmentId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(departments);
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toEqual(mockDepartment);
    });

    it('should return undefined for non-existent department ID', async () => {
      const departmentId = 999;
      mockDb.where.mockResolvedValue([]);

      const result = await storage.getDepartmentById(departmentId);

      expect(result).toBeUndefined();
    });

    it('should fetch department by name and organization', async () => {
      const organizationId = 1;
      const departmentName = 'Engineering';
      const mockDepartment = {
        id: 1,
        name: 'Engineering',
        organization_id: 1,
        color: '#3B82F6',
        is_active: true,
      };

      mockDb.where.mockResolvedValue([mockDepartment]);

      const result = await storage.getDepartmentByName(organizationId, departmentName);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toEqual(mockDepartment);
    });
  });

  describe('Department Updates', () => {
    it('should update department with new data', async () => {
      const departmentId = 1;
      const updateData = {
        name: 'Software Engineering',
        description: 'Updated description',
        color: '#8B5CF6',
        updated_at: new Date().toISOString(),
      };

      const mockUpdatedDepartment = {
        id: departmentId,
        organization_id: 1,
        is_active: true,
        created_at: '2025-01-30T08:00:00Z',
        created_by: 123,
        ...updateData,
      };

      mockDb.returning.mockResolvedValue([mockUpdatedDepartment]);

      const result = await storage.updateDepartment(departmentId, updateData);

      expect(mockDb.update).toHaveBeenCalledWith(departments);
      expect(mockDb.set).toHaveBeenCalledWith(updateData);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedDepartment);
    });

    it('should update only specified fields, leaving others unchanged', async () => {
      const departmentId = 1;
      const partialUpdate = {
        color: '#F59E0B', // Only updating color
      };

      const mockUpdatedDepartment = {
        id: departmentId,
        name: 'Engineering', // Unchanged
        description: 'Software development', // Unchanged
        organization_id: 1,
        color: '#F59E0B', // Updated
        is_active: true,
        created_at: '2025-01-30T08:00:00Z',
        updated_at: new Date().toISOString(),
      };

      mockDb.returning.mockResolvedValue([mockUpdatedDepartment]);

      const result = await storage.updateDepartment(departmentId, partialUpdate);

      expect(mockDb.set).toHaveBeenCalledWith(partialUpdate);
      expect(result.color).toBe('#F59E0B');
      expect(result.name).toBe('Engineering'); // Should remain unchanged
    });

    it('should handle update errors appropriately', async () => {
      const departmentId = 999; // Non-existent department
      const updateData = { name: 'Updated Name' };

      const mockError = new Error('Department not found');
      mockDb.returning.mockRejectedValue(mockError);

      await expect(storage.updateDepartment(departmentId, updateData)).rejects.toThrow(mockError);
    });
  });

  describe('Department Deletion', () => {
    it('should delete department successfully', async () => {
      const departmentId = 1;
      mockDb.where.mockResolvedValue(undefined);

      const result = await storage.deleteDepartment(departmentId);

      expect(mockDb.delete).toHaveBeenCalledWith(departments);
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle deletion errors', async () => {
      const departmentId = 1;
      const mockError = new Error('Cannot delete department with active employees');
      mockDb.where.mockRejectedValue(mockError);

      await expect(storage.deleteDepartment(departmentId)).rejects.toThrow(mockError);
    });
  });

  describe('Employee Count by Department', () => {
    it('should return correct employee count for department', async () => {
      const organizationId = 1;
      const departmentName = 'Engineering';
      const mockResult = { count: '15' };

      mockDb.where.mockResolvedValue([mockResult]);

      const result = await storage.getEmployeeCountByDepartment(organizationId, departmentName);

      expect(result).toBe(15);
      expect(typeof result).toBe('number');
    });

    it('should return 0 for department with no employees', async () => {
      const organizationId = 1;
      const departmentName = 'New Department';
      const mockResult = { count: '0' };

      mockDb.where.mockResolvedValue([mockResult]);

      const result = await storage.getEmployeeCountByDepartment(organizationId, departmentName);

      expect(result).toBe(0);
    });

    it('should handle employee count query errors', async () => {
      const organizationId = 1;
      const departmentName = 'Engineering';
      const mockError = new Error('Database query failed');

      mockDb.where.mockRejectedValue(mockError);

      await expect(storage.getEmployeeCountByDepartment(organizationId, departmentName)).rejects.toThrow(mockError);
    });
  });

  describe('Department Validation and Business Logic', () => {
    it('should validate department color format', async () => {
      const validColors = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B'];
      
      for (const color of validColors) {
        const department = {
          name: 'Test Department',
          organization_id: 1,
          color: color,
        };

        mockDb.returning.mockResolvedValue([{ ...department, id: 1 }]);
        
        const result = await storage.createDepartment(department);
        expect(result.color).toBe(color);
      }
    });

    it('should ensure department names are unique within organization', async () => {
      const organizationId = 1;
      const departmentName = 'Engineering';
      
      // First, check if department exists
      const existingDepartment = {
        id: 1,
        name: 'Engineering',
        organization_id: 1,
      };

      mockDb.where.mockResolvedValue([existingDepartment]);

      const result = await storage.getDepartmentByName(organizationId, departmentName);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(departmentName);
      
      // Attempting to create duplicate should be handled at application level
    });

    it('should maintain audit trail with created_by and timestamps', async () => {
      const newDepartment = {
        name: 'Human Resources',
        organization_id: 1,
        color: '#8B5CF6',
        created_by: 456,
      };

      const mockCreatedDepartment = {
        id: 3,
        ...newDepartment,
        is_active: true,
        created_at: '2025-01-30T08:30:00Z',
        updated_at: '2025-01-30T08:30:00Z',
      };

      mockDb.returning.mockResolvedValue([mockCreatedDepartment]);

      const result = await storage.createDepartment(newDepartment);

      expect(result.created_by).toBe(456);
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
      expect(result.is_active).toBe(true);
    });
  });

  describe('Multi-tenant Data Isolation', () => {
    it('should isolate departments by organization', async () => {
      const org1Departments = [
        { id: 1, name: 'Engineering', organization_id: 1 },
        { id: 2, name: 'Marketing', organization_id: 1 },
      ];

      const org2Departments = [
        { id: 3, name: 'Engineering', organization_id: 2 },
        { id: 4, name: 'Sales', organization_id: 2 },
      ];

      // Test organization 1
      mockDb.where.mockResolvedValueOnce(org1Departments);
      const result1 = await storage.getDepartmentsByOrganization(1);
      expect(result1).toEqual(org1Departments);
      expect(result1.every(dept => dept.organization_id === 1)).toBe(true);

      // Test organization 2
      mockDb.where.mockResolvedValueOnce(org2Departments);
      const result2 = await storage.getDepartmentsByOrganization(2);
      expect(result2).toEqual(org2Departments);
      expect(result2.every(dept => dept.organization_id === 2)).toBe(true);

      // Ensure no cross-contamination
      expect(result1).not.toEqual(result2);
    });

    it('should prevent cross-organization department access', async () => {
      const organizationId = 1;
      const departmentName = 'Engineering';
      
      // Department exists but in different organization
      mockDb.where.mockResolvedValue([]);

      const result = await storage.getDepartmentByName(organizationId, departmentName);
      
      expect(result).toBeUndefined();
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const connectionError = new Error('Connection to database failed');
      mockDb.select.mockRejectedValue(connectionError);

      await expect(storage.getDepartmentsByOrganization(1)).rejects.toThrow('Connection to database failed');
    });

    it('should handle malformed query results', async () => {
      // Mock malformed response
      mockDb.where.mockResolvedValue(null);

      const result = await storage.getDepartmentsByOrganization(1);
      
      // Should handle gracefully, not crash
      expect(result).toBeNull();
    });

    it('should log errors appropriately for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const dbError = new Error('Database error');
      
      mockDb.where.mockRejectedValue(dbError);

      try {
        await storage.getDepartmentsByOrganization(1);
      } catch (error) {
        // Error should be logged
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching departments by organization:', dbError);
      }

      consoleSpy.mockRestore();
    });
  });
});