// Authentication Routes
import { Router, Request, Response } from 'express';
import { AuthenticationService } from '../../domain/services/auth.service';
import { z } from 'zod';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6),
}).refine(data => data.username || data.email, {
  message: 'Either username or email is required',
});

const changePasswordSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(6),
});

const resetPasswordSchema = z.object({
  user_id: z.number(),
  new_password: z.string().min(6),
});

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

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validated = loginSchema.parse(req.body);
    
    const result = await AuthenticationService.authenticate(validated);
    
    if (!result) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username/email or password',
      });
    }
    
    res.json({
      success: true,
      data: result,
      message: 'Login successful',
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
    
    console.error('[Auth Routes] Login error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Login failed',
    });
  }
});

// Logout endpoint
router.post('/logout', verifyToken, async (req: any, res: Response) => {
  try {
    await AuthenticationService.logout(req.user.id);
    
    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error: any) {
    console.error('[Auth Routes] Logout error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Logout failed',
    });
  }
});

// Validate session endpoint
router.get('/validate', verifyToken, async (req: any, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await AuthenticationService.validateSession(token!);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_SESSION',
        message: 'Session is invalid or expired',
      });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        valid: true,
      },
      message: 'Session is valid',
    });
  } catch (error: any) {
    console.error('[Auth Routes] Session validation error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Session validation failed',
    });
  }
});

// Change password endpoint
router.post('/change-password', verifyToken, async (req: any, res: Response) => {
  try {
    const validated = changePasswordSchema.parse(req.body);
    
    const success = await AuthenticationService.changePassword(
      req.user.id,
      validated.current_password,
      validated.new_password
    );
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PASSWORD',
        message: 'Current password is incorrect',
      });
    }
    
    res.json({
      success: true,
      message: 'Password changed successfully',
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
    
    console.error('[Auth Routes] Password change error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Password change failed',
    });
  }
});

// Reset password endpoint (admin only)
router.post('/reset-password', verifyToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }
    
    const validated = resetPasswordSchema.parse(req.body);
    
    const success = await AuthenticationService.resetPassword(
      validated.user_id,
      validated.new_password,
      req.user.id
    );
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'RESET_FAILED',
        message: 'Failed to reset password',
      });
    }
    
    res.json({
      success: true,
      message: 'Password reset successfully',
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
    
    console.error('[Auth Routes] Password reset error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Password reset failed',
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'Refresh token is required',
      });
    }
    
    // TODO: Implement refresh token logic
    res.json({
      success: true,
      message: 'Token refresh endpoint - to be implemented',
    });
  } catch (error: any) {
    console.error('[Auth Routes] Token refresh error:', error?.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Token refresh failed',
    });
  }
});

export { router as authRoutes };