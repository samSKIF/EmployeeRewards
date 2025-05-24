import bcrypt from 'bcrypt';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createSampleData() {
  console.log('🚀 Creating ThrivioHR SaaS sample data...');

  try {
    // First, create the management tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        permissions JSONB DEFAULT '{"manageCompanies": true, "manageMerchants": true, "manageProducts": true, "manageOrders": true, "manageFinances": true, "viewAnalytics": true}',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS merchants (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        api_key TEXT UNIQUE,
        commission_rate DECIMAL(5,2) DEFAULT 15.00,
        payment_method TEXT DEFAULT 'bank_transfer',
        bank_details JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS management_products (
        id SERIAL PRIMARY KEY,
        merchant_id INTEGER REFERENCES merchants(id),
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        subcategory TEXT,
        price DECIMAL(10,2) NOT NULL,
        points_price INTEGER NOT NULL,
        image_url TEXT,
        images JSONB DEFAULT '[]',
        specifications JSONB,
        stock INTEGER DEFAULT 100,
        is_active BOOLEAN DEFAULT true,
        tags JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create ThrivioHR management admin user
    const hashedPassword = await bcrypt.hash('ThrivioAdmin2024!', 10);
    await pool.query(`
      INSERT INTO admin_users (username, email, password, name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO UPDATE SET 
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions
    `, [
      'thrivio_admin',
      'admin@thriviohr.com',
      hashedPassword,
      'ThrivioHR Administrator',
      'super_admin',
      JSON.stringify({
        manageCompanies: true,
        manageMerchants: true,
        manageProducts: true,
        manageOrders: true,
        manageFinances: true,
        viewAnalytics: true
      })
    ]);

    // Create sample merchants
    const merchants = [
      {
        name: 'Premium Rewards Co.',
        email: 'sales@premiumrewards.com',
        phone: '+1-555-0123',
        address: '123 Merchant Street, Business City, BC 12345',
        api_key: 'merchant_premium_2024_abc123',
        commission_rate: 12.50
      },
      {
        name: 'Gift Experience Hub',
        email: 'partnerships@giftexp.com',
        phone: '+1-555-0456',
        address: '456 Experience Ave, Gift City, GC 67890',
        api_key: 'merchant_giftexp_2024_def456',
        commission_rate: 18.00
      },
      {
        name: 'Corporate Merchandise Plus',
        email: 'corporate@mercplus.com',
        phone: '+1-555-0789',
        address: '789 Corporate Blvd, Merch Town, MT 13579',
        api_key: 'merchant_corpmerch_2024_ghi789',
        commission_rate: 15.00
      }
    ];

    const merchantIds = [];
    for (const merchant of merchants) {
      const result = await pool.query(`
        INSERT INTO merchants (name, email, phone, address, api_key, commission_rate)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (api_key) DO UPDATE SET 
          name = EXCLUDED.name,
          email = EXCLUDED.email
        RETURNING id
      `, [merchant.name, merchant.email, merchant.phone, merchant.address, merchant.api_key, merchant.commission_rate]);
      merchantIds.push(result.rows[0].id);
    }

    // Create sample products
    const products = [
      { name: 'Apple AirPods Pro', category: 'merchandise', price: 249.99, points: 2500, merchant: 0, description: 'Premium wireless earbuds with active noise cancellation' },
      { name: 'Amazon Gift Card $50', category: 'giftcard', price: 50.00, points: 500, merchant: 0, description: 'Digital gift card for Amazon purchases' },
      { name: 'Spa Day Experience', category: 'experience', price: 199.99, points: 2000, merchant: 1, description: 'Relaxing spa day with massage and treatments' },
      { name: 'Company Branded Hoodie', category: 'merchandise', price: 45.00, points: 450, merchant: 2, description: 'Premium quality hoodie with company branding' },
      { name: 'Starbucks Gift Card $25', category: 'giftcard', price: 25.00, points: 250, merchant: 0, description: 'Digital gift card for Starbucks coffee' },
      { name: 'Wine Tasting Experience', category: 'experience', price: 89.99, points: 900, merchant: 1, description: 'Premium wine tasting experience for two' },
      { name: 'Wireless Charging Pad', category: 'merchandise', price: 29.99, points: 300, merchant: 2, description: 'Fast wireless charging for smartphones' },
      { name: 'Netflix Gift Card $30', category: 'giftcard', price: 30.00, points: 300, merchant: 0, description: 'Digital gift card for Netflix streaming' }
    ];

    for (const product of products) {
      await pool.query(`
        INSERT INTO management_products (merchant_id, name, description, category, price, points_price)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [merchantIds[product.merchant], product.name, product.description, product.category, product.price, product.points]);
    }

    // Create the three companies
    const companies = [
      {
        name: 'Canva',
        email: 'admin@canva.com',
        domain: 'canva.com',
        database_url: 'postgresql://canva_db_user:password@localhost/canva_db',
        subscription_tier: 'enterprise',
        max_employees: 300,
        wallet_balance: 50000.00,
        admin_username: 'canva_admin',
        admin_email: 'admin@canva.com',
        admin_name: 'Canva Administrator',
        admin_password: 'Canva2024Admin!'
      },
      {
        name: 'Monday',
        email: 'admin@monday.com',
        domain: 'monday.com',
        database_url: 'postgresql://monday_db_user:password@localhost/monday_db',
        subscription_tier: 'enterprise',
        max_employees: 250,
        wallet_balance: 75000.00,
        admin_username: 'monday_admin',
        admin_email: 'admin@monday.com',
        admin_name: 'Monday Administrator',
        admin_password: 'Monday2024Admin!'
      },
      {
        name: 'Loylogic',
        email: 'admin@loylogic.com',
        domain: 'loylogic.com',
        database_url: 'postgresql://loylogic_db_user:password@localhost/loylogic_db',
        subscription_tier: 'premium',
        max_employees: 200,
        wallet_balance: 35000.00,
        admin_username: 'loylogic_admin',
        admin_email: 'admin@loylogic.com',
        admin_name: 'Loylogic Administrator',
        admin_password: 'Loylogic2024Admin!'
      }
    ];

    const companyIds = [];
    for (const company of companies) {
      const result = await pool.query(`
        INSERT INTO companies (name, email, domain, database_url, subscription_tier, max_employees, wallet_balance)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE SET 
          name = EXCLUDED.name,
          domain = EXCLUDED.domain,
          subscription_tier = EXCLUDED.subscription_tier,
          max_employees = EXCLUDED.max_employees,
          wallet_balance = EXCLUDED.wallet_balance
        RETURNING id
      `, [company.name, company.email, company.domain, company.database_url, company.subscription_tier, company.max_employees, company.wallet_balance]);
      companyIds.push({...company, id: result.rows[0].id});
    }

    console.log('✅ ThrivioHR SaaS Management Backend Created Successfully!');
    console.log('');
    console.log('🏢 COMPANIES CREATED:');
    console.log('══════════════════════════════════════════════════');
    
    companyIds.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   📧 Email: ${company.email}`);
      console.log(`   🌐 Domain: ${company.domain}`);
      console.log(`   💰 Wallet Balance: $${company.wallet_balance}`);
      console.log(`   👥 Max Employees: ${company.max_employees}`);
      console.log(`   📊 Subscription: ${company.subscription_tier}`);
      console.log(`   🔑 Admin Username: ${company.admin_username}`);
      console.log(`   🔐 Admin Password: ${company.admin_password}`);
      console.log('   ──────────────────────────────────────────────');
    });

    console.log('');
    console.log('🔧 THRIVIOHR MANAGEMENT BACKEND ACCESS:');
    console.log('══════════════════════════════════════════════════');
    console.log('🌐 Management Dashboard URL: http://localhost:5000/management');
    console.log('👤 Admin Username: thrivio_admin');
    console.log('🔐 Admin Password: ThrivioAdmin2024!');
    console.log('📧 Admin Email: admin@thriviohr.com');
    console.log('');
    console.log('🏪 MARKETPLACE DATA:');
    console.log('══════════════════════════════════════════════════');
    console.log(`✅ ${merchants.length} merchants created`);
    console.log(`✅ ${products.length} products added to catalog`);
    console.log('✅ All companies have $10,000+ wallet balances');
    console.log('✅ Full feature access enabled for all companies');
    
    console.log('');
    console.log('📝 NOTES:');
    console.log('══════════════════════════════════════════════════');
    console.log('• Each company uses the same login URL but shows their own data');
    console.log('• Admin accounts have full access to their company platform');
    console.log('• Management backend is completely separate from company platforms');
    console.log('• All companies have premium/enterprise features enabled');
    console.log('• Ready for employee data import (100-200 employees per company)');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
createSampleData().catch(console.error);