import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users, organizations } from '../shared/schema';
import { eq, desc, and, gte, lte, sum, count } from 'drizzle-orm';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Corporate Admin Authentication Middleware
interface AuthenticatedManagementRequest extends express.Request {
  corporateAdmin?: any;
}

const verifyCorporateAdmin = async (req: AuthenticatedManagementRequest, res: express.Response, next: express.NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id));

    if (!user || user.roleType !== 'corporate_admin') {
      return res.status(401).json({ message: 'Access denied. Corporate admin required.' });
    }

    req.corporateAdmin = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid authentication token' });
  }
};

// Corporate admins have all permissions by default
const checkPermission = (permission: string) => {
  return (req: AuthenticatedManagementRequest, res: express.Response, next: express.NextFunction) => {
    // Corporate admins have all permissions
    next();
  };
};

// ========== AUTHENTICATION ==========

// Corporate admin login
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Look for corporate admin by email or username
    const [corporateAdmin] = await db.select().from(users).where(
      username.includes('@') ? eq(users.email, username) : eq(users.username, username)
    );

    if (!corporateAdmin || corporateAdmin.roleType !== 'corporate_admin') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, corporateAdmin.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last seen
    await db.update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, corporateAdmin.id));

    const token = jwt.sign({ id: corporateAdmin.id }, JWT_SECRET, { expiresIn: '8h' });

    return res.json({
      token,
      user: {
        id: corporateAdmin.id,
        username: corporateAdmin.username || corporateAdmin.email,
        email: corporateAdmin.email,
        name: corporateAdmin.name,
        role: 'corporate_admin',
        permissions: corporateAdmin.permissions || { 
          manageCompanies: true, 
          manageProducts: true, 
          manageOrders: true,
          manageUsers: true,
          manageAnalytics: true
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current corporate admin user
router.get('/auth/me', verifyCorporateAdmin, (req: AuthenticatedManagementRequest, res) => {
  const { password, ...userWithoutPassword } = req.corporateAdmin!;
  res.json({
    id: userWithoutPassword.id,
    username: userWithoutPassword.username || userWithoutPassword.email,
    email: userWithoutPassword.email,
    name: userWithoutPassword.name,
    role: 'corporate_admin',
    permissions: userWithoutPassword.permissions || { 
      manageCompanies: true, 
      manageProducts: true, 
      manageOrders: true,
      manageUsers: true,
      manageAnalytics: true
    }
  });
});

// ========== COMPANY MANAGEMENT ==========

// Get all organizations (companies) with pagination and filters
router.get('/companies', verifyCorporateAdmin, checkPermission('manageCompanies'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = db.select().from(organizations);

    if (search) {
      query = query.where(eq(organizations.name, search as string));
    }

    // Note: organizations table uses 'isActive' field
    if (status === 'active') {
      query = query.where(eq(organizations.isActive, true));
    } else if (status === 'inactive') {
      query = query.where(eq(organizations.isActive, false));
    }

    const companyList = await query.limit(Number(limit)).offset(offset).orderBy(desc(organizations.createdAt));

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

// Get organization by ID
router.get("/organizations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [organization] = await managementDb.select()
      .from(organizations)
      .where(eq(organizations.id, parseInt(id)));

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Get organization statistics
    const stats = await getOrganizationStats(parseInt(id));

    // Ensure all fields are present with proper defaults
    const completeOrganization = {
      id: organization.id,
      name: organization.name || '',
      type: organization.type || 'client',
      status: organization.status || 'active',
      maxUsers: organization.maxUsers || null,
      contactName: organization.contactName || '',
      contactEmail: organization.contactEmail || '',
      contactPhone: organization.contactPhone || '',
      adminEmail: organization.adminEmail || '',
      industry: organization.industry || '',
      streetAddress: organization.streetAddress || '',
      city: organization.city || '',
      state: organization.state || '',
      zipCode: organization.zipCode || '',
      country: organization.country || '',
      website: organization.website || '',
      description: organization.description || '',
      logoUrl: organization.logoUrl || '',
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      stats
    };

    logger.info(`Returning complete organization data for ${id}:`, completeOrganization);
    res.json(completeOrganization);
  } catch (error: any) {
    logger.error("Error fetching organization:", error);
    res.status(500).json({ message: error.message || "Failed to fetch organization" });
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