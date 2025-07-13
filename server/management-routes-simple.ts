import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users, organizations } from '../shared/schema';
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
          manageOrganizations: true, 
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
      manageOrganizations: true, 
      manageProducts: true, 
      manageOrders: true,
      manageUsers: true,
      manageAnalytics: true
    }
  });
});

// ========== ORGANIZATION MANAGEMENT ==========

// Get all organizations with pagination and filters
router.get('/organizations', verifyCorporateAdmin, checkPermission('manageOrganizations'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = db.select({
      id: organizations.id,
      name: organizations.name,
      type: organizations.type,
      status: organizations.status,
      createdAt: organizations.createdAt,
      userCount: sql<number>`(SELECT COUNT(*) FROM ${users} WHERE ${users.organizationId} = ${organizations.id})`,
    }).from(organizations);
    
    if (search) {
      query = query.where(sql`${organizations.name} ILIKE ${`%${search}%`}`);
    }
    
    if (status === 'active') {
      query = query.where(eq(organizations.status, 'active'));
    } else if (status === 'inactive') {
      query = query.where(eq(organizations.status, 'inactive'));
    }
    
    const organizationList = await query.limit(Number(limit)).offset(offset).orderBy(desc(organizations.createdAt));
    
    const totalCount = await db.select({ count: count() }).from(organizations);
    
    res.json(organizationList);
  } catch (error) {
    console.error('Failed to fetch organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get organization details
router.get('/organizations/:id', verifyCorporateAdmin, checkPermission('manageOrganizations'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, Number(id)));
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Get organization statistics
    const userCount = await db.select({ count: count() }).from(users).where(eq(users.organizationId, Number(id)));
    // Order count not implemented yet
    const orderCount = [{ count: 0 }];
    const totalSpent = await db.select({ total: sum(transactions.amount) }).from(transactions)
      .innerJoin(users, eq(transactions.fromAccountId, users.id))
      .where(eq(users.organizationId, Number(id)));
    
    res.json({
      ...organization,
      stats: {
        userCount: userCount[0].count,
        orderCount: orderCount[0].count,
        totalSpent: totalSpent[0].total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization details' });
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

// Products endpoint - feature not yet implemented
router.get('/products', verifyCorporateAdmin, async (req, res) => {
  res.json({ message: 'Products feature not yet implemented', data: [] });
});

// ========== ORDER MANAGEMENT ==========

// Orders endpoint - feature not yet implemented
router.get('/orders', verifyCorporateAdmin, async (req, res) => {
  res.json({ message: 'Orders feature not yet implemented', data: [] });
});

// ========== ANALYTICS ==========

// Test endpoint to check if database is accessible
router.get('/test', verifyCorporateAdmin, async (req, res) => {
  try {
    res.json({ status: 'ok', message: 'Test endpoint working' });
  } catch (error) {
    res.status(500).json({ error: 'Test endpoint failed' });
  }
});

// Get analytics data for the dashboard
router.get('/analytics', verifyCorporateAdmin, async (req, res) => {
  try {
    // Get counts from basic tables that exist
    const [organizationCount] = await db.select({ count: count() }).from(organizations);
    const [userCount] = await db.select({ count: count() }).from(users);
    
    res.json({
      totals: {
        organizations: organizationCount.count,
        users: userCount.count,
        products: 0, // Not implemented yet
        orders: 0, // Not implemented yet
        revenue: 0 // Not implemented yet
      },
      period: 'All Time'
    });
  } catch (error) {
    console.error('Analytics endpoint error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Failed to fetch analytics', 
      details: error.message,
      errorName: error.name 
    });
  }
});

export default router;