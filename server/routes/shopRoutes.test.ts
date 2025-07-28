import request from 'supertest';
import express from 'express';
import shopRoutes from './shopRoutes';
import { storage } from '../storage';
import { verifyToken } from '../middleware/auth';

jest.mock('../storage');
jest.mock('../middleware/auth');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Shop Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    mockVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = {
        id: 1,
        email: 'test@test.com',
        organizationId: 1,
      };
      next();
    });
    
    app.use('/api/shop', shopRoutes);
  });

  describe('GET /api/shop/products', () => {
    it('should return available products', async () => {
      const mockProducts = [
        {
          id: 1,
          name: 'Coffee Voucher',
          description: 'Free coffee for a week',
          points: 100,
          category: 'food',
          availability: 50,
          image: '/products/coffee.jpg',
        },
        {
          id: 2,
          name: 'Gym Membership',
          description: '1-month gym access',
          points: 500,
          category: 'fitness',
          availability: 10,
        },
      ];
      
      mockStorage.getAvailableProducts.mockResolvedValue(mockProducts);

      const response = await request(app)
        .get('/api/shop/products')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProducts);
      expect(mockStorage.getAvailableProducts).toHaveBeenCalledWith(1);
    });

    it('should filter products by category', async () => {
      mockStorage.getAvailableProducts.mockResolvedValue([]);

      await request(app)
        .get('/api/shop/products')
        .query({ category: 'food' })
        .set('Authorization', 'Bearer test-token');

      expect(mockStorage.getAvailableProducts).toHaveBeenCalledWith(1, 'food');
    });
  });

  describe('POST /api/shop/purchase', () => {
    it('should process product purchase', async () => {
      const purchaseData = {
        productId: 1,
        quantity: 1,
      };
      
      const mockProduct = {
        id: 1,
        name: 'Coffee Voucher',
        points: 100,
        availability: 50,
      };
      
      const mockTransaction = {
        transaction: {
          id: 100,
          amount: -100,
          type: 'redeem',
        },
        newBalance: 400,
      };
      
      mockStorage.getProduct.mockResolvedValue(mockProduct);
      mockStorage.getUserBalance.mockResolvedValue(500);
      mockStorage.redeemPoints.mockResolvedValue(mockTransaction);
      mockStorage.createOrder.mockResolvedValue({
        id: 200,
        user_id: 1,
        productId: 1,
        status: 'pending',
      });

      const response = await request(app)
        .post('/api/shop/purchase')
        .set('Authorization', 'Bearer test-token')
        .send(purchaseData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        order: expect.any(Object),
        newBalance: 400,
      });
    });

    it('should reject purchase with insufficient balance', async () => {
      const mockProduct = {
        id: 1,
        points: 500,
        availability: 10,
      };
      
      mockStorage.getProduct.mockResolvedValue(mockProduct);
      mockStorage.getUserBalance.mockResolvedValue(100); // Not enough

      const response = await request(app)
        .post('/api/shop/purchase')
        .set('Authorization', 'Bearer test-token')
        .send({ productId: 1, quantity: 1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Insufficient balance');
    });

    it('should check product availability', async () => {
      const mockProduct = {
        id: 1,
        points: 100,
        availability: 0, // Out of stock
      };
      
      mockStorage.getProduct.mockResolvedValue(mockProduct);

      const response = await request(app)
        .post('/api/shop/purchase')
        .set('Authorization', 'Bearer test-token')
        .send({ productId: 1, quantity: 1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('out of stock');
    });
  });

  describe('GET /api/shop/orders', () => {
    it('should return user orders', async () => {
      const mockOrders = [
        {
          id: 1,
          productId: 1,
          product: { name: 'Coffee Voucher' },
          status: 'completed',
          createdAt: new Date(),
        },
        {
          id: 2,
          productId: 2,
          product: { name: 'Gym Membership' },
          status: 'pending',
          createdAt: new Date(),
        },
      ];
      
      mockStorage.getUserOrders.mockResolvedValue(mockOrders);

      const response = await request(app)
        .get('/api/shop/orders')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockOrders);
      expect(mockStorage.getUserOrders).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /api/shop/categories', () => {
    it('should return product categories', async () => {
      const mockCategories = [
        { id: 'food', name: 'Food & Beverages', icon: '🍔' },
        { id: 'fitness', name: 'Fitness & Wellness', icon: '💪' },
        { id: 'tech', name: 'Technology', icon: '💻' },
        { id: 'entertainment', name: 'Entertainment', icon: '🎮' },
      ];
      
      mockStorage.getProductCategories.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/shop/categories')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCategories);
    });
  });

  describe('GET /api/shop/balance', () => {
    it('should return user point balance', async () => {
      mockStorage.getUserBalance.mockResolvedValue(500);

      const response = await request(app)
        .get('/api/shop/balance')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ balance: 500 });
    });
  });
});