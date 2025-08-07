import type { Express, Request, Response, NextFunction } from 'express';
import { createServer, type Server } from 'http';
import { storage } from './storage';
import {
  verifyToken,
  verifyAdmin,
  AuthenticatedRequest,
  generateToken,
} from './middleware/auth';
import {
  tenantRouting,
  ensureTenantAccess,
  TenantRequest,
} from './middleware/tenant-routing';
import { scheduleBirthdayRewards } from './middleware/scheduler';
import { tilloSupplier, carltonSupplier } from './middleware/suppliers';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { db, pool } from './db';
import { compare, hash } from 'bcrypt';
import { upload, documentUpload, getPublicUrl } from './file-upload';
import recognitionAIRoutes from './api/recognition-ai';
import recognitionRoutes from './microservices/recognition';
import { CacheService } from './cache/cacheService';
import { employeeRoutes } from './features/employee-management';
import { employeeEventHandlers } from './features/employee-management/events/employee.event-handlers';
import { recognitionRoutes as newRecognitionRoutes } from './features/recognition-system';
import { recognitionEventHandlers } from './features/recognition-system/events/recognition.event-handlers';
import socialRoutes from './features/social-system/api/social.routes';
import { socialEventHandlers } from './features/social-system/events/social.handlers';
import { leaveRoutes } from './features/leave-management';
import { initializeLeaveEventHandlers } from './features/leave-management/events/leave.event-handlers';
import {
  users,
  insertUserSchema,
  products,
  insertProductSchema,
  brandingSettings,
  insertBrandingSettingsSchema,
  fileTemplates,
  insertFileTemplateSchema,
  FileTemplate,
  organizations,
  organization_features,
  sellers,
  productCategories,
  orderItems,
  supportTickets,
  ticketMessages,
  productReviews,
  posts,
  comments,
  reactions,
  polls,
  pollVotes,
  recognitions,
  interests,
  employeeInterests,
  interestChannels,
  interestChannelMembers,
  interestChannelPosts,
  interestChannelPostComments,
  interestChannelPostLikes,
  interestChannelJoinRequests,
  interestChannelPinnedPosts,
  onboardingPlans,
  onboardingMissions,
  onboardingAssignments,
  onboardingProgress,
  insertOnboardingPlanSchema,
  insertOnboardingMissionSchema,
  insertOnboardingAssignmentSchema,
  insertOnboardingProgressSchema,
  OnboardingPlan,
  OnboardingMission,
  OnboardingAssignment,
  OnboardingProgress,
} from '@shared/schema';
import { eq, desc, asc, and, or, sql, inArray, like } from 'drizzle-orm';
import path from 'path';

// Import modular routes
import { registerRoutes as registerModularRoutes } from './routes/index';
import { logger } from '@shared/logger';
import managementRoutes from './management-routes';

export async function registerRoutes(app: Express): Promise<Server> {
  // Register core modular routes (auth, users, admin, celebrations, points, channels)
  registerModularRoutes(app);

  // Register specialized analytics routes
  app.use('/api/analytics', recognitionAIRoutes);

  // Register recognition microservice routes
  app.use('/api/recognition', recognitionRoutes);

  // Register corporate management routes
  app.use('/api/management', managementRoutes);

  // Register employee management vertical slice
  app.use('/api/employees', employeeRoutes);
  
  // Register recognition system vertical slice
  app.use('/api/recognitions', newRecognitionRoutes);
  
  // Register social system vertical slice
  app.use('/api/social', socialRoutes);
  
  // Register leave management vertical slice
  app.use('/api/leave', leaveRoutes);
  
  // Initialize employee management event handlers
  employeeEventHandlers.initialize();
  
  // Initialize recognition system event handlers
  recognitionEventHandlers.initialize();
  
  // Initialize social system event handlers
  socialEventHandlers.initialize();
  
  // Initialize leave management event handlers
  initializeLeaveEventHandlers();

  // Legacy interests routes for employees (preserving existing functionality)
  app.get(
    '/api/employees/:id/interests',
    verifyToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        logger.debug('=== DIRECT ROUTE: GET employee interests ===');
        const employeeId = parseInt(req.params.id);

        const { interests, employeeInterests } = await import('@shared/schema');
        const { eq, and, or } = await import('drizzle-orm');

        const currentUserId = req.user?.id;
        const isCurrentUser = currentUserId === employeeId;

        const employeeInterestsData = await db
          .select({
            interest: interests,
            customLabel: employeeInterests.customLabel,
            isPrimary: employeeInterests.isPrimary,
            visibility: employeeInterests.visibility,
          })
          .from(employeeInterests)
          .innerJoin(interests, eq(employeeInterests.interestId, interests.id))
          .where(
            and(
              eq(employeeInterests.employeeId, employeeId),
              or(
                eq(employeeInterests.visibility, 'EVERYONE'),
                isCurrentUser ? sql`TRUE` : sql`FALSE`
              )
            )
          );

        const formattedInterests = employeeInterestsData.map((item) => ({
          id: item.interest.id,
          label: item.customLabel || item.interest.label,
          category: item.interest.category,
          icon: item.interest.icon,
          isPrimary: item.isPrimary,
          visibility: item.visibility,
        }));

        logger.debug('Found interests:', formattedInterests.length);
        res.status(200).json(formattedInterests);
      } catch (error: any) {
        logger.error('Error fetching employee interests:', error);
        res
          .status(500)
          .json({
            message: 'Failed to fetch employee interests',
            error: error.message,
          });
      }
    }
  );

  // Legacy interests management
  app.post(
    '/api/employees/:id/interests',
    verifyToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        logger.debug('=== DIRECT ROUTE: POST employee interests ===');
        const employeeId = parseInt(req.params.id);
        const currentUserId = req.user?.id;

        if (currentUserId !== employeeId) {
          return res
            .status(403)
            .json({ message: 'You can only update your own interests' });
        }

        const { interestIds } = req.body;

        if (!Array.isArray(interestIds)) {
          return res
            .status(400)
            .json({ message: 'interestIds must be an array' });
        }

        const { employeeInterests } = await import('@shared/schema');
        const { eq } = await import('drizzle-orm');

        await db
          .delete(employeeInterests)
          .where(eq(employeeInterests.employeeId, employeeId));

        if (interestIds.length > 0) {
          const interestInserts = interestIds.map((interestId: number) => ({
            employeeId,
            interestId,
            isPrimary: false,
            visibility: 'EVERYONE' as const,
          }));

          await db.insert(employeeInterests).values(interestInserts);
        }

        logger.debug('Successfully updated employee interests');
        res.status(200).json({ message: 'Interests updated successfully' });
      } catch (error: any) {
        logger.error('Error updating employee interests:', error);
        res
          .status(500)
          .json({
            message: 'Failed to update employee interests',
            error: error.message,
          });
      }
    }
  );

  // General interests endpoint
  app.get(
    '/api/interests',
    verifyToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const allInterests = await db.select().from(interests);
        res.status(200).json(allInterests);
      } catch (error: any) {
        logger.error('Error fetching interests:', error);
        res
          .status(500)
          .json({ message: 'Failed to fetch interests', error: error.message });
      }
    }
  );

  // Dashboard stats endpoint
  app.get(
    '/api/dashboard/stats',
    verifyToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user || !req.user.organization_id) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        const organizationId = req.user.organization_id;

        // Get user count for this organization
        const [userCountResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.organization_id, organizationId));

        const userCount = userCountResult?.count || 0;

        // Get subscription info to compare with limit
        const { subscriptions, organizations } = await import('@shared/schema');
        const [orgData] = await db
          .select({
            subscribedUsers: subscriptions.subscribed_users,
          })
          .from(organizations)
          .leftJoin(
            subscriptions,
            eq(organizations.current_subscription_id, subscriptions.id)
          )
          .where(eq(organizations.id, organizationId));

        const subscribedUsers = orgData?.subscribedUsers || 0;

        res.json({
          userCount,
          subscribedUsers,
          pointsBalance: 0,
          orderCount: 0,
          posts: 0,
          comments: 0,
          reactions: 0,
          recognitions: 0,
        });
      } catch (error: any) {
        logger.error('Error fetching dashboard stats:', error);
        res
          .status(500)
          .json({
            message: 'Failed to fetch dashboard stats',
            error: error.message,
          });
      }
    }
  );

  // Return a placeholder server since the main server handles listening
  const httpServer = createServer(app);
  return httpServer;
}
