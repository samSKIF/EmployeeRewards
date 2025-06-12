
 import Redis from 'ioredis';
+import { logger } from '@shared/logger';

 // Redis is now optional - only connect if REDIS_URL is provided
 const isRedisEnabled = !!process.env.REDIS_URL;

 class RedisCache {
   private static instance: RedisCache;
   private client: Redis | null = null;
   private isEnabled: boolean = false;

   private constructor() {
     this.isEnabled = isRedisEnabled;

     if (this.isEnabled) {
       this.client = new Redis(process.env.REDIS_URL!, {
         maxRetriesPerRequest: 3,
         retryDelayOnFailover: 100,
         lazyConnect: true,
       });

       this.client.on('connect', () => {
-        console.log('Connected to Redis');
+        logger.info('Connected to Redis');
       });

       this.client.on('error', (err) => {
         console.error('Redis connection error:', err);
       });
     } else {
-      console.log('Redis disabled - no REDIS_URL environment variable set');
+      logger.info('Redis disabled - no REDIS_URL environment variable set');
     }
   }

   public static getInstance(): RedisCache {
     if (!RedisCache.instance) {
       RedisCache.instance = new RedisCache();
     }
     return RedisCache.instance;
   }

   public getClient(): Redis | null {
     return this.client;
   }

   public async set(key: string, value: any, ttl?: number): Promise<void> {
     if (!this.isEnabled || !this.client) return;

     const serializedValue = JSON.stringify(value);
     if (ttl) {
       await this.client.setex(key, ttl, serializedValue);
     } else {
       await this.client.set(key, serializedValue);
     }
   }

   public async get(key: string): Promise<any> {
     if (!this.isEnabled || !this.client) return null;

     const value = await this.client.get(key);
     return value ? JSON.parse(value) : null;
   }

   public async del(key: string): Promise<number> {
     if (!this.isEnabled || !this.client) return 0;

     return await this.client.del(key);
   }

   public async exists(key: string): Promise<boolean> {
     if (!this.isEnabled || !this.client) return false;

     const result = await this.client.exists(key);
     return result === 1;
   }

   public async disconnect(): Promise<void> {
     if (this.isEnabled && this.client) {
       await this.client.quit();
-      console.log('Disconnected from Redis');
+      logger.info('Disconnected from Redis');
     }
   }
 }

 export const redisCache = RedisCache.getInstance();
