import express from 'express';
import cors from 'cors';

// Mock authentication middleware that bypasses JWT verification for tests
export const createMockAuthMiddleware = (userOverrides = {}) => {
  return (req: any, res: any, next: any) => {
    req.user = {
      id: 1,
      organization_id: 1,
      role: 'admin',
      username: 'admin@test.com',
      ...userOverrides
    };
    next();
  };
};

// Mock admin verification middleware
export const createMockAdminMiddleware = () => {
  return (req: any, res: any, next: any) => {
    next();
  };
};

// Create test Express app with proper middleware setup
export const createTestExpressApp = (routes: express.Router) => {
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  app.use(cors());
  
  // Mock authentication
  app.use(createMockAuthMiddleware());
  
  // Mount routes
  app.use('/api/admin/employees', routes);
  app.use('/api/users', routes);
  
  return app;
};