import { pool, db } from './db';
import { sql } from 'drizzle-orm';

/**
 * This script adds the new columns needed for the three-tier account structure
 */
async function runMigration() {
  console.log(
    'Starting database migration for three-tier account structure...'
  );

  try {
    // Check if users table has role_type column
    const checkRoleTypeColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role_type'
    `);

    // If role_type column doesn't exist, add it
    if (checkRoleTypeColumn.rows.length === 0) {
      console.log('Adding role_type column to users table...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN role_type text,
        ADD COLUMN organization_id integer,
        ADD COLUMN created_by integer,
        ADD COLUMN permissions jsonb
      `);
      console.log(
        'Added role_type, organization_id, created_by, and permissions columns to users table'
      );
    } else {
      console.log('role_type column already exists in users table');
    }

    // Check if organizations table exists
    const checkOrganizationsTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'organizations'
    `);

    // If organizations table doesn't exist, create it
    if (checkOrganizationsTable.rows.length === 0) {
      console.log('Creating organizations table...');
      await pool.query(`
        CREATE TABLE organizations (
          id serial PRIMARY KEY,
          name text NOT NULL,
          type text NOT NULL,
          status text NOT NULL,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now()
        )
      `);
      console.log('Created organizations table');
    } else {
      console.log('organizations table already exists');
    }

    // Check if organization_features table exists
    const checkOrgFeaturesTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'organization_features'
    `);

    // If organization_features table doesn't exist, create it
    if (checkOrgFeaturesTable.rows.length === 0) {
      console.log('Creating organization_features table...');
      await pool.query(`
        CREATE TABLE organization_features (
          id serial PRIMARY KEY,
          organization_id integer NOT NULL,
          feature_name text NOT NULL,
          is_enabled boolean DEFAULT true NOT NULL,
          settings jsonb
        )
      `);
      console.log('Created organization_features table');
    } else {
      console.log('organization_features table already exists');
    }

    // Check if sellers table exists
    const checkSellersTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'sellers'
    `);

    // If sellers table doesn't exist, create it
    if (checkSellersTable.rows.length === 0) {
      console.log('Creating sellers table...');
      await pool.query(`
        CREATE TABLE sellers (
          id serial PRIMARY KEY,
          name text NOT NULL,
          description text,
          status text DEFAULT 'pending' NOT NULL,
          user_id integer,
          organization_id integer,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now()
        )
      `);
      console.log('Created sellers table');
    } else {
      console.log('sellers table already exists');
    }

    // Check if product_categories table exists
    const checkProductCategoriesTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'product_categories'
    `);

    // If product_categories table doesn't exist, create it
    if (checkProductCategoriesTable.rows.length === 0) {
      console.log('Creating product_categories table...');
      await pool.query(`
        CREATE TABLE product_categories (
          id serial PRIMARY KEY,
          name text NOT NULL,
          description text,
          parent_id integer,
          created_at timestamp with time zone DEFAULT now() NOT NULL
        )
      `);
      console.log('Created product_categories table');
    } else {
      console.log('product_categories table already exists');
    }

    // Create other marketplace tables

    // 1. Check if support_tickets table exists
    const checkSupportTicketsTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'support_tickets'
    `);

    // If support_tickets table doesn't exist, create it
    if (checkSupportTicketsTable.rows.length === 0) {
      console.log('Creating support_tickets table...');
      await pool.query(`
        CREATE TABLE support_tickets (
          id serial PRIMARY KEY,
          subject text NOT NULL,
          description text NOT NULL,
          status text DEFAULT 'open' NOT NULL,
          priority text DEFAULT 'medium' NOT NULL,
          user_id integer NOT NULL,
          order_id integer,
          product_id integer,
          seller_id integer,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now()
        )
      `);
      console.log('Created support_tickets table');
    } else {
      console.log('support_tickets table already exists');
    }

    // 2. Check if ticket_messages table exists
    const checkTicketMessagesTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'ticket_messages'
    `);

    // If ticket_messages table doesn't exist, create it
    if (checkTicketMessagesTable.rows.length === 0) {
      console.log('Creating ticket_messages table...');
      await pool.query(`
        CREATE TABLE ticket_messages (
          id serial PRIMARY KEY,
          content text NOT NULL,
          ticket_id integer NOT NULL,
          user_id integer NOT NULL,
          is_from_support boolean DEFAULT false NOT NULL,
          created_at timestamp with time zone DEFAULT now() NOT NULL
        )
      `);
      console.log('Created ticket_messages table');
    } else {
      console.log('ticket_messages table already exists');
    }

    // 3. Add product_reviews table
    const checkProductReviewsTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'product_reviews'
    `);

    // If product_reviews table doesn't exist, create it
    if (checkProductReviewsTable.rows.length === 0) {
      console.log('Creating product_reviews table...');
      await pool.query(`
        CREATE TABLE product_reviews (
          id serial PRIMARY KEY,
          rating integer NOT NULL,
          comment text,
          product_id integer NOT NULL,
          user_id integer NOT NULL,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now()
        )
      `);
      console.log('Created product_reviews table');
    } else {
      console.log('product_reviews table already exists');
    }

    // 4. Add seller_id column to products table if it doesn't exist
    const checkSellerIdColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'seller_id'
    `);

    if (checkSellerIdColumn.rows.length === 0) {
      console.log('Adding seller_id column to products table...');
      await pool.query(`
        ALTER TABLE products 
        ADD COLUMN seller_id integer
      `);
      console.log('Added seller_id column to products table');
    } else {
      console.log('seller_id column already exists in products table');
    }

    // 5. Create index for improved query performance
    console.log('Creating indexes for improved query performance...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS users_organization_id_idx ON users(organization_id);
      CREATE INDEX IF NOT EXISTS organizations_type_idx ON organizations(type);
      CREATE INDEX IF NOT EXISTS sellers_organization_id_idx ON sellers(organization_id);
    `);

    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS products_seller_id_idx ON products(seller_id);
      `);
      console.log('Created products_seller_id_idx index');
    } catch (indexError) {
      console.warn(
        'Could not create products_seller_id_idx index:',
        indexError.message
      );
    }
    console.log('Created indexes');

    // Create a default corporate organization if none exists
    const checkCorporateOrg = await pool.query(`
      SELECT id FROM organizations WHERE type = 'corporate' LIMIT 1
    `);

    if (checkCorporateOrg.rows.length === 0) {
      console.log('Creating default corporate organization...');
      await pool.query(`
        INSERT INTO organizations (name, type, status)
        VALUES ('ThrivioHR Corporate', 'corporate', 'active')
      `);
      console.log('Created default corporate organization');
    } else {
      console.log('Corporate organization already exists');
    }

    // Update existing admin user to be a corporate admin
    const adminUser = await pool.query(`
      SELECT id FROM users WHERE email = 'admin@demo.io' LIMIT 1
    `);

    if (adminUser.rows.length > 0) {
      const corporateOrg = await pool.query(`
        SELECT id FROM organizations WHERE type = 'corporate' LIMIT 1
      `);

      if (corporateOrg.rows.length > 0) {
        console.log('Updating admin user to corporate admin role...');
        await pool.query(
          `
          UPDATE users
          SET role_type = 'corporate_admin',
              organization_id = $1
          WHERE id = $2
        `,
          [corporateOrg.rows[0].id, adminUser.rows[0].id]
        );
        console.log('Updated admin user to corporate admin role');
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
