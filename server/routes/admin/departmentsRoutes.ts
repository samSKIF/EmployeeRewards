import { Router } from 'express';
import { verifyToken, verifyAdmin } from '../../middleware/auth';
import { storage } from '../../storage';
import { logger } from '@platform/sdk';
import { activityLogger, logActivity, auditLogger } from '../../middleware/activityLogger';

const router = Router();

// Get all departments for organization
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  let organizationId: number | undefined;
  try {
    organizationId = (req.user as any).organization_id;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    const departments = await storage.getDepartmentsByOrganization(organizationId);
    res.json(departments);
  } catch (error: any) {
    logger.error('Error fetching departments:', { error: error?.message || 'unknown_error', organizationId });
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

// Create new department
router.post('/', 
  verifyToken, 
  verifyAdmin,
  activityLogger({ action_type: 'create_department', resource_type: 'department' }),
  async (req, res) => {
  try {
    const { name, color } = req.body;
    const organizationId = (req.user as any).organization_id;
    const userId = (req.user as any).id;

    if (!name || !organizationId) {
      return res.status(400).json({ message: 'Name and organization are required' });
    }

    // Check if department already exists
    const existingDepartment = await storage.getDepartmentByName(organizationId, name);
    if (existingDepartment) {
      return res.status(409).json({ message: 'Department with this name already exists' });
    }

    const newDepartment = await storage.createDepartment({
      name,
      color: color || '#3B82F6',
      organization_id: organizationId,
      created_by: userId,
      is_active: true
    });

    // Log the department creation activity
    await logActivity(req as any, 'create_department', 'department', newDepartment.id, {
      department_name: name,
      color: color || '#3B82F6',
      success: true,
    });

    res.status(201).json(newDepartment);
  } catch (error: any) {
    logger.error('Error creating department:', { error: error?.message || 'unknown_error', organizationId: (req.user as any)?.organization_id });
    res.status(500).json({ message: 'Failed to create department' });
  }
});

// Update department
router.put('/:id', 
  verifyToken, 
  verifyAdmin,
  activityLogger({ action_type: 'update_department', resource_type: 'department' }),
  async (req, res) => {
  let departmentId: number;
  let organizationId: number | undefined;
  try {
    departmentId = parseInt(req.params.id);
    organizationId = (req.user as any).organization_id;
    const { name, color, is_active } = req.body;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Verify department belongs to user's organization
    const existingDepartment = await storage.getDepartmentById(departmentId);
    if (!existingDepartment || existingDepartment.organization_id !== organizationId) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if new name conflicts with existing department (if name is changing)
    if (name && name !== existingDepartment.name) {
      const nameConflict = await storage.getDepartmentByName(organizationId, name);
      if (nameConflict) {
        return res.status(409).json({ message: 'Department with this name already exists' });
      }
    }

    const updateData = {
      name: name || existingDepartment.name,
      color: color || existingDepartment.color,
      is_active: is_active !== undefined ? is_active : existingDepartment.is_active,
      updated_at: new Date(),
    };

    const updatedDepartment = await storage.updateDepartment(departmentId, updateData);

    // Log the department update activity
    await logActivity(req as any, 'update_department', 'department', departmentId, {
      changes: updateData,
      old_values: {
        name: existingDepartment.name,
        color: existingDepartment.color,
        is_active: existingDepartment.is_active,
      },
      success: true,
    });

    res.json(updatedDepartment);
  } catch (error: any) {
    logger.error('Error updating department:', { error: error?.message || 'unknown_error', departmentId, organizationId });
    res.status(500).json({ message: 'Failed to update department' });
  }
});

// Delete department
router.delete('/:id', 
  verifyToken, 
  verifyAdmin,
  activityLogger({ action_type: 'delete_department', resource_type: 'department' }),
  async (req, res) => {
  let departmentId: number;
  let organizationId: number | undefined;
  try {
    departmentId = parseInt(req.params.id);
    organizationId = (req.user as any).organization_id;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Verify department belongs to user's organization
    const department = await storage.getDepartmentById(departmentId);
    if (!department || department.organization_id !== organizationId) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if department is in use by employees
    const employeesUsingDepartment = await storage.getEmployeeCountByDepartment(organizationId, department.name);
    if (employeesUsingDepartment > 0) {
      return res.status(400).json({ 
        message: `Cannot delete department. ${employeesUsingDepartment} employees are assigned to this department.`,
        employees_count: employeesUsingDepartment 
      });
    }

    // Store department data before deletion for audit
    const departmentToDelete = await storage.getDepartmentById(departmentId);
    
    await storage.deleteDepartment(departmentId);

    // Log the department deletion activity
    await logActivity(req as any, 'delete_department', 'department', departmentId, {
      deleted_department: {
        name: departmentToDelete?.name,
        color: departmentToDelete?.color,
        is_active: departmentToDelete?.is_active,
      },
      success: true,
    });

    res.json({ message: 'Department deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting department:', { error: error?.message || 'unknown_error', departmentId, organizationId });
    res.status(500).json({ message: 'Failed to delete department' });
  }
});

// Get department usage statistics
router.get('/api/admin/departments/:id/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    const organizationId = (req.user as any).organization_id;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    const department = await storage.getDepartmentById(departmentId);
    if (!department || department.organization_id !== organizationId) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const employeeCount = await storage.getEmployeeCountByDepartment(organizationId, department.name);
    const stats = {
      employee_count: employeeCount,
      department_name: department.name,
      manager: department.manager_id ? await storage.getUserById(department.manager_id) : null,
    };

    res.json(stats);
  } catch (error: any) {
    logger.error('Error fetching department stats:', { error: error?.message || 'unknown_error', organizationId: (req.user as any)?.organization_id });
    res.status(500).json({ message: 'Failed to fetch department statistics' });
  }
});

export default router;