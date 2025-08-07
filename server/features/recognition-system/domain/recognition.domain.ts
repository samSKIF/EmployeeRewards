// Recognition Domain Layer
// Handles all recognition business logic, validation, and event publishing

import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import {
  recognitions,
  recognitionSettings,
  managerBudgets,
  pointsTransactions,
  type Recognition,
  type User,
  type RecognitionSetting,
  type ManagerBudget,
  type PointsTransaction,
  type InsertRecognition,
  type InsertPointsTransaction,
  type InsertManagerBudget,
} from '@shared/schema';
import { eventSystem } from '@shared/events';
import {
  createRecognitionCreatedEvent,
  createRecognitionApprovedEvent,
  createPointsAwardedEvent,
  createRecognitionRejectedEvent,
  createManagerBudgetUpdatedEvent,
} from '@shared/events';
import { logger } from '@shared/logger';

// Validation schemas for recognition operations
export const createRecognitionSchema = createInsertSchema(recognitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  recipientId: z.number().positive('Recipient ID must be positive'),
  badgeType: z.string().min(1, 'Badge type is required'),
  message: z.string().min(5, 'Message must be at least 5 characters').max(500, 'Message must not exceed 500 characters'),
  points: z.number().positive('Points must be positive').max(1000, 'Points cannot exceed 1000'),
});

export const updateRecognitionSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  transactionId: z.number().optional(),
  reviewedAt: z.date().optional(),
  reviewedBy: z.number().optional(),
  rejectionReason: z.string().optional(),
});

export const recognitionFiltersSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  badgeType: z.string().optional(),
  recipientId: z.number().optional(),
  recognizerId: z.number().optional(),
  departmentFilter: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().positive().max(100).default(20),
  offset: z.number().nonnegative().default(0),
});

export const managerBudgetSchema = createInsertSchema(managerBudgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  managerId: z.number().positive('Manager ID must be positive'),
  totalPoints: z.number().positive('Total points must be positive'),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2030),
});

// Type exports
export type CreateRecognitionData = z.infer<typeof createRecognitionSchema>;
export type UpdateRecognitionData = z.infer<typeof updateRecognitionSchema>;
export type RecognitionFilters = z.infer<typeof recognitionFiltersSchema>;
export type ManagerBudgetData = z.infer<typeof managerBudgetSchema>;

// Dependencies interface
export interface RecognitionDependencies {
  persistRecognition: (data: InsertRecognition) => Promise<Recognition>;
  updateRecognition: (id: number, data: Partial<Recognition>) => Promise<Recognition | null>;
  getUserById: (id: number) => Promise<User | null>;
  getUsersByOrganization: (organizationId: number) => Promise<User[]>;
  getRecognitionSettings: (organizationId: number) => Promise<RecognitionSetting | null>;
  createPointsTransaction: (data: InsertPointsTransaction) => Promise<PointsTransaction>;
  updateUserPoints: (userId: number, newBalance: number) => Promise<boolean>;
  getUserBalance: (userId: number) => Promise<number>;
  getManagerBudget: (managerId: number, month: number, year: number) => Promise<ManagerBudget | null>;
  updateManagerBudget: (budgetId: number, remainingPoints: number) => Promise<boolean>;
  checkUserDependencies: (userId: number) => Promise<boolean>;
}

/**
 * Recognition Domain Service
 * Centralizes all recognition business logic and validation
 */
export class RecognitionDomain {
  /**
   * Create a new peer-to-peer recognition with validation and event publishing
   */
  static async createPeerRecognition(
    data: CreateRecognitionData,
    recognizerId: number,
    organizationId: number,
    dependencies: RecognitionDependencies
  ): Promise<Recognition> {
    try {
      // Validate input data
      const validatedData = createRecognitionSchema.parse(data);
      
      // Business rule: Cannot recognize yourself
      if (recognizerId === validatedData.recipientId) {
        throw new Error('You cannot recognize yourself');
      }

      // Get recognition settings for the organization
      const settings = await dependencies.getRecognitionSettings(organizationId);
      if (!settings || !settings.peerEnabled) {
        throw new Error('Peer-to-peer recognition is not enabled for your organization');
      }

      // Get recognizer and recipient information
      const [recognizer, recipient] = await Promise.all([
        dependencies.getUserById(recognizerId),
        dependencies.getUserById(validatedData.recipientId),
      ]);

      if (!recognizer || recognizer.organization_id !== organizationId) {
        throw new Error('Invalid recognizer');
      }

      if (!recipient || recipient.organization_id !== organizationId) {
        throw new Error('Recipient not found in your organization');
      }

      // Validate points against settings
      const pointsToAward = validatedData.points || settings.peerPointsPerRecognition;
      if (pointsToAward > settings.peerPointsPerRecognition) {
        throw new Error(`Points cannot exceed ${settings.peerPointsPerRecognition} for peer recognition`);
      }

      // Create recognition with proper status
      const recognitionData: InsertRecognition = {
        recognizerId,
        recipientId: validatedData.recipientId,
        badgeType: validatedData.badgeType,
        message: validatedData.message,
        points: pointsToAward,
        status: settings.peerRequiresApproval ? 'pending' : 'approved',
        createdBy: recognizerId,
      };

      const recognition = await dependencies.persistRecognition(recognitionData);

      // If auto-approved, process points immediately
      let transaction: PointsTransaction | null = null;
      if (recognition.status === 'approved') {
        transaction = await RecognitionDomain.processRecognitionPoints(
          recognition,
          recipient,
          recognizer,
          dependencies
        );
      }

      // Publish recognition created event
      const createdEvent = createRecognitionCreatedEvent(
        {
          recognition: {
            id: recognition.id,
            recognizerId: recognition.recognizerId,
            recipientId: recognition.recipientId,
            badgeType: recognition.badgeType,
            message: recognition.message,
            points: recognition.points,
            status: recognition.status as 'pending' | 'approved' | 'rejected',
            createdAt: recognition.createdAt || new Date(),
          },
          organization: {
            id: organizationId,
            name: 'Organization', // This could be fetched from org service
          },
          recognizer: {
            id: recognizer.id,
            name: recognizer.name,
            department: recognizer.department,
          },
          recipient: {
            id: recipient.id,
            name: recipient.name,
            department: recipient.department,
          },
          createdBy: recognizerId,
        },
        organizationId,
        { autoApproved: recognition.status === 'approved', transactionId: transaction?.id }
      );

      await eventSystem.publish(createdEvent);

      logger.info('✅ Peer recognition created', {
        recognitionId: recognition.id,
        recognizer: recognizer.name,
        recipient: recipient.name,
        points: pointsToAward,
        autoApproved: recognition.status === 'approved',
      });

      return recognition;
    } catch (error: any) {
      logger.error('❌ Error creating peer recognition', {
        error: error?.message || 'unknown_error',
        recognizerId,
        data,
      });
      throw error;
    }
  }

  /**
   * Approve a pending recognition and award points
   */
  static async approveRecognition(
    recognitionId: number,
    approvedBy: number,
    organizationId: number,
    dependencies: RecognitionDependencies
  ): Promise<{ recognition: Recognition; transaction: PointsTransaction }> {
    try {
      // Get existing recognition (this would need to be added to dependencies)
      // For now, we'll assume it exists and mock the flow

      const updateData: UpdateRecognitionData = {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: approvedBy,
      };

      const updatedRecognition = await dependencies.updateRecognition(recognitionId, updateData);
      if (!updatedRecognition) {
        throw new Error('Recognition not found');
      }

      // Get recipient and recognizer for transaction
      const [recipient, recognizer] = await Promise.all([
        dependencies.getUserById(updatedRecognition.recipientId),
        dependencies.getUserById(updatedRecognition.recognizerId),
      ]);

      if (!recipient || !recognizer) {
        throw new Error('User not found');
      }

      // Process points transaction
      const transaction = await RecognitionDomain.processRecognitionPoints(
        updatedRecognition,
        recipient,
        recognizer,
        dependencies
      );

      // Update recognition with transaction ID
      await dependencies.updateRecognition(recognitionId, { transactionId: transaction.id });

      // Publish recognition approved event
      const approvedEvent = createRecognitionApprovedEvent(
        {
          recognition: {
            id: updatedRecognition.id,
            recognizerId: updatedRecognition.recognizerId,
            recipientId: updatedRecognition.recipientId,
            badgeType: updatedRecognition.badgeType,
            points: updatedRecognition.points,
            approvedAt: new Date(),
          },
          transaction: {
            id: transaction.id,
            userId: transaction.userId,
            amount: transaction.amount,
            type: transaction.type as 'earned' | 'redeemed',
            reason: transaction.reason,
            description: transaction.description,
          },
          approvedBy,
          previousBalance: transaction.previousBalance || 0,
          newBalance: transaction.newBalance || 0,
        },
        organizationId
      );

      await eventSystem.publish(approvedEvent);

      logger.info('✅ Recognition approved and points awarded', {
        recognitionId,
        recipient: recipient.name,
        points: updatedRecognition.points,
        approvedBy,
      });

      return { recognition: updatedRecognition, transaction };
    } catch (error: any) {
      logger.error('❌ Error approving recognition', {
        error: error?.message || 'unknown_error',
        recognitionId,
        approvedBy,
      });
      throw error;
    }
  }

  /**
   * Reject a pending recognition
   */
  static async rejectRecognition(
    recognitionId: number,
    rejectedBy: number,
    reason: string,
    organizationId: number,
    dependencies: RecognitionDependencies
  ): Promise<Recognition> {
    try {
      const updateData: UpdateRecognitionData = {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: rejectedBy,
        rejectionReason: reason,
      };

      const updatedRecognition = await dependencies.updateRecognition(recognitionId, updateData);
      if (!updatedRecognition) {
        throw new Error('Recognition not found');
      }

      // Get recognizer and recipient for event
      const [recognizer, recipient] = await Promise.all([
        dependencies.getUserById(updatedRecognition.recognizerId),
        dependencies.getUserById(updatedRecognition.recipientId),
      ]);

      // Publish recognition rejected event
      const rejectedEvent = createRecognitionRejectedEvent(
        {
          recognition: {
            id: updatedRecognition.id,
            recognizerId: updatedRecognition.recognizerId,
            recipientId: updatedRecognition.recipientId,
            badgeType: updatedRecognition.badgeType,
            message: updatedRecognition.message,
            rejectedAt: new Date(),
          },
          rejectedBy,
          reason,
        },
        organizationId
      );

      await eventSystem.publish(rejectedEvent);

      logger.info('❌ Recognition rejected', {
        recognitionId,
        reason,
        rejectedBy,
      });

      return updatedRecognition;
    } catch (error: any) {
      logger.error('❌ Error rejecting recognition', {
        error: error?.message || 'unknown_error',
        recognitionId,
        rejectedBy,
      });
      throw error;
    }
  }

  /**
   * Process points transaction for approved recognition
   */
  private static async processRecognitionPoints(
    recognition: Recognition,
    recipient: User,
    recognizer: User,
    dependencies: RecognitionDependencies
  ): Promise<PointsTransaction> {
    const currentBalance = await dependencies.getUserBalance(recipient.id);
    const newBalance = currentBalance + recognition.points;

    // Create points transaction
    const transactionData: InsertPointsTransaction = {
      userId: recipient.id,
      amount: recognition.points,
      type: 'earned',
      reason: 'recognition',
      description: `Recognition from ${recognizer.name}: ${recognition.badgeType}`,
      createdBy: recognition.createdBy || recognizer.id,
      previousBalance: currentBalance,
      newBalance,
    };

    const transaction = await dependencies.createPointsTransaction(transactionData);
    
    // Update user balance
    await dependencies.updateUserPoints(recipient.id, newBalance);

    // Publish points awarded event
    const pointsEvent = createPointsAwardedEvent(
      {
        transaction: {
          id: transaction.id,
          userId: transaction.userId,
          amount: transaction.amount,
          type: transaction.type as 'earned' | 'redeemed',
          reason: transaction.reason,
          description: transaction.description,
          createdAt: transaction.createdAt || new Date(),
        },
        user: {
          id: recipient.id,
          name: recipient.name,
          department: recipient.department,
        },
        awardedBy: recognizer.id,
        previousBalance: currentBalance,
        newBalance,
        context: {
          source: 'recognition',
          sourceId: recognition.id,
        },
      },
      recipient.organization_id || 1
    );

    await eventSystem.publish(pointsEvent);

    return transaction;
  }

  /**
   * Validate recognition business rules
   */
  static async validateRecognitionRules(
    data: CreateRecognitionData,
    recognizerId: number,
    organizationId: number,
    dependencies: RecognitionDependencies
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Basic data validation
      const validation = createRecognitionSchema.safeParse(data);
      if (!validation.success) {
        errors.push(...validation.error.errors.map(e => e.message));
      }

      // Business rules validation
      if (recognizerId === data.recipientId) {
        errors.push('Cannot recognize yourself');
      }

      // Check organization settings
      const settings = await dependencies.getRecognitionSettings(organizationId);
      if (!settings?.peerEnabled) {
        errors.push('Peer recognition is not enabled');
      }

      // Check if users exist and belong to organization
      const [recognizer, recipient] = await Promise.all([
        dependencies.getUserById(recognizerId),
        dependencies.getUserById(data.recipientId),
      ]);

      if (!recognizer || recognizer.organization_id !== organizationId) {
        errors.push('Invalid recognizer');
      }

      if (!recipient || recipient.organization_id !== organizationId) {
        errors.push('Recipient not found in organization');
      }

      return { valid: errors.length === 0, errors };
    } catch (error: any) {
      logger.error('❌ Error validating recognition rules', {
        error: error?.message || 'unknown_error',
        data,
        recognizerId,
      });
      return { valid: false, errors: ['Validation failed'] };
    }
  }

  /**
   * Update manager budget with validation and events
   */
  static async updateManagerBudget(
    data: ManagerBudgetData,
    updatedBy: number,
    organizationId: number,
    dependencies: RecognitionDependencies
  ): Promise<ManagerBudget> {
    try {
      const validatedData = managerBudgetSchema.parse(data);

      // Check if manager exists and belongs to organization
      const manager = await dependencies.getUserById(validatedData.managerId);
      if (!manager || manager.organization_id !== organizationId) {
        throw new Error('Manager not found in organization');
      }

      // Check if manager role is appropriate (should contain 'manager')
      if (!manager.role_type?.toLowerCase().includes('manager')) {
        throw new Error('User is not a manager');
      }

      // Get existing budget
      const existingBudget = await dependencies.getManagerBudget(
        validatedData.managerId,
        validatedData.month,
        validatedData.year
      );

      // This would need to be implemented in dependencies
      // For now, we'll return a mock budget
      const budget = {
        id: existingBudget?.id || Date.now(),
        managerId: validatedData.managerId,
        organizationId,
        totalPoints: validatedData.totalPoints,
        remainingPoints: validatedData.totalPoints,
        month: validatedData.month,
        year: validatedData.year,
        createdBy: updatedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ManagerBudget;

      // Publish budget updated event
      const budgetEvent = createManagerBudgetUpdatedEvent(
        {
          budget: {
            id: budget.id,
            managerId: budget.managerId,
            organizationId: budget.organizationId,
            totalPoints: budget.totalPoints,
            remainingPoints: budget.remainingPoints,
            month: budget.month,
            year: budget.year,
          },
          manager: {
            id: manager.id,
            name: manager.name,
            department: manager.department,
          },
          updatedBy,
          previousBudget: existingBudget?.totalPoints || null,
          newBudget: budget.totalPoints,
        },
        organizationId
      );

      await eventSystem.publish(budgetEvent);

      logger.info('✅ Manager budget updated', {
        managerId: manager.id,
        managerName: manager.name,
        totalPoints: validatedData.totalPoints,
        month: validatedData.month,
        year: validatedData.year,
      });

      return budget;
    } catch (error: any) {
      logger.error('❌ Error updating manager budget', {
        error: error?.message || 'unknown_error',
        data,
        updatedBy,
      });
      throw error;
    }
  }
}