import { getTenantDb, clearTenantDbPool } from './tenant-db';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

jest.mock('@neondatabase/serverless');
jest.mock('drizzle-orm/neon-serverless');

describe('Tenant Database Management', () => {
  const mockPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  
  const mockDb = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    clearTenantDbPool();
    
    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool as any);
    (drizzle as jest.Mock).mockReturnValue(mockDb);
  });

  describe('getTenantDb', () => {
    it('should create new connection for first tenant', () => {
      const tenantId = 'tenant1';
      const dbUrl = 'postgresql://test@localhost/tenant1';
      
      const db = getTenantDb(tenantId, dbUrl);
      
      expect(Pool).toHaveBeenCalledWith({ connectionString: dbUrl });
      expect(drizzle).toHaveBeenCalledWith({ client: mockPool });
      expect(db).toBe(mockDb);
    });

    it('should reuse existing connection for same tenant', () => {
      const tenantId = 'tenant1';
      const dbUrl = 'postgresql://test@localhost/tenant1';
      
      const db1 = getTenantDb(tenantId, dbUrl);
      const db2 = getTenantDb(tenantId, dbUrl);
      
      expect(Pool).toHaveBeenCalledTimes(1);
      expect(db1).toBe(db2);
    });

    it('should create separate connections for different tenants', () => {
      const tenant1 = { id: 'tenant1', url: 'postgresql://test@localhost/tenant1' };
      const tenant2 = { id: 'tenant2', url: 'postgresql://test@localhost/tenant2' };
      
      const db1 = getTenantDb(tenant1.id, tenant1.url);
      const db2 = getTenantDb(tenant2.id, tenant2.url);
      
      expect(Pool).toHaveBeenCalledTimes(2);
      expect(Pool).toHaveBeenCalledWith({ connectionString: tenant1.url });
      expect(Pool).toHaveBeenCalledWith({ connectionString: tenant2.url });
    });

    it('should handle connection errors', () => {
      (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => {
        throw new Error('Connection failed');
      });
      
      expect(() => getTenantDb('tenant1', 'invalid-url')).toThrow('Connection failed');
    });
  });

  describe('clearTenantDbPool', () => {
    it('should clear all tenant connections', async () => {
      // Create multiple tenant connections
      getTenantDb('tenant1', 'postgresql://test@localhost/tenant1');
      getTenantDb('tenant2', 'postgresql://test@localhost/tenant2');
      
      await clearTenantDbPool();
      
      expect(mockPool.end).toHaveBeenCalledTimes(2);
    });

    it('should handle pool cleanup errors', async () => {
      getTenantDb('tenant1', 'postgresql://test@localhost/tenant1');
      mockPool.end.mockRejectedValue(new Error('Cleanup failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await clearTenantDbPool();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error closing pool'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should allow creating new connections after clear', () => {
      const tenantId = 'tenant1';
      const dbUrl = 'postgresql://test@localhost/tenant1';
      
      getTenantDb(tenantId, dbUrl);
      clearTenantDbPool();
      
      const newDb = getTenantDb(tenantId, dbUrl);
      
      expect(Pool).toHaveBeenCalledTimes(2);
      expect(newDb).toBe(mockDb);
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should ensure tenant data isolation', () => {
      const tenant1Db = getTenantDb('tenant1', 'postgresql://test@localhost/tenant1');
      const tenant2Db = getTenantDb('tenant2', 'postgresql://test@localhost/tenant2');
      
      // Each tenant gets their own database instance
      expect(tenant1Db).not.toBe(tenant2Db);
      
      // Verify separate pool instances
      expect(Pool).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent tenant requests', async () => {
      const tenants = Array.from({ length: 5 }, (_, i) => ({
        id: `tenant${i}`,
        url: `postgresql://test@localhost/tenant${i}`,
      }));
      
      const promises = tenants.map(tenant => 
        Promise.resolve(getTenantDb(tenant.id, tenant.url))
      );
      
      const dbs = await Promise.all(promises);
      
      expect(dbs).toHaveLength(5);
      expect(Pool).toHaveBeenCalledTimes(5);
    });
  });
});