import { 
  getPostsCollection, 
  getReactionsCollection, 
  getCommentsCollection,
  getNotificationsCollection 
} from './collections';
import { getMongoDb } from './connection';

jest.mock('./connection');

const mockCollection = {
  find: jest.fn(),
  findOne: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  aggregate: jest.fn(),
  createIndex: jest.fn(),
};

const mockDb = {
  collection: jest.fn().mockReturnValue(mockCollection),
};

(getMongoDb as jest.Mock).mockReturnValue(mockDb);

describe('MongoDB Collections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPostsCollection', () => {
    it('should return posts collection', () => {
      const collection = getPostsCollection();
      
      expect(mockDb.collection).toHaveBeenCalledWith('posts');
      expect(collection).toBe(mockCollection);
    });

    it('should cache collection instance', () => {
      const collection1 = getPostsCollection();
      const collection2 = getPostsCollection();
      
      expect(collection1).toBe(collection2);
      expect(mockDb.collection).toHaveBeenCalledTimes(1);
    });
  });

  describe('getReactionsCollection', () => {
    it('should return reactions collection', () => {
      const collection = getReactionsCollection();
      
      expect(mockDb.collection).toHaveBeenCalledWith('reactions');
      expect(collection).toBe(mockCollection);
    });
  });

  describe('getCommentsCollection', () => {
    it('should return comments collection', () => {
      const collection = getCommentsCollection();
      
      expect(mockDb.collection).toHaveBeenCalledWith('comments');
      expect(collection).toBe(mockCollection);
    });
  });

  describe('getNotificationsCollection', () => {
    it('should return notifications collection', () => {
      const collection = getNotificationsCollection();
      
      expect(mockDb.collection).toHaveBeenCalledWith('notifications');
      expect(collection).toBe(mockCollection);
    });
  });

  describe('Collection Indexes', () => {
    it('should create indexes on posts collection', async () => {
      const postsCollection = getPostsCollection();
      
      // Simulate index creation
      await postsCollection.createIndex({ companyId: 1, createdAt: -1 });
      await postsCollection.createIndex({ userId: 1 });
      
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ 
        companyId: 1, 
        createdAt: -1 
      });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ userId: 1 });
    });

    it('should create compound index on reactions', async () => {
      const reactionsCollection = getReactionsCollection();
      
      await reactionsCollection.createIndex({ postId: 1, userId: 1 });
      
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ 
        postId: 1, 
        userId: 1 
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle null database', () => {
      (getMongoDb as jest.Mock).mockReturnValue(null);
      
      expect(() => getPostsCollection()).toThrow();
    });
  });
});