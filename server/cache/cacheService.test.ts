import { CacheService } from './cacheService';
import { RedisClient } from './redisClient';

jest.mock('./redisClient');

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedisClient: jest.Mocked<RedisClient>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      clear: jest.fn(),
      keys: jest.fn(),
      isConnected: jest.fn(),
    } as any;
    
    (RedisClient.getInstance as jest.Mock).mockReturnValue(mockRedisClient);
    cacheService = new CacheService();
  });

  describe('get', () => {
    it('should return cached value if exists', async () => {
      const cachedData = { id: 1, name: 'Test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await cacheService.get('test-key');

      expect(result).toEqual(cachedData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null if key not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json');
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('set', () => {
    it('should store value with default TTL', async () => {
      const data = { id: 1, name: 'Test' };

      await cacheService.set('test-key', data);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(data),
        3600 // Default TTL
      );
    });

    it('should store value with custom TTL', async () => {
      const data = { id: 1, name: 'Test' };
      const customTTL = 7200;

      await cacheService.set('test-key', data, customTTL);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(data),
        customTTL
      );
    });

    it('should handle set errors', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await cacheService.set('test-key', { data: 'test' });

      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('delete', () => {
    it('should delete key from cache', async () => {
      await cacheService.delete('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle delete errors', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await cacheService.delete('test-key');

      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('should clear all cache', async () => {
      await cacheService.clear();

      expect(mockRedisClient.clear).toHaveBeenCalled();
    });

    it('should handle clear errors', async () => {
      mockRedisClient.clear.mockRejectedValue(new Error('Redis error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await cacheService.clear();

      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('invalidatePattern', () => {
    it('should delete all keys matching pattern', async () => {
      const matchingKeys = ['user:1', 'user:2', 'user:3'];
      mockRedisClient.keys.mockResolvedValue(matchingKeys);

      await cacheService.invalidatePattern('user:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('user:*');
      expect(mockRedisClient.del).toHaveBeenCalledTimes(3);
      expect(mockRedisClient.del).toHaveBeenCalledWith('user:1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('user:2');
      expect(mockRedisClient.del).toHaveBeenCalledWith('user:3');
    });

    it('should handle no matching keys', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await cacheService.invalidatePattern('nonexistent:*');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('cache key generation', () => {
    it('should generate user cache key', () => {
      const key = cacheService.getUserCacheKey(123);
      expect(key).toBe('user:123');
    });

    it('should generate organization cache key', () => {
      const key = cacheService.getOrgCacheKey(456);
      expect(key).toBe('org:456');
    });

    it('should generate custom cache key', () => {
      const key = cacheService.getCacheKey('posts', 'latest', 789);
      expect(key).toBe('posts:latest:789');
    });
  });
});