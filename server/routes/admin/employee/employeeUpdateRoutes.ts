import { Router } from 'express';
import { verifyToken, verifyAdmin, AuthenticatedRequest } from '../../../middleware/auth';
import { storage } from '../../../storage';
import { logger } from '@platform/sdk';
import { logActivity } from '../../../middleware/activityLogger';

const router = Router();

// Update employee information with comprehensive activity tracking
router.put('/:id', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const organizationId = req.user?.organization_id;
    const updateData = req.body;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Get current employee data for comparison
    const currentEmployee = await storage.getUserById(employeeId);
    if (!currentEmployee || currentEmployee.organization_id !== organizationId) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Update employee
    const updatedEmployee = await storage.updateUser(employeeId, updateData);

    // Log the update with detailed change tracking
    await logActivity(req, 'update_employee', 'employees', employeeId, {
      employee_name: currentEmployee.name,
      changes: updateData,
      before_state: {
        name: currentEmployee.name,
        email: currentEmployee.email,
        department: currentEmployee.department,
        job_title: currentEmployee.job_title,
        status: currentEmployee.status
      },
      after_state: {
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        department: updatedEmployee.department,
        job_title: updatedEmployee.job_title,
        status: updatedEmployee.status
      },
      fields_modified: Object.keys(updateData),
    });

    res.json({
      message: 'Employee updated successfully',
      employee: updatedEmployee,
    });

  } catch (error: any) {
    const message = error?.message || 'unknown_error';
    logger.error('Error updating employee:', { error, message, employeeId: req.params.id });
    res.status(500).json({ message: 'Failed to update employee' });
  }
});

// Delete employee with comprehensive dependency checking
router.delete('/:id', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Get employee details before deletion for audit
    const employee = await storage.getUserById(employeeId);
    if (!employee || employee.organization_id !== organizationId) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check for dependencies before deletion
    const dependencies = await storage.checkUserDependencies(employeeId);
    const hasBlockingDependencies = dependencies.hasActivePosts || dependencies.hasActiveRecognitions || dependencies.hasActiveOrders;
    
    if (hasBlockingDependencies) {
      return res.status(400).json({ 
        message: 'Cannot delete employee with active dependencies',
        dependencies
      });
    }

    // Perform soft delete
    await storage.deleteUser(employeeId);

    // Log the deletion
    await logActivity(req, 'delete_employee', 'employees', employeeId, {
      employee_name: employee.name,
      employee_email: employee.email,
      employee_department: employee.department,
      deletion_type: 'soft_delete',
      dependencies_checked: dependencies,
    });

    res.json({
      message: 'Employee deleted successfully',
      employee: { id: employeeId, name: employee.name },
    });

  } catch (error: any) {
    const message = error?.message || 'unknown_error';
    logger.error('Error deleting employee:', { error, message, employeeId: req.params.id });
    res.status(500).json({ message: 'Failed to delete employee' });
  }
});

export default router;