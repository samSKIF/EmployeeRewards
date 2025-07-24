import { initializeMongoDB, isMongoDBAvailable, useFallbackStorage } from './integration';
import { connectToMongoDB, getMongoDb } from './connection';
import { storage } from '../storage';

jest.mock('./connection');
jest.mock('../storage');

const mockConnectToMongoDB = connectToMongoDB as jest.MockedFunction<typeof connectToMongoDB>;
const mockGetMongoDb = getMongoDb as jest.MockedFunction<typeof getMongoDb>;

describe('MongoDB Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module state
    (global as any).mongoDbAvailable = undefined;
  });

  describe('initializeMongoDB', () => {
    it('should initialize MongoDB successfully', async () => {
      mockConnectToMongoDB.mockResolvedValue(undefined);
      mockGetMongoDb.mockReturnValue({} as any);

      const result = await initializeMongoDB();

      expect(result).toBe(true);
      expect(mockConnectToMongoDB).toHaveBeenCalled();
      expect(isMongoDBAvailable()).toBe(true);
    });

    it('should handle initialization failure', async () => {
      mockConnectToMongoDB.mockRejectedValue(new Error('Connection failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await initializeMongoDB();

      expect(result).toBe(false);
      expect(isMongoDBAvailable()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect to MongoDB'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should log fallback message on failure', async () => {
      mockConnectToMongoDB.mockRejectedValue(new Error('Auth failed'));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await initializeMongoDB();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Social features will use PostgreSQL fallback')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('isMongoDBAvailable', () => {
    it('should return false before initialization', () => {
      expect(isMongoDBAvailable()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      mockConnectToMongoDB.mockResolvedValue(undefined);
      mockGetMongoDb.mockReturnValue({} as any);

      await initializeMongoDB();

      expect(isMongoDBAvailable()).toBe(true);
    });

    it('should return false after failed initialization', async () => {
      mockConnectToMongoDB.mockRejectedValue(new Error('Failed'));

      await initializeMongoDB();

      expect(isMongoDBAvailable()).toBe(false);
    });
  });

  describe('useFallbackStorage', () => {
    it('should use MongoDB storage when available', async () => {
      mockGetMongoDb.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          find: jest.fn(),
        }),
      } as any);
      
      // Set MongoDB as available
      mockConnectToMongoDB.mockResolvedValue(undefined);
      await initializeMongoDB();

      const result = await useFallbackStorage(
        async () => ({ source: 'mongodb', data: [] }),
        async () => ({ source: 'postgres', data: [] })
      );

      expect(result).toEqual({ source: 'mongodb', data: [] });
    });

    it('should use fallback when MongoDB not available', async () => {
      // MongoDB not initialized
      const result = await useFallbackStorage(
        async () => ({ source: 'mongodb', data: [] }),
        async () => ({ source: 'postgres', data: [] })
      );

      expect(result).toEqual({ source: 'postgres', data: [] });
    });

    it('should use fallback when MongoDB operation fails', async () => {
      // Set MongoDB as available
      mockGetMongoDb.mockReturnValue({} as any);
      mockConnectToMongoDB.mockResolvedValue(undefined);
      await initializeMongoDB();

      const result = await useFallbackStorage(
        async () => {
          throw new Error('MongoDB operation failed');
        },
        async () => ({ source: 'postgres', data: [] })
      );

      expect(result).toEqual({ source: 'postgres', data: [] });
    });
  });

  describe('Integration Patterns', () => {
    it('should handle concurrent initialization attempts', async () => {
      mockConnectToMongoDB.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockGetMongoDb.mockReturnValue({} as any);

      const promises = Array(5).fill(null).map(() => initializeMongoDB());
      const results = await Promise.all(promises);

      expect(results.every(r => r === true)).toBe(true);
      expect(mockConnectToMongoDB).toHaveBeenCalledTimes(1); // Should only connect once
    });
  });
});