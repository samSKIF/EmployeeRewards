
import { hybridDb } from './hybrid-db';
import { mysqlDb } from './db-mysql';
import { mongoDb } from './db-mongodb';
import { redisCache } from './db-redis';
import { users as mysqlUsers, organizations as mysqlOrgs } from '@shared/mysql-schema';
import { COLLECTIONS } from '@shared/mongodb-schemas';

async function checkMigrationStatus() {
  console.log('🔍 Checking Migration Status');
  console.log('============================\n');

  try {
    // Initialize connections
    await hybridDb.initialize();
    const mongodb = mongoDb.getDb();

    console.log('📊 Data Migration Status:');
    console.log('-------------------------');

    // Check MySQL data
    const mysqlUsersCount = await mysqlDb.select().from(mysqlUsers);
    const mysqlOrgsCount = await mysqlDb.select().from(mysqlOrgs);

    console.log(`MySQL Users: ${mysqlUsersCount.length}`);
    console.log(`MySQL Organizations: ${mysqlOrgsCount.length}`);

    // Check MongoDB data
    const mongoPostsCount = await mongodb.collection(COLLECTIONS.POSTS).countDocuments();
    const mongoCommentsCount = await mongodb.collection(COLLECTIONS.COMMENTS).countDocuments();
    const mongoNotificationsCount = await mongodb.collection(COLLECTIONS.NOTIFICATIONS).countDocuments();

    console.log(`MongoDB Posts: ${mongoPostsCount}`);
    console.log(`MongoDB Comments: ${mongoCommentsCount}`);
    console.log(`MongoDB Notifications: ${mongoNotificationsCount}`);

    // Check Redis cache
    const redisInfo = await redisCache.getClient().info('memory');
    console.log(`Redis: Connected (${redisInfo.includes('used_memory') ? 'Active' : 'Inactive'})`);

    // Health check
    console.log('\n🏥 System Health:');
    console.log('-----------------');
    const health = await hybridDb.healthCheck();
    Object.entries(health).forEach(([service, status]) => {
      console.log(`${service}: ${status ? '✅ Healthy' : '❌ Unhealthy'}`);
    });

    const allHealthy = Object.values(health).every(status => status);
    console.log(`\n🎯 Overall Status: ${allHealthy ? '✅ All Systems Operational' : '⚠️  Some Issues Detected'}`);

    // Migration recommendations
    console.log('\n📝 Next Steps:');
    console.log('--------------');
    if (mysqlUsersCount.length === 0 && mysqlOrgsCount.length === 0) {
      console.log('• Run migration: npm run migrate-hybrid');
    } else {
      console.log('• Migration appears complete ✅');
      console.log('• Start application: Click "Run" button');
    }

  } catch (error) {
    console.error('❌ Status check failed:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('-------------------');
    console.log('1. Ensure all environment variables are set in Secrets');
    console.log('2. Run: npm run provision-db');
    console.log('3. Check database connectivity');
  }
}

// Run status check if this file is executed directly
if (require.main === module) {
  checkMigrationStatus()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Status check failed:', error);
      process.exit(1);
    });
}

export { checkMigrationStatus };
