
import { hybridDb } from './hybrid-db';
import { mysqlDb } from './db-mysql';
import { mongoDb } from './db-mongodb';
import { redisCache } from './db-redis';
import { db as postgresDb } from './db'; // Your existing PostgreSQL connection
import { users as pgUsers, organizations as pgOrgs, posts as pgPosts } from '@shared/schema';
import { users as mysqlUsers, organizations as mysqlOrgs } from '@shared/mysql-schema';
import { COLLECTIONS, type SocialPost, type Comment } from '@shared/mongodb-schemas';

async function migrateToHybridDatabase() {
  console.log('Starting migration to hybrid database architecture...');

  try {
    // Initialize connections
    await hybridDb.initialize();
    const mongodb = mongoDb.getDb();

    console.log('✅ Database connections established');

    // 1. Migrate Organizations from PostgreSQL to MySQL
    console.log('📦 Migrating organizations...');
    const existingOrgs = await postgresDb.select().from(pgOrgs);
    
    for (const org of existingOrgs) {
      await mysqlDb.insert(mysqlOrgs).values({
        id: org.id,
        name: org.name,
        domain: org.domain,
        subscriptionTier: org.subscriptionTier || 'basic',
        maxEmployees: org.maxEmployees || 50,
        isActive: org.isActive ?? true,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      }).onDuplicateKeyUpdate({
        name: org.name,
        domain: org.domain,
        updatedAt: new Date(),
      });
    }
    console.log(`✅ Migrated ${existingOrgs.length} organizations`);

    // 2. Migrate Users from PostgreSQL to MySQL
    console.log('👥 Migrating users...');
    const existingUsers = await postgresDb.select().from(pgUsers);
    
    for (const user of existingUsers) {
      await mysqlDb.insert(mysqlUsers).values({
        id: user.id,
        firebaseUid: user.firebaseUid,
        username: user.username,
        email: user.email,
        name: user.name,
        jobTitle: user.jobTitle,
        department: user.department,
        location: user.location,
        phoneNumber: user.phoneNumber,
        birthday: user.birthday,
        hireDate: user.hireDate,
        organizationId: user.organizationId,
        managerId: user.managerId,
        isAdmin: user.isAdmin ?? false,
        isActive: user.isActive ?? true,
        points: user.points || 0,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }).onDuplicateKeyUpdate({
        name: user.name,
        email: user.email,
        points: user.points || 0,
        updatedAt: new Date(),
      });
    }
    console.log(`✅ Migrated ${existingUsers.length} users`);

    // 3. Migrate Posts from PostgreSQL to MongoDB
    console.log('📝 Migrating posts to MongoDB...');
    const existingPosts = await postgresDb.select().from(pgPosts);
    
    for (const post of existingPosts) {
      const mongoPost: SocialPost = {
        authorId: post.authorId,
        authorName: post.authorName || 'Unknown',
        organizationId: post.organizationId || 1,
        content: post.content,
        imageUrl: post.imageUrl || undefined,
        type: post.type as any || 'text',
        visibility: 'public',
        reactions: [], // Will migrate reactions separately if needed
        commentsCount: 0, // Will update after migrating comments
        sharesCount: 0,
        createdAt: post.createdAt || new Date(),
        updatedAt: post.updatedAt || new Date(),
        isDeleted: post.isDeleted || false,
        tags: [],
        mentions: [],
      };

      await mongodb.collection(COLLECTIONS.POSTS).insertOne(mongoPost);
    }
    console.log(`✅ Migrated ${existingPosts.length} posts to MongoDB`);

    // 4. Set up MongoDB indexes
    console.log('🔍 Setting up MongoDB indexes...');
    await Promise.all([
      mongodb.collection(COLLECTIONS.POSTS).createIndex({ organizationId: 1, createdAt: -1 }),
      mongodb.collection(COLLECTIONS.POSTS).createIndex({ authorId: 1, createdAt: -1 }),
      mongodb.collection(COLLECTIONS.POSTS).createIndex({ isDeleted: 1 }),
      mongodb.collection(COLLECTIONS.COMMENTS).createIndex({ postId: 1, createdAt: -1 }),
      mongodb.collection(COLLECTIONS.NOTIFICATIONS).createIndex({ userId: 1, createdAt: -1 }),
      mongodb.collection(COLLECTIONS.NOTIFICATIONS).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    console.log('✅ MongoDB indexes created');

    // 5. Clear Redis cache to ensure fresh data
    console.log('🧹 Clearing Redis cache...');
    await redisCache.getClient().flushall();
    console.log('✅ Redis cache cleared');

    console.log('🎉 Migration to hybrid database completed successfully!');
    
    // Health check
    const health = await hybridDb.healthCheck();
    console.log('🏥 Health check results:', health);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateToHybridDatabase()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateToHybridDatabase };
