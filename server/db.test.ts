import { db, pool } from './db';
import { Pool } from '@neondatabase/serverless';

// Mock the neon serverless module
jest.mock('@neondatabase/serverless', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  })),
  neonConfig: {
    webSocketConstructor: null,
  },
}));

jest.mock('ws');

describe('Database Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error if DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL;
    
    jest.isolateModules(() => {
      expect(() => {
        require('./db');
      }).toThrow('DATABASE_URL must be set');
    });
  });

  it('should create pool with DATABASE_URL', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb';
    
    jest.isolateModules(() => {
      require('./db');
      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://test:test@localhost/testdb',
      });
    });
  });

  it('should export db and pool objects', () => {
    expect(db).toBeDefined();
    expect(pool).toBeDefined();
  });
});