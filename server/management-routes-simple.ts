import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users, organizations, products, orders, transactions } from '../shared/schema';
import { eq, desc, and, gte, lte, sum, count, sql } from 'drizzle-orm';

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
    
    let query = db.select({
      id: organizations.id,
      name: organizations.name,
      description: organizations.description,
      isActive: organizations.isActive,
      createdAt: organizations.createdAt,
      userCount: sql<number>`(SELECT COUNT(*) FROM ${users} WHERE ${users.organizationId} = ${organizations.id})`,
    }).from(organizations);
    
    if (search) {
      query = query.where(sql`${organizations.name} ILIKE ${`%${search}%`}`);
    }
    
    if (status === 'active') {
      query = query.where(eq(organizations.isActive, true));
    } else if (status === 'inactive') {
      query = query.where(eq(organizations.isActive, false));
    }
    
    const companyList = await query.limit(Number(limit)).offset(offset).orderBy(desc(organizations.createdAt));
    
    const totalCount = await db.select({ count: count() }).from(organizations);
    
    res.json({
      companies: companyList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get company details
router.get('/companies/:id', verifyCorporateAdmin, checkPermission('manageCompanies'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const [company] = await db.select().from(organizations).where(eq(organizations.id, Number(id)));
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Get company statistics
    const userCount = await db.select({ count: count() }).from(users).where(eq(users.organizationId, Number(id)));
    const orderCount = await db.select({ count: count() }).from(orders).where(eq(orders.organizationId, Number(id)));
    const totalSpent = await db.select({ total: sum(transactions.amount) }).from(transactions)
      .innerJoin(users, eq(transactions.fromAccountId, users.id))
      .where(eq(users.organizationId, Number(id)));
    
    res.json({
      ...company,
      stats: {
        userCount: userCount[0].count,
        orderCount: orderCount[0].count,
        totalSpent: totalSpent[0].total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch company details' });
  }
});

// ========== USER MANAGEMENT ==========

// Get all users across all organizations
router.get('/users', verifyCorporateAdmin, checkPermission('manageUsers'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, organizationId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = db.select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      department: users.department,
      jobTitle: users.jobTitle,
      roleType: users.roleType,
      isAdmin: users.isAdmin,
      status: users.status,
      organizationId: users.organizationId,
      organizationName: organizations.name,
      balance: users.balance,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt
    }).from(users).leftJoin(organizations, eq(users.organizationId, organizations.id));
    
    if (search) {
      query = query.where(sql`(${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`})`);
    }
    
    if (organizationId) {
      query = query.where(eq(users.organizationId, Number(organizationId)));
    }
    
    const userList = await query.limit(Number(limit)).offset(offset).orderBy(desc(users.createdAt));
    
    res.json(userList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ========== PRODUCT MANAGEMENT ==========

// Get all products across all organizations
router.get('/products', verifyCorporateAdmin, checkPermission('manageProducts'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, category } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = db.select().from(products);
    
    if (search) {
      query = query.where(sql`${products.name} ILIKE ${`%${search}%`}`);
    }
    
    if (category) {
      query = query.where(eq(products.category, category as string));
    }
    
    const productList = await query.limit(Number(limit)).offset(offset).orderBy(desc(products.createdAt));
    
    res.json(productList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ========== ORDER MANAGEMENT ==========

// Get all orders across all organizations
router.get('/orders', verifyCorporateAdmin, checkPermission('manageOrders'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, organizationId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = db.select({
      id: orders.id,
      userId: orders.userId,
      productId: orders.productId,
      organizationId: orders.organizationId,
      orderType: orders.orderType,
      status: orders.status,
      totalAmount: orders.totalAmount,
      pointsUsed: orders.pointsUsed,
      createdAt: orders.createdAt,
      userName: users.name,
      userEmail: users.email,
      productName: products.name,
      organizationName: organizations.name
    }).from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(organizations, eq(orders.organizationId, organizations.id));
    
    if (status) {
      query = query.where(eq(orders.status, status as string));
    }
    
    if (organizationId) {
      query = query.where(eq(orders.organizationId, Number(organizationId)));
    }
    
    const orderList = await query.limit(Number(limit)).offset(offset).orderBy(desc(orders.createdAt));
    
    res.json(orderList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ========== ANALYTICS ==========

// Get platform analytics
router.get('/analytics', verifyCorporateAdmin, checkPermission('manageAnalytics'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateFilter;
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Total counts
    const totalUsers = await db.select({ count: count() }).from(users);
    const totalOrganizations = await db.select({ count: count() }).from(organizations);
    const totalProducts = await db.select({ count: count() }).from(products);
    const totalOrders = await db.select({ count: count() }).from(orders);
    
    // Recent activity (within period)
    const recentUsers = await db.select({ count: count() }).from(users).where(gte(users.createdAt, dateFilter));
    const recentOrders = await db.select({ count: count() }).from(orders).where(gte(orders.createdAt, dateFilter));
    
    // Revenue (total points spent)
    const totalRevenue = await db.select({ total: sum(orders.pointsUsed) }).from(orders);
    const recentRevenue = await db.select({ total: sum(orders.pointsUsed) }).from(orders).where(gte(orders.createdAt, dateFilter));
    
    res.json({
      totals: {
        users: totalUsers[0].count,
        organizations: totalOrganizations[0].count,
        products: totalProducts[0].count,
        orders: totalOrders[0].count,
        revenue: totalRevenue[0].total || 0
      },
      recent: {
        users: recentUsers[0].count,
        orders: recentOrders[0].count,
        revenue: recentRevenue[0].total || 0
      },
      period
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;