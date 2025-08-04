import { Router } from 'express';
import { verifyToken, verifyAdmin, AuthenticatedRequest } from '../../middleware/auth';
import { storage } from '../../storage';
import { logger } from '@shared/logger';
import { activityLogger, logActivity, auditLogger } from '../../middleware/activityLogger';

const router = Router();

/**
 * Enhanced Employee Management Routes with Comprehensive Activity Tracking
 * 
 * Addresses audit findings by adding:
 * - Complete activity tracking for all employee operations
 * - Comprehensive audit trails for compliance
 * - Enhanced error handling and validation
 * - Performance monitoring integration
 */

// Get employees with enhanced filtering and activity tracking
router.get('/', 
  verifyToken, 
  verifyAdmin,
  activityLogger({ action_type: 'view_employees', resource_type: 'employees' }),
  async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organization_id;
    const { 
      search, 
      department, 
      status = 'active', 
      limit = 50, 
      offset = 0,
      sort_by = 'name',
      sort_order = 'asc',
      include_admin = 'all'
    } = req.query;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Log the employee directory access with detailed context
    await logActivity(req, 'view_employee_directory', 'employees', undefined, {
      search_params: { search, department, status, limit, offset },
      filters_applied: !!search || !!department || status !== 'active',
      sort_config: { sort_by, sort_order },
      admin_filter: include_admin,
      organization_context: organizationId,
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

    // Log successful data retrieval
    await logActivity(req, 'employees_data_retrieved', 'employees', undefined, {
      employee_count: employees.length,
      filters_used: { search, department, status },
      performance_note: 'successful_retrieval',
    });

    res.json({
      employees,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: employees.length,
      },
      filters: { search, department, status, include_admin },
      meta: {
        organization_id: organizationId,
        retrieved_at: new Date().toISOString(),
        sort_config: { sort_by, sort_order },
      }
    });

  } catch (error) {
    logger.error('Enhanced employee fetch failed:', { 
      error, 
      organizationId: req.user?.organization_id,
      request_params: req.query,
    });

    // Log the error for audit purposes
    await logActivity(req, 'employees_fetch_error', 'employees', undefined, {
      error_type: error.message,
      request_params: req.query,
      failure_reason: 'database_query_failed',
    });

    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

// Create employee with comprehensive tracking
router.post('/', 
  verifyToken, 
  verifyAdmin,
  activityLogger({ action_type: 'create_employee', resource_type: 'employee' }),
  async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organization_id;
    const employeeData = req.body;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Validate required fields
    if (!employeeData.name || !employeeData.email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Check if email already exists
    const existingUser = await storage.getUserByEmail(employeeData.email);
    if (existingUser) {
      await logActivity(req, 'create_employee_failed', 'employee', undefined, {
        failure_reason: 'email_already_exists',
        attempted_email: employeeData.email,
        existing_user_id: existingUser.id,
      });
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Create the employee
    const newEmployee = await storage.createUser({
      ...employeeData,
      organization_id: organizationId,
      created_by: req.user?.id,
      created_at: new Date(),
      status: employeeData.status || 'active',
    });

    // Create comprehensive audit log
    await auditLogger(
      req.user?.id,
      organizationId,
      'CREATE',
      'users',
      newEmployee.id,
      null,
      {
        name: newEmployee.name,
        email: newEmployee.email,
        department: newEmployee.department,
        job_title: newEmployee.job_title,
        status: newEmployee.status,
        is_admin: newEmployee.is_admin,
        organization_id: organizationId,
      },
      req
    );

    // Log detailed employee creation activity
    await logActivity(req, 'create_employee', 'employee', newEmployee.id, {
      employee_name: newEmployee.name,
      employee_email: newEmployee.email,
      department: newEmployee.department,
      job_title: newEmployee.job_title,
      is_admin: newEmployee.is_admin,
      created_by_admin: req.user?.id,
      organization_context: organizationId,
      success: true,
    });

    res.status(201).json({
      employee: newEmployee,
      message: 'Employee created successfully',
      audit_trail: {
        created_by: req.user?.id,
        created_at: new Date().toISOString(),
        action: 'employee_creation',
      }
    });

  } catch (error) {
    logger.error('Enhanced employee creation failed:', { 
      error, 
      organizationId: req.user?.organization_id,
      employee_data: { ...req.body, password: '[REDACTED]' },
    });

    await logActivity(req, 'create_employee_error', 'employee', undefined, {
      error_type: error.message,
      attempted_data: { 
        name: req.body.name,
        email: req.body.email,
        department: req.body.department 
      },
      failure_context: 'database_creation_failed',
    });

    res.status(500).json({ message: 'Failed to create employee' });
  }
});

// Update employee with enhanced audit tracking
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

    // Get current employee data for comprehensive audit trail
    const currentEmployee = await storage.getUserById(employeeId);
    
    if (!currentEmployee || currentEmployee.organization_id !== organizationId) {
      await logActivity(req, 'update_employee_failed', 'employee', employeeId, {
        failure_reason: 'employee_not_found_or_unauthorized',
        attempted_employee_id: employeeId,
        organization_mismatch: currentEmployee?.organization_id !== organizationId,
      });
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Prevent self-privilege escalation in admin updates
    if (updates.is_admin !== undefined && currentEmployee.id === req.user?.id) {
      await logActivity(req, 'update_employee_failed', 'employee', employeeId, {
        failure_reason: 'attempted_self_privilege_escalation',
        current_admin_status: currentEmployee.is_admin,
        attempted_admin_status: updates.is_admin,
      });
      return res.status(403).json({ message: 'Cannot modify your own admin status' });
    }

    // Update employee
    const updatedEmployee = await storage.updateUser(employeeId, updates);

    // Create comprehensive audit log with before/after comparison
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
        is_admin: currentEmployee.is_admin,
        manager_email: currentEmployee.manager_email,
      },
      {
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        department: updatedEmployee.department,
        job_title: updatedEmployee.job_title,
        status: updatedEmployee.status,
        is_admin: updatedEmployee.is_admin,
        manager_email: updatedEmployee.manager_email,
      },
      req
    );

    // Log detailed employee update activity
    await logActivity(req, 'update_employee', 'employee', employeeId, {
      changes_made: updates,
      employee_name: updatedEmployee.name,
      previous_values: {
        department: currentEmployee.department,
        job_title: currentEmployee.job_title,
        status: currentEmployee.status,
        is_admin: currentEmployee.is_admin,
      },
      new_values: {
        department: updatedEmployee.department,
        job_title: updatedEmployee.job_title,
        status: updatedEmployee.status,
        is_admin: updatedEmployee.is_admin,
      },
      updated_by_admin: req.user?.id,
      organization_context: organizationId,
      success: true,
    });

    res.json({
      employee: updatedEmployee,
      message: 'Employee updated successfully',
      audit_trail: {
        updated_by: req.user?.id,
        updated_at: new Date().toISOString(),
        changes_applied: Object.keys(updates),
      }
    });

  } catch (error) {
    logger.error('Enhanced employee update failed:', { 
      error, 
      employeeId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    await logActivity(req, 'update_employee_error', 'employee', parseInt(req.params.id), {
      error_type: error.message,
      attempted_changes: req.body,
      failure_context: 'database_update_failed',
    });

    res.status(500).json({ message: 'Failed to update employee' });
  }
});

// Delete employee with comprehensive safety checks and audit
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

    // Prevent self-deletion
    if (employeeId === req.user?.id) {
      await logActivity(req, 'delete_employee_failed', 'employee', employeeId, {
        failure_reason: 'attempted_self_deletion',
        admin_attempted_self_delete: true,
      });
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }

    // Get employee data before deletion for comprehensive audit
    const employeeToDelete = await storage.getUserById(employeeId);
    
    if (!employeeToDelete || employeeToDelete.organization_id !== organizationId) {
      await logActivity(req, 'delete_employee_failed', 'employee', employeeId, {
        failure_reason: 'employee_not_found_or_unauthorized',
        organization_mismatch: employeeToDelete?.organization_id !== organizationId,
      });
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check for dependencies and active content
    const dependencies = await storage.checkUserDependencies(employeeId);
    
    if (dependencies.hasActivePosts || dependencies.hasActiveRecognitions) {
      await logActivity(req, 'delete_employee_blocked', 'employee', employeeId, {
        blocking_reason: 'has_active_content',
        dependencies: dependencies,
        posts_count: dependencies.postsCount,
        recognitions_count: dependencies.recognitionsCount,
      });
      
      return res.status(400).json({ 
        message: 'Cannot delete employee with active posts or recognitions. Please archive the employee instead.',
        dependencies: dependencies,
        recommendation: 'archive_instead_of_delete'
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
        is_admin: employeeToDelete.is_admin,
        hire_date: employeeToDelete.hire_date,
        organization_id: employeeToDelete.organization_id,
        created_at: employeeToDelete.created_at,
      },
      null,
      req
    );

    // Perform the deletion
    await storage.deleteUser(employeeId);

    // Log comprehensive employee deletion activity
    await logActivity(req, 'delete_employee', 'employee', employeeId, {
      deleted_employee: {
        name: employeeToDelete.name,
        email: employeeToDelete.email,
        department: employeeToDelete.department,
        job_title: employeeToDelete.job_title,
        is_admin: employeeToDelete.is_admin,
        hire_date: employeeToDelete.hire_date,
      },
      dependencies_checked: dependencies,
      deleted_by_admin: req.user?.id,
      organization_context: organizationId,
      deletion_timestamp: new Date().toISOString(),
      success: true,
    });

    res.json({ 
      message: 'Employee deleted successfully',
      deleted_employee: {
        id: employeeId,
        name: employeeToDelete.name,
        email: employeeToDelete.email,
      },
      audit_trail: {
        deleted_by: req.user?.id,
        deleted_at: new Date().toISOString(),
        action: 'employee_deletion',
      }
    });

  } catch (error) {
    logger.error('Enhanced employee deletion failed:', { 
      error, 
      employeeId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    await logActivity(req, 'delete_employee_error', 'employee', parseInt(req.params.id), {
      error_type: error.message,
      failure_context: 'database_deletion_failed',
    });

    res.status(500).json({ message: 'Failed to delete employee' });
  }
});

// Enhanced bulk operations with comprehensive tracking
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
    const auditTrail = [];

    for (const employeeId of employee_ids) {
      try {
        let result;
        const beforeState = await storage.getUserById(employeeId);
        
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
          case 'activate':
            result = await storage.updateUser(employeeId, { status: 'active' });
            break;
          default:
            throw new Error(`Unsupported bulk action: ${action}`);
        }
        
        // Create audit trail for each successful operation
        await auditLogger(
          req.user?.id,
          organizationId,
          'BULK_UPDATE',
          'users',
          employeeId,
          beforeState,
          result,
          req
        );

        auditTrail.push({
          employee_id: employeeId,
          action: action,
          before: beforeState,
          after: result,
          success: true
        });
        
        results.push({ employee_id: employeeId, success: true, result });
      } catch (error) {
        logger.error('Bulk action failed for employee:', { employeeId, action, error });
        errors.push({ employee_id: employeeId, success: false, error: error.message });
        
        auditTrail.push({
          employee_id: employeeId,
          action: action,
          success: false,
          error: error.message
        });
      }
    }

    // Log comprehensive bulk operation
    await logActivity(req, 'bulk_employee_action', 'employees', undefined, {
      action,
      employee_count: employee_ids.length,
      successful_updates: results.length,
      failed_updates: errors.length,
      data_applied: data,
      full_audit_trail: auditTrail,
      performed_by_admin: req.user?.id,
      organization_context: organizationId,
    });

    res.json({
      message: `Bulk ${action} completed`,
      results,
      errors,
      summary: {
        total: employee_ids.length,
        successful: results.length,
        failed: errors.length,
      },
      audit_trail: {
        action: `bulk_${action}`,
        performed_by: req.user?.id,
        performed_at: new Date().toISOString(),
        affected_employees: employee_ids.length,
      }
    });

  } catch (error) {
    logger.error('Enhanced bulk operation failed:', { 
      error, 
      action: req.body.action,
      organizationId: req.user?.organization_id,
    });

    await logActivity(req, 'bulk_employee_action_error', 'employees', undefined, {
      error_type: error.message,
      attempted_action: req.body.action,
      employee_ids: req.body.employee_ids,
      failure_context: 'bulk_operation_failed',
    });

    res.status(500).json({ message: 'Failed to perform bulk action' });
  }
});

export default router;