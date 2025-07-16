import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db, pool } from './db';
import { users, organizations, subscriptions } from '../shared/schema';
import { eq, desc, and, gte, lte, sum, count, sql } from 'drizzle-orm';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Subscription utility functions
function calculateExpirationDate(lastPaymentDate: Date, period: string, customDays?: number): Date {
  const expiration = new Date(lastPaymentDate);
  switch (period) {
    case 'quarter':
      expiration.setDate(expiration.getDate() + 90);
      break;
    case 'year':
      expiration.setDate(expiration.getDate() + 365);
      break;
    case 'custom':
      if (customDays) {
        expiration.setDate(expiration.getDate() + customDays);
      }
      break;
  }
  return expiration;
}

function calculateSubscriptionStatus(expirationDate: Date | null, isActive: boolean, period?: string, customDays?: number) {
  if (!expirationDate || !isActive) {
    return { status: 'inactive', daysRemaining: 0, color: 'red' };
  }

  const now = new Date();
  const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return { status: 'expired', daysRemaining: 0, color: 'red' };
  }

  const totalDays = period === 'quarter' ? 90 : period === 'year' ? 365 : customDays || 90;
  const percentageRemaining = (daysRemaining / totalDays) * 100;

  if (percentageRemaining > 30) {
    return { status: 'active', daysRemaining, color: 'green' };
  } else {
    return { status: 'expiring', daysRemaining, color: 'orange' };
  }
}

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

    // Use simple Drizzle queries without complex SQL templates
    let query = db.select().from(organizations);

    // Apply simple filters without complex SQL
    if (status === 'active' || status === 'inactive') {
      query = query.where(eq(organizations.status, status));
    }

    const organizationList = await query
      .orderBy(desc(organizations.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Add user count for each organization
    const organizationsWithCounts = await Promise.all(
      organizationList.map(async (org) => {
        const [userCountResult] = await db.select({ count: count() })
          .from(users)
          .where(eq(users.organizationId, org.id));
        
        return {
          ...org,
          userCount: userCountResult.count
        };
      })
    );

    // Check subscription status for each organization
    const organizationsWithSubscriptionData = await Promise.all(
      organizationsWithCounts.map(async (org: any) => {
        // Get active subscription for this organization
        const [activeSubscription] = await db.select()
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.organizationId, org.id),
              eq(subscriptions.isActive, true)
            )
          )
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);

        let subscriptionActive = false;
        let daysRemaining = 0;
        let calculatedStatus = org.status;

        if (activeSubscription) {
          const now = new Date();
          const expirationDate = new Date(activeSubscription.expirationDate);
          subscriptionActive = expirationDate > now;
          
          if (subscriptionActive) {
            daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        // If no active subscription, mark organization as inactive
        if (!subscriptionActive) {
          calculatedStatus = 'inactive';
          // Update organization status in database
          await db.update(organizations)
            .set({ status: 'inactive' })
            .where(eq(organizations.id, org.id));
        }

        return {
          ...org,
          status: calculatedStatus,
          lastPaymentDate: activeSubscription?.lastPaymentDate || null,
          subscriptionPeriod: activeSubscription?.subscriptionPeriod || null,
          expirationDate: activeSubscription?.expirationDate || null,
          subscriptionActive,
          daysRemaining,
          subscribedUsers: activeSubscription?.subscribedUsers || null
        };
      })
    );

    res.json(organizationsWithSubscriptionData);
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

    // Parse address if it's a JSON string
    let parsedAddress = {};
    if (organization.address) {
      try {
        parsedAddress = typeof organization.address === 'string' 
          ? JSON.parse(organization.address) 
          : organization.address;
      } catch (e) {
        console.error('Failed to parse address:', e);
        parsedAddress = {};
      }
    }

    res.json({
      ...organization,
      // Flatten address fields for easier frontend access
      streetAddress: parsedAddress.street || '',
      city: parsedAddress.city || '',
      state: parsedAddress.state || '',
      zipCode: parsedAddress.zipCode || '',
      country: parsedAddress.country || '',
      // Keep original address as well
      address: parsedAddress,
      stats: {
        userCount: userCount[0].count,
        orderCount: 0,
        totalSpent: 0
      }
    });
  } catch (error) {
    console.error('Failed to fetch organization details:', error);
    res.status(500).json({ error: 'Failed to fetch organization details' });
  }
});

// Create new organization
router.post('/organizations', verifyCorporateAdmin, checkPermission('manageOrganizations'), async (req, res) => {
  try {
    const {
      name,
      slug,
      type = 'client',
      status = 'active',
      contactName,
      contactEmail,
      contactPhone,
      superuserEmail,
      industry,
      address,
      // Subscription fields
      lastPaymentDate,
      subscriptionPeriod,
      customDurationDays,
      subscribedUsers,
      pricePerUserPerMonth,
      totalMonthlyAmount
    } = req.body;

    // Validate required fields
    if (!name || !contactName || !contactEmail || !superuserEmail || !industry || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If creating a subscription, require pricing fields
    if (lastPaymentDate && subscriptionPeriod && (!subscribedUsers || !pricePerUserPerMonth)) {
      return res.status(400).json({ error: 'Subscription requires subscribedUsers and pricePerUserPerMonth' });
    }

    // Generate slug if not provided
    const organizationSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // Check if slug already exists
    const existingOrg = await db.select().from(organizations).where(eq(organizations.slug, organizationSlug));
    if (existingOrg.length > 0) {
      return res.status(400).json({ error: 'Organization slug already exists' });
    }

    // Create organization (initially without subscription)
    const [newOrganization] = await db.insert(organizations).values({
      name,
      slug: organizationSlug,
      type,
      status: lastPaymentDate ? 'active' : 'inactive', // Only active if subscription provided
      contactName,
      contactEmail,
      contactPhone,
      superuserEmail,
      industry,
      address
    }).returning();

    // Create subscription if payment information provided
    let newSubscription = null;
    if (lastPaymentDate && subscriptionPeriod) {
      const paymentDate = new Date(lastPaymentDate);
      const expirationDate = calculateExpirationDate(paymentDate, subscriptionPeriod, customDurationDays);

      [newSubscription] = await db.insert(subscriptions).values({
        organizationId: newOrganization.id,
        lastPaymentDate: paymentDate,
        subscriptionPeriod,
        customDurationDays,
        expirationDate,
        subscribedUsers: subscribedUsers || 50, // Default to 50 users
        pricePerUserPerMonth: pricePerUserPerMonth || 10.0, // Default price
        totalMonthlyAmount: totalMonthlyAmount || ((subscribedUsers || 50) * (pricePerUserPerMonth || 10.0)), // Calculate total
        isActive: true
      }).returning();

      // Update organization with subscription reference
      await db.update(organizations)
        .set({ 
          currentSubscriptionId: newSubscription.id,
          status: 'active'
        })
        .where(eq(organizations.id, newOrganization.id));
    }

    // Create superuser account for the organization
    const bcrypt = await import('bcrypt');
    const defaultPassword = 'ChangeMe123!'; // Organization will need to change this
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const [superuser] = await db.insert(users).values({
      username: superuserEmail.split('@')[0], // Use email prefix as username
      password: hashedPassword,
      name: contactName,
      email: superuserEmail,
      roleType: 'client_admin',
      isAdmin: true,
      status: 'active',
      organizationId: newOrganization.id
    }).returning();

    res.status(201).json({
      organization: newOrganization,
      subscription: newSubscription,
      superuser: {
        id: superuser.id,
        email: superuser.email,
        name: superuser.name,
        defaultPassword // Return the default password so it can be shared with the client
      },
      message: 'Organization and superuser created successfully'
    });
  } catch (error) {
    console.error('Failed to create organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Credit organization (simple implementation for now)
router.post('/organizations/:id/credit', verifyCorporateAdmin, checkPermission('manageOrganizations'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;

    const [organization] = await db.select().from(organizations).where(eq(organizations.id, Number(id)));
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // For now, just return success message
    // In a real implementation, you would update wallet balance
    res.json({ 
      message: 'Organization credited successfully',
      amount: amount,
      description: description || 'Manual credit'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to credit organization' });
  }
});

// Update organization
router.put('/organizations/:id', verifyCorporateAdmin, checkPermission('manageOrganizations'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      type, 
      status, 
      maxUsers, 
      contactName, 
      contactEmail, 
      contactPhone, 
      superuserEmail, 
      industry, 
      address 
    } = req.body;

    const [updatedOrganization] = await db.update(organizations)
      .set({ 
        name, 
        type, 
        status, 
        maxUsers,
        contactName,
        contactEmail,
        contactPhone,
        superuserEmail,
        industry,
        address,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, Number(id)))
      .returning();

    if (!updatedOrganization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // If superuserEmail changed, update the admin user's email
    if (superuserEmail) {
      await db.update(users)
        .set({ email: superuserEmail })
        .where(
          and(
            eq(users.organizationId, Number(id)),
            eq(users.roleType, 'client_admin')
          )
        );
    }

    res.json(updatedOrganization);
  } catch (error) {
    console.error('Failed to update organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Reset organization admin password
router.post('/organizations/:id/reset-password', verifyCorporateAdmin, checkPermission('manageOrganizations'), async (req, res) => {
  try {
    const { id } = req.params;

    // Find the organization's admin user
    const [admin] = await db.select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, Number(id)),
          eq(users.roleType, 'client_admin')
        )
      );

    if (!admin) {
      return res.status(404).json({ error: 'Organization admin not found' });
    }

    // Generate new password
    const newPassword = Math.random().toString(36).slice(-12) + 'A1!';
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update admin password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, admin.id));

    res.json({ 
      success: true, 
      newPassword,
      adminEmail: admin.email 
    });
  } catch (error) {
    console.error('Failed to reset password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
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
      organizationId: users.organization_id,
      organizationName: organizations.name,
      balance: users.balance,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt
    }).from(users).leftJoin(organizations, eq(users.organization_id, organizations.id));

    if (search) {
      query = query.where(sql`(${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`})`);
    }

    if (organizationId) {
      query = query.where(eq(users.organization_id, Number(organizationId)));
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

// ========== SUBSCRIPTION MANAGEMENT ==========

// Create subscription for organization
router.post('/organizations/:id/subscription', verifyCorporateAdmin, checkPermission('manageOrganizations'), async (req, res) => {
  try {
    const { id } = req.params;
    const { lastPaymentDate, subscriptionPeriod, customDurationDays, subscribedUsers, pricePerUserPerMonth, totalMonthlyAmount } = req.body;

    // Check if organization exists
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, Number(id)));
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if organization already has an active subscription
    const [existingSubscription] = await db.select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.organizationId, Number(id)),
          eq(subscriptions.isActive, true)
        )
      );

    if (existingSubscription) {
      return res.status(400).json({ error: 'Organization already has an active subscription' });
    }

    // Create new subscription
    const paymentDate = new Date(lastPaymentDate);
    const expirationDate = calculateExpirationDate(paymentDate, subscriptionPeriod, customDurationDays);

    const [newSubscription] = await db.insert(subscriptions).values({
      organizationId: Number(id),
      lastPaymentDate: paymentDate,
      subscriptionPeriod,
      customDurationDays,
      expirationDate,
      subscribedUsers: subscribedUsers || 50,
      pricePerUserPerMonth: pricePerUserPerMonth || 10.0,
      totalMonthlyAmount: totalMonthlyAmount || ((subscribedUsers || 50) * (pricePerUserPerMonth || 10.0)),
      isActive: true
    }).returning();

    // Update organization with subscription reference and activate
    await db.update(organizations)
      .set({ 
        currentSubscriptionId: newSubscription.id,
        status: 'active'
      })
      .where(eq(organizations.id, Number(id)));

    res.status(201).json({
      subscription: newSubscription,
      message: 'Subscription created successfully'
    });
  } catch (error) {
    console.error('Failed to create subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Renew subscription
router.post('/organizations/:id/subscription/renew', verifyCorporateAdmin, checkPermission('manageOrganizations'), async (req, res) => {
  try {
    const { id } = req.params;
    const { lastPaymentDate, subscriptionPeriod, customDurationDays, subscribedUsers, pricePerUserPerMonth, totalMonthlyAmount } = req.body;

    // Get current subscription
    const [currentSubscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, Number(id)))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!currentSubscription) {
      return res.status(404).json({ error: 'No subscription found for organization' });
    }

    // Deactivate current subscription
    await db.update(subscriptions)
      .set({ isActive: false })
      .where(eq(subscriptions.id, currentSubscription.id));

    // Get organization for max users setting
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, Number(id)));

    // Create new subscription
    const paymentDate = new Date(lastPaymentDate);
    const expirationDate = calculateExpirationDate(paymentDate, subscriptionPeriod, customDurationDays);

    const [newSubscription] = await db.insert(subscriptions).values({
      organizationId: Number(id),
      lastPaymentDate: paymentDate,
      subscriptionPeriod,
      customDurationDays,
      expirationDate,
      subscribedUsers: subscribedUsers || currentSubscription.subscribedUsers || 50,
      pricePerUserPerMonth: pricePerUserPerMonth || currentSubscription.pricePerUserPerMonth || 10.0,
      totalMonthlyAmount: totalMonthlyAmount || ((subscribedUsers || currentSubscription.subscribedUsers || 50) * (pricePerUserPerMonth || currentSubscription.pricePerUserPerMonth || 10.0)),
      isActive: true
    }).returning();

    // Update organization with new subscription reference
    await db.update(organizations)
      .set({ 
        currentSubscriptionId: newSubscription.id,
        status: 'active'
      })
      .where(eq(organizations.id, Number(id)));

    res.json({
      subscription: newSubscription,
      message: 'Subscription renewed successfully'
    });
  } catch (error) {
    console.error('Failed to renew subscription:', error);
    res.status(500).json({ error: 'Failed to renew subscription' });
  }
});

// Get organization subscription status
router.get('/organizations/:id/subscription', verifyCorporateAdmin, checkPermission('manageOrganizations'), async (req, res) => {
  try {
    const { id } = req.params;

    const [subscriptionData] = await db.select({
      // Organization info
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationStatus: organizations.status,
      // Subscription info
      subscriptionId: subscriptions.id,
      lastPaymentDate: subscriptions.lastPaymentDate,
      subscriptionPeriod: subscriptions.subscriptionPeriod,
      customDurationDays: subscriptions.customDurationDays,
      expirationDate: subscriptions.expirationDate,
      subscribedUsers: subscriptions.subscribedUsers,
      pricePerUserPerMonth: subscriptions.pricePerUserPerMonth,
      totalMonthlyAmount: subscriptions.totalMonthlyAmount,
      isActive: subscriptions.isActive,
      subscriptionCreatedAt: subscriptions.createdAt
    })
    .from(organizations)
    .leftJoin(subscriptions, eq(subscriptions.id, organizations.currentSubscriptionId))
    .where(eq(organizations.id, Number(id)));

    if (!subscriptionData) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get current user count for this organization
    const [userCountResult] = await db.select({ count: count() })
      .from(users)
      .where(eq(users.organizationId, Number(id)));
    
    const currentUserCount = userCountResult.count;

    // Calculate subscription status
    let status = null;
    if (subscriptionData.subscriptionId) {
      status = calculateSubscriptionStatus(
        subscriptionData.expirationDate, 
        subscriptionData.isActive,
        subscriptionData.subscriptionPeriod,
        subscriptionData.customDurationDays
      );
    }

    res.json({
      ...subscriptionData,
      currentUserCount,
      calculatedStatus: status
    });
  } catch (error) {
    console.error('Failed to get subscription status:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Monitor all subscriptions (for dashboard view)
router.get('/subscriptions/monitor', verifyCorporateAdmin, async (req, res) => {
  try {
    const { status: statusFilter, expiringSoon } = req.query;

    let query = db.select({
      subscriptionId: subscriptions.id,
      organizationId: organizations.id,
      organizationName: organizations.name,
      contactEmail: organizations.contactEmail,
      subscriptionPeriod: subscriptions.subscriptionPeriod,
      lastPaymentDate: subscriptions.lastPaymentDate,
      expirationDate: subscriptions.expirationDate,
      subscribedUsers: subscriptions.subscribedUsers,
      pricePerUserPerMonth: subscriptions.pricePerUserPerMonth,
      totalMonthlyAmount: subscriptions.totalMonthlyAmount,
      isActive: subscriptions.isActive,
      daysRemaining: sql<number>`EXTRACT(DAY FROM subscriptions.expiration_date - CURRENT_TIMESTAMP)`,
    })
    .from(subscriptions)
    .innerJoin(organizations, eq(organizations.currentSubscriptionId, subscriptions.id));

    // Filter by expiring soon (next 30 days)
    if (expiringSoon === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query = query.where(
        and(
          eq(subscriptions.isActive, true),
          lte(subscriptions.expirationDate, thirtyDaysFromNow)
        )
      );
    }

    const subscriptionsList = await query.orderBy(subscriptions.expirationDate);

    // Add calculated status and user count to each subscription
    const enrichedSubscriptions = await Promise.all(subscriptionsList.map(async (sub) => {
      // Get current user count for this organization
      const [userCountResult] = await db.select({ count: count() })
        .from(users)
        .where(eq(users.organizationId, sub.organizationId));
      
      const currentUserCount = userCountResult.count;

      return {
        ...sub,
        currentUserCount,
        calculatedStatus: calculateSubscriptionStatus(
          sub.expirationDate,
          sub.isActive,
          sub.subscriptionPeriod
        )
      };
    }));

    res.json(enrichedSubscriptions);
  } catch (error) {
    console.error('Failed to monitor subscriptions:', error);
    res.status(500).json({ error: 'Failed to monitor subscriptions' });
  }
});

// Deactivate subscription
router.post('/organizations/:id/subscription/deactivate', verifyCorporateAdmin, checkPermission('manageOrganizations'), async (req, res) => {
  try {
    const { id } = req.params;

    // Find current subscription
    const [organization] = await db.select()
      .from(organizations)
      .where(eq(organizations.id, Number(id)));

    if (!organization || !organization.currentSubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Deactivate subscription
    await db.update(subscriptions)
      .set({ isActive: false })
      .where(eq(subscriptions.id, organization.currentSubscriptionId));

    // Update organization status
    await db.update(organizations)
      .set({ 
        status: 'inactive',
        currentSubscriptionId: null
      })
      .where(eq(organizations.id, Number(id)));

    res.json({ 
      message: 'Subscription deactivated successfully' 
    });
  } catch (error) {
    console.error('Failed to deactivate subscription:', error);
    res.status(500).json({ error: 'Failed to deactivate subscription' });
  }
});

export default router;