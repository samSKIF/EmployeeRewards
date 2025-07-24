import { DatabaseStorage } from './storage';
import { db } from './db';
import { hash, compare } from 'bcrypt';
import { eq, and, desc, ne, sql, or, isNull, inArray } from 'drizzle-orm';

// Mock dependencies
jest.mock('./db');
jest.mock('bcrypt');
jest.mock('./middleware/suppliers');

const mockDb = db as jest.Mocked<typeof db>;
const mockHash = hash as jest.MockedFunction<typeof hash>;
const mockCompare = compare as jest.MockedFunction<typeof compare>;

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockFrom: jest.Mock;
  let mockWhere: jest.Mock;
  let mockReturning: jest.Mock;
  let mockValues: jest.Mock;
  let mockSet: jest.Mock;
  let mockOnConflictDoUpdate: jest.Mock;
  let mockOrderBy: jest.Mock;
  let mockLimit: jest.Mock;
  let mockOffset: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new DatabaseStorage();

    // Setup mock chain
    mockWhere = jest.fn().mockReturnThis();
    mockReturning = jest.fn().mockReturnThis();
    mockValues = jest.fn().mockReturnThis();
    mockSet = jest.fn().mockReturnThis();
    mockOnConflictDoUpdate = jest.fn().mockReturnThis();
    mockOrderBy = jest.fn().mockReturnThis();
    mockLimit = jest.fn().mockReturnThis();
    mockOffset = jest.fn().mockReturnThis();
    
    mockFrom = jest.fn().mockReturnValue({
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      offset: mockOffset,
    });
    
    mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
    mockInsert = jest.fn().mockReturnValue({ 
      values: mockValues,
      onConflictDoUpdate: mockOnConflictDoUpdate,
    });
    mockUpdate = jest.fn().mockReturnValue({
      set: mockSet,
      where: mockWhere,
      returning: mockReturning,
    });
    mockDelete = jest.fn().mockReturnValue({
      where: mockWhere,
      returning: mockReturning,
    });

    mockDb.select = mockSelect;
    mockDb.insert = mockInsert;
    mockDb.update = mockUpdate;
    mockDb.delete = mockDelete;
  });

  describe('User Management', () => {
    describe('getUser', () => {
      it('should return user by id', async () => {
        const mockUser = { 
          id: 1, 
          email: 'test@test.com', 
          name: 'Test User',
          organizationId: 1 
        };
        mockWhere.mockResolvedValue([mockUser]);

        const result = await storage.getUser(1);

        expect(mockSelect).toHaveBeenCalled();
        expect(mockFrom).toHaveBeenCalled();
        expect(mockWhere).toHaveBeenCalled();
        expect(result).toEqual(mockUser);
      });

      it('should return undefined if user not found', async () => {
        mockWhere.mockResolvedValue([]);

        const result = await storage.getUser(999);

        expect(result).toBeUndefined();
      });
    });

    describe('getUserByEmail', () => {
      it('should return user by email', async () => {
        const mockUser = { 
          id: 1, 
          email: 'test@test.com',
          name: 'Test User' 
        };
        mockWhere.mockResolvedValue([mockUser]);

        const result = await storage.getUserByEmail('test@test.com');

        expect(result).toEqual(mockUser);
      });

      it('should return undefined if email not found', async () => {
        mockWhere.mockResolvedValue([]);

        const result = await storage.getUserByEmail('notfound@test.com');

        expect(result).toBeUndefined();
      });
    });

    describe('checkDuplicateUser', () => {
      it('should check for duplicate email and name', async () => {
        // Mock email check
        mockWhere.mockResolvedValueOnce([{ id: 1 }]); // Email exists
        // Mock name check
        mockWhere.mockResolvedValueOnce([]); // Name doesn't exist

        const result = await storage.checkDuplicateUser(
          'existing@test.com',
          'New',
          'User'
        );

        expect(result).toEqual({
          emailExists: true,
          nameExists: false,
        });
      });

      it('should handle no duplicates', async () => {
        mockWhere.mockResolvedValue([]);

        const result = await storage.checkDuplicateUser(
          'new@test.com',
          'New',
          'User'
        );

        expect(result).toEqual({
          emailExists: false,
          nameExists: false,
        });
      });
    });

    describe('createUser', () => {
      it('should create a new user with hashed password', async () => {
        const newUser = {
          email: 'new@test.com',
          name: 'New User',
          password: 'plainpassword',
          username: 'newuser',
          organizationId: 1,
        };
        
        const hashedPassword = 'hashedpassword123';
        const createdUser = { ...newUser, id: 1, password: hashedPassword };
        
        mockHash.mockResolvedValue(hashedPassword);
        mockReturning.mockResolvedValue([createdUser]);

        const result = await storage.createUser(newUser);

        expect(mockHash).toHaveBeenCalledWith('plainpassword', 10);
        expect(mockInsert).toHaveBeenCalled();
        expect(mockValues).toHaveBeenCalledWith({
          ...newUser,
          password: hashedPassword,
          balance: 0,
        });
        expect(result).toEqual(createdUser);
      });

      it('should throw error if user creation fails', async () => {
        const newUser = {
          email: 'new@test.com',
          name: 'New User',
          password: 'plainpassword',
          username: 'newuser',
        };
        
        mockHash.mockResolvedValue('hashedpassword');
        mockReturning.mockRejectedValue(new Error('Database error'));

        await expect(storage.createUser(newUser)).rejects.toThrow('Database error');
      });
    });

    describe('getUsers', () => {
      it('should return paginated users for organization', async () => {
        const mockUsers = [
          { id: 1, name: 'User 1', organizationId: 1 },
          { id: 2, name: 'User 2', organizationId: 1 },
        ];
        mockLimit.mockReturnValue({ offset: mockOffset });
        mockOffset.mockResolvedValue(mockUsers);

        const result = await storage.getUsers(1, 10, 0);

        expect(mockWhere).toHaveBeenCalled();
        expect(mockOrderBy).toHaveBeenCalled();
        expect(mockLimit).toHaveBeenCalledWith(10);
        expect(mockOffset).toHaveBeenCalledWith(0);
        expect(result).toEqual(mockUsers);
      });

      it('should filter by status if provided', async () => {
        mockLimit.mockReturnValue({ offset: mockOffset });
        mockOffset.mockResolvedValue([]);

        await storage.getUsers(1, 10, 0, 'active');

        expect(mockWhere).toHaveBeenCalled();
      });
    });
  });

  describe('Authentication', () => {
    describe('verifyPassword', () => {
      it('should return true for correct password', async () => {
        mockCompare.mockResolvedValue(true);

        const result = await storage.verifyPassword('plain', 'hashed');

        expect(mockCompare).toHaveBeenCalledWith('plain', 'hashed');
        expect(result).toBe(true);
      });

      it('should return false for incorrect password', async () => {
        mockCompare.mockResolvedValue(false);

        const result = await storage.verifyPassword('wrong', 'hashed');

        expect(result).toBe(false);
      });
    });
  });

  describe('Points and Transactions', () => {
    describe('getUserBalance', () => {
      it('should return user balance', async () => {
        const mockAccount = { id: 1, userId: 1, balance: 100 };
        mockWhere.mockResolvedValue([mockAccount]);

        const result = await storage.getUserBalance(1);

        expect(result).toBe(100);
      });

      it('should return 0 if account not found', async () => {
        mockWhere.mockResolvedValue([]);

        const result = await storage.getUserBalance(999);

        expect(result).toBe(0);
      });
    });

    describe('earnPoints', () => {
      it('should create earn transaction and update balance', async () => {
        const userId = 1;
        const amount = 50;
        const reason = 'achievement';
        const description = 'Test achievement';
        
        // Mock account lookup
        const mockAccount = { id: 1, userId, balance: 100 };
        mockWhere.mockResolvedValueOnce([mockAccount]);
        
        // Mock transaction creation
        const mockTransaction = { 
          id: 1, 
          accountId: 1,
          type: 'earn',
          amount,
          reason,
          description,
        };
        mockReturning.mockResolvedValueOnce([mockTransaction]);
        
        // Mock balance update
        mockReturning.mockResolvedValueOnce([{ balance: 150 }]);

        const result = await storage.earnPoints(userId, amount, reason, description);

        expect(mockInsert).toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalled();
        expect(result).toEqual(mockTransaction);
      });

      it('should handle earn points for user without account', async () => {
        mockWhere.mockResolvedValueOnce([]); // No account found
        
        // Mock account creation
        const newAccount = { id: 2, userId: 2, balance: 0 };
        mockReturning.mockResolvedValueOnce([newAccount]);
        
        // Mock transaction creation
        const mockTransaction = { id: 1, amount: 50 };
        mockReturning.mockResolvedValueOnce([mockTransaction]);
        
        // Mock balance update
        mockReturning.mockResolvedValueOnce([{ balance: 50 }]);

        const result = await storage.earnPoints(2, 50, 'reward', 'New user reward');

        expect(mockInsert).toHaveBeenCalledTimes(2); // Account + Transaction
        expect(result).toBeDefined();
      });
    });

    describe('redeemPoints', () => {
      it('should create redeem transaction if sufficient balance', async () => {
        const userId = 1;
        const amount = 30;
        const productId = 1;
        
        // Mock account with sufficient balance
        const mockAccount = { id: 1, userId, balance: 100 };
        mockWhere.mockResolvedValueOnce([mockAccount]);
        
        // Mock transaction creation
        const mockTransaction = { 
          id: 1,
          type: 'redeem',
          amount: -amount,
        };
        mockReturning.mockResolvedValueOnce([mockTransaction]);
        
        // Mock balance update
        mockReturning.mockResolvedValueOnce([{ balance: 70 }]);

        const result = await storage.redeemPoints(userId, amount, 'Product redemption', productId);

        expect(result).toEqual(mockTransaction);
      });

      it('should throw error if insufficient balance', async () => {
        const mockAccount = { id: 1, userId: 1, balance: 20 };
        mockWhere.mockResolvedValueOnce([mockAccount]);

        await expect(
          storage.redeemPoints(1, 50, 'Product', 1)
        ).rejects.toThrow('Insufficient balance');
      });
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should only return users from same organization', async () => {
      const orgId = 1;
      mockLimit.mockReturnValue({ offset: mockOffset });
      mockOffset.mockResolvedValue([
        { id: 1, organizationId: orgId },
        { id: 2, organizationId: orgId },
      ]);

      const result = await storage.getUsers(orgId, 10, 0);

      expect(mockWhere).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result.every(u => u.organizationId === orgId)).toBe(true);
    });

    it('should count only active users for organization', async () => {
      const mockResult = [{ count: 25 }];
      mockWhere.mockResolvedValue(mockResult);

      const result = await storage.getUserCount(1, 'active');

      expect(mockWhere).toHaveBeenCalled();
      expect(result).toBe(25);
    });
  });
});