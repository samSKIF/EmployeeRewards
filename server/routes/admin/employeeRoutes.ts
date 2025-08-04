import { Router } from 'express';
import { verifyToken, verifyAdmin, AuthenticatedRequest } from '../../middleware/auth';
import { storage } from '../../storage';
import { logger } from '@shared/logger';
import { activityLogger, logActivity, auditLogger } from '../../middleware/activityLogger';

const router = Router();

/**
 * Enhanced employee management with comprehensive activity tracking
 */

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

  } catch (error) {
    logger.error('Error fetching employees:', { error, organizationId: req.user?.organization_id });
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

// Get employee by ID with activity tracking
router.get('/:id', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    const employee = await storage.getUserById(employeeId);
    
    if (!employee || employee.organization_id !== organizationId) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Log the employee profile view
    await logActivity(req, 'view_employee_profile', 'employee', employeeId, {
      employee_name: employee.name,
      employee_department: employee.department,
    });

    res.json(employee);

  } catch (error) {
    logger.error('Error fetching employee:', { error, employeeId: req.params.id });
    res.status(500).json({ message: 'Failed to fetch employee' });
  }
});

// Update employee with comprehensive audit trail
router.put('/:id', 
  verifyToken, 
  verifyAdmin,
  activityLogger({ action_type: 'update_employee', resource_type: 'employee' }),
  async (req: AuthenticatedRequest, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const organizationId = req.user?.organization_id;
    const updates = req.body;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Get current employee data for audit trail
    const currentEmployee = await storage.getUserById(employeeId);
    
    if (!currentEmployee || currentEmployee.organization_id !== organizationId) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Update employee
    const updatedEmployee = await storage.updateUser(employeeId, updates);

    // Create comprehensive audit log
    await auditLogger(
      req.user?.id,
      organizationId,
      'UPDATE',
      'users',
      employeeId,
      {
        name: currentEmployee.name,
        email: currentEmployee.email,
        department: currentEmployee.department,
        job_title: currentEmployee.job_title,
        status: currentEmployee.status,
      },
      {
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        department: updatedEmployee.department,
        job_title: updatedEmployee.job_title,
        status: updatedEmployee.status,
      },
      req
    );

    // Log the employee update activity
    await logActivity(req, 'update_employee', 'employee', employeeId, {
      changes: updates,
      employee_name: updatedEmployee.name,
      old_department: currentEmployee.department,
      new_department: updatedEmployee.department,
      success: true,
    });

    res.json(updatedEmployee);

  } catch (error) {
    logger.error('Error updating employee:', { error, employeeId: req.params.id });
    res.status(500).json({ message: 'Failed to update employee' });
  }
});

// Delete employee with comprehensive audit and cleanup
router.delete('/:id', 
  verifyToken, 
  verifyAdmin,
  activityLogger({ action_type: 'delete_employee', resource_type: 'employee' }),
  async (req: AuthenticatedRequest, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Get employee data before deletion for audit
    const employeeToDelete = await storage.getUserById(employeeId);
    
    if (!employeeToDelete || employeeToDelete.organization_id !== organizationId) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check for dependencies (posts, recognitions, etc.)
    const dependencies = await storage.checkUserDependencies(employeeId);
    
    if (dependencies.hasActivePosts || dependencies.hasActiveRecognitions) {
      return res.status(400).json({ 
        message: 'Cannot delete employee with active posts or recognitions. Please archive the employee instead.',
        dependencies: dependencies
      });
    }

    // Create comprehensive audit log before deletion
    await auditLogger(
      req.user?.id,
      organizationId,
      'DELETE',
      'users',
      employeeId,
      {
        name: employeeToDelete.name,
        email: employeeToDelete.email,
        department: employeeToDelete.department,
        job_title: employeeToDelete.job_title,
        status: employeeToDelete.status,
        hire_date: employeeToDelete.hire_date,
        organization_id: employeeToDelete.organization_id,
      },
      null,
      req
    );

    // Perform the deletion
    await storage.deleteUser(employeeId);

    // Log the employee deletion activity
    await logActivity(req, 'delete_employee', 'employee', employeeId, {
      deleted_employee: {
        name: employeeToDelete.name,
        email: employeeToDelete.email,
        department: employeeToDelete.department,
        job_title: employeeToDelete.job_title,
      },
      dependencies_checked: dependencies,
      success: true,
    });

    res.json({ 
      message: 'Employee deleted successfully',
      deleted_employee: {
        id: employeeId,
        name: employeeToDelete.name,
        email: employeeToDelete.email,
      }
    });

  } catch (error) {
    logger.error('Error deleting employee:', { error, employeeId: req.params.id });
    res.status(500).json({ message: 'Failed to delete employee' });
  }
});

// Bulk employee operations with activity tracking
router.post('/bulk-action', 
  verifyToken, 
  verifyAdmin,
  activityLogger({ action_type: 'bulk_employee_action', resource_type: 'employees' }),
  async (req: AuthenticatedRequest, res) => {
  try {
    const { action, employee_ids, data } = req.body;
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    if (!action || !employee_ids || !Array.isArray(employee_ids)) {
      return res.status(400).json({ message: 'Invalid bulk action parameters' });
    }

    const results = [];
    const errors = [];

    for (const employeeId of employee_ids) {
      try {
        let result;
        
        switch (action) {
          case 'update_status':
            result = await storage.updateUser(employeeId, { status: data.status });
            break;
          case 'update_department':
            result = await storage.updateUser(employeeId, { department: data.department });
            break;
          case 'archive':
            result = await storage.updateUser(employeeId, { status: 'inactive' });
            break;
          default:
            throw new Error(`Unsupported bulk action: ${action}`);
        }
        
        results.push({ employee_id: employeeId, success: true, result });
      } catch (error) {
        logger.error('Bulk action failed for employee:', { employeeId, action, error });
        errors.push({ employee_id: employeeId, success: false, error: error.message });
      }
    }

    // Log the bulk operation
    await logActivity(req, 'bulk_employee_action', 'employees', undefined, {
      action,
      employee_count: employee_ids.length,
      successful_updates: results.length,
      failed_updates: errors.length,
      data,
    });

    res.json({
      message: `Bulk ${action} completed`,
      results,
      errors,
      summary: {
        total: employee_ids.length,
        successful: results.length,
        failed: errors.length,
      }
    });

  } catch (error) {
    logger.error('Error in bulk employee action:', { error, action: req.body.action });
    res.status(500).json({ message: 'Failed to perform bulk action' });
  }
});

// Employee search with advanced filters and activity tracking
router.get('/search/:query', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const query = req.params.query;
    const organizationId = req.user?.organization_id;
    const { department, status, limit = 20 } = req.query;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Log the search activity
    await logActivity(req, 'search_employees', 'employees', undefined, {
      search_query: query,
      filters: { department, status },
      search_length: query.length,
    });

    const searchResults = await storage.searchEmployees(organizationId, query, {
      department: department as string,
      status: status as string,
      limit: parseInt(limit as string),
    });

    res.json({
      query,
      results: searchResults,
      total: searchResults.length,
    });

  } catch (error) {
    logger.error('Error searching employees:', { error, query: req.params.query });
    res.status(500).json({ message: 'Failed to search employees' });
  }
});

export default router;