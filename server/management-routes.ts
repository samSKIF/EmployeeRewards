import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { managementDb } from './management-db';
import { 
  companies, 
  merchants, 
  products, 
  orders, 
  invoices, 
  walletTransactions, 
  adminUsers, 
  companyAnalytics,
  insertCompanySchema,
  insertMerchantSchema,
  insertProductSchema,
  insertAdminUserSchema,
  type Company,
  type Merchant,
  type Product,
  type Order,
  type AdminUser
} from '@shared/management-schema';
import { eq, desc, and, gte, lte, sum, count } from 'drizzle-orm';

const router = express.Router();
const JWT_SECRET = process.env.MANAGEMENT_JWT_SECRET || 'management-secret-key';

// Management Authentication Middleware
interface AuthenticatedManagementRequest extends express.Request {
  managementUser?: AdminUser;
}

const verifyManagementToken = async (req: AuthenticatedManagementRequest, res: express.Response, next: express.NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No management token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const [adminUser] = await managementDb.select().from(adminUsers).where(eq(adminUsers.id, decoded.id));
    
    if (!adminUser || !adminUser.isActive) {
      return res.status(401).json({ message: 'Invalid management token' });
    }

    req.managementUser = adminUser;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid management token' });
  }
};

// Permission check middleware
const checkPermission = (permission: string) => {
  return (req: AuthenticatedManagementRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.managementUser?.permissions) {
      return res.status(403).json({ message: 'No permissions defined' });
    }
    
    const permissions = req.managementUser.permissions as any;
    if (!permissions[permission]) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

// ========== AUTHENTICATION ==========

// Login to management system
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const [adminUser] = await managementDb.select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username));
    
    if (!adminUser || !adminUser.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, adminUser.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    await managementDb.update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.id, adminUser.id));
    
    const token = jwt.sign({ id: adminUser.id }, JWT_SECRET, { expiresIn: '8h' });
    
    res.json({
      token,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        permissions: adminUser.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current management user
router.get('/auth/me', verifyManagementToken, (req: AuthenticatedManagementRequest, res) => {
  const { password, ...userWithoutPassword } = req.managementUser!;
  res.json(userWithoutPassword);
});

// ========== COMPANY MANAGEMENT ==========

// Get all companies with pagination and filters
router.get('/companies', verifyManagementToken, checkPermission('manageCompanies'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = managementDb.select().from(companies);
    
    if (search) {
      query = query.where(eq(companies.name, search as string));
    }
    
    if (status === 'active') {
      query = query.where(eq(companies.isActive, true));
    } else if (status === 'inactive') {
      query = query.where(eq(companies.isActive, false));
    }
    
    const companyList = await query.limit(Number(limit)).offset(offset).orderBy(desc(companies.createdAt));
    
    res.json({
      companies: companyList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: companyList.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Create new company
router.post('/companies', verifyManagementToken, checkPermission('manageCompanies'), async (req, res) => {
  try {
    const companyData = insertCompanySchema.parse(req.body);
    
    // In a real implementation, you would:
    // 1. Create a new database for this company
    // 2. Set up their schema
    // 3. Generate database URL
    const newCompanyDbUrl = `postgresql://company_${Date.now()}@localhost/company_db`;
    
    const [newCompany] = await managementDb.insert(companies).values({
      ...companyData,
      databaseUrl: newCompanyDbUrl
    }).returning();
    
    res.status(201).json(newCompany);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Update company features and settings
router.patch('/companies/:id', verifyManagementToken, checkPermission('manageCompanies'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const [updatedCompany] = await managementDb.update(companies)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(companies.id, Number(id)))
      .returning();
    
    res.json(updatedCompany);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// Credit company wallet
router.post('/companies/:id/credit', verifyManagementToken, checkPermission('manageFinances'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    
    // Get current balance
    const [company] = await managementDb.select().from(companies).where(eq(companies.id, Number(id)));
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const currentBalance = Number(company.walletBalance);
    const newBalance = currentBalance + Number(amount);
    
    // Update company balance
    await managementDb.update(companies)
      .set({ walletBalance: newBalance.toString() })
      .where(eq(companies.id, Number(id)));
    
    // Record transaction
    await managementDb.insert(walletTransactions).values({
      companyId: Number(id),
      type: 'credit',
      amount: amount.toString(),
      description: description || 'Manual credit',
      balanceBefore: currentBalance.toString(),
      balanceAfter: newBalance.toString(),
      processedBy: req.managementUser!.id
    });
    
    res.json({ 
      message: 'Company wallet credited successfully',
      newBalance: newBalance.toString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to credit wallet' });
  }
});

// ========== MERCHANT MANAGEMENT ==========

// Get all merchants
router.get('/merchants', verifyManagementToken, checkPermission('manageMerchants'), async (req, res) => {
  try {
    const merchantList = await managementDb.select().from(merchants).orderBy(desc(merchants.createdAt));
    res.json(merchantList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch merchants' });
  }
});

// Create new merchant
router.post('/merchants', verifyManagementToken, checkPermission('manageMerchants'), async (req, res) => {
  try {
    const merchantData = insertMerchantSchema.parse(req.body);
    
    // Generate API key for merchant
    const apiKey = `merchant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const [newMerchant] = await managementDb.insert(merchants).values({
      ...merchantData,
      apiKey
    }).returning();
    
    res.status(201).json(newMerchant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create merchant' });
  }
});

// ========== PRODUCT MANAGEMENT ==========

// Get all products
router.get('/products', verifyManagementToken, checkPermission('manageProducts'), async (req, res) => {
  try {
    const { category, merchantId } = req.query;
    
    let query = managementDb.select({
      id: products.id,
      name: products.name,
      description: products.description,
      category: products.category,
      price: products.price,
      pointsPrice: products.pointsPrice,
      imageUrl: products.imageUrl,
      stock: products.stock,
      isActive: products.isActive,
      merchantName: merchants.name,
      merchantId: products.merchantId,
      createdAt: products.createdAt
    }).from(products).leftJoin(merchants, eq(products.merchantId, merchants.id));
    
    if (category) {
      query = query.where(eq(products.category, category as string));
    }
    
    if (merchantId) {
      query = query.where(eq(products.merchantId, Number(merchantId)));
    }
    
    const productList = await query.orderBy(desc(products.createdAt));
    res.json(productList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Create new product
router.post('/products', verifyManagementToken, checkPermission('manageProducts'), async (req, res) => {
  try {
    const productData = insertProductSchema.parse(req.body);
    
    const [newProduct] = await managementDb.insert(products).values(productData).returning();
    
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// ========== ORDER MANAGEMENT ==========

// Get all orders with details
router.get('/orders', verifyManagementToken, checkPermission('manageOrders'), async (req, res) => {
  try {
    const { status, companyId, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = managementDb.select({
      id: orders.id,
      employeeName: orders.employeeName,
      employeeEmail: orders.employeeEmail,
      quantity: orders.quantity,
      pointsUsed: orders.pointsUsed,
      totalAmount: orders.totalAmount,
      status: orders.status,
      trackingNumber: orders.trackingNumber,
      createdAt: orders.createdAt,
      productName: products.name,
      companyName: companies.name,
      merchantName: merchants.name
    }).from(orders)
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(companies, eq(orders.companyId, companies.id))
      .leftJoin(merchants, eq(orders.merchantId, merchants.id));
    
    if (status) {
      query = query.where(eq(orders.status, status as string));
    }
    
    if (companyId) {
      query = query.where(eq(orders.companyId, Number(companyId)));
    }
    
    const orderList = await query.limit(Number(limit)).offset(offset).orderBy(desc(orders.createdAt));
    
    res.json({
      orders: orderList,
      pagination: {
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status
router.patch('/orders/:id/status', verifyManagementToken, checkPermission('manageOrders'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;
    
    const updates: any = { status, updatedAt: new Date() };
    if (trackingNumber) {
      updates.trackingNumber = trackingNumber;
    }
    
    const [updatedOrder] = await managementDb.update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// ========== ANALYTICS DASHBOARD ==========

// Get company engagement analytics
router.get('/analytics/companies/:id', verifyManagementToken, checkPermission('viewAnalytics'), async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    // Get recent analytics data
    let query = managementDb.select().from(companyAnalytics).where(eq(companyAnalytics.companyId, Number(id)));
    
    if (startDate && endDate) {
      query = query.where(and(
        gte(companyAnalytics.date, new Date(startDate as string)),
        lte(companyAnalytics.date, new Date(endDate as string))
      ));
    }
    
    const analytics = await query.orderBy(desc(companyAnalytics.date)).limit(30);
    
    // Get summary stats
    const summary = await managementDb.select({
      totalOrders: sum(companyAnalytics.ordersPlaced),
      totalPointsSpent: sum(companyAnalytics.pointsSpent),
      avgEngagement: sum(companyAnalytics.engagementScore)
    }).from(companyAnalytics).where(eq(companyAnalytics.companyId, Number(id)));
    
    res.json({
      analytics,
      summary: summary[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get overall platform stats
router.get('/analytics/platform', verifyManagementToken, checkPermission('viewAnalytics'), async (req, res) => {
  try {
    // Get platform-wide statistics
    const [companiesCount] = await managementDb.select({ count: count() }).from(companies);
    const [merchantsCount] = await managementDb.select({ count: count() }).from(merchants);
    const [productsCount] = await managementDb.select({ count: count() }).from(products);
    const [ordersCount] = await managementDb.select({ count: count() }).from(orders);
    
    // Get revenue and order stats
    const [revenueStats] = await managementDb.select({
      totalRevenue: sum(orders.totalAmount),
      totalPointsUsed: sum(orders.pointsUsed)
    }).from(orders);
    
    res.json({
      companies: companiesCount.count,
      merchants: merchantsCount.count,
      products: productsCount.count,
      orders: ordersCount.count,
      totalRevenue: revenueStats.totalRevenue || '0',
      totalPointsUsed: revenueStats.totalPointsUsed || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch platform analytics' });
  }
});

export default router;