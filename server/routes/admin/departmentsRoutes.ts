import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminMiddleware';
import { storage } from '../../storage';

const router = Router();

// Get all departments for organization
router.get('/api/admin/departments', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    const departments = await storage.getDepartmentsByOrganization(organizationId);
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

// Create new department
router.post('/api/admin/departments', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId;
    const { name, description, manager_id, color } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    // Check if department name already exists in organization
    const existingDepartment = await storage.getDepartmentByName(organizationId, name);
    if (existingDepartment) {
      return res.status(409).json({ message: 'Department with this name already exists' });
    }

    const departmentData = {
      organization_id: organizationId,
      name,
      description: description || null,
      manager_id: manager_id || null,
      color: color || '#6B7280',
      created_by: req.user!.id,
    };

    const department = await storage.createDepartment(departmentData);
    res.status(201).json(department);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ message: 'Failed to create department' });
  }
});

// Update department
router.put('/api/admin/departments/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    const organizationId = req.user!.organizationId;
    const { name, description, manager_id, color, is_active } = req.body;
    
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
      description: description !== undefined ? description : existingDepartment.description,
      manager_id: manager_id !== undefined ? manager_id : existingDepartment.manager_id,
      color: color || existingDepartment.color,
      is_active: is_active !== undefined ? is_active : existingDepartment.is_active,
      updated_at: new Date(),
    };

    const updatedDepartment = await storage.updateDepartment(departmentId, updateData);
    res.json(updatedDepartment);
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ message: 'Failed to update department' });
  }
});

// Delete department
router.delete('/api/admin/departments/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    const organizationId = req.user!.organizationId;
    
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

    await storage.deleteDepartment(departmentId);
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ message: 'Failed to delete department' });
  }
});

// Get department usage statistics
router.get('/api/admin/departments/:id/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    const organizationId = req.user!.organizationId;
    
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
  } catch (error) {
    console.error('Error fetching department stats:', error);
    res.status(500).json({ message: 'Failed to fetch department statistics' });
  }
});

export default router;