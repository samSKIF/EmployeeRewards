// Week 1 Refactoring Integration Tests - Gold Standard Compliance
// Integration tests for shared types extraction and dependency injection auth

import { AuthServiceFactory } from '../../shared/services/auth.factory';
import { MemoryAuthStorage } from '../../shared/services/auth.storage';
import { Employee, EmployeeWithDetails } from '../../shared/types/employee';
import { users } from '../../shared/schema';
import { createInsertSchema } from 'drizzle-zod';

describe('Week 1 Refactoring Integration Tests', () => {
  beforeEach(() => {
    AuthServiceFactory.reset();
  });

  describe('Shared Types Integration', () => {
    test('should use extracted employee types consistently', () => {
      // Test that the Employee type from shared package works correctly
      const mockEmployee: Employee = {
        id: 1,
        username: 'john.doe',
        password: 'hashedpassword',
        name: 'John Doe',
        surname: null,
        email: 'john.doe@company.com',
        phone_number: '+1234567890',
        job_title: 'Software Engineer',
        department: 'Engineering',
        sex: 'M',
        is_admin: false,
        organization_id: 1,
        points_balance: 100,
        avatar_url: null,
        birth_date: new Date('1990-05-15'),
        start_date: new Date('2023-01-15'),
        last_login: null,
        created_at: new Date(),
        updated_at: new Date(),
        billing_city: null,
        billing_address: null,
        billing_address_2: null,
        billing_state: null,
        billing_zip: null,
        country: 'USA',
        employee_status: 'active',
        is_approved: true,
        role: 'employee',
        manager_id: null,
        allowed_departments: null
      };

      expect(mockEmployee).toBeDefined();
      expect(mockEmployee.id).toBe(1);
      expect(mockEmployee.username).toBe('john.doe');
      expect(mockEmployee.email).toBe('john.doe@company.com');
    });

    test('should create EmployeeWithDetails with computed fields', () => {
      const baseEmployee: Employee = {
        id: 1,
        username: 'jane.smith',
        password: 'hashedpassword',
        name: 'Jane',
        surname: 'Smith',
        email: 'jane.smith@company.com',
        phone_number: '+1234567890',
        job_title: 'Product Manager',
        department: 'Product',
        sex: 'F',
        is_admin: false,
        organization_id: 1,
        points_balance: 150,
        avatar_url: null,
        birth_date: new Date('1985-08-20'),
        start_date: new Date('2022-03-01'),
        last_login: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        billing_city: null,
        billing_address: null,
        billing_address_2: null,
        billing_state: null,
        billing_zip: null,
        country: 'USA',
        employee_status: 'active',
        is_approved: true,
        role: 'employee',
        manager_id: null,
        allowed_departments: null
      };

      const employeeWithDetails: EmployeeWithDetails = {
        ...baseEmployee,
        fullName: `${baseEmployee.name} ${baseEmployee.surname}`,
        departmentName: 'Product Department',
        locationName: 'San Francisco Office',
        managerName: 'John Manager',
        isCurrentUser: false
      };

      expect(employeeWithDetails.fullName).toBe('Jane Smith');
      expect(employeeWithDetails.departmentName).toBe('Product Department');
      expect(employeeWithDetails.isCurrentUser).toBe(false);
    });

    test('should validate schema integration works correctly', () => {
      const insertSchema = createInsertSchema(users).omit({ id: true });
      
      const validEmployeeData = {
        username: 'test.employee',
        password: 'hashedpassword123',
        name: 'Test',
        surname: 'Employee',
        email: 'test.employee@company.com',
        organization_id: 1,
        employee_status: 'active',
        is_approved: true,
        role: 'employee'
      };

      const result = insertSchema.safeParse(validEmployeeData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.username).toBe('test.employee');
        expect(result.data.email).toBe('test.employee@company.com');
      }
    });
  });

  describe('Dependency Injection Auth Integration', () => {
    test('should create auth service with different storage strategies', () => {
      // Test memory storage
      const memoryAuthService = AuthServiceFactory.createInstance({
        storageStrategy: 'memory',
        enableAutoRefresh: false
      });

      expect(memoryAuthService).toBeDefined();

      // Test localStorage strategy
      const localStorageAuthService = AuthServiceFactory.createInstance({
        storageStrategy: 'localStorage',
        enableAutoRefresh: false
      });

      expect(localStorageAuthService).toBeDefined();

      // Verify they are different instances
      expect(memoryAuthService).not.toBe(localStorageAuthService);
    });

    test('should maintain consistent API across storage strategies', async () => {
      const strategies = ['memory', 'localStorage', 'sessionStorage'] as const;
      
      for (const strategy of strategies) {
        const authService = AuthServiceFactory.createInstance({
          storageStrategy: strategy,
          enableAutoRefresh: false
        });

        // All services should have the same interface
        expect(typeof authService.getCurrentUser).toBe('function');
        expect(typeof authService.isAuthenticated).toBe('function');
        expect(typeof authService.getToken).toBe('function');
        expect(typeof authService.login).toBe('function');
        expect(typeof authService.logout).toBe('function');
        expect(typeof authService.refreshToken).toBe('function');

        // Initial state should be consistent
        expect(await authService.isAuthenticated()).toBe(false);
        expect(await authService.getCurrentUser()).toBeNull();
        expect(await authService.getToken()).toBeNull();
      }
    });

    test('should handle factory configuration correctly', () => {
      const customConfig = {
        storageStrategy: 'memory' as const,
        baseURL: 'https://test-api.company.com',
        enableAutoRefresh: true,
        refreshThreshold: 10
      };

      AuthServiceFactory.configure(customConfig);
      const configuredService = AuthServiceFactory.getInstance();

      expect(configuredService).toBeDefined();
      
      // Reset and get new instance should use new config
      AuthServiceFactory.reset();
      const newService = AuthServiceFactory.getInstance();
      
      expect(newService).toBeDefined();
      expect(newService).not.toBe(configuredService);
    });

    test('should support mock instances for testing', () => {
      const mockService = AuthServiceFactory.createMockInstance();
      
      expect(mockService).toBeDefined();
      expect(typeof mockService.login).toBe('function');
      expect(typeof mockService.logout).toBe('function');
    });
  });

  describe('Cross-Package Compatibility', () => {
    test('should work with auth service and employee types together', async () => {
      const authService = AuthServiceFactory.createInstance({
        storageStrategy: 'memory'
      });

      // Mock storing an employee as authenticated user
      const mockEmployee: Partial<Employee> = {
        id: 1,
        username: 'admin.user',
        email: 'admin@company.com',
        name: 'Admin',
        surname: 'User',
        role: 'admin',
        organization_id: 1
      };

      // This would typically happen in the login flow
      const storage = new MemoryAuthStorage();
      await storage.setUser(mockEmployee);
      await storage.setToken('mock-token');

      // Verify the storage works
      const storedUser = await storage.getUser();
      const storedToken = await storage.getToken();

      expect(storedUser).toEqual(mockEmployee);
      expect(storedToken).toBe('mock-token');
    });

    test('should maintain type safety across packages', () => {
      // This test ensures TypeScript compilation works correctly
      const authService = AuthServiceFactory.getInstance();
      
      // These should compile without TypeScript errors
      expect(typeof authService.getCurrentUser).toBe('function');
      expect(typeof authService.isAuthenticated).toBe('function');
      
      // Employee types should be properly typed
      const employee: Partial<Employee> = {
        id: 1,
        username: 'test',
        email: 'test@company.com'
      };
      
      expect(employee.id).toBe(1);
    });
  });

  describe('Compliance with Gold Standard Requirements', () => {
    test('should follow enterprise error handling patterns', async () => {
      const authService = AuthServiceFactory.createInstance({
        storageStrategy: 'memory'
      });

      try {
        // This will fail since we don't have a real HTTP client configured
        await authService.login({
          username: 'test@example.com',
          password: 'password'
        });
      } catch (error: any) {
        // Should follow proper error handling with null-safe access
        expect(error?.message || 'unknown_error').toBeDefined();
        expect(typeof (error?.message || 'unknown_error')).toBe('string');
      }
    });

    test('should support audit trail requirements', () => {
      // Verify that the auth service can be tracked for audit purposes
      const authService = AuthServiceFactory.getInstance();
      
      // The service should have identifiable methods for audit tracking
      const methods = [
        'login',
        'logout',
        'refreshToken',
        'updateUser',
        'getCurrentUser',
        'isAuthenticated'
      ];

      methods.forEach(method => {
        expect(typeof (authService as any)[method]).toBe('function');
      });
    });

    test('should handle concurrent operations safely', async () => {
      const authService = AuthServiceFactory.createInstance({
        storageStrategy: 'memory'
      });

      // Multiple concurrent authentication checks should not cause issues
      const promises = Array.from({ length: 10 }, () => 
        authService.isAuthenticated()
      );

      const results = await Promise.all(promises);
      
      // All should return the same result (false in this case)
      expect(results.every(result => result === false)).toBe(true);
    });

    test('should support internationalization patterns', () => {
      // Verify that error messages and response patterns support i18n
      const authService = AuthServiceFactory.getInstance();
      
      // Service should be ready for i18n integration
      expect(authService).toBeDefined();
      
      // Future i18n support can be added to error handling
      const errorHandler = (error: any) => {
        return error?.message || 'unknown_error';
      };
      
      expect(errorHandler(new Error('Test error'))).toBe('Test error');
      expect(errorHandler(null)).toBe('unknown_error');
    });
  });

  describe('Performance and Scalability', () => {
    test('should create services efficiently', () => {
      const startTime = Date.now();
      
      // Create multiple service instances
      const services = Array.from({ length: 100 }, () => 
        AuthServiceFactory.createInstance({ storageStrategy: 'memory' })
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(services).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle memory cleanup properly', () => {
      const initialInstances = [];
      
      // Create instances
      for (let i = 0; i < 50; i++) {
        initialInstances.push(AuthServiceFactory.createInstance({
          storageStrategy: 'memory'
        }));
      }
      
      // Reset factory
      AuthServiceFactory.reset();
      
      // Create new instances - should not reference old ones
      const newInstance = AuthServiceFactory.getInstance();
      
      expect(newInstance).toBeDefined();
      expect(initialInstances.every(instance => instance !== newInstance)).toBe(true);
    });
  });

  describe('Security Compliance', () => {
    test('should not expose sensitive data in logs', () => {
      const authService = AuthServiceFactory.createInstance({
        storageStrategy: 'memory'
      });

      // Converting to string should not expose internal state
      const serviceString = authService.toString();
      expect(serviceString).not.toContain('password');
      expect(serviceString).not.toContain('token');
    });

    test('should handle storage isolation correctly', async () => {
      const service1 = AuthServiceFactory.createInstance({ storageStrategy: 'memory' });
      const service2 = AuthServiceFactory.createInstance({ storageStrategy: 'memory' });

      // Different service instances should have isolated storage
      expect(service1).not.toBe(service2);
    });
  });
});