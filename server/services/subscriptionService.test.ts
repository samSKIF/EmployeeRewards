import { checkSubscriptionStatus, getActiveSubscriptionForOrg } from './subscriptionService';
import { db } from '../db';
import { subscriptions } from '@shared/schema';
import { eq, and, gte } from 'drizzle-orm';

jest.mock('../db');

const mockDb = db as jest.Mocked<typeof db>;

describe('Subscription Service', () => {
  let mockSelect: jest.Mock;
  let mockFrom: jest.Mock;
  let mockWhere: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockWhere = jest.fn().mockReturnThis();
    mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
    mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
    
    mockDb.select = mockSelect;
  });

  describe('checkSubscriptionStatus', () => {
    it('should return true for active subscription', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      
      mockWhere.mockResolvedValue([{
        id: 1,
        organizationId: 1,
        expirationDate: futureDate,
        isActive: true,
      }]);

      const result = await checkSubscriptionStatus(1);

      expect(result).toBe(true);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith(subscriptions);
    });

    it('should return false for expired subscription', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);
      
      mockWhere.mockResolvedValue([{
        id: 1,
        organizationId: 1,
        expirationDate: pastDate,
        isActive: true,
      }]);

      const result = await checkSubscriptionStatus(1);

      expect(result).toBe(false);
    });

    it('should return false for inactive subscription', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      
      mockWhere.mockResolvedValue([{
        id: 1,
        organizationId: 1,
        expirationDate: futureDate,
        isActive: false,
      }]);

      const result = await checkSubscriptionStatus(1);

      expect(result).toBe(false);
    });

    it('should return false if no subscription found', async () => {
      mockWhere.mockResolvedValue([]);

      const result = await checkSubscriptionStatus(1);

      expect(result).toBe(false);
    });

    it('should handle null organizationId', async () => {
      const result = await checkSubscriptionStatus(null);

      expect(result).toBe(false);
      expect(mockSelect).not.toHaveBeenCalled();
    });
  });

  describe('getActiveSubscriptionForOrg', () => {
    it('should return active subscription', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      
      const mockSubscription = {
        id: 1,
        organizationId: 1,
        subscribedUsers: 50,
        expirationDate: futureDate,
        isActive: true,
      };
      
      mockWhere.mockResolvedValue([mockSubscription]);

      const result = await getActiveSubscriptionForOrg(1);

      expect(result).toEqual(mockSubscription);
    });

    it('should return null for expired subscription', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);
      
      mockWhere.mockResolvedValue([{
        id: 1,
        expirationDate: pastDate,
        isActive: true,
      }]);

      const result = await getActiveSubscriptionForOrg(1);

      expect(result).toBeNull();
    });

    it('should return null if no subscription', async () => {
      mockWhere.mockResolvedValue([]);

      const result = await getActiveSubscriptionForOrg(1);

      expect(result).toBeNull();
    });
  });
});