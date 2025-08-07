// Recognition Controller - API Layer
// Handles HTTP requests and coordinates between domain and infrastructure layers

import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth';
import { RecognitionDomain, type CreateRecognitionData, type RecognitionFilters, type ManagerBudgetData } from '../domain/recognition.domain';
import { RecognitionRepository } from '../infrastructure/recognition.repository';
import { storage } from '../../../storage';
import { logger } from '@shared/logger';
import { z } from 'zod';

/**
 * Recognition Controller
 * Orchestrates recognition operations through domain layer
 */
export class RecognitionController {
  private repository: RecognitionRepository;

  constructor() {
    this.repository = new RecognitionRepository();
  }

  /**
   * Create a new peer recognition
   * POST /api/recognitions/peer
   */
  createPeerRecognition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { recipientId, badgeType, message, points } = req.body;
      const recognizerId = req.user.id;
      const organizationId = req.user.organization_id || req.user.organizationId;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization not found' });
        return;
      }

      const recognitionData: CreateRecognitionData = {
        recipientId,
        badgeType,
        message,
        points,
      };

      // Create dependencies object for domain layer
      const dependencies = {
        persistRecognition: (data: any) => this.repository.createRecognition(data),
        updateRecognition: (id: number, data: any) => this.repository.updateRecognition(id, data),
        getUserById: (id: number) => storage.getUserById(id),
        getUsersByOrganization: (orgId: number) => storage.getUsersByOrganization(orgId),
        getRecognitionSettings: (orgId: number) => this.repository.getRecognitionSettings(orgId),
        createPointsTransaction: (data: any) => this.repository.createPointsTransaction(data),
        updateUserPoints: (userId: number, balance: number) => this.repository.updateUserPoints(userId, balance),
        getUserBalance: (userId: number) => this.repository.getUserBalance(userId),
        getManagerBudget: (managerId: number, month: number, year: number) => 
          this.repository.getManagerBudget(managerId, month, year),
        updateManagerBudget: (budgetId: number, remainingPoints: number) => Promise.resolve(true),
        checkUserDependencies: (userId: number) => storage.checkUserDependencies(userId),
      };

      const recognition = await RecognitionDomain.createPeerRecognition(
        recognitionData,
        recognizerId,
        organizationId,
        dependencies
      );

      logger.info('✅ Peer recognition created via API', {
        recognitionId: recognition.id,
        recognizer: req.user.name,
        recipientId,
        points: recognition.points,
      });

      res.status(201).json({
        recognition,
        message: 'Recognition created successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error in createPeerRecognition controller', {
        error: error?.message || 'unknown_error',
        userId: req.user?.id,
        body: req.body,
      });
      res.status(400).json({ error: error?.message || 'Failed to create recognition' });
    }
  };

  /**
   * Get recognitions with filters and pagination
   * GET /api/recognitions
   */
  getRecognitions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const organizationId = req.user.organization_id || req.user.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization not found' });
        return;
      }

      // Parse query parameters
      const filters: RecognitionFilters = {
        status: req.query.status as 'pending' | 'approved' | 'rejected' | undefined,
        badgeType: req.query.badgeType as string | undefined,
        recipientId: req.query.recipientId ? parseInt(req.query.recipientId as string) : undefined,
        recognizerId: req.query.recognizerId ? parseInt(req.query.recognizerId as string) : undefined,
        departmentFilter: req.query.department as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        search: req.query.search as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const result = await this.repository.getRecognitionsWithFilters(organizationId, filters);

      res.json({
        recognitions: result.recognitions,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: result.total > (filters.offset + filters.limit),
        },
        filters: filters,
      });
    } catch (error: any) {
      logger.error('❌ Error in getRecognitions controller', {
        error: error?.message || 'unknown_error',
        userId: req.user?.id,
        query: req.query,
      });
      res.status(500).json({ error: 'Failed to fetch recognitions' });
    }
  };

  /**
   * Get recognition by ID
   * GET /api/recognitions/:id
   */
  getRecognitionById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const recognitionId = parseInt(req.params.id);
      if (isNaN(recognitionId)) {
        res.status(400).json({ error: 'Invalid recognition ID' });
        return;
      }

      const recognition = await this.repository.getRecognitionById(recognitionId);
      if (!recognition) {
        res.status(404).json({ error: 'Recognition not found' });
        return;
      }

      // Verify user has access to this recognition
      const organizationId = req.user.organization_id || req.user.organizationId;
      if (recognition.recognizer?.organization_id !== organizationId && 
          recognition.recipient?.organization_id !== organizationId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json({ recognition });
    } catch (error: any) {
      logger.error('❌ Error in getRecognitionById controller', {
        error: error?.message || 'unknown_error',
        userId: req.user?.id,
        recognitionId: req.params.id,
      });
      res.status(500).json({ error: 'Failed to fetch recognition' });
    }
  };

  /**
   * Approve a pending recognition
   * POST /api/recognitions/:id/approve
   */
  approveRecognition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const recognitionId = parseInt(req.params.id);
      if (isNaN(recognitionId)) {
        res.status(400).json({ error: 'Invalid recognition ID' });
        return;
      }

      const organizationId = req.user.organization_id || req.user.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization not found' });
        return;
      }

      // Create dependencies for domain layer
      const dependencies = {
        persistRecognition: (data: any) => this.repository.createRecognition(data),
        updateRecognition: (id: number, data: any) => this.repository.updateRecognition(id, data),
        getUserById: (id: number) => storage.getUserById(id),
        getUsersByOrganization: (orgId: number) => storage.getUsersByOrganization(orgId),
        getRecognitionSettings: (orgId: number) => this.repository.getRecognitionSettings(orgId),
        createPointsTransaction: (data: any) => this.repository.createPointsTransaction(data),
        updateUserPoints: (userId: number, balance: number) => this.repository.updateUserPoints(userId, balance),
        getUserBalance: (userId: number) => this.repository.getUserBalance(userId),
        getManagerBudget: (managerId: number, month: number, year: number) => 
          this.repository.getManagerBudget(managerId, month, year),
        updateManagerBudget: (budgetId: number, remainingPoints: number) => Promise.resolve(true),
        checkUserDependencies: (userId: number) => storage.checkUserDependencies(userId),
      };

      const result = await RecognitionDomain.approveRecognition(
        recognitionId,
        req.user.id,
        organizationId,
        dependencies
      );

      res.json({
        recognition: result.recognition,
        transaction: result.transaction,
        message: 'Recognition approved and points awarded',
      });
    } catch (error: any) {
      logger.error('❌ Error in approveRecognition controller', {
        error: error?.message || 'unknown_error',
        userId: req.user?.id,
        recognitionId: req.params.id,
      });
      res.status(400).json({ error: error?.message || 'Failed to approve recognition' });
    }
  };

  /**
   * Reject a pending recognition
   * POST /api/recognitions/:id/reject
   */
  rejectRecognition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const recognitionId = parseInt(req.params.id);
      if (isNaN(recognitionId)) {
        res.status(400).json({ error: 'Invalid recognition ID' });
        return;
      }

      const { reason } = req.body;
      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        res.status(400).json({ error: 'Rejection reason is required (minimum 5 characters)' });
        return;
      }

      const organizationId = req.user.organization_id || req.user.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization not found' });
        return;
      }

      // Create dependencies for domain layer
      const dependencies = {
        persistRecognition: (data: any) => this.repository.createRecognition(data),
        updateRecognition: (id: number, data: any) => this.repository.updateRecognition(id, data),
        getUserById: (id: number) => storage.getUserById(id),
        getUsersByOrganization: (orgId: number) => storage.getUsersByOrganization(orgId),
        getRecognitionSettings: (orgId: number) => this.repository.getRecognitionSettings(orgId),
        createPointsTransaction: (data: any) => this.repository.createPointsTransaction(data),
        updateUserPoints: (userId: number, balance: number) => this.repository.updateUserPoints(userId, balance),
        getUserBalance: (userId: number) => this.repository.getUserBalance(userId),
        getManagerBudget: (managerId: number, month: number, year: number) => 
          this.repository.getManagerBudget(managerId, month, year),
        updateManagerBudget: (budgetId: number, remainingPoints: number) => Promise.resolve(true),
        checkUserDependencies: (userId: number) => storage.checkUserDependencies(userId),
      };

      const recognition = await RecognitionDomain.rejectRecognition(
        recognitionId,
        req.user.id,
        reason.trim(),
        organizationId,
        dependencies
      );

      res.json({
        recognition,
        message: 'Recognition rejected',
      });
    } catch (error: any) {
      logger.error('❌ Error in rejectRecognition controller', {
        error: error?.message || 'unknown_error',
        userId: req.user?.id,
        recognitionId: req.params.id,
      });
      res.status(400).json({ error: error?.message || 'Failed to reject recognition' });
    }
  };

  /**
   * Get recognition statistics for organization
   * GET /api/recognitions/stats
   */
  getRecognitionStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const organizationId = req.user.organization_id || req.user.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization not found' });
        return;
      }

      const stats = await this.repository.getRecognitionStats(organizationId);
      res.json(stats);
    } catch (error: any) {
      logger.error('❌ Error in getRecognitionStats controller', {
        error: error?.message || 'unknown_error',
        userId: req.user?.id,
      });
      res.status(500).json({ error: 'Failed to fetch recognition statistics' });
    }
  };

  /**
   * Get recognition settings for organization
   * GET /api/recognitions/settings
   */
  getRecognitionSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const organizationId = req.user.organization_id || req.user.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization not found' });
        return;
      }

      const settings = await this.repository.getRecognitionSettings(organizationId);
      if (!settings) {
        // Return default settings if none exist
        const defaultSettings = {
          organizationId,
          costPerPoint: 0.1,
          peerEnabled: true,
          peerRequiresApproval: true,
          peerPointsPerRecognition: 10,
          peerMaxRecognitionsPerMonth: 5,
          managerEnabled: true,
          managerRequiresApproval: false,
        };
        res.json(defaultSettings);
        return;
      }

      res.json(settings);
    } catch (error: any) {
      logger.error('❌ Error in getRecognitionSettings controller', {
        error: error?.message || 'unknown_error',
        userId: req.user?.id,
      });
      res.status(500).json({ error: 'Failed to fetch recognition settings' });
    }
  };

  /**
   * Update recognition settings for organization
   * PUT /api/recognitions/settings
   */
  updateRecognitionSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const organizationId = req.user.organization_id || req.user.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization not found' });
        return;
      }

      const settings = await this.repository.upsertRecognitionSettings(
        organizationId,
        req.body,
        req.user.id
      );

      res.json({
        settings,
        message: 'Recognition settings updated successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error in updateRecognitionSettings controller', {
        error: error?.message || 'unknown_error',
        userId: req.user?.id,
        body: req.body,
      });
      res.status(400).json({ error: error?.message || 'Failed to update recognition settings' });
    }
  };

  /**
   * Get user's recognition history (sent and received)
   * GET /api/recognitions/history
   */
  getUserRecognitionHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const history = await this.repository.getUserRecognitionHistory(req.user.id);
      res.json(history);
    } catch (error: any) {
      logger.error('❌ Error in getUserRecognitionHistory controller', {
        error: error?.message || 'unknown_error',
        userId: req.user?.id,
      });
      res.status(500).json({ error: 'Failed to fetch recognition history' });
    }
  };

  /**
   * Get manager budgets for organization
   * GET /api/recognitions/manager-budgets
   */
  getManagerBudgets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const organizationId = req.user.organization_id || req.user.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization not found' });
        return;
      }

      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const budgets = await this.repository.getManagerBudgets(organizationId, month, year);
      res.json(budgets);
    } catch (error: any) {
      logger.error('❌ Error in getManagerBudgets controller', {
        error: error?.message || 'unknown_error',
        userId: req.user?.id,
        query: req.query,
      });
      res.status(500).json({ error: 'Failed to fetch manager budgets' });
    }
  };

  /**
   * Update manager budget
   * POST /api/recognitions/manager-budgets
   */
  updateManagerBudget = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const organizationId = req.user.organization_id || req.user.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization not found' });
        return;
      }

      const budgetData: ManagerBudgetData = {
        managerId: req.body.managerId || req.body.manager_id,
        totalPoints: req.body.totalPoints,
        month: req.body.month,
        year: req.body.year,
      };

      const dependencies = {
        persistRecognition: (data: any) => this.repository.createRecognition(data),
        updateRecognition: (id: number, data: any) => this.repository.updateRecognition(id, data),
        getUserById: (id: number) => storage.getUserById(id),
        getUsersByOrganization: (orgId: number) => storage.getUsersByOrganization(orgId),
        getRecognitionSettings: (orgId: number) => this.repository.getRecognitionSettings(orgId),
        createPointsTransaction: (data: any) => this.repository.createPointsTransaction(data),
        updateUserPoints: (userId: number, balance: number) => this.repository.updateUserPoints(userId, balance),
        getUserBalance: (userId: number) => this.repository.getUserBalance(userId),
        getManagerBudget: (managerId: number, month: number, year: number) => 
          this.repository.getManagerBudget(managerId, month, year),
        updateManagerBudget: (budgetId: number, remainingPoints: number) => Promise.resolve(true),
        checkUserDependencies: (userId: number) => storage.checkUserDependencies(userId),
      };

      const budget = await RecognitionDomain.updateManagerBudget(
        budgetData,
        req.user.id,
        organizationId,
        dependencies
      );

      res.json({
        budget,
        message: 'Manager budget updated successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error in updateManagerBudget controller', {
        error: error?.message || 'unknown_error',
        userId: req.user?.id,
        body: req.body,
      });
      res.status(400).json({ error: error?.message || 'Failed to update manager budget' });
    }
  };
}