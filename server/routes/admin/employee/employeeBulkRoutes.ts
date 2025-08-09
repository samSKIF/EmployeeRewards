import { Router } from 'express';
import { verifyToken, verifyAdmin, AuthenticatedRequest } from '../../../middleware/auth';
import { storage } from '../../../storage';
import { logger } from '@platform/sdk';
import { logActivity } from '../../../middleware/activityLogger';

const router = Router();

// Bulk employee operations with comprehensive tracking
router.post('/bulk', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
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
      } catch (error: any) {
        const message = error?.message || 'unknown_error';
        logger.error('Bulk action failed for employee:', { employeeId, action, error, message });
        errors.push({ employee_id: employeeId, success: false, error: message });
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

  } catch (error: any) {
    const message = error?.message || 'unknown_error';
    logger.error('Error in bulk employee action:', { error, message, action: req.body.action });
    res.status(500).json({ message: 'Failed to perform bulk action' });
  }
});

export default router;