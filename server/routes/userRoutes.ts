import { Router } from 'express';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../storage';
import { db } from '../db';
import { users, subscriptions } from '@shared/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { logger } from '@shared/logger';
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

    // Combine fresh user data with balance, ensuring isAdmin is explicitly set
    const userWithBalance = {
      ...freshUser,
      isAdmin: freshUser.is_admin === true, // Ensure boolean false for non-admins
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

    // Combine user data with balance
    const userWithBalance = {
      ...updatedUser,
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
        user: updatedUser,
      });
    } catch (dbError) {
      logger.error('Database error updating avatar:', dbError);

      // Fallback: If database update fails, still return the user with updated avatar
      const updatedUser = {
        ...req.user,
        avatarUrl,
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
        user: updatedUser,
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

    const users = await dualWriteAdapter.handleUsersList(
      organizationId,
      subscriptionLimit, // Use subscription limit instead of hardcoded 50
      parseInt(offset as string),
      async () => {
        return await storage.getUsers(
          organizationId!,
          subscriptionLimit,
          parseInt(offset as string)
        );
      }
    );

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

      // Query the departments table directly (no caching for now)
      const departmentRows = await db.execute(sql`
      SELECT name FROM departments 
      WHERE organization_id = ${req.user.organization_id || 1} 
      ORDER BY name
    `);

      const departments = departmentRows.rows.map((row: any) => row.name);

      logger.info(
        `Returning ${departments.length} departments for org ${req.user.organization_id}:`,
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
          eq(users.organization_id, req.user.organization_id)
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
