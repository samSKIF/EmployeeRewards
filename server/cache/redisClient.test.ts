import { RedisClient } from './redisClient';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('RedisClient', () => {
  let redisClient: RedisClient;
  let mockRedis: jest.Mocked<Redis>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      flushall: jest.fn(),
      ping: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
    } as any;
    
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);
    
    // Reset singleton
    (RedisClient as any).instance = null;
    redisClient = RedisClient.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = RedisClient.getInstance();
      const instance2 = RedisClient.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize Redis connection', () => {
      expect(Redis).toHaveBeenCalledWith({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      });
    });
  });

  describe('get', () => {
    it('should get value from Redis', async () => {
      mockRedis.get.mockResolvedValue('cached value');
      
      const result = await redisClient.get('test-key');
      
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe('cached value');
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      const result = await redisClient.get('non-existent');
      
      expect(result).toBeNull();
    });

    it('should handle Redis errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await redisClient.get('test-key');
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('set', () => {
    it('should set value with TTL', async () => {
      await redisClient.set('test-key', 'test value', 3600);
      
      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 3600, 'test value');
    });

    it('should set value without TTL', async () => {
      await redisClient.set('test-key', 'test value');
      
      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test value');
    });

    it('should handle set errors', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await redisClient.set('test-key', 'value', 3600);
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      mockRedis.del.mockResolvedValue(1);
      
      await redisClient.del('test-key');
      
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle delete errors', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await redisClient.del('test-key');
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('keys', () => {
    it('should return keys matching pattern', async () => {
      const mockKeys = ['user:1', 'user:2', 'user:3'];
      mockRedis.keys.mockResolvedValue(mockKeys);
      
      const result = await redisClient.keys('user:*');
      
      expect(mockRedis.keys).toHaveBeenCalledWith('user:*');
      expect(result).toEqual(mockKeys);
    });

    it('should handle keys errors', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await redisClient.keys('test:*');
      
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('should flush all keys', async () => {
      await redisClient.clear();
      
      expect(mockRedis.flushall).toHaveBeenCalled();
    });

    it('should handle clear errors', async () => {
      mockRedis.flushall.mockRejectedValue(new Error('Redis error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await redisClient.clear();
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('isConnected', () => {
    it('should check connection status', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      
      const result = await redisClient.isConnected();
      
      expect(result).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should return false on ping error', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection error'));
      
      const result = await redisClient.isConnected();
      
      expect(result).toBe(false);
    });
  });

  describe('connection events', () => {
    it('should handle connect event', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const connectHandler = mockRedis.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      
      if (connectHandler) {
        connectHandler();
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redis connected')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle error event', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorHandler = mockRedis.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      if (errorHandler) {
        errorHandler(new Error('Connection failed'));
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redis error'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
});