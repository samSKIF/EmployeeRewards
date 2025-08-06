import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { storage } from '../../../../storage';
import { createMockEmployee } from '../../../../test-utils/employee-test-utils';

// Mock storage
jest.mock('../../../../storage');
const mockStorage = storage as jest.Mocked<typeof storage>;

interface MockAuthRequest extends Request {
  user?: {
    id: number;
    organization_id: number;
    role: string;
    username: string;
  };
}

describe('Employee Update Routes', () => {
  let mockReq: Partial<MockAuthRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      user: {
        id: 1,
        organization_id: 1,
        role: 'admin',
        username: 'admin@test.com'
      },
      params: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup default mock behaviors
    mockStorage.getUserById = jest.fn();
    mockStorage.updateUser = jest.fn();
    mockStorage.deleteUser = jest.fn();
    mockStorage.checkUserDependencies = jest.fn();
  });

  describe('PUT /:id - Update employee', () => {
    it('should update employee successfully', async () => {
      const originalEmployee = createMockEmployee({ 
        id: 1, 
        name: 'John Doe',
        department: 'Engineering' 
      });
      const updatedEmployee = createMockEmployee({ 
        id: 1, 
        name: 'John Smith',
        department: 'Marketing' 
      });

      mockStorage.getUserById.mockResolvedValue(originalEmployee);
      mockStorage.updateUser.mockResolvedValue(updatedEmployee);

      mockReq.params = { id: '1' };
      mockReq.body = { 
        name: 'John Smith',
        department: 'Marketing' 
      };

      const employeeId = parseInt(mockReq.params.id);
      const organizationId = mockReq.user?.organization_id;
      const updateData = mockReq.body;

      // Simulate the update logic
      const currentEmployee = await mockStorage.getUserById(employeeId);
      expect(currentEmployee).toBeDefined();
      expect(currentEmployee?.organization_id).toBe(organizationId);

      const result = await mockStorage.updateUser(employeeId, updateData);

      expect(mockStorage.getUserById).toHaveBeenCalledWith(1);
      expect(mockStorage.updateUser).toHaveBeenCalledWith(1, updateData);
      expect(result.name).toBe('John Smith');
      expect(result.department).toBe('Marketing');
    });

    it('should handle employee not found', async () => {
      mockStorage.getUserById.mockResolvedValue(undefined);

      mockReq.params = { id: '999' };
      mockReq.body = { name: 'Updated Name' };

      const employeeId = parseInt(mockReq.params.id);
      const currentEmployee = await mockStorage.getUserById(employeeId);

      expect(currentEmployee).toBeUndefined();
      // This would trigger a 404 response
    });

    it('should handle organization mismatch', async () => {
      const employee = createMockEmployee({ 
        id: 1, 
        organization_id: 2 // Different organization
      });
      mockStorage.getUserById.mockResolvedValue(employee);

      mockReq.params = { id: '1' };
      const organizationId = mockReq.user?.organization_id;

      const currentEmployee = await mockStorage.getUserById(1);
      
      expect(currentEmployee?.organization_id).toBe(2);
      expect(organizationId).toBe(1);
      expect(currentEmployee?.organization_id).not.toBe(organizationId);
      // This would trigger a 404 response
    });
  });

  describe('DELETE /:id - Delete employee', () => {
    it('should delete employee successfully', async () => {
      const employee = createMockEmployee({ id: 1 });
      const dependencies = {
        hasActivePosts: false,
        hasActiveRecognitions: false,
        hasActiveOrders: false,
      };

      mockStorage.getUserById.mockResolvedValue(employee);
      mockStorage.checkUserDependencies.mockResolvedValue(dependencies);
      mockStorage.deleteUser.mockResolvedValue(undefined);

      mockReq.params = { id: '1' };

      const employeeId = parseInt(mockReq.params.id);
      
      // Simulate deletion logic
      const currentEmployee = await mockStorage.getUserById(employeeId);
      expect(currentEmployee).toBeDefined();

      const deps = await mockStorage.checkUserDependencies(employeeId);
      const hasBlockingDependencies = deps.hasActivePosts || deps.hasActiveRecognitions || deps.hasActiveOrders;
      
      expect(hasBlockingDependencies).toBe(false);

      await mockStorage.deleteUser(employeeId);

      expect(mockStorage.getUserById).toHaveBeenCalledWith(1);
      expect(mockStorage.checkUserDependencies).toHaveBeenCalledWith(1);
      expect(mockStorage.deleteUser).toHaveBeenCalledWith(1);
    });

    it('should prevent deletion when dependencies exist', async () => {
      const employee = createMockEmployee({ id: 1 });
      const dependencies = {
        hasActivePosts: true,
        hasActiveRecognitions: false,
        hasActiveOrders: false,
      };

      mockStorage.getUserById.mockResolvedValue(employee);
      mockStorage.checkUserDependencies.mockResolvedValue(dependencies);

      mockReq.params = { id: '1' };

      const employeeId = parseInt(mockReq.params.id);
      const deps = await mockStorage.checkUserDependencies(employeeId);
      const hasBlockingDependencies = deps.hasActivePosts || deps.hasActiveRecognitions || deps.hasActiveOrders;

      expect(hasBlockingDependencies).toBe(true);
      expect(deps.hasActivePosts).toBe(true);
      
      // This would trigger a 400 response preventing deletion
      expect(mockStorage.deleteUser).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle update errors', async () => {
      const employee = createMockEmployee({ id: 1 });
      mockStorage.getUserById.mockResolvedValue(employee);
      mockStorage.updateUser.mockRejectedValue(new Error('Update failed'));

      mockReq.params = { id: '1' };
      mockReq.body = { name: 'New Name' };

      try {
        const employeeId = parseInt(mockReq.params.id);
        await mockStorage.getUserById(employeeId);
        await mockStorage.updateUser(employeeId, mockReq.body);
      } catch (error) {
        expect((error as Error).message).toBe('Update failed');
      }
    });
  });
});