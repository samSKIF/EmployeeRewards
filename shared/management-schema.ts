import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  decimal,
  json,
  uuid,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Company/Client Management Tables
export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  domain: text('domain').unique(),
  databaseUrl: text('database_url').notNull(), // Each company has its own database
  subscriptionTier: text('subscription_tier').notNull().default('basic'), // basic, premium, enterprise
  maxEmployees: integer('max_employees').notNull().default(50),
  walletBalance: decimal('wallet_balance', { precision: 10, scale: 2 })
    .notNull()
    .default('0.00'),
  isActive: boolean('is_active').notNull().default(true),
  features: json('features')
    .$type<{
      leaveManagement: boolean;
      recognitionModule: boolean;
      socialFeed: boolean;
      celebrations: boolean;
      marketplace: boolean;
    }>()
    .notNull()
    .default({
      leaveManagement: true,
      recognitionModule: true,
      socialFeed: true,
      celebrations: true,
      marketplace: true,
    }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Marketplace - Merchants
export const merchants = pgTable('merchants', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  address: text('address'),
  apiKey: text('api_key').unique(),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 })
    .notNull()
    .default('10.00'), // percentage
  paymentMethod: text('payment_method').notNull().default('bank_transfer'), // bank_transfer, stripe, paypal
  bankDetails: json('bank_details'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Marketplace - Products
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  merchantId: integer('merchant_id')
    .references(() => merchants.id)
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(), // merchandise, giftcard, experience
  subcategory: text('subcategory'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  pointsPrice: integer('points_price').notNull(), // Price in company points
  imageUrl: text('image_url'),
  images: json('images').$type<string[]>().default([]),
  specifications: json('specifications'),
  stock: integer('stock').default(0),
  isActive: boolean('is_active').notNull().default(true),
  tags: json('tags').$type<string[]>().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Orders Management
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: integer('company_id')
    .references(() => companies.id)
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  merchantId: integer('merchant_id')
    .references(() => merchants.id)
    .notNull(),
  employeeId: text('employee_id').notNull(), // ID from company's database
  employeeName: text('employee_name').notNull(),
  employeeEmail: text('employee_email').notNull(),
  quantity: integer('quantity').notNull().default(1),
  pointsUsed: integer('points_used').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'), // pending, processing, shipped, delivered, cancelled
  shippingAddress: json('shipping_address'),
  trackingNumber: text('tracking_number'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Invoices to Merchants
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  merchantId: integer('merchant_id')
    .references(() => merchants.id)
    .notNull(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal('commission_amount', {
    precision: 10,
    scale: 2,
  }).notNull(),
  payoutAmount: decimal('payout_amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'), // pending, paid, overdue
  dueDate: timestamp('due_date').notNull(),
  paidAt: timestamp('paid_at'),
  orderIds: json('order_ids').$type<string[]>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Wallet Transactions (Company Credits/Debits)
export const walletTransactions = pgTable('wallet_transactions', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id)
    .notNull(),
  type: text('type').notNull(), // credit, debit, purchase, refund
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  orderId: uuid('order_id').references(() => orders.id),
  balanceBefore: decimal('balance_before', {
    precision: 10,
    scale: 2,
  }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 10, scale: 2 }).notNull(),
  processedBy: integer('processed_by'), // Admin user ID
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Management System Users (Internal Staff)
export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('admin'), // admin, super_admin, support
  permissions: json('permissions')
    .$type<{
      manageCompanies: boolean;
      manageMerchants: boolean;
      manageProducts: boolean;
      manageOrders: boolean;
      manageFinances: boolean;
      viewAnalytics: boolean;
    }>()
    .notNull()
    .default({
      manageCompanies: true,
      manageMerchants: true,
      manageProducts: true,
      manageOrders: true,
      manageFinances: false,
      viewAnalytics: true,
    }),
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Company Analytics/Engagement Tracking
export const companyAnalytics = pgTable('company_analytics', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id)
    .notNull(),
  date: timestamp('date').notNull(),
  activeEmployees: integer('active_employees').notNull().default(0),
  totalLogins: integer('total_logins').notNull().default(0),
  postsCreated: integer('posts_created').notNull().default(0),
  recognitionsGiven: integer('recognitions_given').notNull().default(0),
  ordersPlaced: integer('orders_placed').notNull().default(0),
  pointsSpent: integer('points_spent').notNull().default(0),
  engagementScore: decimal('engagement_score', {
    precision: 5,
    scale: 2,
  }).default('0.00'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Insert Schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMerchantSchema = createInsertSchema(merchants).omit({
  id: true,
  createdAt: true,
});
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});
export const insertWalletTransactionSchema = createInsertSchema(
  walletTransactions
).omit({ id: true, createdAt: true });

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<
  typeof insertWalletTransactionSchema
>;
