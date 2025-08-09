import { Router } from 'express';
import { verifyToken, verifyAdmin, AuthenticatedRequest } from '../../../middleware/auth';
import { storage } from '../../../storage';
import { logger } from '@platform/sdk';
import { logActivity } from '../../../middleware/activityLogger';

const router = Router();

// Employee search with advanced filters and activity tracking
router.get('/search/:query', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const query = req.params.query;
    const organizationId = req.user?.organization_id;
    const { department, status, limit = 20 } = req.query;

    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Log the search activity
    await logActivity(req, 'search_employees', 'employees', undefined, {
      search_query: query,
      filters: { department, status },
      search_length: query.length,
    });

    const searchResults = await storage.searchEmployees(organizationId, query, {
      department: department as string,
      status: status as string,
      limit: parseInt(limit as string),
    });

    res.json({
      query,
      results: searchResults,
      total: searchResults.length,
    });

  } catch (error: any) {
    const message = error?.message || 'unknown_error';
    logger.error('Error searching employees:', { error, message, query: req.params.query });
    res.status(500).json({ message: 'Failed to search employees' });
  }
});

export default router;