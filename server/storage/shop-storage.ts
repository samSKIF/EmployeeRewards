// Shop storage module for ThrivioHR platform
// Gold standard compliance: Enterprise-grade error handling and type safety

import { db } from '../db';
import {
  products,
  orders,
  users,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import type { ProductWithAvailable, OrderWithDetails } from '@shared/types';
import type { IShopStorage } from './interfaces';

export class ShopStorage implements IShopStorage {
  async getProducts(): Promise<Product[]> {
    try {
      return await db
        .select()
        .from(products)
        .where(eq(products.isActive, true))
        .orderBy(products.points);
    } catch (error: any) {
      console.error('Error getting products:', error?.message || 'unknown_error');
      return [];
    }
  }

  async deleteAllProducts(): Promise<void> {
    try {
      await db.delete(products);
    } catch (error: any) {
      console.error('Error deleting all products:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getProductsWithAvailability(_userId: number): Promise<ProductWithAvailable[]> {
    try {
      const allProducts = await this.getProducts();
      
      return allProducts.map((product) => ({
        ...product,
        supplier: product.supplier || '',
        isAvailable: true, // This will be calculated by the main storage with user balance
      }));
    } catch (error: any) {
      console.error('Error getting products with availability:', error?.message || 'unknown_error');
      return [];
    }
  }

  async getProductById(id: number): Promise<Product | undefined> {
    try {
      const [product] = await db.select().from(products).where(eq(products.id, id));
      return product;
    } catch (error: any) {
      console.error('Error getting product by ID:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    try {
      const [product] = await db.insert(products).values(productData).returning();
      return product;
    } catch (error: any) {
      console.error('Error creating product:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getOrdersByUserId(userId: number): Promise<OrderWithDetails[]> {
    try {
      const userOrders = await db
        .select({
          order: orders,
          product: products,
          user: users,
        })
        .from(orders)
        .where(eq(orders.userId, userId))
        .leftJoin(products, eq(orders.productId, products.id))
        .leftJoin(users, eq(orders.userId, users.id))
        .orderBy(desc(orders.createdAt));

      return userOrders.map((row) => ({
        ...row.order,
        user: row.user ? {
          ...row.user,
          createdAt: row.user.created_at || new Date(),
        } : {} as any,
        product: row.product!,
        transaction: null,
        productName: row.product?.name || 'Unknown Product',
        userName: row.user?.name || 'Unknown User',
        points: row.product?.points || 0,
      }));
    } catch (error: any) {
      console.error('Error getting orders by user ID:', error?.message || 'unknown_error');
      return [];
    }
  }

  async getAllOrders(): Promise<OrderWithDetails[]> {
    try {
      const allOrders = await db
        .select({
          order: orders,
          product: products,
          user: users,
        })
        .from(orders)
        .leftJoin(products, eq(orders.productId, products.id))
        .leftJoin(users, eq(orders.userId, users.id))
        .orderBy(desc(orders.createdAt));

      return allOrders.map((row) => ({
        ...row.order,
        user: row.user ? {
          ...row.user,
          createdAt: row.user.created_at || new Date(),
        } : {} as any,
        product: row.product!,
        transaction: null,
        productName: row.product?.name || 'Unknown Product',
        userName: row.user?.name || 'Unknown User',
        points: row.product?.points || 0,
      }));
    } catch (error: any) {
      console.error('Error getting all orders:', error?.message || 'unknown_error');
      return [];
    }
  }

  async getOrderById(id: number): Promise<OrderWithDetails | undefined> {
    try {
      const [orderData] = await db
        .select({
          order: orders,
          product: products,
          user: users,
        })
        .from(orders)
        .where(eq(orders.id, id))
        .leftJoin(products, eq(orders.productId, products.id))
        .leftJoin(users, eq(orders.userId, users.id));

      if (!orderData) return undefined;

      return {
        ...orderData.order,
        user: orderData.user ? {
          ...orderData.user,
          createdAt: orderData.user.created_at || new Date(),
        } : {} as any,
        product: orderData.product!,
        transaction: null,
        productName: orderData.product?.name || 'Unknown Product',
        userName: orderData.user?.name || 'Unknown User',
        points: orderData.product?.points || 0,
      };
    } catch (error: any) {
      console.error('Error getting order by ID:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    try {
      const [order] = await db.insert(orders).values(orderData).returning();
      return order;
    } catch (error: any) {
      console.error('Error creating order:', error?.message || 'unknown_error');
      throw error;
    }
  }
}