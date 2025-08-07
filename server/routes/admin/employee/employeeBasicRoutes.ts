import { Router } from 'express';
import { verifyToken, verifyAdmin, AuthenticatedRequest } from '../../../middleware/auth';
import { storage } from '../../../storage';
import { logger } from '@shared/logger';
import { logActivity } from '../../../middleware/activityLogger';

const router = Router();

// Get all employees for organization with enhanced search
router.get('/', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organization_id;
    const { 
      search, 
      department, 
      status = 'active', 
      limit = 50, 
      offset = 0,
      sort_by = 'name',
      sort_order = 'asc'
    } = req.query;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Log the employee directory access
    await logActivity(req, 'view_employee_directory', 'employees', undefined, {
      search_params: { search, department, status, limit, offset },
      filters_applied: !!search || !!department || status !== 'active',
    });

    const employees = await storage.getEmployeesWithFilters(organizationId, {
      search: search as string,
      department: department as string,
      status: status as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      sortBy: sort_by as string,
      sortOrder: sort_order as string,
    });

    res.json({
      employees,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: employees.length,
      },
      filters: { search, department, status },
    });

  } catch (error: any) {
    const message = error?.message || 'unknown_error';
    logger.error('Error fetching employees:', { error, message, organizationId: req.user?.organization_id });
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

// Get employee by ID with activity tracking
router.get('/:id', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const organizationId = req.user?.organization_id;
    const isCorporateAdmin = req.user?.role_type === 'corporate_admin';

    // Corporate admins can access all employees
    if (!isCorporateAdmin && !organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    const employee = await storage.getUserById(employeeId);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Check organization match only for non-corporate admins
    if (!isCorporateAdmin && employee.organization_id !== organizationId) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Log the employee profile view
    await logActivity(req, 'view_employee_profile', 'employees', employeeId, {
      employee_name: employee.name,
      employee_department: employee.department,
    });

    // Return employee data with snake_case field naming as per replit.md
    const responseData = {
      id: employee.id,
      username: employee.username,
      name: employee.name,
      surname: employee.surname,
      email: employee.email,
      phone_number: employee.phone_number,
      job_title: employee.job_title,
      department: employee.department,
      location: employee.location,
      manager_email: employee.manager_email,
      sex: employee.sex,
      nationality: employee.nationality,
      birth_date: employee.birth_date,
      hire_date: employee.hire_date,
      status: employee.status,
      avatar_url: employee.avatar_url,
      responsibilities: employee.responsibilities,
      about_me: employee.about_me,
      cover_photo_url: employee.cover_photo_url,
    };
    
    res.json(responseData);

  } catch (error: any) {
    const message = error?.message || 'unknown_error';
    logger.error('Error fetching employee:', { error, message, employeeId: req.params.id });
    res.status(500).json({ message: 'Failed to fetch employee' });
  }
});

export default router;