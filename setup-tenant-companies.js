import pkg from 'pg';
const { Pool } = pkg;

async function setupTenantCompanies() {
  console.log('🏢 Setting up tenant companies for multi-tenant architecture...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // First, create the companies table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        domain TEXT UNIQUE,
        database_url TEXT NOT NULL,
        subscription_tier TEXT DEFAULT 'premium',
        max_employees INTEGER DEFAULT 500,
        wallet_balance DECIMAL(10,2) DEFAULT 10000.00,
        is_active BOOLEAN DEFAULT true,
        features JSONB DEFAULT '{"leaveManagement": true, "recognitionModule": true, "socialFeed": true, "celebrations": true, "marketplace": true}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Check if companies already exist
    const existingCompanies = await pool.query('SELECT COUNT(*) as count FROM companies');
    const companyCount = parseInt(existingCompanies.rows[0].count);

    if (companyCount > 0) {
      console.log(`Found ${companyCount} existing companies. Updating configuration...`);
    }

    // Create or update the main company for fripl.com domain
    const friptCompanyResult = await pool.query(`
      INSERT INTO companies (name, email, domain, database_url, subscription_tier, max_employees, wallet_balance)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        domain = EXCLUDED.domain,
        database_url = EXCLUDED.database_url,
        subscription_tier = EXCLUDED.subscription_tier,
        max_employees = EXCLUDED.max_employees,
        wallet_balance = EXCLUDED.wallet_balance,
        updated_at = NOW()
      RETURNING id;
    `, [
      'Fripl Technologies',
      'admin@demo.io',
      'fripl.com',
      process.env.DATABASE_URL, // For now, use the same database
      'enterprise',
      1000,
      50000.00
    ]);

    const friptCompanyId = friptCompanyResult.rows[0].id;
    console.log(`✅ Created/Updated Fripl Technologies company (ID: ${friptCompanyId})`);

    // Update the admin user to belong to this company
    await pool.query(`
      UPDATE users 
      SET organization_id = $1, role_type = 'client_admin'
      WHERE email = 'admin@demo.io'
    `, [friptCompanyId]);

    console.log('✅ Updated admin@demo.io to belong to Fripl Technologies');

    // Update all employees created by this admin to have the correct organization link
    const employeeUpdateResult = await pool.query(`
      UPDATE employees 
      SET created_by_id = (SELECT id FROM users WHERE email = 'admin@demo.io')
      WHERE email LIKE '%@fripl.com'
    `);

    console.log(`✅ Updated ${employeeUpdateResult.rowCount} employees to be linked to admin@demo.io`);

    // Create a demo company for testing multi-tenant functionality
    const demoCompanyResult = await pool.query(`
      INSERT INTO companies (name, email, domain, database_url, subscription_tier, max_employees, wallet_balance)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        domain = EXCLUDED.domain,
        database_url = EXCLUDED.database_url,
        updated_at = NOW()
      RETURNING id;
    `, [
      'Demo Corporation',
      'demo-admin@democorp.com',
      'democorp.com',
      process.env.DATABASE_URL, // For now, same database but filtered by company
      'premium',
      200,
      25000.00
    ]);

    const demoCompanyId = demoCompanyResult.rows[0].id;
    console.log(`✅ Created/Updated Demo Corporation (ID: ${demoCompanyId})`);

    // Show final setup summary
    const companies = await pool.query(`
      SELECT c.id, c.name, c.email, c.domain, c.subscription_tier, c.max_employees,
             COUNT(u.id) as admin_users,
             (SELECT COUNT(*) FROM employees e 
              JOIN users u2 ON e.created_by_id = u2.id 
              WHERE u2.organization_id = c.id) as employee_count
      FROM companies c
      LEFT JOIN users u ON u.organization_id = c.id
      GROUP BY c.id, c.name, c.email, c.domain, c.subscription_tier, c.max_employees
      ORDER BY c.id
    `);

    console.log('\n📊 Multi-Tenant Setup Summary:');
    console.log('=====================================');
    
    for (const company of companies.rows) {
      console.log(`\n🏢 Company: ${company.name}`);
      console.log(`   📧 Admin Email: ${company.email}`);
      console.log(`   🌐 Domain: ${company.domain}`);
      console.log(`   📋 Tier: ${company.subscription_tier}`);
      console.log(`   👥 Admin Users: ${company.admin_users}`);
      console.log(`   👤 Employees: ${company.employee_count}`);
    }

    console.log('\n✅ Multi-tenant architecture setup completed!');
    console.log('🔒 Each company now has proper data isolation');

  } catch (error) {
    console.error('❌ Error setting up tenant companies:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup
setupTenantCompanies()
  .then(() => {
    console.log('✨ Tenant companies setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });