// Employee Management Vertical Slice - Main Export
// Provides complete employee management functionality as a self-contained slice

// API Layer
export { default as employeeRoutes } from './api/employee.routes';
export { EmployeeController } from './api/employee.controller';

// Domain Layer  
export { EmployeeDomain } from './domain/employee.domain';
export type { 
  CreateEmployeeData, 
  UpdateEmployeeData, 
  EmployeeFilters 
} from './domain/employee.domain';

// Infrastructure Layer
export { EmployeeRepository } from './infrastructure/employee.repository';
export type { EmployeeDependencies } from './infrastructure/employee.repository';

// Re-export key functionality for easy integration
export { 
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeFiltersSchema
} from './domain/employee.domain';