import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { pool, db } from './db';
import * as schema from '@shared/schema';

// Mock the external dependencies
jest.mock('@neondatabase/serverless');
jest.mock('drizzle-orm/neon-serverless');
jest.mock('ws');

const MockedPool = Pool as jest.MockedClass<typeof Pool>;
const mockedDrizzle = drizzle as jest.MockedFunction<typeof drizzle>;

describe('Database Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Configuration', () => {
    it('should configure websocket constructor from ws library', () => {
      expect(neonConfig.webSocketConstructor).toBe(ws);
    });

    it('should throw error when DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;

      expect(() => {
        // Re-import to trigger the error
        jest.resetModules();
        require('./db');
      }).toThrow('DATABASE_URL must be set. Did you forget to provision a database?');
    });

    it('should not throw error when DATABASE_URL is set', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';

      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });

    it('should handle various DATABASE_URL formats', () => {
      const testUrls = [
        'postgresql://user:pass@localhost:5432/testdb',
        'postgres://user:pass@localhost:5432/testdb',
        'postgresql://user:pass@localhost/testdb',
        'postgres://user@localhost:5432/testdb',
        'postgresql://localhost:5432/testdb',
      ];

      testUrls.forEach(url => {
        process.env.DATABASE_URL = url;
        expect(() => {
          jest.resetModules();
          require('./db');
        }).not.toThrow();
      });
    });

    it('should handle DATABASE_URL with special characters in password', () => {
      process.env.DATABASE_URL = 'postgresql://user:p@ss!w0rd@localhost:5432/testdb';

      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });

    it('should handle DATABASE_URL with SSL parameters', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb?sslmode=require';

      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });

    it('should handle Neon serverless DATABASE_URL format', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@ep-cool-darkness-123456.us-east-1.aws.neon.tech/neondb?sslmode=require';

      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });
  });

  describe('Pool Configuration', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    });

    it('should initialize Pool with correct connection string', () => {
      jest.resetModules();
      require('./db');

      expect(MockedPool).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@localhost:5432/testdb'
      });
    });

    it('should create pool instance successfully', () => {
      const mockPoolInstance = {
        connect: jest.fn(),
        end: jest.fn(),
        query: jest.fn(),
      };

      MockedPool.mockImplementation(() => mockPoolInstance as any);

      jest.resetModules();
      const { pool } = require('./db');

      expect(pool).toBe(mockPoolInstance);
    });

    it('should handle pool creation errors', () => {
      MockedPool.mockImplementation(() => {
        throw new Error('Pool creation failed');
      });

      expect(() => {
        jest.resetModules();
        require('./db');
      }).toThrow('Pool creation failed');
    });

    it('should configure pool with environment-specific settings', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://user:pass@prod-db:5432/proddb';

      jest.resetModules();
      require('./db');

      expect(MockedPool).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@prod-db:5432/proddb'
      });
    });

    it('should handle development environment configuration', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/devdb';

      jest.resetModules();
      require('./db');

      expect(MockedPool).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@localhost:5432/devdb'
      });
    });

    it('should handle test environment configuration', () => {
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';

      jest.resetModules();
      require('./db');

      expect(MockedPool).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@localhost:5432/testdb'
      });
    });
  });

  describe('Drizzle Configuration', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    });

    it('should initialize drizzle with correct parameters', () => {
      const mockPoolInstance = { query: jest.fn() };
      const mockDbInstance = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() };

      MockedPool.mockImplementation(() => mockPoolInstance as any);
      mockedDrizzle.mockReturnValue(mockDbInstance as any);

      jest.resetModules();
      const { db } = require('./db');

      expect(mockedDrizzle).toHaveBeenCalledWith({
        client: mockPoolInstance,
        schema: schema
      });
      expect(db).toBe(mockDbInstance);
    });

    it('should include all schema tables in drizzle configuration', () => {
      const mockPoolInstance = { query: jest.fn() };
      MockedPool.mockImplementation(() => mockPoolInstance as any);

      jest.resetModules();
      require('./db');

      expect(mockedDrizzle).toHaveBeenCalledWith({
        client: expect.any(Object),
        schema: expect.objectContaining({
          users: expect.any(Object),
          organizations: expect.any(Object),
          // Should include all schema exports
        })
      });
    });

    it('should handle drizzle initialization errors', () => {
      const mockPoolInstance = { query: jest.fn() };
      MockedPool.mockImplementation(() => mockPoolInstance as any);
      mockedDrizzle.mockImplementation(() => {
        throw new Error('Drizzle initialization failed');
      });

      expect(() => {
        jest.resetModules();
        require('./db');
      }).toThrow('Drizzle initialization failed');
    });

    it('should configure drizzle with proper schema binding', () => {
      const mockPoolInstance = { query: jest.fn() };
      MockedPool.mockImplementation(() => mockPoolInstance as any);

      jest.resetModules();
      require('./db');

      const drizzleCall = mockedDrizzle.mock.calls[0][0];
      expect(drizzleCall).toHaveProperty('client', mockPoolInstance);
      expect(drizzleCall).toHaveProperty('schema');
      expect(drizzleCall.schema).toBe(schema);
    });
  });

  describe('Schema Integration', () => {
    it('should export all required schema components', () => {
      expect(schema).toHaveProperty('users');
      expect(schema).toHaveProperty('organizations');
      expect(schema).toHaveProperty('posts');
      expect(schema).toHaveProperty('comments');
      expect(schema).toHaveProperty('recognitions');
      expect(schema).toHaveProperty('leave_requests');
      expect(schema).toHaveProperty('points');
      expect(schema).toHaveProperty('channels');
      expect(schema).toHaveProperty('notifications');
    });

    it('should have proper schema table structure', () => {
      // Verify schema exports are properly structured
      expect(typeof schema.users).toBe('object');
      expect(typeof schema.organizations).toBe('object');
      expect(typeof schema.posts).toBe('object');
    });

    it('should include relations in schema', () => {
      // Verify that relations are included in the schema export
      expect(schema).toHaveProperty('usersRelations');
      expect(schema).toHaveProperty('organizationsRelations');
      expect(schema).toHaveProperty('postsRelations');
    });

    it('should have consistent schema export structure', () => {
      const schemaKeys = Object.keys(schema);
      
      // Should have table definitions
      expect(schemaKeys).toContain('users');
      expect(schemaKeys).toContain('organizations');
      
      // Should have relation definitions
      expect(schemaKeys.some(key => key.includes('Relations'))).toBe(true);
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    });

    it('should create single pool instance', () => {
      jest.resetModules();
      const db1 = require('./db');
      const db2 = require('./db');

      expect(db1.pool).toBe(db2.pool);
    });

    it('should create single drizzle instance', () => {
      jest.resetModules();
      const db1 = require('./db');
      const db2 = require('./db');

      expect(db1.db).toBe(db2.db);
    });

    it('should handle connection pool configuration for high concurrency', () => {
      // Test that pool can be configured for high concurrency scenarios
      const mockPoolInstance = {
        connect: jest.fn(),
        end: jest.fn(),
        query: jest.fn(),
        totalCount: 10,
        idleCount: 5,
        waitingCount: 0,
      };

      MockedPool.mockImplementation(() => mockPoolInstance as any);

      jest.resetModules();
      const { pool } = require('./db');

      expect(pool).toBe(mockPoolInstance);
    });

    it('should handle connection timeout scenarios', () => {
      const mockPoolInstance = {
        connect: jest.fn().mockRejectedValue(new Error('Connection timeout')),
        end: jest.fn(),
        query: jest.fn(),
      };

      MockedPool.mockImplementation(() => mockPoolInstance as any);

      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow(); // Pool creation itself shouldn't throw
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment variables gracefully', () => {
      delete process.env.DATABASE_URL;

      expect(() => {
        jest.resetModules();
        require('./db');
      }).toThrow('DATABASE_URL must be set. Did you forget to provision a database?');
    });

    it('should handle malformed DATABASE_URL', () => {
      process.env.DATABASE_URL = 'invalid-url';

      // Should not throw during module initialization
      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });

    it('should handle network connection errors', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@unreachable-host:5432/testdb';

      // Module should load successfully, errors will occur during actual queries
      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });

    it('should handle authentication errors', () => {
      process.env.DATABASE_URL = 'postgresql://invalid-user:wrong-pass@localhost:5432/testdb';

      // Module should load successfully, auth errors will occur during connection
      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });

    it('should handle database not found errors', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/nonexistent-db';

      // Module should load successfully, DB errors will occur during queries
      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });

    it('should handle SSL configuration errors', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb?sslmode=invalid';

      // Module should load successfully, SSL errors will occur during connection
      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });
  });

  describe('WebSocket Configuration', () => {
    it('should configure neonConfig with ws library', () => {
      expect(neonConfig.webSocketConstructor).toBe(ws);
    });

    it('should handle WebSocket connection for serverless functions', () => {
      // Test that WebSocket is properly configured for Neon serverless
      const mockWs = jest.fn();
      (ws as any) = mockWs;

      jest.resetModules();
      require('./db');

      expect(neonConfig.webSocketConstructor).toBeTruthy();
    });

    it('should maintain WebSocket configuration across module reloads', () => {
      const initialConfig = neonConfig.webSocketConstructor;

      jest.resetModules();
      require('./db');

      expect(neonConfig.webSocketConstructor).toBe(initialConfig);
    });
  });

  describe('Performance Considerations', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    });

    it('should handle multiple simultaneous database initializations', () => {
      const mockPoolInstance = { query: jest.fn() };
      MockedPool.mockImplementation(() => mockPoolInstance as any);

      // Simulate multiple require calls
      jest.resetModules();
      const db1 = require('./db');
      const db2 = require('./db');
      const db3 = require('./db');

      // Should use the same pool instance
      expect(db1.pool).toBe(db2.pool);
      expect(db2.pool).toBe(db3.pool);
      expect(MockedPool).toHaveBeenCalledTimes(1);
    });

    it('should handle database configuration for different load scenarios', () => {
      // Test different database URLs that might indicate different load scenarios
      const loadScenarios = [
        'postgresql://user:pass@localhost:5432/light-load-db',
        'postgresql://user:pass@localhost:5432/heavy-load-db',
        'postgresql://user:pass@localhost:5432/batch-processing-db',
      ];

      loadScenarios.forEach(url => {
        process.env.DATABASE_URL = url;
        jest.resetModules();
        
        expect(() => {
          require('./db');
        }).not.toThrow();
      });
    });

    it('should optimize for serverless cold starts', () => {
      // Test that module loading is optimized for serverless environments
      const startTime = process.hrtime();
      
      jest.resetModules();
      require('./db');
      
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      
      // Should load quickly (arbitrary threshold for test)
      expect(milliseconds).toBeLessThan(1000);
    });
  });

  describe('Type Safety Integration', () => {
    it('should export pool with correct typing', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      
      jest.resetModules();
      const { pool } = require('./db');

      // Pool should be defined
      expect(pool).toBeDefined();
    });

    it('should export db with correct typing', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      
      jest.resetModules();
      const { db } = require('./db');

      // Database instance should be defined
      expect(db).toBeDefined();
    });

    it('should maintain schema type information in drizzle instance', () => {
      const mockPoolInstance = { query: jest.fn() };
      const mockDbInstance = { 
        select: jest.fn(), 
        insert: jest.fn(), 
        update: jest.fn(), 
        delete: jest.fn(),
        schema: schema 
      };

      MockedPool.mockImplementation(() => mockPoolInstance as any);
      mockedDrizzle.mockReturnValue(mockDbInstance as any);

      jest.resetModules();
      const { db } = require('./db');

      expect(db.schema).toBe(schema);
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should work in development environment', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://dev:dev@localhost:5432/devdb';

      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });

    it('should work in test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });

    it('should work in production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://prod:prod@prod-host:5432/proddb';

      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });

    it('should handle staging environment', () => {
      process.env.NODE_ENV = 'staging';
      process.env.DATABASE_URL = 'postgresql://staging:staging@staging-host:5432/stagingdb';

      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });
  });

  describe('Security Considerations', () => {
    it('should not expose database credentials in error messages', () => {
      delete process.env.DATABASE_URL;

      let errorMessage = '';
      try {
        jest.resetModules();
        require('./db');
      } catch (error) {
        errorMessage = (error as Error).message;
      }

      // Error message should not contain sensitive information
      expect(errorMessage).not.toContain('password');
      expect(errorMessage).not.toContain('user');
      expect(errorMessage).not.toContain('host');
    });

    it('should handle secure connection strings', () => {
      process.env.DATABASE_URL = 'postgresql://user:securepass123@secure-host.com:5432/securedb?sslmode=require';

      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();
    });

    it('should not log sensitive connection information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      process.env.DATABASE_URL = 'postgresql://user:password@host:5432/db';

      jest.resetModules();
      require('./db');

      // Should not log connection string or credentials
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('password')
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('password')
      );

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Module Exports', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    });

    it('should export pool and db objects', () => {
      jest.resetModules();
      const dbModule = require('./db');

      expect(dbModule).toHaveProperty('pool');
      expect(dbModule).toHaveProperty('db');
    });

    it('should export valid pool instance', () => {
      const mockPoolInstance = { 
        connect: jest.fn(), 
        end: jest.fn(), 
        query: jest.fn() 
      };
      MockedPool.mockImplementation(() => mockPoolInstance as any);

      jest.resetModules();
      const { pool } = require('./db');

      expect(pool).toBe(mockPoolInstance);
      expect(typeof pool.connect).toBe('function');
      expect(typeof pool.end).toBe('function');
      expect(typeof pool.query).toBe('function');
    });

    it('should export valid drizzle instance', () => {
      const mockDbInstance = { 
        select: jest.fn(), 
        insert: jest.fn(), 
        update: jest.fn(), 
        delete: jest.fn() 
      };
      mockedDrizzle.mockReturnValue(mockDbInstance as any);

      jest.resetModules();
      const { db } = require('./db');

      expect(db).toBe(mockDbInstance);
      expect(typeof db.select).toBe('function');
      expect(typeof db.insert).toBe('function');
      expect(typeof db.update).toBe('function');
      expect(typeof db.delete).toBe('function');
    });

    it('should maintain consistent export structure', () => {
      jest.resetModules();
      const dbModule = require('./db');
      const exportKeys = Object.keys(dbModule);

      expect(exportKeys).toContain('pool');
      expect(exportKeys).toContain('db');
      expect(exportKeys).toHaveLength(2);
    });
  });
});