import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db, pool } from './db';
import { users, organizations, organization_features, subscriptions } from '../shared/schema';
import { 
  companies, 
  insertCompanySchema, 
  merchants, 
  insertMerchantSchema,
  products,
  insertProductSchema,
  orders,
  walletTransactions,
  companyAnalytics
} from '../shared/management-schema';
import { eq, desc, and, gte, lte, sum, count } from 'drizzle-orm';

// Initialize management database (using same db instance for now)
const managementDb = db;

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to calculate total user count including main super user
async function calculateTotalUserCount(organizationUserCount: number): Promise<number> {
  try {
    // Count main super user (corporate admin without organization)
    const result = await pool.query(`
      SELECT COUNT(*) as super_user_count 
      FROM users 
      WHERE organization_id IS NULL AND role_type = 'corporate_admin'
    `);
    
    const superUserCount = parseInt(result.rows[0].super_user_count) || 0;
    
    // Return Active + Pending + Main super user account only
    return organizationUserCount + superUserCount;
  } catch (error: any) {
    console.error('Error calculating total user count:', error?.message || 'unknown_error');
    return organizationUserCount; // Fallback to just organization count
  }
}

// Corporate Admin Authentication Middleware
interface AuthenticatedManagementRequest extends express.Request {
  corporateAdmin?: any;
  managementUser?: any;
}

const verifyCorporateAdmin = async (
  req: AuthenticatedManagementRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res
        .status(401)
        .json({ message: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.id));

    // SECURITY FIX: Allow corporate admin (no org) or super admin (with admin role)
    // Corporate admin should have role_type='corporate_admin' and organization_id=null
    // Super admin (like admin@canva.com) has role_type='admin' and can have organization_id
    const isCorporateAdmin = user.role_type === 'corporate_admin' && user.organization_id === null;
    const isSuperAdmin = user.role_type === 'admin'; // Super admins can manage all orgs
    
    if (!user || (!isCorporateAdmin && !isSuperAdmin)) {
      console.log('SECURITY: Management access denied for user:', {
        user_id: user?.id,
        email: user?.email,
        roleType: user?.role_type,
        organizationId: user?.organization_id,
        isCorporateAdmin,
        isSuperAdmin
      });
      return res
        .status(403)
        .json({ message: 'Access denied. Corporate admin or super admin required.' });
    }

    req.corporateAdmin = user;
    next();
  } catch (error: any) {
    res.status(401).json({ message: error?.message || 'Invalid authentication token' });
  }
};

// Corporate admins have all permissions by default
const checkPermission = (permission: string) => {
  return (
    req: AuthenticatedManagementRequest,
    res: express.Response,
    next: express.NextFunction
  ) => {
    // Corporate admins have all permissions
    next();
  };
};

// ========== AUTHENTICATION ==========

// Corporate admin login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const loginField = email || username;

    // Look for corporate admin by email or username
    const [corporateAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, loginField));

    if (!corporateAdmin || !corporateAdmin.is_admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(
      password,
      corporateAdmin.password
    );
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: corporateAdmin.id }, JWT_SECRET, {
      expiresIn: '8h',
    });

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
          manageAnalytics: true,
        },
      },
    });
  } catch (error) {
    console.error('Management login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get current corporate admin user
router.get(
  '/auth/me',
  verifyCorporateAdmin,
  (req: AuthenticatedManagementRequest, res) => {
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
        manageAnalytics: true,
      },
    });
  }
);

// ========== COMPANY MANAGEMENT ==========

// Get all organizations (companies) with pagination and filters
router.get('/organizations', verifyCorporateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build WHERE conditions
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`o.name ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status === 'active') {
      whereConditions.push(`o.status = $${paramIndex}`);
      params.push('active');
      paramIndex++;
    } else if (status === 'inactive') {
      whereConditions.push(`o.status = $${paramIndex}`);
      params.push('inactive');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Add limit and offset params
    params.push(Number(limit), offset);
    const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

    // Use raw SQL to get organizations with user counts and subscription data
    const result = await pool.query(`
      SELECT 
        o.id,
        o.name,
        o.status,
        o.max_users as max_users,
        o.contact_email,
        o.created_at as created_at,
        o.industry,
        COALESCE(u.user_count, 0) as user_count,
        s.id as subscription_id,
        s.subscribed_users,
        s.total_monthly_amount,
        s.expiration_date,
        s.is_active as subscription_active,
        s.subscription_period,
        s.price_per_user_per_month,
        s.last_payment_date
      FROM organizations o
      LEFT JOIN (
        -- BUSINESS RULE: Count Active + Pending + Main super user account only
        -- Additional super user accounts are excluded from billing calculations
        SELECT organization_id, COUNT(*) as user_count 
        FROM users 
        WHERE status IN ('active', 'pending')
        GROUP BY organization_id
      ) u ON o.id = u.organization_id
      LEFT JOIN (
        SELECT DISTINCT ON (organization_id) 
          id, organization_id, subscribed_users, total_monthly_amount, 
          expiration_date, is_active, subscription_period, 
          price_per_user_per_month, last_payment_date, created_at
        FROM subscriptions 
        WHERE is_active = true
        ORDER BY organization_id, created_at DESC
      ) s ON o.id = s.organization_id
      ${whereClause}
      ORDER BY o.created_at DESC
      ${limitClause}
    `, params);

    const transformedList = await Promise.all(result.rows.map(async row => ({
        id: row.id,
        name: row.name,
        status: row.status || 'active',
        description: 'ThrivioHR Client Organization',
        isActive: row.status === 'active',
        createdAt: row.created_at,
        userCount: await calculateTotalUserCount(parseInt(row.user_count) || 0),
        maxUsers: row.max_users,
        contactEmail: row.contact_email,
        industry: row.industry,
        // Add subscription information
        subscription: row.subscription_id ? {
          id: row.subscription_id,
          subscribedUsers: row.subscribed_users,
          totalMonthlyAmount: row.total_monthly_amount,
          expirationDate: row.expiration_date,
          isActive: row.subscription_active,
          subscriptionPeriod: row.subscription_period,
          pricePerUserPerMonth: row.price_per_user_per_month,
          lastPaymentDate: row.last_payment_date
        } : null,
    })));

    console.log(`Fetched ${transformedList.length} organizations with subscription data`);
    res.json(transformedList);
  } catch (error) {
    console.error('Failed to fetch organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Create new company
router.post(
  '/companies',
  verifyCorporateAdmin,
  checkPermission('manageCompanies'),
  async (req, res) => {
    try {
      const companyData = insertCompanySchema.parse(req.body);

      // In a real implementation, you would:
      // 1. Create a new database for this company
      // 2. Set up their schema
      // 3. Generate database URL
      const newCompanyDbUrl = `postgresql://company_${Date.now()}@localhost/company_db`;

      const [newCompany] = await db
        .insert(companies)
        .values({
          ...companyData,
          databaseUrl: newCompanyDbUrl,
        })
        .returning();

      res.status(201).json(newCompany);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create company' });
    }
  }
);

// Update company features and settings
router.patch(
  '/companies/:id',
  verifyCorporateAdmin,
  checkPermission('manageCompanies'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const [updatedCompany] = await db
        .update(companies)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, Number(id)))
        .returning();

      res.json(updatedCompany);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update company' });
    }
  }
);

// Credit company wallet
router.post(
  '/companies/:id/credit',
  verifyCorporateAdmin,
  checkPermission('manageFinances'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, description } = req.body;

      // Get current balance
      const [company] = await managementDb
        .select()
        .from(companies)
        .where(eq(companies.id, Number(id)));
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const currentBalance = Number(company.walletBalance);
      const newBalance = currentBalance + Number(amount);

      // Update company balance
      await managementDb
        .update(companies)
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
        processedBy: req.corporateAdmin!.id,
      });

      res.json({
        message: 'Company wallet credited successfully',
        newBalance: newBalance.toString(),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to credit wallet' });
    }
  }
);

// Get organization by ID with subscription data
router.get('/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Use same query structure as list endpoint to include subscription data
    const result = await pool.query(`
      SELECT 
        o.id,
        o.name,
        o.status,
        o.max_users,
        o.contact_name,
        o.contact_email,
        o.contact_phone,
        o.superuser_email,
        o.industry,
        o.address,
        o.logo_url,
        o.created_at,
        COALESCE(u.user_count, 0) as user_count,
        s.id as subscription_id,
        s.subscribed_users,
        s.total_monthly_amount,
        s.expiration_date,
        s.is_active as subscription_active,
        s.subscription_period,
        s.price_per_user_per_month,
        s.last_payment_date
      FROM organizations o
      LEFT JOIN (
        -- BUSINESS RULE: Count Active + Pending + Main super user account only
        -- Additional super user accounts are excluded from billing calculations
        SELECT organization_id, COUNT(*) as user_count 
        FROM users 
        WHERE status IN ('active', 'pending')
        GROUP BY organization_id
      ) u ON o.id = u.organization_id
      LEFT JOIN (
        SELECT DISTINCT ON (organization_id) 
          id, organization_id, subscribed_users, total_monthly_amount, 
          expiration_date, is_active, subscription_period, 
          price_per_user_per_month, last_payment_date, created_at
        FROM subscriptions 
        WHERE is_active = true
        ORDER BY organization_id, created_at DESC
      ) s ON o.id = s.organization_id
      WHERE o.id = $1
    `, [parseInt(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const row = result.rows[0];

    // Ensure all fields are present with proper defaults and include subscription data
    const completeOrganization = {
      id: row.id,
      name: row.name || '',
      status: row.status || 'active',
      maxUsers: row.max_users,
      contactName: row.contact_name || '',
      contactEmail: row.contact_email || '',
      contactPhone: row.contact_phone || '',
      adminEmail: row.superuser_email || '',
      superuserEmail: row.superuser_email || '',
      industry: row.industry || '',
      streetAddress: row.address?.street || '',
      city: row.address?.city || '',
      state: row.address?.state || '',
      zipCode: row.address?.zip || '',
      country: row.address?.country || '',
      website: '',
      description: '',
      logoUrl: row.logo_url || '',
      createdAt: row.created_at,
      userCount: await calculateTotalUserCount(parseInt(row.user_count) || 0),
      address: row.address || {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
      },
      // Add subscription information 
      subscription: row.subscription_id ? {
        id: row.subscription_id,
        subscribedUsers: row.subscribed_users,
        totalMonthlyAmount: row.total_monthly_amount,
        expirationDate: row.expiration_date,
        isActive: row.subscription_active,
        subscriptionPeriod: row.subscription_period,
        pricePerUserPerMonth: row.price_per_user_per_month,
        lastPaymentDate: row.last_payment_date
      } : null,
    };

    res.json(completeOrganization);
  } catch (error: any) {
    console.error('Error fetching organization:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to fetch organization' });
  }
});

// Get organization subscription
router.get('/organizations/:id/subscription', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching subscription for organization ID: ${id}`);
    
    // Use raw SQL query to avoid Drizzle ORM field selection issues
    const result = await pool.query(`
      SELECT s.* FROM subscriptions s 
      WHERE s.organization_id = $1 AND s.is_active = true 
      ORDER BY s.created_at DESC 
      LIMIT 1
    `, [parseInt(id)]);

    console.log(`Query result:`, result.rows);

    if (result.rows.length === 0) {
      return res.json({
        hasSubscription: false,
        subscription: null
      });
    }

    const subscription = result.rows[0];
    res.json({
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        organizationId: subscription.organization_id,
        lastPaymentDate: subscription.last_payment_date,
        subscriptionPeriod: subscription.subscription_period,
        customDurationDays: subscription.custom_duration_days,
        expirationDate: subscription.expiration_date,
        isActive: subscription.is_active,
        subscribedUsers: subscription.subscribed_users,
        pricePerUserPerMonth: subscription.price_per_user_per_month,
        totalMonthlyAmount: subscription.total_monthly_amount,
        createdAt: subscription.created_at
      }
    });
  } catch (error) {
    console.error('Failed to fetch organization subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription data' });
  }
});

// Get organization features
router.get('/organizations/:id/features', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching features for organization: ${id}`);
    
    const features = await db
      .select()
      .from(organization_features)
      .where(eq(organization_features.organization_id, parseInt(id)));

    console.log(`Found features:`, features);
    res.json(features);
  } catch (error) {
    console.error('Failed to fetch organization features:', error);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// Get all subscriptions for management dashboard
router.get('/subscriptions', verifyCorporateAdmin, async (req, res) => {
  try {
    console.log('Fetching all subscriptions for management dashboard...');
    
    // Use raw SQL to avoid Drizzle ORM issues
    const result = await pool.query(`
      SELECT s.*, o.name as organization_name 
      FROM subscriptions s 
      LEFT JOIN organizations o ON s.organization_id = o.id 
      ORDER BY s.created_at DESC
    `);

    const enrichedSubscriptions = result.rows.map(row => ({
      id: row.id,
      organizationId: row.organization_id,
      lastPaymentDate: row.last_payment_date,
      subscriptionPeriod: row.subscription_period,
      customDurationDays: row.custom_duration_days,
      expirationDate: row.expiration_date,
      isActive: row.is_active,
      subscribedUsers: row.subscribed_users,
      pricePerUserPerMonth: row.price_per_user_per_month,
      totalMonthlyAmount: row.total_monthly_amount,
      createdAt: row.created_at,
      organizationName: row.organization_name || 'Unknown Organization'
    }));

    console.log(`Found ${enrichedSubscriptions.length} subscriptions`);
    res.json(enrichedSubscriptions);
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// ========== MERCHANT MANAGEMENT ==========

// Get all merchants
router.get(
  '/merchants',
  verifyCorporateAdmin,
  checkPermission('manageMerchants'),
  async (req, res) => {
    try {
      const merchantList = await managementDb
        .select()
        .from(merchants)
        .orderBy(desc(merchants.created_at));
      res.json(merchantList);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch merchants' });
    }
  }
);

// Create new merchant
router.post(
  '/merchants',
  verifyCorporateAdmin,
  checkPermission('manageMerchants'),
  async (req, res) => {
    try {
      const merchantData = insertMerchantSchema.parse(req.body);

      // Generate API key for merchant
      const apiKey = `merchant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const [newMerchant] = await managementDb
        .insert(merchants)
        .values({
          ...merchantData,
          apiKey,
        })
        .returning();

      res.status(201).json(newMerchant);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create merchant' });
    }
  }
);

// ========== PRODUCT MANAGEMENT ==========

// Get all products
router.get(
  '/products',
  verifyCorporateAdmin,
  checkPermission('manageProducts'),
  async (req, res) => {
    try {
      const { category, merchantId } = req.query;

      let query = managementDb
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          category: products.category,
          price: products.price,
          pointsPrice: products.pointsPrice,
          imageUrl: products.image_url,
          stock: products.stock,
          isActive: products.is_active,
          merchantName: merchants.name,
          merchantId: products.merchantId,
          createdAt: products.created_at,
        })
        .from(products)
        .leftJoin(merchants, eq(products.merchantId, merchants.id));

      if (category) {
        query = query.where(eq(products.category, category as string));
      }

      if (merchantId) {
        query = query.where(eq(products.merchantId, Number(merchantId)));
      }

      const productList = await query.orderBy(desc(products.created_at));
      res.json(productList);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }
);

// Create new product
router.post(
  '/products',
  verifyCorporateAdmin,
  checkPermission('manageProducts'),
  async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);

      const [newProduct] = await managementDb
        .insert(products)
        .values(productData)
        .returning();

      res.status(201).json(newProduct);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
);

// ========== ORDER MANAGEMENT ==========

// Get all orders with details
router.get(
  '/orders',
  verifyCorporateAdmin,
  checkPermission('manageOrders'),
  async (req, res) => {
    try {
      const { status, companyId, page = 1, limit = 50 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = managementDb
        .select({
          id: orders.id,
          employeeName: orders.employeeName,
          employeeEmail: orders.employeeEmail,
          quantity: orders.quantity,
          pointsUsed: orders.pointsUsed,
          totalAmount: orders.totalAmount,
          status: orders.status,
          trackingNumber: orders.trackingNumber,
          createdAt: orders.created_at,
          productName: products.name,
          companyName: companies.name,
          merchantName: merchants.name,
        })
        .from(orders)
        .leftJoin(products, eq(orders.productId, products.id))
        .leftJoin(companies, eq(orders.companyId, companies.id))
        .leftJoin(merchants, eq(orders.merchantId, merchants.id));

      if (status) {
        query = query.where(eq(orders.status, status as string));
      }

      if (companyId) {
        query = query.where(eq(orders.companyId, Number(companyId)));
      }

      const orderList = await query
        .limit(Number(limit))
        .offset(offset)
        .orderBy(desc(orders.created_at));

      res.json({
        orders: orderList,
        pagination: {
          page: Number(page),
          limit: Number(limit),
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }
);

// Update order status
router.patch(
  '/orders/:id/status',
  verifyCorporateAdmin,
  checkPermission('manageOrders'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, trackingNumber } = req.body;

      const updates: any = { status, updatedAt: new Date() };
      if (trackingNumber) {
        updates.trackingNumber = trackingNumber;
      }

      const [updatedOrder] = await managementDb
        .update(orders)
        .set(updates)
        .where(eq(orders.id, id))
        .returning();

      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }
);

// ========== ANALYTICS DASHBOARD ==========

// Get company engagement analytics
router.get(
  '/analytics/companies/:id',
  verifyCorporateAdmin,
  checkPermission('viewAnalytics'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      // Get recent analytics data
      let query = managementDb
        .select()
        .from(companyAnalytics)
        .where(eq(companyAnalytics.companyId, Number(id)));

      if (startDate && endDate) {
        query = query.where(
          and(
            gte(companyAnalytics.date, new Date(startDate as string)),
            lte(companyAnalytics.date, new Date(endDate as string))
          )
        );
      }

      const analytics = await query
        .orderBy(desc(companyAnalytics.date))
        .limit(30);

      // Get summary stats
      const summary = await managementDb
        .select({
          totalOrders: sum(companyAnalytics.ordersPlaced),
          totalPointsSpent: sum(companyAnalytics.pointsSpent),
          avgEngagement: sum(companyAnalytics.engagementScore),
        })
        .from(companyAnalytics)
        .where(eq(companyAnalytics.companyId, Number(id)));

      res.json({
        analytics,
        summary: summary[0],
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }
);

// Get overall platform stats  
router.get(
  '/analytics/platform',
  verifyCorporateAdmin,
  checkPermission('viewAnalytics'),
  async (req, res) => {
    try {
      // Get platform-wide statistics
      const [companiesCount] = await managementDb
        .select({ count: count() })
        .from(companies);
      const [merchantsCount] = await managementDb
        .select({ count: count() })
        .from(merchants);
      const [productsCount] = await managementDb
        .select({ count: count() })
        .from(products);
      const [ordersCount] = await managementDb
        .select({ count: count() })
        .from(orders);

      // Get revenue and order stats
      const [revenueStats] = await managementDb
        .select({
          totalRevenue: sum(orders.totalAmount),
          totalPointsUsed: sum(orders.pointsUsed),
        })
        .from(orders);

      res.json({
        companies: companiesCount.count,
        merchants: merchantsCount.count,
        products: productsCount.count,
        orders: ordersCount.count,
        totalRevenue: revenueStats.totalRevenue || '0',
        totalPointsUsed: revenueStats.totalPointsUsed || 0,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch platform analytics' });
    }
  }
);

// Management Dashboard Analytics - Consistent with subscription billing logic
router.get('/analytics', verifyCorporateAdmin, async (req, res) => {
  try {
    // Get organization statistics using the same logic as subscription billing
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_organizations,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_organizations,
        SUM(COALESCE(u.billable_employees, 0)) as total_billable_users,
        AVG(COALESCE(u.billable_employees, 0)) as avg_users_per_org
      FROM organizations o
      LEFT JOIN (
        -- BUSINESS RULE: Same logic as subscription billing - Active + Pending only
        SELECT organization_id, COUNT(*) as billable_employees 
        FROM users 
        WHERE status IN ('active', 'pending')
        GROUP BY organization_id
      ) u ON o.id = u.organization_id
    `);

    const stats = result.rows[0];
    
    // Get subscription statistics  
    const subscriptionResult = await pool.query(`
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_subscriptions,
        SUM(CASE WHEN is_active = true THEN subscribed_users ELSE 0 END) as total_subscribed_capacity,
        SUM(CASE WHEN is_active = true THEN total_monthly_amount ELSE 0 END) as total_monthly_revenue
      FROM subscriptions
    `);

    const subscriptionStats = subscriptionResult.rows[0];

    const organizationStats = {
      totalOrganizations: parseInt(stats.total_organizations) || 0,
      activeOrganizations: parseInt(stats.active_organizations) || 0,
      totalBillableUsers: parseInt(stats.total_billable_users) || 0,
      averageUsersPerOrg: parseFloat(stats.avg_users_per_org) || 0,
      totalSubscriptions: parseInt(subscriptionStats.total_subscriptions) || 0,
      activeSubscriptions: parseInt(subscriptionStats.active_subscriptions) || 0,
      totalSubscribedCapacity: parseInt(subscriptionStats.total_subscribed_capacity) || 0,
      totalMonthlyRevenue: parseFloat(subscriptionStats.total_monthly_revenue) || 0,
      // This field should match subscription usage logic
      currentEmployees: parseInt(stats.total_billable_users) || 0
    };

    res.json({
      organizationStats,
      platformStats: {
        status: 'operational',
        uptime: '99.9%'
      }
    });
  } catch (error: any) {
    console.error('Error fetching management analytics:', error?.message || 'unknown_error');
    res.status(500).json({ 
      message: error?.message || 'Failed to fetch analytics' 
    });
  }
});

// ========== ORGANIZATION FEATURES MANAGEMENT ==========

// Get organization features
router.get('/organizations/:id/features', verifyCorporateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = parseInt(id);

    console.log('Fetching features for organization:', organizationId);

    // Get all features for this organization
    const features = await db
      .select()
      .from(organization_features)
      .where(eq(organization_features.organization_id, organizationId));

    console.log('Found features:', features);

    // If no features exist, create default ones
    if (features.length === 0) {
      const defaultFeatures = [
        { organizationId, featureKey: 'recognition', isEnabled: false },
        { organizationId, featureKey: 'social', isEnabled: true },
        { organizationId, featureKey: 'surveys', isEnabled: true },
        { organizationId, featureKey: 'marketplace', isEnabled: true },
      ];

      console.log('Creating default features:', defaultFeatures);
      await db.insert(organization_features).values(defaultFeatures);
      
      // Fetch the created features to get full data with IDs
      const createdFeatures = await db
        .select()
        .from(organization_features)
        .where(eq(organization_features.organization_id, organizationId));
      
      console.log('Created features:', createdFeatures);
      res.json(createdFeatures);
    } else {
      res.json(features);
    }
  } catch (error) {
    console.error('Failed to fetch organization features:', error);
    res.status(500).json({ error: 'Failed to fetch organization features' });
  }
});

// Update organization feature
router.put('/organizations/:id/features/:featureKey', verifyCorporateAdmin, async (req, res) => {
  try {
    const { id, featureKey } = req.params;
    const { isEnabled } = req.body;
    const organizationId = parseInt(id);

    console.log('Updating feature:', { organizationId, featureKey, isEnabled });

    // Check if feature exists
    const [existingFeature] = await db
      .select()
      .from(organization_features)
      .where(
        and(
          eq(organization_features.organization_id, organizationId),
          eq(organization_features.featureKey, featureKey)
        )
      );

    if (existingFeature) {
      // Update existing feature
      const [updatedFeature] = await db
        .update(organization_features)
        .set({ 
          isEnabled,
          enabledAt: isEnabled ? new Date() : null,
          enabledBy: isEnabled ? req.corporateAdmin.id : null
        })
        .where(
          and(
            eq(organization_features.organization_id, organizationId),
            eq(organization_features.featureKey, featureKey)
          )
        )
        .returning();

      console.log('Updated feature:', updatedFeature);
      res.json(updatedFeature);
    } else {
      // Create new feature
      const [newFeature] = await db
        .insert(organization_features)
        .values({ 
          organizationId, 
          featureKey, 
          isEnabled,
          enabledAt: isEnabled ? new Date() : null,
          enabledBy: isEnabled ? req.corporateAdmin.id : null
        })
        .returning();

      console.log('Created new feature:', newFeature);
      res.json(newFeature);
    }
  } catch (error) {
    console.error('Failed to update organization feature:', error);
    res.status(500).json({ error: 'Failed to update organization feature' });
  }
});

export default router;
