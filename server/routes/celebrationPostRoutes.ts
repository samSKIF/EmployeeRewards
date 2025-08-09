/**
 * Celebration Post Routes
 * Admin endpoints for managing automatic celebration posts
 */
import { Router } from 'express';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { celebrationPostService } from '../services/celebrationPostService';
import { logger } from '@platform/sdk';

const router = Router();

/**
 * Manually trigger celebration post generation for today
 * Only accessible by admins
 */
router.post(
  '/generate-today',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check if user is admin
      if (
        !req.user.is_admin &&
        req.user.role_type !== 'corporate_admin' &&
        req.user.role_type !== 'client_admin'
      ) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      logger.info(
        `Manual celebration post generation triggered by admin: ${req.user.email}`
      );

      await celebrationPostService.generateTodaysCelebrationPosts();

      res.json({
        message: 'Celebration posts generated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error in manual celebration post generation:', error);
      res
        .status(500)
        .json({
          message: error.message || 'Failed to generate celebration posts',
        });
    }
  }
);

/**
 * Generate celebration post for a specific user (admin testing)
 */
router.post(
  '/generate-for-user',
  verifyToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check if user is admin
      if (
        !req.user.is_admin &&
        req.user.role_type !== 'corporate_admin' &&
        req.user.role_type !== 'client_admin'
      ) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { user_id, type } = req.body;

      if (!user_id || !type) {
        return res
          .status(400)
          .json({
            message: 'user_id and type (birthday/work_anniversary) are required',
          });
      }

      if (!['birthday', 'work_anniversary'].includes(type)) {
        return res
          .status(400)
          .json({ message: "type must be 'birthday' or 'work_anniversary'" });
      }

      logger.info(
        `Manual celebration post generation for user ${user_id} (${type}) triggered by admin: ${req.user.email}`
      );

      const success =
        await celebrationPostService.generateCelebrationPostsForUser(
          parseInt(user_id),
          type
        );

      if (success) {
        res.json({
          message: `Celebration post created successfully for user ${user_id}`,
          type,
          user_id: parseInt(user_id),
        });
      } else {
        res.status(500).json({ message: 'Failed to create celebration post' });
      }
    } catch (error: any) {
      logger.error('Error in manual user celebration post generation:', error);
      res
        .status(500)
        .json({
          message: error.message || 'Failed to generate celebration post',
        });
    }
  }
);

export { router as celebrationPostRoutes };
