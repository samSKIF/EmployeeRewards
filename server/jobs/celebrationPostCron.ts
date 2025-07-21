/**
 * Celebration Post Cron Job
 * Automatically generates celebration posts daily
 */
import cron from 'node-cron';
import { celebrationPostService } from '../services/celebrationPostService';
import { logger } from '@shared/logger';

/**
 * Schedule celebration post generation
 * Runs every day at 6:00 AM server time
 */
export function startCelebrationPostCron() {
  // Schedule: "0 6 * * *" means 6:00 AM every day
  // For testing, use "*/5 * * * *" to run every 5 minutes
  const schedule = process.env.NODE_ENV === 'development' ? '0 6 * * *' : '0 6 * * *';
  
  cron.schedule(schedule, async () => {
    try {
      logger.info('🎉 Starting scheduled celebration post generation...');
      await celebrationPostService.generateTodaysCelebrationPosts();
      logger.info('✅ Scheduled celebration post generation completed');
    } catch (error) {
      logger.error('❌ Error in scheduled celebration post generation:', error);
    }
  });
  
  logger.info(`🕒 Celebration post cron job scheduled: ${schedule}`);
}

/**
 * Run celebration post generation immediately (for server startup)
 */
export async function runCelebrationPostsOnStartup() {
  try {
    logger.info('🚀 Running celebration post generation on server startup...');
    await celebrationPostService.generateTodaysCelebrationPosts();
    logger.info('✅ Startup celebration post generation completed');
  } catch (error) {
    logger.error('❌ Error in startup celebration post generation:', error);
  }
}