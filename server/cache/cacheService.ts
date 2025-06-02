import { redisCache } from './redisClient';

export class CacheService {
  // Cache keys for different data types
  static KEYS = {
    USER: (id: number) => `user:${id}`,
    USERS_LIST: (orgId: number) => `users:org:${orgId}`,
    DEPARTMENTS: (orgId: number) => `departments:org:${orgId}`,
    LOCATIONS: (orgId: number) => `locations:org:${orgId}`,
    SOCIAL_POSTS: (orgId: number) => `social:posts:org:${orgId}`,
    SOCIAL_STATS: (orgId: number) => `social:stats:org:${orgId}`,
    CELEBRATIONS_TODAY: (orgId: number) => `celebrations:today:org:${orgId}`,
    CELEBRATIONS_UPCOMING: (orgId: number) => `celebrations:upcoming:org:${orgId}`,
    USER_POINTS: (userId: number) => `points:user:${userId}`,
  };

  // Cache expiration times (in seconds)
  static EXPIRATION = {
    USER: 900, // 15 minutes
    USERS_LIST: 1800, // 30 minutes
    DEPARTMENTS: 3600, // 1 hour
    LOCATIONS: 3600, // 1 hour
    SOCIAL_POSTS: 300, // 5 minutes
    SOCIAL_STATS: 600, // 10 minutes
    CELEBRATIONS: 3600, // 1 hour
    USER_POINTS: 900, // 15 minutes
  };

  // Get cached data with fallback to database
  static async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    expirationSeconds: number = 300
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await redisCache.get(key);
      if (cached !== null) {
        console.log(`Cache HIT for key: ${key}`);
        return cached;
      }

      console.log(`Cache MISS for key: ${key}`);
      // Fetch from database
      const data = await fetchFunction();
      
      // Store in cache for next time
      await redisCache.set(key, data, expirationSeconds);
      
      return data;
    } catch (error) {
      console.log(`Cache error for key ${key}:`, error);
      // If cache fails, just return the database result
      return await fetchFunction();
    }
  }

  // Invalidate cache patterns for data updates
  static async invalidateUserCache(userId: number, orgId?: number) {
    await redisCache.del(this.KEYS.USER(userId));
    await redisCache.del(this.KEYS.USER_POINTS(userId));
    
    if (orgId) {
      await redisCache.del(this.KEYS.USERS_LIST(orgId));
    }
  }

  static async invalidateSocialCache(orgId: number) {
    await redisCache.del(this.KEYS.SOCIAL_POSTS(orgId));
    await redisCache.del(this.KEYS.SOCIAL_STATS(orgId));
  }

  static async invalidateOrganizationCache(orgId: number) {
    await redisCache.invalidatePattern(`*:org:${orgId}`);
  }

  static async invalidateCelebrationsCache(orgId: number) {
    await redisCache.del(this.KEYS.CELEBRATIONS_TODAY(orgId));
    await redisCache.del(this.KEYS.CELEBRATIONS_UPCOMING(orgId));
  }

  // Health check for cache
  static isReady(): boolean {
    return redisCache.isReady();
  }
}