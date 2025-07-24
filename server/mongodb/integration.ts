import { connectToMongoDB } from './connection';

export async function initializeMongoDB() {
  try {
    console.log('Initializing MongoDB for social features...');

    // Connect to MongoDB
    const db = await connectToMongoDB();

    if (db) {
      console.log('MongoDB connected successfully');
      return true;
    } else {
      console.log(
        'MongoDB not available, continuing with PostgreSQL for social features'
      );
      return false;
    }
  } catch (error) {
    console.error('Failed to initialize MongoDB:', error);
    console.log('Continuing with PostgreSQL fallback for social features');
    return false;
  }
}

export async function setupMongoDBSocialRoutes(app: any) {
  try {
    const { initializeSocialRoutes } = await import('./socialRoutes');
    const socialRoutes = initializeSocialRoutes();
    app.use('/api/social', socialRoutes);
    console.log('MongoDB social routes initialized');
    return true;
  } catch (error) {
    console.error('Failed to setup MongoDB social routes:', error);
    return false;
  }
}

export async function migrateSocialDataToMongoDB() {
  try {
    console.log('Social data migration skipped - migration files removed');
    return true;
  } catch (error) {
    console.error('Social data migration failed:', error);
    return false;
  }
}

// Export removed - routes initialized dynamically
