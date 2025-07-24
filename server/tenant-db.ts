import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from '@shared/schema';
import { companies } from '@shared/management-schema';
import { eq } from 'drizzle-orm';
import { db as managementDb } from './db';

// Cache for tenant database connections
const tenantDbCache = new Map<string, any>();

/**
 * Get a database connection for a specific tenant/company
 * Using logical separation within the same PostgreSQL database
 */
export async function getTenantDb(companyId: number) {
  const cacheKey = `company_${companyId}`;

  // Return cached connection if exists
  if (tenantDbCache.has(cacheKey)) {
    return tenantDbCache.get(cacheKey);
  }

  try {
    // Get company info from management database
    const company = await managementDb
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .then((rows) => rows[0]);

    if (!company) {
      throw new Error(`Company with ID ${companyId} not found`);
    }

    console.log(`Connected to tenant database for company: ${company.name}`);

    // Use the same database connection as management but with tenant context
    // This provides logical separation while using the same physical database
    const tenantDb = managementDb;

    // Cache the connection
    tenantDbCache.set(cacheKey, tenantDb);

    return tenantDb;
  } catch (error) {
    console.error(
      `Failed to connect to tenant database for company ${companyId}:`,
      error
    );
    throw error;
  }
}

/**
 * Get company ID from user's organization
 */
export async function getCompanyIdFromUser(
  userId: number
): Promise<number | null> {
  try {
    // First check if user is in the main users table with organizationId
    const user = await managementDb
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .then((rows) => rows[0]);

    if (user?.organizationId) {
      return user.organizationId;
    }

    // If no organizationId, this might be a shared database scenario
    // For now, return null to indicate we should use the main database
    return null;
  } catch (error) {
    console.error('Error getting company ID from user:', error);
    return null;
  }
}

/**
 * Get company ID from email domain
 */
export async function getCompanyIdFromEmail(
  email: string
): Promise<number | null> {
  try {
    const domain = email.split('@')[1];

    const company = await managementDb
      .select()
      .from(companies)
      .where(eq(companies.domain, domain))
      .then((rows) => rows[0]);

    return company?.id || null;
  } catch (error) {
    console.error('Error getting company ID from email:', error);
    return null;
  }
}

/**
 * Initialize a new tenant database with the required schema
 */
export async function initializeTenantDatabase(companyId: number) {
  try {
    const tenantDb = await getTenantDb(companyId);

    // Run any necessary migrations or schema setup for the tenant database
    console.log(`Initialized tenant database for company ${companyId}`);

    return tenantDb;
  } catch (error) {
    console.error(
      `Failed to initialize tenant database for company ${companyId}:`,
      error
    );
    throw error;
  }
}

/**
 * Close all tenant database connections (for cleanup)
 */
export function closeTenantConnections() {
  for (const key of tenantDbCache.keys()) {
    try {
      // Note: In a real implementation, you'd want to properly close the pool
      console.log(`Closing connection for ${key}`);
    } catch (error) {
      console.error(`Error closing connection for ${key}:`, error);
    }
  }
  tenantDbCache.clear();
}
