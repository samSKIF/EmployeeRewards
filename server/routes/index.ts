import { Express } from 'express';
import authRoutes from './authRoutes';
import { userRoutes } from './userRoutes';
import adminRoutes from './adminRoutes';
import departmentsRoutes from './admin/departmentsRoutes';
import locationsRoutes from './admin/locationsRoutes';
import bulkUploadRoutes from './admin/bulkUploadRoutes';
import activityRoutes from './admin/activityRoutes';
import celebrationRoutes from './celebrationRoutes';
import { celebrationPostRoutes } from './celebrationPostRoutes';
import pointsRoutes from './pointsRoutes';
import channelRoutes from './channelRoutes';
import spacesRoutes from './spacesRoutes';
import featuredPostsRoutes from './featuredPostsRoutes';
import prioritiesRoutes from './prioritiesRoutes';
import postsRoutes from './postsRoutes';
import subscriptionRoutes from './subscriptionRoutes';
import { logger } from '@shared/logger';

// Import microservices
import recognitionMicroservice from '../microservices/recognition';
import socialMicroservice from '../microservices/social';
import leaveMicroservice from '../microservices/leave';
import interestsMicroservice from '../microservices/interests';
import employeeStatusMicroservice from '../microservices/employee-status';
import { setupBirthdayStatusRoutes } from '../microservices/birthday-status';

export function registerRoutes(app: Express) {
  logger.info('Registering modular routes...');

  // Authentication routes
  app.use('/api/auth', authRoutes);

  // User management routes
  app.use('/api/users', userRoutes);

  // Admin functionality routes
  app.use('/api/admin', adminRoutes);
  
  // Department management routes
  app.use('/api/admin/departments', departmentsRoutes);
  
  // Location management routes
  app.use('/api/admin/locations', locationsRoutes);
  
  // Activity tracking and analytics routes
  app.use('/api/admin', activityRoutes);
  
  // Bulk upload routes
  app.use(bulkUploadRoutes);

  // Celebration routes (birthdays, anniversaries)
  app.use('/api/celebrations', celebrationRoutes);

  // Celebration post generation routes
  app.use('/api/celebration-posts', celebrationPostRoutes);

  // Points system routes
  app.use('/api/points', pointsRoutes);

  // Channel/Space routes
  app.use('/api/channels', channelRoutes);
  app.use('/api/spaces', spacesRoutes);

  // Posts interaction routes
  app.use('/api/posts', postsRoutes);

  // Featured posts management routes
  app.use('/api/featured-posts', featuredPostsRoutes);

  // Priorities management routes
  app.use('/api/priorities', prioritiesRoutes);

  // Subscription management routes
  app.use('/api/admin/subscription', subscriptionRoutes);

  // Mount microservices with prefixes to avoid conflicts
  app.use('/api/recognition', recognitionMicroservice);
  app.use('/api/social', socialMicroservice);
  app.use('/api/leave', leaveMicroservice);
  app.use('/api/interests', interestsMicroservice);
  app.use('/api/employee-status', employeeStatusMicroservice);
  setupBirthdayStatusRoutes(app);

  logger.info('All modular routes registered successfully');
}
