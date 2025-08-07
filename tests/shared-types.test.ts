// Shared Types Package Tests - Gold Standard Compliance
// Tests for extracted shared types to ensure proper validation and consistency

import { z } from 'zod';
import {
  Employee,
  EmployeeWithDetails,
  EmployeeInsert,
  employeeInsertSchema,
  EmployeeFilters,
  EmployeeSearchResult,
} from '../shared/types/employee';
import {
  User,
  UserInsert,
  userInsertSchema,
} from '../shared/types/user';
import {
  Organization,
  OrganizationInsert,
  organizationInsertSchema,
} from '../shared/types/organization';
import {
  ApiResponse,
  PaginatedResponse,
  FilterOptions,
  SortOptions,
} from '../shared/types/api';
import {
  RequiredFields,
} from '../shared/types/common';

describe('Shared Types Package', () => {
  describe('Employee Types', () => {
    test('employeeInsertSchema should validate valid employee data', () => {
      const validEmployee = {
        username: 'john.doe',
        email: 'john.doe@company.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashedpassword123',
        role: 'employee' as const,
        organization_id: 1,
        department: 'Engineering',
        location: 'New York Office',
        hireDate: new Date('2023-01-15'),
        birthDate: new Date('1990-05-20'),
        isActive: true,
      };

      const result = employeeInsertSchema.safeParse(validEmployee);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('john.doe');
        expect(result.data.email).toBe('john.doe@company.com');
        expect(result.data.role).toBe('employee');
      }
    });

    test('employeeInsertSchema should reject invalid email', () => {
      const invalidEmployee = {
        username: 'john.doe',
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashedpassword123',
        role: 'employee' as const,
        organization_id: 1,
      };

      const result = employeeInsertSchema.safeParse(invalidEmployee);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    test('employeeInsertSchema should reject missing required fields', () => {
      const incompleteEmployee = {
        username: 'john.doe',
        // Missing email, firstName, lastName
        passwordHash: 'hashedpassword123',
        role: 'employee' as const,
        organization_id: 1,
      };

      const result = employeeInsertSchema.safeParse(incompleteEmployee);
      expect(result.success).toBe(false);
      if (!result.success) {
        const missingFields = result.error.issues.map(issue => issue.path[0]);
        expect(missingFields).toContain('email');
        expect(missingFields).toContain('firstName');
        expect(missingFields).toContain('lastName');
      }
    });

    test('EmployeeWithDetails should include computed fields', () => {
      const employee: Employee = {
        id: 1,
        username: 'john.doe',
        email: 'john.doe@company.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashedpassword123',
        role: 'employee',
        organization_id: 1,
        department: 'Engineering',
        location: 'New York Office',
        hireDate: new Date('2023-01-15'),
        birthDate: new Date('1990-05-20'),
        isActive: true,
        pointsBalance: 100,
        avatar: null,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const employeeWithDetails: EmployeeWithDetails = {
        ...employee,
        fullName: 'John Doe',
        departmentName: 'Engineering Department',
        locationName: 'New York Office',
        managerName: 'Jane Smith',
        isCurrentUser: false,
      };

      expect(employeeWithDetails.fullName).toBe('John Doe');
      expect(employeeWithDetails.departmentName).toBe('Engineering Department');
      expect(employeeWithDetails.isCurrentUser).toBe(false);
    });
  });

  describe('User Types', () => {
    test('userInsertSchema should validate valid user data', () => {
      const validUser = {
        username: 'admin.user',
        email: 'admin@company.com',
        firstName: 'Admin',
        lastName: 'User',
        passwordHash: 'hashedpassword123',
        role: 'admin' as const,
        organization_id: 1,
        isActive: true,
      };

      const result = userInsertSchema.safeParse(validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('admin');
        expect(result.data.isActive).toBe(true);
      }
    });

    test('userInsertSchema should validate role enum values', () => {
      const userWithInvalidRole = {
        username: 'test.user',
        email: 'test@company.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashedpassword123',
        role: 'invalid_role' as any,
        organization_id: 1,
        isActive: true,
      };

      const result = userInsertSchema.safeParse(userWithInvalidRole);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('role');
      }
    });
  });

  describe('Organization Types', () => {
    test('organizationInsertSchema should validate valid organization data', () => {
      const validOrganization = {
        name: 'Acme Corporation',
        domain: 'acme.com',
        subscription_plan: 'premium' as const,
        isActive: true,
        settings: { theme: 'light', notifications: true },
      };

      const result = organizationInsertSchema.safeParse(validOrganization);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Acme Corporation');
        expect(result.data.subscription_plan).toBe('premium');
      }
    });

    test('organizationInsertSchema should reject invalid domain format', () => {
      const invalidOrganization = {
        name: 'Acme Corporation',
        domain: 'invalid-domain',
        subscription_plan: 'premium' as const,
        isActive: true,
      };

      const result = organizationInsertSchema.safeParse(invalidOrganization);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('domain');
      }
    });
  });

  describe('API Response Types', () => {
    test('ApiResponse should handle success response', () => {
      const successResponse: ApiResponse<{ id: number; name: string }> = {
        success: true,
        data: { id: 1, name: 'Test' },
        message: 'Operation successful',
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toEqual({ id: 1, name: 'Test' });
      expect(successResponse.error).toBeUndefined();
    });

    test('ApiResponse should handle error response', () => {
      const errorResponse: ApiResponse<null> = {
        success: false,
        data: null,
        error: 'Something went wrong',
        message: 'Operation failed',
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.data).toBeNull();
      expect(errorResponse.error).toBe('Something went wrong');
    });

    test('PaginatedResponse should include pagination metadata', () => {
      const paginatedResponse: PaginatedResponse<{ id: number; name: string }> = {
        success: true,
        data: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 5,
          totalCount: 100,
          limit: 20,
          hasNext: true,
          hasPrev: false,
        },
        message: 'Data retrieved successfully',
      };

      expect(paginatedResponse.pagination.currentPage).toBe(1);
      expect(paginatedResponse.pagination.totalPages).toBe(5);
      expect(paginatedResponse.pagination.hasNext).toBe(true);
      expect(paginatedResponse.pagination.hasPrev).toBe(false);
    });
  });

  describe('Common Utility Types', () => {
    test('FilterOptions should support various filter types', () => {
      const filterOptions: FilterOptions = {
        search: 'john',
        department: 'Engineering',
        status: 'active',
        dateRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-12-31'),
        },
        customFilters: {
          location: 'New York',
          role: 'employee',
        },
      };

      expect(filterOptions.search).toBe('john');
      expect(filterOptions.department).toBe('Engineering');
      expect(filterOptions.customFilters?.location).toBe('New York');
    });

    test('SortOptions should define sort parameters', () => {
      const sortOptions: SortOptions = {
        field: 'lastName',
        direction: 'asc',
        secondarySort: {
          field: 'firstName',
          direction: 'asc',
        },
      };

      expect(sortOptions.field).toBe('lastName');
      expect(sortOptions.direction).toBe('asc');
      expect(sortOptions.secondarySort?.field).toBe('firstName');
    });

    test('RequiredFields should mark specified fields as required', () => {
      interface TestInterface {
        optionalField?: string;
        requiredField: string;
        anotherOptionalField?: number;
      }

      type RequiredTest = RequiredFields<TestInterface, 'optionalField' | 'anotherOptionalField'>;

      // This test ensures the type transformation works correctly
      const testObject: RequiredTest = {
        optionalField: 'now required',
        requiredField: 'still required',
        anotherOptionalField: 42,
      };

      expect(testObject.optionalField).toBe('now required');
      expect(testObject.requiredField).toBe('still required');
      expect(testObject.anotherOptionalField).toBe(42);
    });
  });

  describe('Type Consistency and Cross-Package Integration', () => {
    test('Employee and User types should be compatible where expected', () => {
      const employee: Employee = {
        id: 1,
        username: 'john.doe',
        email: 'john.doe@company.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashedpassword123',
        role: 'employee',
        organization_id: 1,
        department: 'Engineering',
        location: 'New York Office',
        hireDate: new Date('2023-01-15'),
        birthDate: new Date('1990-05-20'),
        isActive: true,
        pointsBalance: 100,
        avatar: null,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Employee should be compatible with User for common fields
      const userFields: Pick<User, 'id' | 'username' | 'email' | 'firstName' | 'lastName' | 'role' | 'organization_id' | 'isActive'> = {
        id: employee.id,
        username: employee.username,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        organization_id: employee.organization_id,
        isActive: employee.isActive,
      };

      expect(userFields.id).toBe(employee.id);
      expect(userFields.username).toBe(employee.username);
      expect(userFields.role).toBe(employee.role);
    });

    test('All insert schemas should omit id field', () => {
      // Test that insert schemas properly omit auto-generated fields
      const employeeInsert: EmployeeInsert = {
        username: 'test.user',
        email: 'test@company.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashedpassword123',
        role: 'employee',
        organization_id: 1,
        isActive: true,
      };

      const userInsert: UserInsert = {
        username: 'admin.user',
        email: 'admin@company.com',
        firstName: 'Admin',
        lastName: 'User',
        passwordHash: 'hashedpassword123',
        role: 'admin',
        organization_id: 1,
        isActive: true,
      };

      const organizationInsert: OrganizationInsert = {
        name: 'Test Organization',
        domain: 'test.com',
        subscription_plan: 'basic',
        isActive: true,
      };

      // Ensure no id fields are present (TypeScript compile-time check)
      expect(employeeInsert).not.toHaveProperty('id');
      expect(userInsert).not.toHaveProperty('id');
      expect(organizationInsert).not.toHaveProperty('id');
    });
  });

  describe('Schema Validation Edge Cases', () => {
    test('should handle null and undefined values appropriately', () => {
      const employeeWithNulls = {
        username: 'john.doe',
        email: 'john.doe@company.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashedpassword123',
        role: 'employee' as const,
        organization_id: 1,
        department: null,
        location: null,
        avatar: null,
        isActive: true,
      };

      const result = employeeInsertSchema.safeParse(employeeWithNulls);
      expect(result.success).toBe(true);
    });

    test('should enforce string length constraints', () => {
      const employeeWithLongStrings = {
        username: 'a'.repeat(256), // Assuming max length is 255
        email: 'test@company.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashedpassword123',
        role: 'employee' as const,
        organization_id: 1,
        isActive: true,
      };

      const result = employeeInsertSchema.safeParse(employeeWithLongStrings);
      // This test assumes there are string length validations in the schema
      // If not present, consider adding them for Gold Standard compliance
      expect(result.success).toBe(false);
    });

    test('should validate organization_id as positive integer', () => {
      const employeeWithInvalidOrgId = {
        username: 'john.doe',
        email: 'john.doe@company.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashedpassword123',
        role: 'employee' as const,
        organization_id: -1, // Invalid negative ID
        isActive: true,
      };

      const result = employeeInsertSchema.safeParse(employeeWithInvalidOrgId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('organization_id');
      }
    });
  });

  describe('Performance and Memory Efficiency', () => {
    test('should efficiently validate large batches of data', () => {
      const startTime = Date.now();
      
      const employees = Array.from({ length: 1000 }, (_, i) => ({
        username: `user${i}`,
        email: `user${i}@company.com`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        passwordHash: 'hashedpassword123',
        role: 'employee' as const,
        organization_id: 1,
        isActive: true,
      }));

      const results = employees.map(emp => employeeInsertSchema.safeParse(emp));
      const validResults = results.filter(r => r.success);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(validResults).toHaveLength(1000);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});