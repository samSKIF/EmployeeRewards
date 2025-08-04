import { Router } from 'express';
import { verifyToken, verifyAdmin } from '../middleware/auth';
import { storage } from '../storage';
const fuzz = require('fuzzball');

const router = Router();

interface DepartmentSuggestion {
  id: number;
  name: string;
  employeeCount: number;
  suggestedMergeWith?: {
    id: number;
    name: string;
    employeeCount: number;
    similarity: number;
  };
}

// Get department cleanup suggestions
router.get('/api/admin/departments/cleanup-suggestions', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const organizationId = (req as any).user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Get all departments with employee counts
    const departments = await storage.getDepartmentsByOrganization(organizationId);
    const departmentSuggestions: DepartmentSuggestion[] = [];

    // Get employee counts for each department
    for (const dept of departments) {
      const employees = await storage.getUsersByDepartment(organizationId, dept.name);
      const suggestion: DepartmentSuggestion = {
        id: dept.id,
        name: dept.name,
        employeeCount: employees.length
      };

      // Find potential duplicates/typos
      const otherDepartments = departments.filter((d: any) => d.id !== dept.id);
      const matches = otherDepartments.map((other: any) => ({
        id: other.id,
        name: other.name,
        similarity: fuzz.ratio(dept.name.toLowerCase(), other.name.toLowerCase())
      })).sort((a: any, b: any) => b.similarity - a.similarity);

      const bestMatch = matches[0];
      if (bestMatch && bestMatch.similarity > 70 && bestMatch.similarity < 100) {
        const otherEmployees = await storage.getUsersByDepartment(organizationId, bestMatch.name);
        suggestion.suggestedMergeWith = {
          id: bestMatch.id,
          name: bestMatch.name,
          employeeCount: otherEmployees.length,
          similarity: bestMatch.similarity
        };
      }

      departmentSuggestions.push(suggestion);
    }

    // Filter to only show departments with merge suggestions
    const duplicatesFound = departmentSuggestions.filter((d: any) => d.suggestedMergeWith);

    res.json({
      totalDepartments: departments.length,
      duplicatesFound: duplicatesFound.length,
      suggestions: duplicatesFound
    });

  } catch (error) {
    console.error('Error getting department cleanup suggestions:', error);
    res.status(500).json({ message: 'Failed to get cleanup suggestions' });
  }
});

// Merge departments
router.post('/api/admin/departments/merge', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const organizationId = (req as any).user?.organization_id;
    const { fromDepartmentId, toDepartmentId, newName } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    if (!fromDepartmentId || !toDepartmentId) {
      return res.status(400).json({ message: 'Source and target department IDs are required' });
    }

    // Get department details
    const departments = await storage.getDepartmentsByOrganization(organizationId);
    const fromDept = departments.find(d => d.id === fromDepartmentId);
    const toDept = departments.find(d => d.id === toDepartmentId);

    if (!fromDept || !toDept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Move all employees from source department to target department
    const employeesToMove = await storage.getUsersByDepartment(organizationId, fromDept.name);
    
    for (const employee of employeesToMove) {
      await storage.updateUserDepartment(employee.id, toDept.name);
    }

    // Update target department name if provided
    if (newName && newName !== toDept.name) {
      await storage.updateDepartment(toDepartmentId, { name: newName });
    }

    // Delete the source department
    await storage.deleteDepartment(fromDepartmentId);

    res.json({
      message: `Successfully merged ${fromDept.name} into ${newName || toDept.name}`,
      employeesMoved: employeesToMove.length,
      finalDepartmentName: newName || toDept.name
    });

  } catch (error) {
    console.error('Error merging departments:', error);
    res.status(500).json({ message: 'Failed to merge departments' });
  }
});

export default router;