// Adapter Layer Main Export
// Centralized exports for all adapters and factory

// Base adapter and types
export * from './base-adapter';

// Feature-specific adapters
export * from './employee-adapter';
export * from './recognition-adapter';
export * from './social-adapter';

// Adapter factory and management
export * from './adapter-factory';

// Re-export key instances for convenience
export { employeeAdapter } from './employee-adapter';
export { recognitionAdapter } from './recognition-adapter';  
export { socialAdapter } from './social-adapter';
export { adapterFactory } from './adapter-factory';

// Re-export convenience functions
export { 
  getEmployeeAdapter, 
  getRecognitionAdapter, 
  getSocialAdapter 
} from './adapter-factory';