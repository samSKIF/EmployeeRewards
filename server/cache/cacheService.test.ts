import { CacheService } from './cacheService';
import { redisCache } from './redisClient';

// Mock Redis client
jest.mock('./redisClient');

const mockedRedisCache = redisCache as jest.Mocked<typeof redisCache>;

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrSet', () => {
    it('should return cached data when available (cache hit)', async () => {
      const key = 'test-key';
      const cachedData = { id: 1, name: 'Test' };
      
      mockedRedisCache.get.mockResolvedValue(cachedData);

      const fetchFunction = jest.fn();
      const result = await CacheService.getOrSet(key, fetchFunction, 300);

      expect(result).toEqual(cachedData);
      expect(mockedRedisCache.get).toHaveBeenCalledWith(key);
      expect(fetchFunction).not.toHaveBeenCalled();
      expect(mockedRedisCache.set).not.toHaveBeenCalled();
    });

    it('should fetch and cache data when not in cache (cache miss)', async () => {
      const key = 'test-key';
      const freshData = { id: 2, name: 'Fresh Data' };
      
      mockedRedisCache.get.mockResolvedValue(null);
      const fetchFunction = jest.fn().mockResolvedValue(freshData);

      const result = await CacheService.getOrSet(key, fetchFunction, 300);

      expect(result).toEqual(freshData);
      expect(mockedRedisCache.get).toHaveBeenCalledWith(key);
      expect(fetchFunction).toHaveBeenCalledTimes(1);
      expect(mockedRedisCache.set).toHaveBeenCalledWith(key, freshData, 300);
    });

    it('should handle cache errors gracefully', async () => {
      const key = 'test-key';
      const freshData = { id: 3, name: 'Error Recovery' };
      
      mockedRedisCache.get.mockRejectedValue(new Error('Redis connection failed'));
      const fetchFunction = jest.fn().mockResolvedValue(freshData);

      const result = await CacheService.getOrSet(key, fetchFunction, 300);

      expect(result).toEqual(freshData);
      expect(fetchFunction).toHaveBeenCalledTimes(1);
    });

    it('should use default expiration when not provided', async () => {
      const key = 'test-key';
      const freshData = { id: 4, name: 'Default Expiration' };
      
      mockedRedisCache.get.mockResolvedValue(null);
      const fetchFunction = jest.fn().mockResolvedValue(freshData);

      await CacheService.getOrSet(key, fetchFunction);

      expect(mockedRedisCache.set).toHaveBeenCalledWith(key, freshData, 300);
    });
  });

  describe('invalidateUserCache', () => {
    it('should invalidate user-specific cache keys', async () => {
      const user_id = 123;
      const orgId = 456;

      await CacheService.invalidateUserCache(user_id, orgId);

      expect(mockedRedisCache.del).toHaveBeenCalledWith(CacheService.KEYS.USER(user_id));
      expect(mockedRedisCache.del).toHaveBeenCalledWith(CacheService.KEYS.USER_POINTS(user_id));
      expect(mockedRedisCache.del).toHaveBeenCalledWith(CacheService.KEYS.USERS_LIST(orgId));
    });

    it('should invalidate user cache without org ID', async () => {
      const user_id = 123;

      await CacheService.invalidateUserCache(user_id);

      expect(mockedRedisCache.del).toHaveBeenCalledWith(CacheService.KEYS.USER(user_id));
      expect(mockedRedisCache.del).toHaveBeenCalledWith(CacheService.KEYS.USER_POINTS(user_id));
      expect(mockedRedisCache.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidateSocialCache', () => {
    it('should invalidate social-related cache keys', async () => {
      const orgId = 789;

      await CacheService.invalidateSocialCache(orgId);

      expect(mockedRedisCache.del).toHaveBeenCalledWith(CacheService.KEYS.SOCIAL_POSTS(orgId));
      expect(mockedRedisCache.del).toHaveBeenCalledWith(CacheService.KEYS.SOCIAL_STATS(orgId));
    });
  });

  describe('invalidateOrganizationCache', () => {
    it('should invalidate all organization-related cache', async () => {
      const orgId = 101;

      await CacheService.invalidateOrganizationCache(orgId);

      expect(mockedRedisCache.invalidatePattern).toHaveBeenCalledWith(`*:org:${orgId}`);
    });
  });

  describe('Cache Keys', () => {
    it('should generate correct cache keys', () => {
      expect(CacheService.KEYS.USER(123)).toBe('user:123');
      expect(CacheService.KEYS.USERS_LIST(456)).toBe('users:org:456');
      expect(CacheService.KEYS.DEPARTMENTS(789)).toBe('departments:org:789');
      expect(CacheService.KEYS.LOCATIONS(101)).toBe('locations:org:101');
      expect(CacheService.KEYS.SOCIAL_POSTS(202)).toBe('social:posts:org:202');
      expect(CacheService.KEYS.SOCIAL_STATS(303)).toBe('social:stats:org:303');
      expect(CacheService.KEYS.CELEBRATIONS_TODAY(404)).toBe('celebrations:today:org:404');
      expect(CacheService.KEYS.CELEBRATIONS_UPCOMING(505)).toBe('celebrations:upcoming:org:505');
      expect(CacheService.KEYS.USER_POINTS(606)).toBe('points:user:606');
    });
  });

  describe('Cache Expiration Constants', () => {
    it('should have appropriate expiration times', () => {
      expect(CacheService.EXPIRATION.USER).toBe(900); // 15 minutes
      expect(CacheService.EXPIRATION.USERS_LIST).toBe(1800); // 30 minutes
      expect(CacheService.EXPIRATION.DEPARTMENTS).toBe(3600); // 1 hour
      expect(CacheService.EXPIRATION.LOCATIONS).toBe(3600); // 1 hour
      expect(CacheService.EXPIRATION.SOCIAL_POSTS).toBe(300); // 5 minutes
      expect(CacheService.EXPIRATION.SOCIAL_STATS).toBe(600); // 10 minutes
      expect(CacheService.EXPIRATION.CELEBRATIONS).toBe(3600); // 1 hour
      expect(CacheService.EXPIRATION.USER_POINTS).toBe(900); // 15 minutes
    });
  });
});