/**
 * This migration adds the subscription management table
 * and updates the organizations table to include currentSubscriptionId
 */

import { pool } from './db';

async function runSubscriptionMigration() {
  const client = await pool.connect();

  try {
    console.log('Starting subscription migration...');

    // Create subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        last_payment_date TIMESTAMP NOT NULL,
        subscription_period VARCHAR NOT NULL CHECK (subscription_period IN ('quarter', 'year', 'custom')),
        custom_duration_days INTEGER,
        expiration_date TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    console.log('✓ Created subscriptions table');

    // Add currentSubscriptionId to organizations table if it doesn't exist
    await client.query(`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS current_subscription_id INTEGER REFERENCES subscriptions(id);
    `);

    console.log('✓ Added current_subscription_id to organizations table');

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_expiration_date ON subscriptions(expiration_date);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_is_active ON subscriptions(is_active);
    `);

    console.log('✓ Created indexes for subscriptions');

    console.log('Subscription migration completed successfully!');
  } catch (error) {
    console.error('Subscription migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
runSubscriptionMigration()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

export { runSubscriptionMigration };
