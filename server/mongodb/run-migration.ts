import { connectToMongoDB } from './connection';
import { runSocialMigration } from './migration';

async function executeMigration() {
  try {
    console.log('🚀 Starting MongoDB social data migration...');

    // Check if MongoDB is available
    const db = await connectToMongoDB();
    if (!db) {
      console.log(
        '❌ MongoDB not available. Please provide MONGODB_URI environment variable.'
      );
      return;
    }

    // Run the migration
    await runSocialMigration();

    console.log('✅ MongoDB social data migration completed successfully!');
    console.log(
      '📊 Social posts, comments, and reactions have been migrated to MongoDB'
    );
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

export { executeMigration };
