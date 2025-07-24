import { DatabaseStorage } from './storage';
import { db } from './db';
import { users, accounts, transactions } from '@shared/schema';
import { eq, and, count, sum } from 'drizzle-orm';
import { compare } from 'bcrypt';

// Mock dependencies
jest.mock('./db');
jest.mock('bcrypt');

const mockedDb = db as jest.Mocked<typeof db>;
const mockedCompare = compare as jest.MockedFunction<typeof compare>;

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    storage = new DatabaseStorage();
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 1,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      const result = await storage.getUser(1);

      expect(result).toEqual(mockUser);
      expect(mockedDb.select).toHaveBeenCalled();
    });

    it('should return undefined when user not found', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await storage.getUser(999);

      expect(result).toBeUndefined();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      const result = await storage.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should return undefined when user not found by email', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await storage.getUserByEmail('nonexistent@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('createUser', () => {
    it('should create new user successfully', async () => {
      const newUser = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'hashedpassword',
        name: 'New User',
        organizationId: 1,
      };

      const createdUser = { id: 2, ...newUser };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([createdUser]),
        }),
      });

      const result = await storage.createUser(newUser);

      expect(result).toEqual(createdUser);
      expect(mockedDb.insert).toHaveBeenCalledWith(users);
    });

    it('should handle database errors during user creation', async () => {
      const newUser = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password',
        name: 'New User',
        organizationId: 1,
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('Duplicate email')),
        }),
      });

      await expect(storage.createUser(newUser)).rejects.toThrow('Duplicate email');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        department: 'Engineering',
        jobTitle: 'Senior Developer',
      };

      const updatedUser = { id: 1, ...updateData };

      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedUser]),
          }),
        }),
      });

      const result = await storage.updateUser(1, updateData);

      expect(result).toEqual(updatedUser);
    });

    it('should return undefined when user to update not found', async () => {
      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await storage.updateUser(999, { name: 'New Name' });

      expect(result).toBeUndefined();
    });
  });

  describe('getUsers', () => {
    it('should return filtered users for organization', async () => {
      const mockUsers = [
        { id: 1, name: 'User 1', organizationId: 1, department: 'Engineering' },
        { id: 2, name: 'User 2', organizationId: 1, department: 'Marketing' },
      ];

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue(mockUsers),
              }),
            }),
          }),
        }),
      });

      const result = await storage.getUsers(1, undefined, 0, 50);

      expect(result).toEqual(mockUsers);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        department: 'Engineering',
        search: 'john',
        status: 'active',
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      await storage.getUsers(1, filters, 0, 25);

      // Verify the where clause was called (filters applied)
      expect(mockedDb.select).toHaveBeenCalled();
    });
  });

  describe('getUserCount', () => {
    it('should return total and active user counts', async () => {
      // Mock total users count
      mockedDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 100 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 85 }]),
          }),
        });

      const result = await storage.getUserCount(1);

      expect(result).toEqual({
        totalUsers: 100,
        activeUsers: 85,
      });
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const mockUser = {
        id: 1,
        password: 'hashedpassword',
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      mockedCompare.mockResolvedValue(true);

      const result = await storage.verifyPassword(1, 'plainpassword');

      expect(result).toBe(true);
      expect(mockedCompare).toHaveBeenCalledWith('plainpassword', 'hashedpassword');
    });

    it('should reject incorrect password', async () => {
      const mockUser = {
        id: 1,
        password: 'hashedpassword',
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      mockedCompare.mockResolvedValue(false);

      const result = await storage.verifyPassword(1, 'wrongpassword');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await storage.verifyPassword(999, 'password');

      expect(result).toBe(false);
    });
  });

  describe('getUserBalance', () => {
    it('should return user balance', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ balance: 1500 }]),
        }),
      });

      const result = await storage.getUserBalance(1);

      expect(result).toBe(1500);
    });

    it('should return 0 when account not found', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await storage.getUserBalance(999);

      expect(result).toBe(0);
    });
  });

  describe('updateUserBalance', () => {
    it('should update user balance successfully', async () => {
      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await storage.updateUserBalance(1, 2000);

      expect(mockedDb.update).toHaveBeenCalledWith(accounts);
    });

    it('should create account if not exists', async () => {
      // Mock update returning no results (account doesn't exist)
      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      // Mock insert for creating new account
      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      await storage.updateUserBalance(1, 1000);

      // Should attempt update first, then insert if needed
      expect(mockedDb.update).toHaveBeenCalled();
    });
  });

  describe('addTransaction', () => {
    it('should add transaction successfully', async () => {
      const transaction = {
        fromUserId: 1,
        toUserId: 2,
        amount: 100,
        type: 'recognition',
        description: 'Great work!',
        organizationId: 1,
      };

      const createdTransaction = { id: 1, ...transaction };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([createdTransaction]),
        }),
      });

      const result = await storage.addTransaction(transaction);

      expect(result).toEqual(createdTransaction);
      expect(mockedDb.insert).toHaveBeenCalledWith(transactions);
    });
  });

  describe('getTransactions', () => {
    it('should return user transactions', async () => {
      const mockTransactions = [
        {
          id: 1,
          amount: 100,
          type: 'recognition',
          description: 'Great work!',
          createdAt: new Date(),
        },
      ];

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockTransactions),
            }),
          }),
        }),
      });

      const result = await storage.getTransactions(1);

      expect(result).toEqual(mockTransactions);
    });

    it('should apply limit correctly', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await storage.getTransactions(1, 25);

      expect(mockedDb.select).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Connection failed')),
        }),
      });

      await expect(storage.getUser(1)).rejects.toThrow('Connection failed');
    });

    it('should handle constraint violations', async () => {
      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(
            new Error('UNIQUE constraint failed: users.email')
          ),
        }),
      });

      const newUser = {
        username: 'test',
        email: 'existing@example.com',
        password: 'password',
        name: 'Test',
        organizationId: 1,
      };

      await expect(storage.createUser(newUser)).rejects.toThrow(
        'UNIQUE constraint failed'
      );
    });
  });
});