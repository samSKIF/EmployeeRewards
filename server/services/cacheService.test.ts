import { CacheService } from './cacheService';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedisInstance: jest.Mocked<Redis>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRedisInstance = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      keys: jest.fn(),
      flushall: jest.fn(),
      pipeline: jest.fn(),
      disconnect: jest.fn(),
      status: 'ready',
    } as any;

    MockedRedis.mockImplementation(() => mockRedisInstance);
    cacheService = new CacheService();
  });

  describe('Constructor and Connection', () => {
    it('should create Redis instance with default configuration', () => {
      expect(MockedRedis).toHaveBeenCalledWith({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });
    });

    it('should handle Redis connection with custom configuration', () => {
      process.env.REDIS_HOST = 'custom-redis-host';
      process.env.REDIS_PORT = '6380';

      new CacheService();

      expect(MockedRedis).toHaveBeenCalledWith({
        host: 'custom-redis-host',
        port: 6380,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });
    });

    it('should handle Redis URL configuration', () => {
      process.env.REDIS_URL = 'redis://username:password@redis-host:6379/1';

      new CacheService();

      expect(MockedRedis).toHaveBeenCalledWith(
        'redis://username:password@redis-host:6379/1',
        expect.any(Object)
      );
    });
  });

  describe('get', () => {
    it('should retrieve value from cache', async () => {
      const testValue = JSON.stringify({ data: 'test', timestamp: Date.now() });
      mockRedisInstance.get.mockResolvedValue(testValue);

      const result = await cacheService.get('test-key');

      expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual({ data: 'test', timestamp: expect.any(Number) });
    });

    it('should return null for non-existent key', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cacheService.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should handle JSON parsing errors gracefully', async () => {
      mockRedisInstance.get.mockResolvedValue('invalid-json');

      const result = await cacheService.get('invalid-key');

      expect(result).toBeNull();
    });

    it('should handle Redis connection errors', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle different data types', async () => {
      const testCases = [
        { input: { user: 'john', age: 30 }, expected: { user: 'john', age: 30 } },
        { input: [1, 2, 3], expected: [1, 2, 3] },
        { input: 'simple string', expected: 'simple string' },
        { input: 42, expected: 42 },
        { input: true, expected: true },
      ];

      for (const testCase of testCases) {
        mockRedisInstance.get.mockResolvedValue(JSON.stringify(testCase.input));
        const result = await cacheService.get('test-key');
        expect(result).toEqual(testCase.expected);
      }
    });
  });

  describe('set', () => {
    it('should store value in cache with default TTL', async () => {
      const testData = { user: 'john', role: 'admin' };
      mockRedisInstance.set.mockResolvedValue('OK');

      await cacheService.set('user:1', testData);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'user:1',
        JSON.stringify(testData),
        'EX',
        3600 // Default 1 hour TTL
      );
    });

    it('should store value with custom TTL', async () => {
      const testData = { session: 'abc123' };
      mockRedisInstance.set.mockResolvedValue('OK');

      await cacheService.set('session:abc123', testData, 1800);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'session:abc123',
        JSON.stringify(testData),
        'EX',
        1800
      );
    });

    it('should handle Redis set errors', async () => {
      mockRedisInstance.set.mockRejectedValue(new Error('Redis set failed'));

      await expect(
        cacheService.set('test-key', { data: 'test' })
      ).rejects.toThrow('Redis set failed');
    });

    it('should serialize complex objects correctly', async () => {
      const complexData = {
        user: { id: 1, name: 'John' },
        permissions: ['read', 'write'],
        settings: { theme: 'dark', notifications: true },
        timestamp: new Date().toISOString(),
      };

      mockRedisInstance.set.mockResolvedValue('OK');

      await cacheService.set('complex-data', complexData);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'complex-data',
        JSON.stringify(complexData),
        'EX',
        3600
      );
    });

    it('should handle null and undefined values', async () => {
      mockRedisInstance.set.mockResolvedValue('OK');

      await cacheService.set('null-value', null);
      await cacheService.set('undefined-value', undefined);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'null-value',
        JSON.stringify(null),
        'EX',
        3600
      );
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'undefined-value',
        JSON.stringify(undefined),
        'EX',
        3600
      );
    });
  });

  describe('del', () => {
    it('should delete single key', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const result = await cacheService.del('test-key');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
      expect(result).toBe(1);
    });

    it('should delete multiple keys', async () => {
      mockRedisInstance.del.mockResolvedValue(3);

      const result = await cacheService.del(['key1', 'key2', 'key3']);

      expect(mockRedisInstance.del).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
      expect(result).toBe(3);
    });

    it('should return 0 for non-existent keys', async () => {
      mockRedisInstance.del.mockResolvedValue(0);

      const result = await cacheService.del('non-existent');

      expect(result).toBe(0);
    });

    it('should handle Redis delete errors', async () => {
      mockRedisInstance.del.mockRejectedValue(new Error('Delete failed'));

      await expect(
        cacheService.del('error-key')
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('exists', () => {
    it('should return true for existing key', async () => {
      mockRedisInstance.exists.mockResolvedValue(1);

      const result = await cacheService.exists('existing-key');

      expect(mockRedisInstance.exists).toHaveBeenCalledWith('existing-key');
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      mockRedisInstance.exists.mockResolvedValue(0);

      const result = await cacheService.exists('non-existent-key');

      expect(result).toBe(false);
    });

    it('should handle multiple keys existence check', async () => {
      mockRedisInstance.exists.mockResolvedValue(2);

      const result = await cacheService.exists(['key1', 'key2', 'key3']);

      expect(mockRedisInstance.exists).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
      expect(result).toBe(2); // Number of existing keys
    });
  });

  describe('expire', () => {
    it('should set expiration time for key', async () => {
      mockRedisInstance.expire.mockResolvedValue(1);

      const result = await cacheService.expire('test-key', 300);

      expect(mockRedisInstance.expire).toHaveBeenCalledWith('test-key', 300);
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      mockRedisInstance.expire.mockResolvedValue(0);

      const result = await cacheService.expire('non-existent', 300);

      expect(result).toBe(false);
    });

    it('should handle expire errors', async () => {
      mockRedisInstance.expire.mockRejectedValue(new Error('Expire failed'));

      await expect(
        cacheService.expire('test-key', 300)
      ).rejects.toThrow('Expire failed');
    });
  });

  describe('keys', () => {
    it('should return matching keys by pattern', async () => {
      const mockKeys = ['user:1', 'user:2', 'user:3'];
      mockRedisInstance.keys.mockResolvedValue(mockKeys);

      const result = await cacheService.keys('user:*');

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('user:*');
      expect(result).toEqual(mockKeys);
    });

    it('should return empty array for no matches', async () => {
      mockRedisInstance.keys.mockResolvedValue([]);

      const result = await cacheService.keys('nonexistent:*');

      expect(result).toEqual([]);
    });

    it('should handle keys operation errors', async () => {
      mockRedisInstance.keys.mockRejectedValue(new Error('Keys operation failed'));

      await expect(
        cacheService.keys('test:*')
      ).rejects.toThrow('Keys operation failed');
    });
  });

  describe('flushAll', () => {
    it('should clear all cache entries', async () => {
      mockRedisInstance.flushall.mockResolvedValue('OK');

      await cacheService.flushAll();

      expect(mockRedisInstance.flushall).toHaveBeenCalled();
    });

    it('should handle flush errors', async () => {
      mockRedisInstance.flushall.mockRejectedValue(new Error('Flush failed'));

      await expect(cacheService.flushAll()).rejects.toThrow('Flush failed');
    });
  });

  describe('mget (Multiple Get)', () => {
    it('should retrieve multiple values at once', async () => {
      const values = ['{"data":"value1"}', '{"data":"value2"}', null];
      mockRedisInstance.mget = jest.fn().mockResolvedValue(values);

      const result = await cacheService.mget(['key1', 'key2', 'key3']);

      expect(mockRedisInstance.mget).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
      expect(result).toEqual([
        { data: 'value1' },
        { data: 'value2' },
        null
      ]);
    });

    it('should handle mget errors', async () => {
      mockRedisInstance.mget = jest.fn().mockRejectedValue(new Error('Mget failed'));

      const result = await cacheService.mget(['key1', 'key2']);

      expect(result).toEqual([null, null]); // Should return nulls on error
    });
  });

  describe('mset (Multiple Set)', () => {
    it('should set multiple key-value pairs', async () => {
      const data = {
        'user:1': { name: 'John' },
        'user:2': { name: 'Jane' },
      };

      mockRedisInstance.mset = jest.fn().mockResolvedValue('OK');

      await cacheService.mset(data, 1800);

      const expectedArgs = [
        'user:1', JSON.stringify({ name: 'John' }),
        'user:2', JSON.stringify({ name: 'Jane' })
      ];

      expect(mockRedisInstance.mset).toHaveBeenCalledWith(expectedArgs);
    });

    it('should handle empty data object', async () => {
      mockRedisInstance.mset = jest.fn().mockResolvedValue('OK');

      await cacheService.mset({});

      expect(mockRedisInstance.mset).not.toHaveBeenCalled();
    });
  });

  describe('increment operations', () => {
    it('should increment counter', async () => {
      mockRedisInstance.incr = jest.fn().mockResolvedValue(5);

      const result = await cacheService.incr('counter:visits');

      expect(mockRedisInstance.incr).toHaveBeenCalledWith('counter:visits');
      expect(result).toBe(5);
    });

    it('should increment by specific amount', async () => {
      mockRedisInstance.incrby = jest.fn().mockResolvedValue(15);

      const result = await cacheService.incrby('counter:points', 10);

      expect(mockRedisInstance.incrby).toHaveBeenCalledWith('counter:points', 10);
      expect(result).toBe(15);
    });

    it('should decrement counter', async () => {
      mockRedisInstance.decr = jest.fn().mockResolvedValue(3);

      const result = await cacheService.decr('counter:remaining');

      expect(mockRedisInstance.decr).toHaveBeenCalledWith('counter:remaining');
      expect(result).toBe(3);
    });
  });

  describe('Hash operations', () => {
    it('should set hash field', async () => {
      mockRedisInstance.hset = jest.fn().mockResolvedValue(1);

      await cacheService.hset('user:1', 'name', 'John Doe');

      expect(mockRedisInstance.hset).toHaveBeenCalledWith('user:1', 'name', 'John Doe');
    });

    it('should get hash field', async () => {
      mockRedisInstance.hget = jest.fn().mockResolvedValue('John Doe');

      const result = await cacheService.hget('user:1', 'name');

      expect(mockRedisInstance.hget).toHaveBeenCalledWith('user:1', 'name');
      expect(result).toBe('John Doe');
    });

    it('should get all hash fields', async () => {
      const hashData = { name: 'John', age: '30', role: 'admin' };
      mockRedisInstance.hgetall = jest.fn().mockResolvedValue(hashData);

      const result = await cacheService.hgetall('user:1');

      expect(mockRedisInstance.hgetall).toHaveBeenCalledWith('user:1');
      expect(result).toEqual(hashData);
    });

    it('should delete hash field', async () => {
      mockRedisInstance.hdel = jest.fn().mockResolvedValue(1);

      const result = await cacheService.hdel('user:1', 'temp_field');

      expect(mockRedisInstance.hdel).toHaveBeenCalledWith('user:1', 'temp_field');
      expect(result).toBe(1);
    });
  });

  describe('List operations', () => {
    it('should push to list', async () => {
      mockRedisInstance.lpush = jest.fn().mockResolvedValue(3);

      const result = await cacheService.lpush('notifications:1', 'New message');

      expect(mockRedisInstance.lpush).toHaveBeenCalledWith('notifications:1', 'New message');
      expect(result).toBe(3);
    });

    it('should pop from list', async () => {
      mockRedisInstance.lpop = jest.fn().mockResolvedValue('Latest notification');

      const result = await cacheService.lpop('notifications:1');

      expect(mockRedisInstance.lpop).toHaveBeenCalledWith('notifications:1');
      expect(result).toBe('Latest notification');
    });

    it('should get list range', async () => {
      const listItems = ['item1', 'item2', 'item3'];
      mockRedisInstance.lrange = jest.fn().mockResolvedValue(listItems);

      const result = await cacheService.lrange('queue:tasks', 0, -1);

      expect(mockRedisInstance.lrange).toHaveBeenCalledWith('queue:tasks', 0, -1);
      expect(result).toEqual(listItems);
    });

    it('should get list length', async () => {
      mockRedisInstance.llen = jest.fn().mockResolvedValue(5);

      const result = await cacheService.llen('queue:pending');

      expect(mockRedisInstance.llen).toHaveBeenCalledWith('queue:pending');
      expect(result).toBe(5);
    });
  });

  describe('Set operations', () => {
    it('should add to set', async () => {
      mockRedisInstance.sadd = jest.fn().mockResolvedValue(1);

      const result = await cacheService.sadd('tags:post:1', 'javascript');

      expect(mockRedisInstance.sadd).toHaveBeenCalledWith('tags:post:1', 'javascript');
      expect(result).toBe(1);
    });

    it('should check set membership', async () => {
      mockRedisInstance.sismember = jest.fn().mockResolvedValue(1);

      const result = await cacheService.sismember('active_users', 'user:123');

      expect(mockRedisInstance.sismember).toHaveBeenCalledWith('active_users', 'user:123');
      expect(result).toBe(true);
    });

    it('should get all set members', async () => {
      const members = ['tag1', 'tag2', 'tag3'];
      mockRedisInstance.smembers = jest.fn().mockResolvedValue(members);

      const result = await cacheService.smembers('tags:popular');

      expect(mockRedisInstance.smembers).toHaveBeenCalledWith('tags:popular');
      expect(result).toEqual(members);
    });

    it('should remove from set', async () => {
      mockRedisInstance.srem = jest.fn().mockResolvedValue(1);

      const result = await cacheService.srem('active_users', 'user:456');

      expect(mockRedisInstance.srem).toHaveBeenCalledWith('active_users', 'user:456');
      expect(result).toBe(1);
    });
  });

  describe('Pipeline operations', () => {
    it('should execute pipeline commands', async () => {
      const mockPipeline = {
        set: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 'OK'],
          [null, '{"data":"test"}'],
          [null, 1]
        ])
      };

      mockRedisInstance.pipeline.mockReturnValue(mockPipeline as any);

      const result = await cacheService.pipeline([
        ['set', 'key1', JSON.stringify({ data: 'test' })],
        ['get', 'key1'],
        ['del', 'key2']
      ]);

      expect(mockRedisInstance.pipeline).toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalled();
      expect(result).toEqual(['OK', { data: 'test' }, 1]);
    });

    it('should handle pipeline errors', async () => {
      const mockPipeline = {
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Pipeline failed'))
      };

      mockRedisInstance.pipeline.mockReturnValue(mockPipeline as any);

      await expect(
        cacheService.pipeline([['set', 'key1', 'value1']])
      ).rejects.toThrow('Pipeline failed');
    });
  });

  describe('Connection Management', () => {
    it('should handle Redis disconnection', async () => {
      mockRedisInstance.disconnect.mockResolvedValue(undefined);

      await cacheService.disconnect();

      expect(mockRedisInstance.disconnect).toHaveBeenCalled();
    });

    it('should check connection status', () => {
      const isConnected = cacheService.isConnected();

      expect(isConnected).toBe(true); // mockRedisInstance.status is 'ready'
    });

    it('should handle connection status changes', () => {
      mockRedisInstance.status = 'connecting';
      expect(cacheService.isConnected()).toBe(false);

      mockRedisInstance.status = 'ready';
      expect(cacheService.isConnected()).toBe(true);

      mockRedisInstance.status = 'close';
      expect(cacheService.isConnected()).toBe(false);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Redis unavailable gracefully', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle timeout errors', async () => {
      mockRedisInstance.set.mockRejectedValue(new Error('Command timeout'));

      await expect(
        cacheService.set('test-key', { data: 'test' })
      ).rejects.toThrow('Command timeout');
    });

    it('should handle malformed JSON during get operations', async () => {
      mockRedisInstance.get.mockResolvedValue('{"invalid": json}');

      const result = await cacheService.get('malformed-key');

      expect(result).toBeNull();
    });

    it('should handle network interruptions', async () => {
      mockRedisInstance.keys.mockRejectedValue(new Error('Network error'));

      await expect(
        cacheService.keys('pattern:*')
      ).rejects.toThrow('Network error');
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large data sets efficiently', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `item-${i}`,
        timestamp: Date.now()
      }));

      mockRedisInstance.set.mockResolvedValue('OK');

      await cacheService.set('large-dataset', largeData);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'large-dataset',
        JSON.stringify(largeData),
        'EX',
        3600
      );
    });

    it('should handle concurrent operations', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({ counter: 1 }));

      const promises = Array.from({ length: 10 }, (_, i) =>
        cacheService.get(`concurrent-key-${i}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(mockRedisInstance.get).toHaveBeenCalledTimes(10);
    });

    it('should optimize memory usage for TTL operations', async () => {
      mockRedisInstance.set.mockResolvedValue('OK');

      // Test different TTL values
      await cacheService.set('short-lived', { data: 'test' }, 60);
      await cacheService.set('medium-lived', { data: 'test' }, 3600);
      await cacheService.set('long-lived', { data: 'test' }, 86400);

      expect(mockRedisInstance.set).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle session caching workflow', async () => {
      const sessionData = {
        user_id: 123,
        username: 'johndoe',
        permissions: ['read', 'write'],
        lastActivity: new Date().toISOString()
      };

      mockRedisInstance.set.mockResolvedValue('OK');
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(sessionData));
      mockRedisInstance.expire.mockResolvedValue(1);

      // Set session
      await cacheService.set('session:abc123', sessionData, 1800);

      // Get session
      const retrieved = await cacheService.get('session:abc123');

      // Extend session
      await cacheService.expire('session:abc123', 3600);

      expect(retrieved).toEqual(sessionData);
      expect(mockRedisInstance.expire).toHaveBeenCalledWith('session:abc123', 3600);
    });

    it('should handle rate limiting scenario', async () => {
      mockRedisInstance.incr.mockResolvedValue(5);
      mockRedisInstance.expire.mockResolvedValue(1);

      const attempts = await cacheService.incr('rate_limit:user:123');
      if (attempts === 1) {
        await cacheService.expire('rate_limit:user:123', 3600);
      }

      expect(attempts).toBe(5);
      expect(mockRedisInstance.incr).toHaveBeenCalledWith('rate_limit:user:123');
    });

    it('should handle cache invalidation patterns', async () => {
      mockRedisInstance.keys.mockResolvedValue(['user:1:profile', 'user:1:settings']);
      mockRedisInstance.del.mockResolvedValue(2);

      const keysToDelete = await cacheService.keys('user:1:*');
      const deletedCount = await cacheService.del(keysToDelete);

      expect(deletedCount).toBe(2);
      expect(mockRedisInstance.del).toHaveBeenCalledWith(['user:1:profile', 'user:1:settings']);
    });
  });
});