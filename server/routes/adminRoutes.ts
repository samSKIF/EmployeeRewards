import { Router } from 'express';
import bcrypt from 'bcrypt';
import {
  verifyToken,
  verifyAdmin,
  AuthenticatedRequest,
} from '../middleware/auth';
import { storage } from '../storage';
import { db, pool } from '../db';
import { users, interestChannels } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@shared/logger';

const router = Router();

// Get organization usage statistics
router.get(
  '/usage-stats',
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user || !req.user.organizationId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = await pool.query(
        `
      SELECT 
        o.name as organization_name,
        o.max_users,
        s.subscribed_users,
        COUNT(CASE WHEN u.status = 'active' THEN 1 END) as current_employees,
        COUNT(u.id) as total_employees
      FROM organizations o
      LEFT JOIN subscriptions s ON o.current_subscription_id = s.id
      LEFT JOIN users u ON u.organization_id = o.id
      WHERE o.id = $1
      GROUP BY o.id, o.name, o.max_users, s.subscribed_users
    `,
        [req.user.organizationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      const stats = result.rows[0];
      res.json({
        organizationName: stats.organization_name,
        maxUsers: parseInt(stats.max_users) || 0,
        subscribedUsers: parseInt(stats.subscribed_users) || 0,
        currentEmployees: parseInt(stats.current_employees) || 0,
        totalEmployees: parseInt(stats.total_employees) || 0,
      });
    } catch (error) {
      logger.error('Error fetching usage stats:', error);
      res.status(500).json({ message: 'Failed to fetch usage statistics' });
    }
  }
);

// Get all spaces for admin management
router.get(
  '/spaces',
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Get all spaces for the admin's organization
      const spaces = await db
        .select({
          id: interestChannels.id,
          name: interestChannels.name,
          description: interestChannels.description,
          channelType: interestChannels.channelType,
          accessLevel: interestChannels.accessLevel,
          memberCount: interestChannels.memberCount,
          isActive: interestChannels.isActive,
          allowedDepartments: interestChannels.allowedDepartments,
          allowedSites: interestChannels.allowedSites,
          createdAt: interestChannels.createdAt,
          createdBy: interestChannels.createdBy,
        })
        .from(interestChannels)
        .where(
          eq(interestChannels.organizationId, req.user.organizationId || 1)
        )
        .orderBy(desc(interestChannels.createdAt));

      logger.info(
        `Returning ${spaces.length} spaces for org ${req.user.organizationId}`
      );
      res.json(spaces);
    } catch (error) {
      logger.error('Error fetching admin spaces:', error);
      res.status(500).json({ message: 'Failed to fetch spaces' });
    }
  }
);

// Create corporate admin account
router.post('/corporate-account', async (req, res) => {
  try {
    // Default values for corporate admin
    const email = 'admin@thriviohr.com';
    const password = 'admin123';
    const name = 'Corporate Admin';
    const username = 'corporate_admin';

    logger.info('Creating corporate admin account:', { email, name, username });

    // Check if email already exists
    const existingEmailUser = await storage.getUserByEmail(email);
    if (existingEmailUser) {
      logger.info('Corporate admin already exists:', email);
      return res
        .status(200)
        .json({ message: 'Corporate admin already exists', email });
    }

    // Check if username already exists
    const [existingUsernameUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    if (existingUsernameUser) {
      logger.info('Username already taken, using alternative');
      const altUsername = `corporate_admin_${Date.now()}`;
    }

    // Get the corporate organization
    const orgsResult = await pool.query(`
      SELECT * FROM organizations WHERE type = 'corporate' LIMIT 1
    `);
    logger.debug('Found corporate organizations:', orgsResult.rows);

    let corporateOrg = orgsResult.rows[0];

    if (!corporateOrg) {
      logger.info('No corporate organization found, creating one');
      const newOrgResult = await pool.query(`
        INSERT INTO organizations (name, type, status)
        VALUES ('ThrivioHR Corporate', 'corporate', 'active')
        RETURNING *
      `);

      corporateOrg = newOrgResult.rows[0];
      logger.info('Created corporate organization:', corporateOrg);
    }

    // Hash the password
    const hashedPassword = await hash(password, 10);
    logger.debug('Password hashed successfully');

    logger.debug('Inserting corporate admin user with values:', {
      email,
      username,
      name,
      isAdmin: true,
      role_type: 'corporate_admin',
      organization_id: corporateOrg.id,
    });

    // Create the user with corporate_admin role
    const result = await pool.query(
      `
      INSERT INTO users (
        email, username, password, name, 
        "is_admin", role_type, organization_id, 
        permissions, status
      ) 
      VALUES (
        $1, $2, $3, $4, 
        $5, $6, $7, 
        $8, $9
      )
      RETURNING *
    `,
      [
        email,
        username,
        hashedPassword,
        name,
        true,
        'corporate_admin',
        corporateOrg.id,
        JSON.stringify({
          manage_clients: true,
          manage_marketplace: true,
          manage_features: true,
        }),
        'active',
      ]
    );

    const newUser = result.rows[0];
    logger.info('Corporate admin user created successfully:', {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role_type: newUser.role_type,
    });

    // Return success with user data (excluding password)
    const userWithoutPassword = { ...newUser, password: undefined };
    return res.status(201).json({
      ...userWithoutPassword,
      credentials: { email, password },
    });
  } catch (error: any) {
    logger.error('Error creating corporate admin account:', error);
    return res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
});

// Verify corporate admin access
router.get(
  '/corporate/check',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check if the user is a corporate admin
      if (req.user.roleType !== 'corporate_admin') {
        return res
          .status(403)
          .json({ message: 'Forbidden: Corporate admin access required' });
      }

      res.json({ isCorporateAdmin: true });
    } catch (error: any) {
      logger.error('Error checking corporate admin:', error);
      res
        .status(500)
        .json({
          message: error.message || 'Error checking corporate admin status',
        });
    }
  }
);

// Get all organizations (clients)
router.get(
  '/organizations',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check if the user is a corporate admin
      if (req.user.roleType !== 'corporate_admin') {
        return res
          .status(403)
          .json({ message: 'Forbidden: Corporate admin access required' });
      }

      // Query all organizations that are not corporate
      const result = await pool.query(`
      SELECT 
        o.*, 
        (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count 
      FROM organizations o 
      WHERE o.type != 'corporate'
      ORDER BY o.created_at DESC
    `);

      const organizations = result.rows;

      res.json(organizations);
    } catch (error: any) {
      logger.error('Error getting organizations:', error);
      res
        .status(500)
        .json({ message: error.message || 'Error retrieving organizations' });
    }
  }
);

// Create a new organization (client)
router.post(
  '/organizations',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check if the user is a corporate admin
      if (req.user.roleType !== 'corporate_admin') {
        return res
          .status(403)
          .json({ message: 'Forbidden: Corporate admin access required' });
      }

      const { name, type, domain, features } = req.body;

      if (!name || !type) {
        return res
          .status(400)
          .json({ message: 'Missing required fields: name and type' });
      }

      // Create new organization
      const result = await pool.query(
        `
      INSERT INTO organizations (name, type, domain, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING *
    `,
        [name, type, domain]
      );

      const newOrg = result.rows[0];

      // Add features if provided
      if (features && Array.isArray(features)) {
        for (const feature of features) {
          await pool.query(
            `
          INSERT INTO organization_features (organization_id, feature_name, is_enabled)
          VALUES ($1, $2, $3)
        `,
            [newOrg.id, feature.name, feature.enabled || true]
          );
        }
      }

      logger.info('New organization created:', newOrg);
      res.status(201).json(newOrg);
    } catch (error: any) {
      logger.error('Error creating organization:', error);
      res
        .status(500)
        .json({ message: error.message || 'Error creating organization' });
    }
  }
);

// Get all employees for admin view
router.get(
  '/employees',
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        department,
        location,
        search,
        limit = 50,
        offset = 0,
      } = req.query;
      const organizationId = req.user.organizationId;

      logger.info(
        `Admin fetching employees for organization ${organizationId}`
      );

      // Query employees from database
      let query = `
      SELECT 
        id, username, name, surname, email, phone_number, job_title, 
        department, location, manager_email, sex, nationality, 
        birth_date, hire_date, is_admin, status, avatar_url, 
        created_at, admin_scope, allowed_sites, allowed_departments
      FROM users 
      WHERE organization_id = $1
    `;

      const queryParams: any[] = [organizationId];
      let paramCount = 1;

      // Add filters if provided
      if (department) {
        paramCount++;
        query += ` AND department = $${paramCount}`;
        queryParams.push(department);
      }

      if (location) {
        paramCount++;
        query += ` AND location = $${paramCount}`;
        queryParams.push(location);
      }

      if (search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR surname ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
      }

      query += ` ORDER BY name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      queryParams.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, queryParams);

      // Map database fields to frontend expected format
      const employees = result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        name: row.name,
        surname: row.surname,
        email: row.email,
        phoneNumber: row.phone_number, // Map snake_case to camelCase
        jobTitle: row.job_title, // Map snake_case to camelCase
        department: row.department,
        location: row.location,
        managerEmail: row.manager_email, // Map snake_case to camelCase
        sex: row.sex,
        nationality: row.nationality,
        dateOfBirth: row.birth_date, // Map birth_date to dateOfBirth
        dateJoined: row.hire_date, // Map hire_date to dateJoined
        isAdmin: row.is_admin,
        status: row.status,
        avatarUrl: row.avatar_url, // Map snake_case to camelCase
        createdAt: row.created_at,
        adminScope: row.admin_scope,
        allowedSites:
          typeof row.allowed_sites === 'string'
            ? JSON.parse(row.allowed_sites)
            : row.allowed_sites || [],
        allowedDepartments:
          typeof row.allowed_departments === 'string'
            ? JSON.parse(row.allowed_departments)
            : row.allowed_departments || [],
      }));

      logger.info(`Returning ${employees.length} employees for admin view`);
      res.json(employees);
    } catch (error: any) {
      logger.error('Error fetching employees:', error);
      res
        .status(500)
        .json({ message: error.message || 'Failed to fetch employees' });
    }
  }
);

// Update employee admin status and permissions
router.patch(
  '/employees/:id',
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const employeeId = parseInt(req.params.id);
      const updateData = req.body;

      logger.info('=== EMPLOYEE UPDATE REQUEST ===');
      logger.info('Employee ID:', employeeId);
      logger.info('Full request body:', JSON.stringify(updateData, null, 2));
      logger.info('User org ID:', req.user.organizationId);
      logger.info('===============================');

      // Build update object with proper field mapping
      const dbUpdateData: any = {};

      if (Object.keys(updateData).length === 0) {
        logger.error('No data provided for update');
        return res.status(400).json({ message: 'No data provided for update' });
      }

      // Handle password update separately - only update if provided and not empty
      if (updateData.password && updateData.password.trim() !== '') {
        const hashedPassword = await bcrypt.hash(updateData.password, 10);
        dbUpdateData.password = hashedPassword;
        logger.info('Password will be updated');
      }

      // Map frontend field names to database field names
      if (updateData.name !== undefined) dbUpdateData.name = updateData.name;
      if (updateData.surname !== undefined)
        dbUpdateData.surname = updateData.surname;
      if (updateData.email !== undefined) dbUpdateData.email = updateData.email;
      if (updateData.phoneNumber !== undefined)
        dbUpdateData.phone_number = updateData.phoneNumber;
      if (updateData.jobTitle !== undefined) {
        dbUpdateData.job_title = updateData.jobTitle;
        logger.info('Setting job_title to:', updateData.jobTitle);
      }
      if (updateData.department !== undefined)
        dbUpdateData.department = updateData.department;
      if (updateData.location !== undefined)
        dbUpdateData.location = updateData.location;
      if (updateData.sex !== undefined) dbUpdateData.sex = updateData.sex;
      if (updateData.nationality !== undefined)
        dbUpdateData.nationality = updateData.nationality;
      if (updateData.birthDate !== undefined) {
        dbUpdateData.birth_date = updateData.birthDate;
        logger.info('Setting birth_date to:', updateData.birthDate);
      }
      if (updateData.hireDate !== undefined)
        dbUpdateData.hire_date = updateData.hireDate;
      if (updateData.status !== undefined)
        dbUpdateData.status = updateData.status;
      if (updateData.avatarUrl !== undefined)
        dbUpdateData.avatar_url = updateData.avatarUrl;
      if (updateData.managerEmail !== undefined)
        dbUpdateData.manager_email = updateData.managerEmail;

      // Handle admin-specific fields
      if (updateData.isAdmin !== undefined) {
        dbUpdateData.is_admin = updateData.isAdmin;
        logger.info('Setting is_admin to:', updateData.isAdmin);
      }

      if (updateData.adminScope !== undefined) {
        dbUpdateData.admin_scope = updateData.adminScope;
      }

      if (updateData.allowedSites !== undefined) {
        // PostgreSQL array format - convert array to PostgreSQL array literal
        dbUpdateData.allowed_sites =
          updateData.allowedSites.length > 0
            ? `{${updateData.allowedSites.map((s) => `"${s}"`).join(',')}}`
            : '{}';
      }

      if (updateData.allowedDepartments !== undefined) {
        // PostgreSQL array format - convert array to PostgreSQL array literal
        dbUpdateData.allowed_departments =
          updateData.allowedDepartments.length > 0
            ? `{${updateData.allowedDepartments.map((d) => `"${d}"`).join(',')}}`
            : '{}';
      }

      // Update using raw SQL to ensure proper field mapping
      const setClause = Object.keys(dbUpdateData)
        .map((key, index) => `"${key}" = $${index + 2}`)
        .join(', ');

      const values = [employeeId, ...Object.values(dbUpdateData)];

      const updateQuery = `
      UPDATE users 
      SET ${setClause}
      WHERE id = $1 AND organization_id = $${values.length + 1}
      RETURNING *
    `;

      values.push(req.user.organizationId);

      if (Object.keys(dbUpdateData).length === 0) {
        logger.warn('No valid fields to update after mapping');
        return res
          .status(400)
          .json({ message: 'No valid fields provided for update' });
      }

      logger.info('=== SQL EXECUTION ===');
      logger.info('Query:', updateQuery);
      logger.info('Values:', values);
      logger.info('dbUpdateData keys:', Object.keys(dbUpdateData));
      logger.info('dbUpdateData values:', dbUpdateData);
      logger.info('====================');

      const result = await pool.query(updateQuery, values);

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ message: 'Team member not found or access denied' });
      }

      const updatedEmployee = result.rows[0];
      logger.info('Team member updated successfully:', {
        id: updatedEmployee.id,
        name: updatedEmployee.name,
        job_title: updatedEmployee.job_title,
        birth_date: updatedEmployee.birth_date,
        is_admin: updatedEmployee.is_admin,
      });

      // Map database fields back to frontend expected format
      const responseData = {
        id: updatedEmployee.id,
        username: updatedEmployee.username,
        name: updatedEmployee.name,
        surname: updatedEmployee.surname,
        email: updatedEmployee.email,
        phoneNumber: updatedEmployee.phone_number,
        jobTitle: updatedEmployee.job_title,
        department: updatedEmployee.department,
        location: updatedEmployee.location,
        managerEmail: updatedEmployee.manager_email,
        sex: updatedEmployee.sex,
        nationality: updatedEmployee.nationality,
        birthDate: updatedEmployee.birth_date, // Changed from dateOfBirth to birthDate
        hireDate: updatedEmployee.hire_date, // Changed from dateJoined to hireDate
        isAdmin: updatedEmployee.is_admin,
        status: updatedEmployee.status,
        avatarUrl: updatedEmployee.avatar_url,
        createdAt: updatedEmployee.created_at,
        adminScope: updatedEmployee.admin_scope,
        allowedSites: updatedEmployee.allowed_sites || [],
        allowedDepartments: updatedEmployee.allowed_departments || [],
      };

      res.json(responseData);
    } catch (error: any) {
      logger.error('Error updating team member:', error);
      res
        .status(500)
        .json({ message: error.message || 'Error updating team member' });
    }
  }
);

// Update admin permissions (for existing admins)
router.patch(
  '/permissions/:id',
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const employeeId = parseInt(req.params.id);
      const { adminScope, allowedSites, allowedDepartments } = req.body;

      logger.info('Updating admin permissions:', { employeeId, adminScope });

      // Update admin permissions
      const result = await pool.query(
        `
      UPDATE users 
      SET 
        is_admin = true,
        admin_scope = $2,
        allowed_sites = $3,
        allowed_departments = $4
      WHERE id = $1 AND organization_id = $5
      RETURNING *
    `,
        [
          employeeId,
          adminScope,
          JSON.stringify(allowedSites || []),
          JSON.stringify(allowedDepartments || []),
          req.user.organizationId,
        ]
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ message: 'Team member not found or access denied' });
      }

      const updatedEmployee = result.rows[0];
      logger.info('Admin permissions updated successfully:', {
        id: updatedEmployee.id,
        name: updatedEmployee.name,
        admin_scope: updatedEmployee.admin_scope,
      });

      res.json(updatedEmployee);
    } catch (error: any) {
      logger.error('Error updating admin permissions:', error);
      res
        .status(500)
        .json({ message: error.message || 'Error updating admin permissions' });
    }
  }
);

// Get all channels for admin interface
router.get(
  '/channels',
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Get all channels for the organization
      const result = await pool.query(
        `
      SELECT 
        c.*,
        COUNT(cm.user_id) as member_count,
        COUNT(CASE WHEN cm.user_id = $2 THEN 1 END) > 0 as is_member
      FROM channels c
      LEFT JOIN channel_members cm ON c.id = cm.channel_id
      WHERE c.organization_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `,
        [req.user.organizationId, req.user.id]
      );

      const channels = result.rows.map((channel) => ({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        type: channel.type,
        isPrivate: channel.is_private,
        memberCount: parseInt(channel.member_count) || 0,
        isMember: channel.is_member,
        createdAt: channel.created_at,
        updatedAt: channel.updated_at,
      }));

      logger.info('Retrieved channels for admin:', {
        organizationId: req.user.organizationId,
        channelCount: channels.length,
      });

      res.json(channels);
    } catch (error: any) {
      logger.error('Error getting channels for admin:', error);
      res
        .status(500)
        .json({ message: error.message || 'Error retrieving channels' });
    }
  }
);

export default router;
