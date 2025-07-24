import { DatabaseStorage } from './storage';
import { db } from './db';
import * as schema from '@shared/schema';
import { eq, and, desc, asc, gte, lte, sql, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';

jest.mock('./db');
jest.mock('bcrypt');

const mockDb = db as jest.Mocked<typeof db>;

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;
  
  beforeEach(() => {
    jest.clearAllMocks();
    storage = new DatabaseStorage();
  });

  describe('User Operations', () => {
    describe('getUser', () => {
      it('should return user by id', async () => {
        const mockUser = { id: 1, name: 'Test User', organizationId: 1 };
        const mockQuery = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([mockUser]),
        };
        mockDb.select = jest.fn().mockReturnValue(mockQuery);

        const result = await storage.getUser(1);

        expect(result).toEqual(mockUser);
        expect(mockQuery.where).toHaveBeenCalled();
        expect(mockQuery.limit).toHaveBeenCalledWith(1);
      });

      it('should return undefined if user not found', async () => {
        const mockQuery = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([]),
        };
        mockDb.select = jest.fn().mockReturnValue(mockQuery);

        const result = await storage.getUser(999);

        expect(result).toBeUndefined();
      });
    });

    describe('createUser', () => {
      it('should create user with hashed password', async () => {
        const userData = {
          username: 'newuser',
          password: 'plaintext',
          name: 'New User',
          email: 'new@test.com',
          organizationId: 1,
        };
        
        const hashedPassword = 'hashed_password';
        (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
        
        const createdUser = { id: 100, ...userData, password: hashedPassword };
        const mockQuery = {
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([createdUser]),
        };
        mockDb.insert = jest.fn().mockReturnValue(mockQuery);

        const result = await storage.createUser(userData);

        expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 10);
        expect(mockQuery.values).toHaveBeenCalledWith({
          ...userData,
          password: hashedPassword,
        });
        expect(result).toEqual(createdUser);
      });
    });

    describe('getUsers', () => {
      it('should return users for organization with pagination', async () => {
        const mockUsers = [
          { id: 1, name: 'User 1', organizationId: 1 },
          { id: 2, name: 'User 2', organizationId: 1 },
        ];
        
        const mockQuery = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockResolvedValue(mockUsers),
        };
        mockDb.select = jest.fn().mockReturnValue(mockQuery);

        const result = await storage.getUsers(1, 10, 0);

        expect(result).toEqual(mockUsers);
        expect(mockQuery.limit).toHaveBeenCalledWith(10);
        expect(mockQuery.offset).toHaveBeenCalledWith(0);
      });

      it('should filter by status when provided', async () => {
        const mockQuery = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockResolvedValue([]),
        };
        mockDb.select = jest.fn().mockReturnValue(mockQuery);

        await storage.getUsers(1, 10, 0, 'active');

        expect(mockQuery.where).toHaveBeenCalled();
      });
    });

    describe('validateUser', () => {
      it('should validate correct credentials', async () => {
        const mockUser = {
          id: 1,
          username: 'testuser',
          password: 'hashed_password',
          organizationId: 1,
        };
        
        const mockQuery = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([mockUser]),
        };
        mockDb.select = jest.fn().mockReturnValue(mockQuery);
        
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await storage.validateUser('testuser', 'plaintext');

        expect(result).toEqual(mockUser);
        expect(bcrypt.compare).toHaveBeenCalledWith('plaintext', 'hashed_password');
      });

      it('should return null for invalid credentials', async () => {
        const mockUser = {
          id: 1,
          username: 'testuser',
          password: 'hashed_password',
        };
        
        const mockQuery = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([mockUser]),
        };
        mockDb.select = jest.fn().mockReturnValue(mockQuery);
        
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await storage.validateUser('testuser', 'wrongpassword');

        expect(result).toBeNull();
      });
    });
  });

  describe('Organization Operations', () => {
    describe('getOrganization', () => {
      it('should return organization by id', async () => {
        const mockOrg = { id: 1, name: 'Test Org', type: 'client' };
        const mockQuery = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([mockOrg]),
        };
        mockDb.select = jest.fn().mockReturnValue(mockQuery);

        const result = await storage.getOrganization(1);

        expect(result).toEqual(mockOrg);
      });
    });

    describe('updateOrganization', () => {
      it('should update organization', async () => {
        const updateData = { name: 'Updated Org', status: 'inactive' };
        const updatedOrg = { id: 1, ...updateData };
        
        const mockQuery = {
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([updatedOrg]),
        };
        mockDb.update = jest.fn().mockReturnValue(mockQuery);

        const result = await storage.updateOrganization(1, updateData);

        expect(result).toEqual(updatedOrg);
        expect(mockQuery.set).toHaveBeenCalledWith(updateData);
      });
    });
  });

  describe('Points and Transactions', () => {
    describe('earnPoints', () => {
      it('should create earn transaction and update balance', async () => {
        const mockWallet = {
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          onConflictDoUpdate: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{ id: 1, userId: 1, balance: 100 }]),
        };
        
        const mockTransaction = {
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{
            id: 100,
            amount: 50,
            type: 'earn',
          }]),
        };
        
        mockDb.insert = jest.fn()
          .mockReturnValueOnce(mockWallet)
          .mockReturnValueOnce(mockTransaction);

        const result = await storage.earnPoints(1, 50, 'achievement', 'Great work!');

        expect(result).toEqual({
          transaction: { id: 100, amount: 50, type: 'earn' },
          newBalance: 100,
        });
      });
    });

    describe('redeemPoints', () => {
      it('should create redeem transaction if sufficient balance', async () => {
        const mockBalance = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ balance: 100 }]),
        };
        mockDb.select = jest.fn().mockReturnValue(mockBalance);
        
        const mockUpdate = {
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{ balance: 50 }]),
        };
        mockDb.update = jest.fn().mockReturnValue(mockUpdate);
        
        const mockTransaction = {
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{
            id: 101,
            amount: -50,
            type: 'redeem',
          }]),
        };
        mockDb.insert = jest.fn().mockReturnValue(mockTransaction);

        const result = await storage.redeemPoints(1, 50, 'product', 'Coffee voucher', 10);

        expect(result).toEqual({
          transaction: { id: 101, amount: -50, type: 'redeem' },
          newBalance: 50,
        });
      });

      it('should throw error if insufficient balance', async () => {
        const mockBalance = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ balance: 30 }]),
        };
        mockDb.select = jest.fn().mockReturnValue(mockBalance);

        await expect(storage.redeemPoints(1, 50, 'product', 'Expensive item'))
          .rejects.toThrow('Insufficient balance');
      });
    });
  });

  describe('Channel/Space Operations', () => {
    describe('getUserChannels', () => {
      it('should return channels for user', async () => {
        const mockChannels = [
          { id: 1, name: 'General', memberCount: 10 },
          { id: 2, name: 'Tech', memberCount: 5 },
        ];
        
        const mockQuery = {
          from: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockResolvedValue(mockChannels),
        };
        mockDb.select = jest.fn().mockReturnValue(mockQuery);

        const result = await storage.getUserChannels(1, 1);

        expect(result).toEqual(mockChannels);
      });
    });

    describe('createChannel', () => {
      it('should create channel and add creator as member', async () => {
        const channelData = {
          name: 'New Channel',
          description: 'Test channel',
          createdBy: 1,
          organizationId: 1,
        };
        
        const createdChannel = { id: 10, ...channelData };
        const mockInsert = {
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([createdChannel]),
        };
        mockDb.insert = jest.fn().mockReturnValue(mockInsert);

        const result = await storage.createChannel(channelData);

        expect(result).toEqual(createdChannel);
        expect(mockDb.insert).toHaveBeenCalledTimes(2); // Channel + member
      });
    });
  });

  describe('Celebration Operations', () => {
    describe('getTodaysCelebrations', () => {
      it('should return birthdays and anniversaries for today', async () => {
        const mockBirthdays = [
          { id: 1, name: 'Birthday User', birthDate: '1990-01-24' },
        ];
        const mockAnniversaries = [
          { id: 2, name: 'Anniversary User', hireDate: '2020-01-24' },
        ];
        
        const mockQuery = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn()
            .mockResolvedValueOnce(mockBirthdays)
            .mockResolvedValueOnce(mockAnniversaries),
        };
        mockDb.select = jest.fn().mockReturnValue(mockQuery);

        const result = await storage.getTodaysCelebrations(1);

        expect(result).toEqual([
          expect.objectContaining({ type: 'birthday' }),
          expect.objectContaining({ type: 'anniversary' }),
        ]);
      });
    });
  });
});