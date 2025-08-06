import { storage } from '../storage';
import { User } from '@shared/schema';

// Test data utilities for employee management
export const createMockEmployee = (overrides: Partial<User> = {}): User => ({
  id: 1,
  username: 'john.doe',
  password: 'hashedpassword',
  name: 'John Doe',
  surname: 'Doe',
  email: 'john.doe@company.com',
  phone_number: '+1234567890',
  job_title: 'Senior Developer',
  department: 'Engineering',
  location: 'New York',
  birth_date: '1990-01-15',
  responsibilities: 'Lead development team',
  status: 'active',
  is_admin: false,
  avatar_url: null,
  balance: 1000,
  organization_id: 1,
  role: 'employee',
  created_at: new Date('2023-01-01'),
  updated_at: new Date('2023-01-01'),
  created_by: null,
  ...overrides,
});

export const createMockEmployees = (count: number = 3): User[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockEmployee({
      id: index + 1,
      name: `Employee ${index + 1}`,
      email: `employee${index + 1}@company.com`,
      username: `employee${index + 1}`,
    })
  );
};

export const mockStorageImplementation = {
  getEmployeesWithFilters: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  searchEmployees: jest.fn(),
  checkUserDependencies: jest.fn(),
  createUser: jest.fn(),
  getUserByUsername: jest.fn(),
  getUser: jest.fn(),
  getUserWithBalance: jest.fn(),
  getAllUsersWithBalance: jest.fn(),
  verifyPassword: jest.fn(),
  getUserCount: jest.fn(),
  getUsersByOrganization: jest.fn(),
};

export const setupMockStorage = () => {
  // Reset all mocks
  Object.values(mockStorageImplementation).forEach(mock => mock.mockReset());
  
  // Setup default behaviors
  mockStorageImplementation.getEmployeesWithFilters.mockResolvedValue(createMockEmployees());
  mockStorageImplementation.getUserById.mockResolvedValue(createMockEmployee());
  mockStorageImplementation.updateUser.mockResolvedValue(createMockEmployee({ name: 'Updated Employee' }));
  mockStorageImplementation.deleteUser.mockResolvedValue(undefined);
  mockStorageImplementation.searchEmployees.mockResolvedValue(createMockEmployees(2));
  mockStorageImplementation.checkUserDependencies.mockResolvedValue({
    hasActivePosts: false,
    hasActiveRecognitions: false,
    hasActiveOrders: false,
  });
  
  return mockStorageImplementation;
};