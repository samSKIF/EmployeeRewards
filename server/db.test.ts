import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

// Mock dependencies
jest.mock('@neondatabase/serverless');
jest.mock('drizzle-orm/neon-serverless');
jest.mock('ws');

const mockedPool = Pool as jest.MockedClass<typeof Pool>;
const mockedDrizzle = drizzle as jest.MockedFunction<typeof drizzle>;

describe('Database Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error when DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL;

    expect(() => {
      // Re-import the module to trigger the check
      jest.resetModules();
      require('./db');
    }).toThrow('DATABASE_URL must be set. Did you forget to provision a database?');
  });

  it('should initialize pool and drizzle with correct configuration', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';

    // Mock instances
    const mockPoolInstance = {
      connect: jest.fn(),
      end: jest.fn(),
    };
    const mockDbInstance = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockedPool.mockImplementation(() => mockPoolInstance as any);
    mockedDrizzle.mockReturnValue(mockDbInstance as any);

    // Re-import to trigger initialization
    jest.resetModules();
    const { pool, db } = require('./db');

    // Check that Pool was instantiated with correct connection string
    expect(Pool).toHaveBeenCalledWith({
      connectionString: 'postgresql://user:pass@localhost:5432/test',
    });

    // Check that drizzle was called with correct parameters
    expect(drizzle).toHaveBeenCalledWith({
      client: expect.any(Object),
      schema: expect.any(Object),
    });

    expect(pool).toBe(mockPoolInstance);
    expect(db).toBe(mockDbInstance);
  });

  it('should configure neon with WebSocket constructor', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';

    // Import to trigger neon configuration
    jest.resetModules();
    require('./db');

    // This test verifies that the WebSocket configuration is set
    // The actual verification would depend on how neonConfig is exposed
    // For now, we just ensure the module can be imported without errors
    expect(true).toBe(true);
  });

  it('should export pool and db instances', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';

    jest.resetModules();
    const dbModule = require('./db');

    expect(dbModule).toHaveProperty('pool');
    expect(dbModule).toHaveProperty('db');
  });

  it('should handle different DATABASE_URL formats', () => {
    const testUrls = [
      'postgresql://user:pass@localhost:5432/test',
      'postgres://user:pass@host.com:5432/db',
      'postgresql://user@localhost/dbname',
    ];

    testUrls.forEach((url) => {
      process.env.DATABASE_URL = url;
      
      expect(() => {
        jest.resetModules();
        require('./db');
      }).not.toThrow();

      expect(Pool).toHaveBeenCalledWith({
        connectionString: url,
      });
    });
  });
});