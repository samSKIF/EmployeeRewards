import { connectToMongoDB } from './connection';
import { runSocialMigration } from './migration';
import socialRoutes from './socialRoutes';

export async function initializeMongoDB() {
  try {
    console.log('Initializing MongoDB for social features...');
    
    // Connect to MongoDB
    await connectToMongoDB();
    
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize MongoDB:', error);
    console.log('Continuing with MySQL fallback for social features');
    return false;
  }
}

export async function migrateSocialDataToMongoDB() {
  try {
    console.log('Starting social data migration to MongoDB...');
    await runSocialMigration();
    console.log('Social data migration completed');
    return true;
  } catch (error) {
    console.error('Social data migration failed:', error);
    return false;
  }
}

export { socialRoutes };