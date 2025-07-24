import { connectToMongoDB, getMongoDb, closeMongoConnection } from './connection';
import { MongoClient } from 'mongodb';

jest.mock('mongodb');

const mockDb = {
  collection: jest.fn(),
};

const mockClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  db: jest.fn().mockReturnValue(mockDb),
  close: jest.fn().mockResolvedValue(undefined),
};

(MongoClient as jest.MockedClass<typeof MongoClient>).mockImplementation(
  () => mockClient as any
);

describe('MongoDB Connection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (global as any).mongoClient = undefined;
    (global as any).mongoDb = undefined;
  });

  describe('connectToMongoDB', () => {
    it('should connect to MongoDB successfully', async () => {
      process.env.MONGODB_URI = 'mongodb://test:27017/testdb';
      
      await connectToMongoDB();
      
      expect(MongoClient).toHaveBeenCalledWith(process.env.MONGODB_URI);
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.db).toHaveBeenCalledWith('empulse_social');
    });

    it('should handle connection errors', async () => {
      mockClient.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(connectToMongoDB()).rejects.toThrow('Connection failed');
    });

    it('should not reconnect if already connected', async () => {
      await connectToMongoDB();
      await connectToMongoDB();
      
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should use custom database name', async () => {
      process.env.MONGODB_DB_NAME = 'custom_db';
      
      await connectToMongoDB();
      
      expect(mockClient.db).toHaveBeenCalledWith('custom_db');
    });
  });

  describe('getMongoDb', () => {
    it('should return database instance after connection', async () => {
      await connectToMongoDB();
      
      const db = getMongoDb();
      
      expect(db).toBe(mockDb);
    });

    it('should return null if not connected', () => {
      const db = getMongoDb();
      
      expect(db).toBeNull();
    });
  });

  describe('closeMongoConnection', () => {
    it('should close connection successfully', async () => {
      await connectToMongoDB();
      await closeMongoConnection();
      
      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should handle close when not connected', async () => {
      await closeMongoConnection();
      
      expect(mockClient.close).not.toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      await connectToMongoDB();
      mockClient.close.mockRejectedValueOnce(new Error('Close failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await closeMongoConnection();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error closing MongoDB'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Connection Resilience', () => {
    it('should handle connection string variations', async () => {
      const connectionStrings = [
        'mongodb://localhost:27017/test',
        'mongodb+srv://user:pass@cluster.mongodb.net/test',
        'mongodb://user:pass@host1:27017,host2:27017/test?replicaSet=rs',
      ];
      
      for (const uri of connectionStrings) {
        process.env.MONGODB_URI = uri;
        (global as any).mongoClient = undefined;
        
        await connectToMongoDB();
        
        expect(MongoClient).toHaveBeenCalledWith(uri);
      }
    });
  });
});