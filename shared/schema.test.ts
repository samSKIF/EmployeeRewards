import { 
  insertUserSchema, 
  insertOrganizationSchema, 
  insertSubscriptionSchema,
  insertProductSchema,
  insertTransactionSchema 
} from './schema';
import { z } from 'zod';

describe('Schema Validation', () => {
  describe('insertUserSchema', () => {
    it('should validate valid user data', () => {
      const validUser = {
        username: 'testuser',
        password: 'password123',
        name: 'Test',
        email: 'test@example.com',
        organizationId: 1,
      };

      const result = insertUserSchema.parse(validUser);
      expect(result).toEqual(validUser);
    });

    it('should reject invalid email', () => {
      const invalidUser = {
        username: 'testuser',
        password: 'password123',
        name: 'Test',
        email: 'invalid-email',
        organizationId: 1,
      };

      expect(() => insertUserSchema.parse(invalidUser)).toThrow();
    });

    it('should require mandatory fields', () => {
      const incompleteUser = {
        username: 'testuser',
        // Missing required fields
      };

      expect(() => insertUserSchema.parse(incompleteUser)).toThrow();
    });

    it('should allow optional fields', () => {
      const userWithOptionals = {
        username: 'testuser',
        password: 'password123',
        name: 'Test',
        email: 'test@example.com',
        surname: 'User',
        phoneNumber: '+1234567890',
        department: 'Engineering',
        organizationId: 1,
      };

      const result = insertUserSchema.parse(userWithOptionals);
      expect(result.surname).toBe('User');
      expect(result.department).toBe('Engineering');
    });
  });

  describe('insertOrganizationSchema', () => {
    it('should validate valid organization data', () => {
      const validOrg = {
        name: 'Test Organization',
        type: 'client',
      };

      const result = insertOrganizationSchema.parse(validOrg);
      expect(result).toEqual(validOrg);
    });

    it('should allow optional contact info', () => {
      const orgWithContact = {
        name: 'Test Organization',
        type: 'corporate',
        contactEmail: 'contact@org.com',
        contactPhone: '+1234567890',
        superuserEmail: 'admin@org.com',
      };

      const result = insertOrganizationSchema.parse(orgWithContact);
      expect(result.contactEmail).toBe('contact@org.com');
    });

    it('should validate organization type', () => {
      const invalidType = {
        name: 'Test Organization',
        type: 'invalid_type',
      };

      expect(() => insertOrganizationSchema.parse(invalidType)).toThrow();
    });
  });

  describe('insertSubscriptionSchema', () => {
    it('should validate valid subscription data', () => {
      const validSubscription = {
        organizationId: 1,
        lastPaymentDate: new Date(),
        subscriptionPeriod: 'year',
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };

      const result = insertSubscriptionSchema.parse(validSubscription);
      expect(result.subscriptionPeriod).toBe('year');
    });

    it('should validate subscription period', () => {
      const invalidPeriod = {
        organizationId: 1,
        lastPaymentDate: new Date(),
        subscriptionPeriod: 'invalid',
        expirationDate: new Date(),
      };

      expect(() => insertSubscriptionSchema.parse(invalidPeriod)).toThrow();
    });

    it('should allow custom duration for custom period', () => {
      const customSubscription = {
        organizationId: 1,
        lastPaymentDate: new Date(),
        subscriptionPeriod: 'custom',
        customDurationDays: 180,
        expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      };

      const result = insertSubscriptionSchema.parse(customSubscription);
      expect(result.customDurationDays).toBe(180);
    });
  });

  describe('insertProductSchema', () => {
    it('should validate valid product data', () => {
      const validProduct = {
        name: 'Test Product',
        price: 99.99,
        description: 'A test product',
        categoryId: 1,
        organizationId: 1,
      };

      const result = insertProductSchema.parse(validProduct);
      expect(result.price).toBe(99.99);
    });

    it('should reject negative price', () => {
      const invalidProduct = {
        name: 'Test Product',
        price: -10,
        description: 'Invalid product',
        categoryId: 1,
        organizationId: 1,
      };

      expect(() => insertProductSchema.parse(invalidProduct)).toThrow();
    });
  });

  describe('insertTransactionSchema', () => {
    it('should validate earn transaction', () => {
      const earnTransaction = {
        accountId: 1,
        type: 'earn',
        amount: 100,
        reason: 'achievement',
        description: 'Monthly goal achieved',
      };

      const result = insertTransactionSchema.parse(earnTransaction);
      expect(result.type).toBe('earn');
      expect(result.amount).toBe(100);
    });

    it('should validate redeem transaction', () => {
      const redeemTransaction = {
        accountId: 1,
        type: 'redeem',
        amount: -50,
        reason: 'product',
        description: 'Coffee voucher',
        productId: 10,
      };

      const result = insertTransactionSchema.parse(redeemTransaction);
      expect(result.type).toBe('redeem');
      expect(result.amount).toBe(-50);
    });

    it('should validate transaction type', () => {
      const invalidType = {
        accountId: 1,
        type: 'invalid',
        amount: 100,
        reason: 'test',
        description: 'Test',
      };

      expect(() => insertTransactionSchema.parse(invalidType)).toThrow();
    });
  });
});