import { connectToMongoDB } from './mongodb/connection';
import { runSocialMigration } from './mongodb/migration';

async function executeMigration() {
  try {
    console.log('🚀 Starting MongoDB social data migration...');

    // Connect to MongoDB first
    const db = await connectToMongoDB();
    if (!db) {
      throw new Error('Failed to connect to MongoDB');
    }

    console.log('📊 Connected to MongoDB, starting data migration...');
    await runSocialMigration();
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

executeMigration();
