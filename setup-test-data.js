const { pool } = require('./server/db');
const bcrypt = require('bcrypt');

async function setupTestData() {
  const client = await pool.connect();
  try {
    // Hash the password
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    console.log('Creating test organization...');
    await client.query(`
      INSERT INTO organizations (id, name, subscription_type, subscription_status) 
      VALUES ('test-org', 'Test Organization', 'premium', 'active')
      ON CONFLICT (id) DO NOTHING;
    `);
    
    console.log('Creating test users...');
    await client.query(`
      INSERT INTO users (id, username, email, password_hash, role, organization_id, first_name, last_name) 
      VALUES 
        (1, 'admin', 'admin@test.com', $1, 'admin', 'test-org', 'Admin', 'User'),
        (2, 'testuser', 'user@test.com', $1, 'employee', 'test-org', 'Test', 'User')
      ON CONFLICT (id) DO NOTHING;
    `, [passwordHash]);
    
    console.log('Test data setup complete!');
    console.log('Login with: admin@test.com / admin123');
    
  } catch (error) {
    console.error('Error setting up test data:', error);
  } finally {
    client.release();
  }
}

setupTestData().then(() => process.exit(0));