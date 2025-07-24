import Redis from 'redis';

class RedisCache {
  private client: any;
  private isConnected: boolean = false;
  private isEnabled: boolean = false;

  constructor() {
    // Only enable Redis if REDIS_URL is explicitly set
    if (process.env.REDIS_URL) {
      this.isEnabled = true;
      this.connect();
    } else {
      console.log('Redis disabled - no REDIS_URL environment variable set');
    }
  }

  private async connect() {
    if (!this.isEnabled) return;

    try {
      this.client = Redis.createClient({
        url: process.env.REDIS_URL!,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
        },
      });

      this.client.on('error', (err: any) => {
        console.log('Redis Client Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.log('Redis connection failed, running without cache:', error);
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<any> {
    if (!this.isEnabled || !this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.log('Redis GET error:', error);
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    expirationSeconds: number = 300
  ): Promise<boolean> {
    if (!this.isEnabled || !this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.setEx(key, expirationSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.log('Redis SET error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.log('Redis DEL error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<boolean> {
    if (!this.isEnabled || !this.isConnected || !this.client) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.log('Redis pattern invalidation error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.log('Redis EXISTS error:', error);
      return false;
    }
  }

  isReady(): boolean {
    return this.isEnabled && this.isConnected;
  }

  async disconnect(): Promise<void> {
    if (this.isEnabled && this.client) {
      try {
        await this.client.disconnect();
      } catch (error) {
        console.log('Redis disconnect error:', error);
      }
    }
  }
}

// Create singleton instance
export const redisCache = new RedisCache();
