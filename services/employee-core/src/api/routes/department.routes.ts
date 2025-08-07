// Department Routes
import { Router, Request, Response } from 'express';
import { db, departments, Department, InsertDepartment, UpdateDepartment, users } from '../../infrastructure/database/connection';
import { AuthenticationService } from '../../domain/services/auth.service';
import { eq, and, or, like, sql } from 'drizzle-orm';
import { insertDepartmentSchema, updateDepartmentSchema } from '../../infrastructure/database/schema';
import { z } from 'zod';
import { eventBus } from '../../../../shared/event-bus';

const router = Router();

// Middleware to verify JWT token
const verifyToken = async (req: any, res: Response, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'No token provided',
    });
  }
  
  const payload = await AuthenticationService.verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
  }
  
  req.user = payload;
  next();
};

// Get all departments
router.get('/', verifyToken, async (req: any, res: Response) => {
  try {
    const organizationId = req.user.organization_id;
    const includeInactive = req.query.include_inactive === 'true';
    const search = req.query.search;
    
    let query = db.select().from(departments);
    const conditions = [];
    
    if (organizationId) {
      conditions.push(eq(departments.organization_id, organizationId));
    }
    
    if (!includeInactive) {
      conditions.push(eq(departments.is_active, true));
    }
    
    if (search) {
      conditions.push(
        or(
          like(departments.name, `%${search}%`),
          like(departments.code, `%${search}%`)
        )!
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const departmentList = await query;
    
    res.json({
      success: true,
      data: departmentList,
      message: `Retrieved ${departmentList.length} departments`,
    });
  } catch (error: any) {
    console.error('[Department Routes] Get departments error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Failed to get departments',
    });
  }
});

// Get department by ID
router.get('/:id', verifyToken, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const includeEmployees = req.query.include_employees === 'true';
    
    const [department] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id));
    
    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Department not found',
      });
    }
    
    // Check if user can access this department (same org or admin)
    if (department.organization_id !== req.user.organization_id && !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Access denied',
      });
    }
    
    let result: any = department;
    
    if (includeEmployees) {
      const employees = await db
        .select()
        .from(users)
        .where(and(
          eq(users.department_id, id),
          eq(users.is_active, true)
        ));
      
      result = {
        ...department,
        employees: employees.map(e => ({
          id: e.id,
          username: e.username,
          email: e.email,
          first_name: e.first_name,
          last_name: e.last_name,
          job_title: e.job_title,
        })),
        employee_count: employees.length,
      };
    }
    
    res.json({
      success: true,
      data: result,
      message: 'Department retrieved successfully',
    });
  } catch (error: any) {
    console.error('[Department Routes] Get department error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Failed to get department',
    });
  }
});

// Create department
router.post('/', verifyToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }
    
    // Validate request body
    const validated = insertDepartmentSchema.parse(req.body);
    
    // Set organization from current user if not provided
    if (!validated.organization_id) {
      validated.organization_id = req.user.organization_id;
    }
    
    // Check if code already exists
    if (validated.code) {
      const [existing] = await db
        .select()
        .from(departments)
        .where(eq(departments.code, validated.code));
      
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'DUPLICATE_CODE',
          message: 'Department code already exists',
        });
      }
    }
    
    const [department] = await db
      .insert(departments)
      .values({
        ...validated,
        created_by: req.user.id,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    
    // Publish event
    await eventBus.publish({
      type: 'department.created',
      version: '1.0',
      source: 'employee-core',
      data: {
        department_id: department.id,
        name: department.name,
        organization_id: department.organization_id,
        created_by: req.user.id,
      },
    });
    
    res.status(201).json({
      success: true,
      data: department,
      message: 'Department created successfully',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors,
      });
    }
    
    console.error('[Department Routes] Create department error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Failed to create department',
    });
  }
});

// Update department
router.patch('/:id', verifyToken, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }
    
    // Validate request body
    const validated = updateDepartmentSchema.parse(req.body);
    
    // Check if department exists
    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id));
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Department not found',
      });
    }
    
    // Check if new code conflicts
    if (validated.code && validated.code !== existing.code) {
      const [conflict] = await db
        .select()
        .from(departments)
        .where(eq(departments.code, validated.code));
      
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: 'DUPLICATE_CODE',
          message: 'Department code already exists',
        });
      }
    }
    
    const [department] = await db
      .update(departments)
      .set({
        ...validated,
        updated_at: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();
    
    // Publish event
    await eventBus.publish({
      type: 'department.updated',
      version: '1.0',
      source: 'employee-core',
      data: {
        department_id: department.id,
        changes: Object.keys(validated),
        updated_by: req.user.id,
      },
    });
    
    res.json({
      success: true,
      data: department,
      message: 'Department updated successfully',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors,
      });
    }
    
    console.error('[Department Routes] Update department error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Failed to update department',
    });
  }
});

// Delete department (soft delete)
router.delete('/:id', verifyToken, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }
    
    // Check if department has employees
    const [employeeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(
        eq(users.department_id, id),
        eq(users.is_active, true)
      ));
    
    if (employeeCount.count > 0) {
      return res.status(400).json({
        success: false,
        error: 'HAS_EMPLOYEES',
        message: `Cannot delete department with ${employeeCount.count} active employees`,
      });
    }
    
    // Soft delete
    const [department] = await db
      .update(departments)
      .set({
        is_active: false,
        deleted_at: new Date(),
        deleted_by: req.user.id,
        updated_at: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();
    
    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Department not found',
      });
    }
    
    // Publish event
    await eventBus.publish({
      type: 'department.deleted',
      version: '1.0',
      source: 'employee-core',
      data: {
        department_id: id,
        deleted_by: req.user.id,
      },
    });
    
    res.json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error: any) {
    console.error('[Department Routes] Delete department error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Failed to delete department',
    });
  }
});

// Get department hierarchy
router.get('/:id/hierarchy', verifyToken, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // TODO: Implement recursive hierarchy query
    res.json({
      success: true,
      data: {
        message: 'Department hierarchy endpoint - to be implemented',
      },
    });
  } catch (error: any) {
    console.error('[Department Routes] Get hierarchy error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Failed to get department hierarchy',
    });
  }
});

export { router as departmentRoutes };