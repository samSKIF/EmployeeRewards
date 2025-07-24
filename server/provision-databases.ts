import { hybridDb } from './hybrid-db';
import { mysqlDb } from './db-mysql';
import { redisCache } from './db-redis';
import { auditLogger } from './db-elasticsearch';

async function provisionDatabases() {
  console.log('🚀 Starting database provisioning...');

  try {
    // Test and initialize all connections
    console.log('📡 Testing database connections...');

    // Initialize hybrid database service
    await hybridDb.initialize();
    console.log('✅ Hybrid database service initialized');

    // Test MySQL connection
    try {
      const testQuery = await mysqlDb.execute('SELECT 1 as test');
      console.log('✅ MySQL connection successful');
    } catch (error) {
      console.error('❌ MySQL connection failed:', error.message);
    }

    // Test Redis connection
    try {
      await redisCache.getClient().ping();
      console.log('✅ Redis connection successful');
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
    }

    // Test Elasticsearch connection
    try {
      await auditLogger.logSystemEvent('database_provision_test', {
        timestamp: new Date(),
        action: 'provision_test',
      });
      console.log('✅ Elasticsearch connection successful');
    } catch (error) {
      console.error('❌ Elasticsearch connection failed:', error.message);
    }

    // Run health check
    const health = await hybridDb.healthCheck();
    console.log('\n🏥 Final Health Check Results:');
    console.log('================================');
    Object.entries(health).forEach(([service, status]) => {
      console.log(`${service}: ${status ? '✅ Healthy' : '❌ Unhealthy'}`);
    });

    const allHealthy = Object.values(health).every((status) => status);
    if (allHealthy) {
      console.log('\n🎉 All databases are healthy and ready!');
      console.log('You can now run the migration script.');
    } else {
      console.log('\n⚠️  Some databases are not responding correctly.');
      console.log(
        'Please check your environment variables and database connections.'
      );
    }
  } catch (error) {
    console.error('❌ Database provisioning failed:', error);
    console.log('\n📋 Required Environment Variables:');
    console.log('==================================');
    console.log('MYSQL_DATABASE_URL - MySQL connection string');
    console.log('MONGODB_URL - MongoDB connection string');
    console.log('REDIS_URL - Redis connection string');
    console.log('ELASTICSEARCH_URL - Elasticsearch connection string');
    process.exit(1);
  }
}

// Run provisioning if this file is executed directly
if (require.main === module) {
  provisionDatabases()
    .then(() => {
      console.log('✅ Database provisioning completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database provisioning failed:', error);
      process.exit(1);
    });
}

export { provisionDatabases };
