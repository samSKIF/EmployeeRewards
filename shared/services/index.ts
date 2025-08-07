// Services Package - Dependency Injection Services
// Exported services for use across the application

export * from './auth.interface';
export * from './auth.service';
export * from './auth.storage';
export * from './auth.http';
export * from './auth.factory';

// Service registry for dependency injection container
export interface ServiceRegistry {
  authService: any; // Will be properly typed when imported
}
