import { Router } from 'express';
import { verifyToken, verifyAdmin } from '../middleware/auth';
import { storage } from '../storage';

const router = Router();

// Bulk delete employees by date range
router.post('/api/admin/employees/bulk-delete-recent', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const organizationId = (req as any).user?.organization_id;
    const { hoursBack = 24 } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Get employees created in the last N hours
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursBack);
    
    const result = await storage.query(
      `SELECT id, name, surname, email, department, created_at 
       FROM users 
       WHERE organization_id = $1 
       AND created_at >= $2 
       AND role_type = 'employee'
       ORDER BY created_at DESC`,
      [organizationId, cutoffDate.toISOString()]
    );

    const recentEmployees = result.rows;

    res.json({
      employeesFound: recentEmployees.length,
      employees: recentEmployees,
      cutoffDate: cutoffDate.toISOString(),
      hoursBack
    });

  } catch (error) {
    console.error('Error finding recent employees:', error);
    res.status(500).json({ message: 'Failed to find recent employees' });
  }
});

// Execute bulk delete
router.post('/api/admin/employees/bulk-delete-confirm', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const organizationId = (req as any).user?.organization_id;
    const { employeeIds } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: 'Employee IDs are required' });
    }

    let deletedCount = 0;
    const errors: string[] = [];

    // Delete each employee
    for (const employeeId of employeeIds) {
      try {
        // Verify the employee belongs to this organization
        const employee = await storage.getUserById(employeeId);
        if (!employee) {
          errors.push(`Employee with ID ${employeeId} not found`);
          continue;
        }

        if (employee.organization_id !== organizationId) {
          errors.push(`Employee ${employee.email} does not belong to your organization`);
          continue;
        }

        if (employee.role_type === 'admin' || employee.is_admin) {
          errors.push(`Cannot delete admin user ${employee.email}`);
          continue;
        }

        await storage.query('DELETE FROM users WHERE id = $1', [employeeId]);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting employee ${employeeId}:`, error);
        errors.push(`Failed to delete employee ID ${employeeId}`);
      }
    }

    res.json({
      message: `Bulk delete completed: ${deletedCount} employees deleted`,
      deletedCount,
      requestedCount: employeeIds.length,
      errors: errors.length > 0 ? errors : undefined,
      success: deletedCount > 0
    });

  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({ message: 'Failed to delete employees' });
  }
});

export default router;