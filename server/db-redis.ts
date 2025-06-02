
import Redis from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error(
    "REDIS_URL must be set. Did you forget to provision a Redis cache?",
  );
}

class RedisCache {
  private static instance: RedisCache;
  private client: Redis;

  private constructor() {
    this.client = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  public static getInstance(): RedisCache {
    if (!RedisCache.instance) {
      RedisCache.instance = new RedisCache();
    }
    return RedisCache.instance;
  }

  public getClient(): Redis {
    return this.client;
  }

  public async set(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.client.setex(key, ttl, serializedValue);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  public async get(key: string): Promise<any> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  public async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
    console.log('Disconnected from Redis');
  }
}

export const redisCache = RedisCache.getInstance();
