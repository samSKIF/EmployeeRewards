import { Router } from 'express';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../storage';
import { db } from '../db';
import { users, subscriptions } from '@shared/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { logger } from '@platform/sdk';
import { CacheService } from '../cache/cacheService';
import { hash } from 'bcrypt';
import { dualWriteAdapter } from '../dual-write/dual-write-adapter';

const router = Router();

// Get current user profile
router.get('/me', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    logger.debug(
      `/api/users/me: Returning data for user ${req.user.id} (${req.user.name}, ${req.user.email})`
    );
    logger.debug(`User isAdmin value: ${req.user.is_admin}`);

    // Update lastSeenAt timestamp for ongoing activity tracking
    try {
      await db
        .update(users)
        .set({ last_seen_at: new Date() })
        .where(eq(users.id, req.user.id));
    } catch (error) {
      logger.warn('Failed to update lastSeenAt:', error);
    }

    // Fetch fresh user data from database to include any recent updates
    const [freshUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!freshUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the user's balance
    const balance = await storage.getUserBalance(req.user.id);

    // Combine fresh user data with balance, ensuring field mapping for frontend
    const userWithBalance = {
      ...freshUser,
      isAdmin: freshUser.is_admin === true, // Ensure boolean false for non-admins
      avatarUrl: freshUser.avatar_url, // Map snake_case to camelCase for frontend
      coverPhotoUrl: freshUser.cover_photo_url, // Map snake_case to camelCase
      jobTitle: freshUser.job_title,
      phoneNumber: freshUser.phone_number,
      birthDate: freshUser.birth_date,
      hireDate: freshUser.hire_date,
      aboutMe: freshUser.about_me,
      balance,
    };

    logger.debug(`Final user object isAdmin: ${userWithBalance.is_admin}`);
    res.json(userWithBalance);
  } catch (error: any) {
    logger.error('Error getting user data:', error);
    res.status(500).json({ message: error.message || 'Failed to get user' });
  }
});

// Update user profile
router.patch('/me', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get fields to update from the request body
    const {
      name,
      title,
      department,
      location,
      responsibilities,
      aboutMe,
      avatarUrl,
    } = req.body;

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.job_title = title;
    if (department !== undefined) updateData.department = department;
    if (location !== undefined) updateData.location = location;
    if (responsibilities !== undefined)
      updateData.responsibilities = responsibilities;
    if (aboutMe !== undefined) updateData.about_me = aboutMe;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;

    // Update user in database
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, req.user.id))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the user's balance
    const balance = await storage.getUserBalance(req.user.id);

    // Combine user data with balance and proper field mapping
    const userWithBalance = {
      ...updatedUser,
      avatarUrl: updatedUser.avatar_url, // Map snake_case to camelCase
      coverPhotoUrl: updatedUser.cover_photo_url,
      jobTitle: updatedUser.job_title,
      phoneNumber: updatedUser.phone_number,
      birthDate: updatedUser.birth_date,
      hireDate: updatedUser.hire_date,
      aboutMe: updatedUser.about_me,
      balance,
    };

    res.json(userWithBalance);
  } catch (error: any) {
    logger.error('Error updating user profile:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to update user profile' });
  }
});

// Upload user avatar
router.post('/avatar', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({ message: 'No avatar image provided' });
    }

    try {
      // Update the user record in the database
      const [updatedUser] = await db
        .update(users)
        .set({ avatar_url: avatarUrl })
        .where(eq(users.id, req.user.id))
        .returning();

      res.json({
        message: 'Avatar updated successfully',
        user: {
          ...updatedUser,
          avatarUrl: updatedUser.avatar_url, // Map snake_case to camelCase for frontend
          jobTitle: updatedUser.job_title,
          phoneNumber: updatedUser.phone_number,
          birthDate: updatedUser.birth_date,
          hireDate: updatedUser.hire_date,
          aboutMe: updatedUser.about_me,
          coverPhotoUrl: updatedUser.cover_photo_url,
        },
      });
    } catch (dbError) {
      logger.error('Database error updating avatar:', dbError);

      // Fallback: If database update fails, still return the user with updated avatar
      const updatedUser = {
        ...req.user,
        avatarUrl: avatarUrl,
      };

      res.json({
        message: 'Avatar updated successfully (local only)',
        user: updatedUser,
      });
    }
  } catch (error: any) {
    logger.error('Error updating user avatar:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to update avatar' });
  }
});

// Upload user cover photo
router.post(
  '/cover-photo',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { coverPhotoUrl } = req.body;

      if (!coverPhotoUrl) {
        return res.status(400).json({ message: 'No cover photo provided' });
      }

      // Update user with the cover photo URL in the database
      const [updatedUser] = await db
        .update(users)
        .set({ cover_photo_url: coverPhotoUrl })
        .where(eq(users.id, req.user.id))
        .returning();

      res.json({
        message: 'Cover photo updated successfully',
        user: {
          ...updatedUser,
          coverPhotoUrl: updatedUser.cover_photo_url, // Map snake_case to camelCase for frontend
          avatarUrl: updatedUser.avatar_url,
          jobTitle: updatedUser.job_title,
          phoneNumber: updatedUser.phone_number,
          birthDate: updatedUser.birth_date,
          hireDate: updatedUser.hire_date,
          aboutMe: updatedUser.about_me,
        },
      });
    } catch (error: any) {
      logger.error('Error updating user cover photo:', error);
      res
        .status(500)
        .json({ message: error.message || 'Failed to update cover photo' });
    }
  }
);

// Get all users with optional filtering
router.get('/', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { department, location, search, offset = 0 } = req.query;
    const organizationId = req.user.organization_id;

    // Get subscription limit for this organization
    const subscriptionData = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.organization_id, organizationId!),
          eq(subscriptions.is_active, true),
          gte(subscriptions.expiration_date, new Date())
        )
      )
      .limit(1);
    
    const subscriptionLimit = subscriptionData[0]?.subscribed_users || 1000; // Default fallback

    const userCount = await storage.getUserCount();
    logger.info(`Total users in organization ${organizationId}: ${userCount}`);
    logger.info(`Using subscription limit: ${subscriptionLimit}, offset: ${offset}`);

    // Use filtered query if filters are provided
    let users;
    if (department || location || search) {
      // Use getEmployeesWithFilters when filters are provided
      users = await storage.getEmployeesWithFilters(organizationId!, {
        department: department as string | undefined,
        location: location as string | undefined,
        search: search as string | undefined,
        limit: subscriptionLimit,
        offset: parseInt(offset as string),
        status: 'active'
      });
    } else {
      // Use regular getUsers when no filters
      users = await dualWriteAdapter.handleUsersList(
        organizationId!,
        subscriptionLimit,
        parseInt(offset as string),
        async () => {
          return await storage.getUsers(
            organizationId!,
            subscriptionLimit,
            parseInt(offset as string)
          );
        }
      );
    }

    logger.info(
      `Returned ${users.length} users for organization ${organizationId}`
    );

    // Check if Shams is in the results
    const shamsUser = users.find(
      (u) =>
        u.name?.toLowerCase() === 'shams' ||
        u.surname?.toLowerCase() === 'aranib'
    );
    if (shamsUser) {
      logger.info(
        `Found Shams Aranib in results: ${JSON.stringify(shamsUser)}`
      );
    } else {
      logger.info(`Shams Aranib NOT found in current batch`);
    }

    res.json(users);
  } catch (error: any) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch users' });
  }
});

// Get user departments (from database tables)
router.get(
  '/departments',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Query only active departments using Drizzle ORM query builder
      const activeDepartments = await storage.getDepartmentsByOrganization(req.user.organization_id || 1);
      const departments = activeDepartments.map(dept => dept.name);

      logger.info(
        `Returning ${departments.length} active departments for org ${req.user.organization_id}:`,
        departments
      );
      res.json(departments);
    } catch (error: any) {
      logger.error('Error fetching departments:', error);
      res
        .status(500)
        .json({ message: error.message || 'Failed to fetch departments' });
    }
  }
);

// Get user locations (from database tables)
router.get(
  '/locations',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Query the locations table directly (no caching for now)
      const locationRows = await db.execute(sql`
      SELECT name FROM locations 
      WHERE organization_id = ${req.user.organization_id || 1} 
      ORDER BY name
    `);

      const locations = locationRows.rows.map((row: any) => row.name);

      logger.info(
        `Returning ${locations.length} locations for org ${req.user.organization_id}:`,
        locations
      );
      res.json(locations);
    } catch (error: any) {
      logger.error('Error fetching locations:', error);
      res
        .status(500)
        .json({ message: error.message || 'Failed to fetch locations' });
    }
  }
);

// Check for duplicate email/name before creating user
router.post(
  '/check-duplicate',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { email, name, surname } = req.body;
      let emailExists = false;
      let nameExists = false;

      // Check if email already exists in the organization
      if (email) {
        const existingEmail = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.email, email),
              eq(users.organization_id, req.user.organization_id!)
            )
          );
        emailExists = existingEmail.length > 0;
      }

      // Check if name/surname combination already exists in the organization
      if (name && surname) {
        const existingName = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.name, name),
              eq(users.surname, surname),
              eq(users.organization_id, req.user.organization_id!)
            )
          );
        nameExists = existingName.length > 0;
      }

      res.json({ emailExists, nameExists });
    } catch (error: any) {
      logger.error('Error checking duplicates:', error);
      res
        .status(500)
        .json({ message: error.message || 'Failed to check duplicates' });
    }
  }
);

// Create new employee
router.post('/', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Only admins can create employees
    if (!req.user.is_admin) {
      return res
        .status(403)
        .json({ message: 'Only administrators can create employees' });
    }

    const {
      email,
      name,
      surname,
      password = 'changeme123',
      phoneNumber,
      jobTitle,
      department,
      location,
      manager_email,
      sex,
      nationality,
      birthDate,
      hireDate,
      isAdmin = false,
      status = 'active',
      avatarUrl,
      adminScope = 'none',
      allowedSites = [],
      allowedDepartments = [],
    } = req.body;

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({ message: 'Email and name are required' });
    }

    // Check if email already exists in the organization
    const existingEmail = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.organization_id, req.user.organization_id!)
        )
      );

    if (existingEmail.length > 0) {
      return res
        .status(409)
        .json({ message: 'Email already exists in this organization' });
    }

    // Generate username from email
    const username = email.split('@')[0];

    // Check if username already exists in the organization
    const existingUsername = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.username, username),
          eq(users.organization_id, req.user.organization_id)
        )
      );

    const finalUsername =
      existingUsername.length > 0 ? `${username}_${Date.now()}` : username;

    // Hash the password
    const hashedPassword = await hash(password, 10);

    // Create the user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        username: finalUsername,
        password: hashedPassword,
        name,
        surname,
        phone_number: phoneNumber,
        job_title: jobTitle,
        department,
        location,
        manager_email,
        sex,
        nationality,
        birth_date: birthDate ? new Date(birthDate) : null,
        hire_date: hireDate ? new Date(hireDate) : null,
        is_admin: isAdmin,
        status,
        avatar_url:
          avatarUrl ||
          `https://api.dicebear.com/7.x/identicon/png?seed=${finalUsername}&backgroundColor=random&size=150`,
        admin_scope: adminScope,
        allowed_sites: allowedSites,
        allowed_departments: allowedDepartments,
        organization_id: req.user.organization_id!,
        created_by: req.user.id,
        created_at: new Date(),
      })
      .returning();

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    logger.info(
      `Employee created successfully: ${email} by admin ${req.user.email}`
    );
    res.status(201).json(userWithoutPassword);
  } catch (error: any) {
    logger.error('Error creating employee:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to create employee' });
  }
});

// Update user by ID (admin only)
router.put('/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Only admins can update other users
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Only administrators can update employees' });
    }

    const user_id = parseInt(req.params.id);
    if (isNaN(user_id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Get fields to update from the request body - handle both camelCase and snake_case
    const {
      name,
      surname,
      email,
      phoneNumber,
      phone_number,
      jobTitle,
      job_title,
      department,
      location,
      status,
      hireDate,
      hire_date,
      birthDate,
      birth_date,
      managerEmail,
      manager_email,
      responsibilities,
      aboutMe,
      about_me,
      nationality,
      sex,
      avatarUrl,
      avatar_url,
    } = req.body;

    // Build update object with snake_case field names for database
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (surname !== undefined) updateData.surname = surname;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined || phone_number !== undefined) updateData.phone_number = phoneNumber || phone_number;
    if (jobTitle !== undefined || job_title !== undefined) updateData.job_title = jobTitle || job_title;
    if (department !== undefined) updateData.department = department;
    if (location !== undefined) updateData.location = location;
    if (status !== undefined) updateData.status = status;
    if (hireDate !== undefined || hire_date !== undefined) updateData.hire_date = hireDate || hire_date ? new Date(hireDate || hire_date) : null;
    if (birthDate !== undefined || birth_date !== undefined) updateData.birth_date = birthDate || birth_date ? new Date(birthDate || birth_date) : null;
    if (managerEmail !== undefined || manager_email !== undefined) updateData.manager_email = managerEmail || manager_email;
    if (responsibilities !== undefined) updateData.responsibilities = responsibilities;
    if (aboutMe !== undefined || about_me !== undefined) updateData.about_me = aboutMe || about_me;
    if (nationality !== undefined) updateData.nationality = nationality;
    if (sex !== undefined) updateData.sex = sex;
    if (avatarUrl !== undefined || avatar_url !== undefined) updateData.avatar_url = avatarUrl || avatar_url;

    // Ensure user belongs to same organization (multi-tenant security)
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user_id));

    if (!existingUser) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (existingUser.organization_id !== req.user.organization_id) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Update user in database
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user_id))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    logger.info(`Employee ${user_id} updated by admin ${req.user.email}`);
    res.json({
      message: 'Employee updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    logger.error('Error updating employee:', error);
    res.status(500).json({ message: error.message || 'Failed to update employee' });
  }
});

// Get organization hierarchy for org chart
router.get('/org-chart/hierarchy', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const organizationId = req.user.organization_id;
    if (!organizationId) {
      return res.status(400).json({ message: 'User has no organization' });
    }

    // Get all users in the organization with their hierarchy info
    const allOrgUsers = await storage.getOrganizationHierarchy(organizationId);
    
    // Filter out isolated super users (admins with no manager and no direct reports)
    const orgUsers = allOrgUsers.filter(user => {
      const hasManager = !!user.manager_email;
      const hasDirectReports = allOrgUsers.some(otherUser => otherUser.manager_email === user.email);
      const isIsolatedSuperUser = user.admin_scope && !hasManager && !hasDirectReports;
      
      if (isIsolatedSuperUser) {
        logger.debug(`Filtering out isolated super user: ${user.name} (${user.email})`);
        return false;
      }
      return true;
    });
    
    // Build the hierarchical tree structure based on manager_email
    const buildHierarchy = (users: any[], managerEmail: string | null = null): any[] => {
      return users
        .filter(user => user.manager_email === managerEmail)
        .map(user => ({
          id: user.id,
          name: user.name,
          surname: user.surname,
          email: user.email,
          jobTitle: user.job_title,
          department: user.department,
          avatarUrl: user.avatar_url,
          children: buildHierarchy(users, user.email)
        }));
    };

    const hierarchy = buildHierarchy(orgUsers);
    
    logger.debug(`Org hierarchy for org ${organizationId}: ${orgUsers.length} users, ${hierarchy.length} root nodes`);
    
    res.json({
      success: true,
      data: hierarchy,
      total: orgUsers.length
    });
  } catch (error: any) {
    logger.error('Error getting org hierarchy:', error);
    res.status(500).json({ message: error.message || 'Failed to get organization hierarchy' });
  }
});

// Get user's hierarchical relationships (N+2, N+1, N-1, N-2, peers)
router.get('/org-chart/relationships/:userId?', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Use provided userId or default to current user
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user.id;
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Get hierarchical relationships
    const hierarchy = await storage.getUserHierarchy(userId);
    
    logger.debug(`User hierarchy for user ${userId}:`, {
      hasManager: !!hierarchy.manager,
      hasSkipManager: !!hierarchy.skipManager,
      directReportsCount: hierarchy.directReports.length,
      indirectReportsCount: hierarchy.indirectReports.length,
      peersCount: hierarchy.peers.length
    });
    
    // Check if this is a super user with no organizational relationships
    // Super users without manager and without direct reports should not appear in org chart
    const isIsolatedSuperUser = hierarchy.user.admin_scope && 
                               !hierarchy.manager && 
                               hierarchy.directReports.length === 0;
                               
    if (isIsolatedSuperUser) {
      logger.debug(`User ${userId} is an isolated super user - excluding from org chart`);
      return res.status(404).json({ 
        message: 'User not part of organizational hierarchy',
        reason: 'isolated_super_user'
      });
    }
    
    // Format response with camelCase for frontend
    const response = {
      user: {
        id: hierarchy.user.id,
        name: hierarchy.user.name,
        surname: hierarchy.user.surname,
        email: hierarchy.user.email,
        jobTitle: hierarchy.user.job_title,
        department: hierarchy.user.department,
        avatarUrl: hierarchy.user.avatar_url,
      },
      manager: hierarchy.manager ? {
        id: hierarchy.manager.id,
        name: hierarchy.manager.name,
        surname: hierarchy.manager.surname,
        email: hierarchy.manager.email,
        jobTitle: hierarchy.manager.job_title,
        department: hierarchy.manager.department,
        avatarUrl: hierarchy.manager.avatar_url,
      } : null,
      skipManager: hierarchy.skipManager ? {
        id: hierarchy.skipManager.id,
        name: hierarchy.skipManager.name,
        surname: hierarchy.skipManager.surname,
        email: hierarchy.skipManager.email,
        jobTitle: hierarchy.skipManager.job_title,
        department: hierarchy.skipManager.department,
        avatarUrl: hierarchy.skipManager.avatar_url,
      } : null,
      directReports: hierarchy.directReports.map(report => ({
        id: report.id,
        name: report.name,
        surname: report.surname,
        email: report.email,
        jobTitle: report.job_title,
        department: report.department,
        avatarUrl: report.avatar_url,
      })),
      indirectReports: hierarchy.indirectReports.map(report => ({
        id: report.id,
        name: report.name,
        surname: report.surname,
        email: report.email,
        jobTitle: report.job_title,
        department: report.department,
        avatarUrl: report.avatar_url,
      })),
      peers: hierarchy.peers.map(peer => ({
        id: peer.id,
        name: peer.name,
        surname: peer.surname,
        email: peer.email,
        jobTitle: peer.job_title,
        department: peer.department,
        avatarUrl: peer.avatar_url,
      })),
    };
    
    res.json({
      success: true,
      data: response
    });
  } catch (error: any) {
    logger.error('Error getting user hierarchy:', error);
    res.status(500).json({ message: error.message || 'Failed to get user hierarchy' });
  }
});

// Get user's reporting tree (subordinates)
router.get('/org-chart/reporting-tree/:userId?', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Use provided userId or default to current user
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user.id;
    const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth as string) : 3;
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const tree = await storage.getReportingTree(userId, maxDepth);
    
    logger.debug(`Reporting tree for user ${userId} with max depth ${maxDepth}:`, {
      hasTree: !!tree,
      userId
    });
    
    res.json({
      success: true,
      data: tree
    });
  } catch (error: any) {
    logger.error('Error getting reporting tree:', error);
    res.status(500).json({ message: error.message || 'Failed to get reporting tree' });
  }
});

// Get specific user by ID (must be last to avoid conflicts with other routes)
router.get('/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user_id = parseInt(req.params.id);
    if (isNaN(user_id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Fetch user data from database
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user_id));

    if (!targetUser) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    // Ensure user belongs to same organization (multi-tenant security)
    if (targetUser.organization_id !== req.user.organization_id) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    // Only return public profile information
    const publicProfile = {
      id: targetUser.id,
      name: targetUser.name,
      surname: targetUser.surname,
      email: targetUser.email,
      jobTitle: targetUser.job_title,
      department: targetUser.department,
      location: targetUser.location,
      avatarUrl: targetUser.avatar_url,
      responsibilities: targetUser.responsibilities,
      aboutMe: targetUser.about_me,
      birthDate: targetUser.birth_date,
      hireDate: targetUser.hire_date,
      phoneNumber: targetUser.phone_number,
      nationality: targetUser.nationality,
      sex: targetUser.sex,
      coverPhotoUrl: targetUser.cover_photo_url,
      manager_email: targetUser.manager_email,
      status: targetUser.status,
    };

    logger.debug(
      `Returning public profile for user ${user_id} (${targetUser.name})`
    );
    res.json(publicProfile);
  } catch (error: any) {
    logger.error('Error getting user by ID:', error);
    res.status(500).json({ message: error.message || 'Failed to get user' });
  }
});

export { router as userRoutes };
