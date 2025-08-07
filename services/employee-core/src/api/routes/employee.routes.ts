// Employee Routes
import { Router, Request, Response } from 'express';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { AuthenticationService } from '../../domain/services/auth.service';
import { insertUserSchema, updateUserSchema } from '../../infrastructure/database/schema';
import { z } from 'zod';

const router = Router();
const userRepository = new UserRepository();

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

// Get all employees
router.get('/', verifyToken, async (req: any, res: Response) => {
  try {
    const filters = {
      organization_id: req.user.organization_id,
      department_id: req.query.department_id ? parseInt(req.query.department_id) : undefined,
      manager_id: req.query.manager_id ? parseInt(req.query.manager_id) : undefined,
      is_active: req.query.is_active === 'false' ? false : true,
      is_admin: req.query.is_admin === 'true' ? true : undefined,
      role_type: req.query.role_type,
      search: req.query.search,
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
    };
    
    const result = await userRepository.getUsers(filters);
    
    res.json({
      success: true,
      data: result.users,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.limit),
        hasMore: filters.page * filters.limit < result.total,
      },
      message: `Retrieved ${result.users.length} employees`,
    });
  } catch (error: any) {
    console.error('[Employee Routes] Get employees error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Failed to get employees',
    });
  }
});

// Get employee by ID
router.get('/:id', verifyToken, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const includeRelations = req.query.include === 'true';
    
    const user = await userRepository.getUserById(id, includeRelations);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Employee not found',
      });
    }
    
    // Check if user can access this employee (same org or admin)
    if (user.organization_id !== req.user.organization_id && !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Access denied',
      });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword,
      message: 'Employee retrieved successfully',
    });
  } catch (error: any) {
    console.error('[Employee Routes] Get employee error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Failed to get employee',
    });
  }
});

// Create employee
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
    const validated = insertUserSchema.parse(req.body);
    
    // Check if username or email already exists
    const existingByUsername = validated.username 
      ? await userRepository.getUserByUsername(validated.username)
      : null;
    const existingByEmail = await userRepository.getUserByEmail(validated.email);
    
    if (existingByUsername || existingByEmail) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_USER',
        message: 'Username or email already exists',
      });
    }
    
    // Hash password
    if (validated.password) {
      validated.password = await AuthenticationService.hashPassword(validated.password);
    }
    
    // Set organization from current user if not provided
    if (!validated.organization_id) {
      validated.organization_id = req.user.organization_id;
    }
    
    const user = await userRepository.createUser(validated, req.user.id);
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({
      success: true,
      data: userWithoutPassword,
      message: 'Employee created successfully',
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
    
    console.error('[Employee Routes] Create employee error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Failed to create employee',
    });
  }
});

// Update employee
router.patch('/:id', verifyToken, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if user is admin or updating themselves
    if (!req.user.is_admin && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }
    
    // Validate request body
    const validated = updateUserSchema.parse(req.body);
    
    // Don't allow password update through this endpoint
    delete (validated as any).password;
    
    const user = await userRepository.updateUser(id, validated, req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Employee not found',
      });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword,
      message: 'Employee updated successfully',
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
    
    console.error('[Employee Routes] Update employee error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Failed to update employee',
    });
  }
});

// Delete employee (soft delete)
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
    
    // Don't allow self-deletion
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_OPERATION',
        message: 'Cannot delete your own account',
      });
    }
    
    const success = await userRepository.deleteUser(id, req.user.id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Employee not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error: any) {
    console.error('[Employee Routes] Delete employee error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Failed to delete employee',
    });
  }
});

// Get subordinates
router.get('/:id/subordinates', verifyToken, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const subordinates = await userRepository.getSubordinates(id);
    
    res.json({
      success: true,
      data: subordinates.map(u => {
        const { password: _, ...userWithoutPassword } = u;
        return userWithoutPassword;
      }),
      message: `Retrieved ${subordinates.length} subordinates`,
    });
  } catch (error: any) {
    console.error('[Employee Routes] Get subordinates error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Failed to get subordinates',
    });
  }
});

export { router as employeeRoutes };