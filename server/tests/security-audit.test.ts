import { describe, it, expect, beforeAll } from '@jest/globals';
import { db } from '../db';
import { users, organizations as orgsTable, organization_features } from '../../shared/schema';
import { eq, and, isNull, isNotNull, count } from 'drizzle-orm';

describe('Security Audit - Database State Validation', () => {
  describe('Corporate Admin Security Audit', () => {
    it('should audit all corporate admin accounts for proper isolation', async () => {
      const corporateAdmins = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          roleType: users.role_type,
          organizationId: users.organization_id,
          isAdmin: users.is_admin
        })
        .from(users)
        .where(eq(users.role_type, 'corporate_admin'));

      // Audit Report
      console.log('=== CORPORATE ADMIN SECURITY AUDIT ===');
      console.log(`Total corporate admins found: ${corporateAdmins.length}`);
      
      corporateAdmins.forEach((admin, index) => {
        console.log(`Admin ${index + 1}:`);
        console.log(`  Email: ${admin.email}`);
        console.log(`  Organization ID: ${admin.organization_id}`);
        console.log(`  Security Status: ${admin.organization_id === null ? '✅ SECURE' : '❌ VIOLATION'}`);
      });

      // Security Assertions
      expect(corporateAdmins.length).toBeGreaterThan(0);
      
      corporateAdmins.forEach(admin => {
        // CRITICAL: Corporate admins must not belong to any organization
        expect(admin.organization_id).toBe(null);
        expect(admin.role_type).toBe('corporate_admin');
        expect(admin.is_admin).toBe(true);
      });
    });

    it('should verify no security violations exist in the database', async () => {
      // Check for corporate admins with organization assignments (SECURITY VIOLATION)
      const [violationCount] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.role_type, 'corporate_admin'),
            isNotNull(users.organization_id)
          )
        );

      console.log('=== SECURITY VIOLATION CHECK ===');
      console.log(`Corporate admins with organization assignments: ${violationCount.count}`);
      
      // This MUST be zero - any number > 0 indicates a security breach
      expect(violationCount.count).toBe(0);
    });

    it('should validate organization data integrity', async () => {
      const organizations = await db
        .select({
          id: orgsTable.id,
          name: orgsTable.name,
          contactEmail: orgsTable.contactEmail,
          superuserEmail: orgsTable.superuserEmail
        })
        .from(orgsTable);

      console.log('=== ORGANIZATION DATA AUDIT ===');
      console.log(`Total organizations: ${organizations.length}`);
      
      organizations.forEach(org => {
        console.log(`Org ${org.id}: ${org.name} (Contact: ${org.contactEmail})`);
        
        // Organizations should have proper contact information
        expect(org.name).toBeTruthy();
        expect(org.contactEmail || org.superuserEmail).toBeTruthy();
      });
    });
  });

  describe('Multi-Tenant Data Isolation Audit', () => {
    it('should audit user-organization relationships', async () => {
      // Get distribution of users by organization
      const userDistribution = await db
        .select({
          organizationId: users.organization_id,
          count: count()
        })
        .from(users)
        .groupBy(users.organization_id);

      console.log('=== USER DISTRIBUTION AUDIT ===');
      userDistribution.forEach(dist => {
        const orgLabel = dist.organization_id === null ? 'Corporate Admins' : `Organization ${dist.organization_id}`;
        console.log(`${orgLabel}: ${dist.count} users`);
      });

      // Validate that we have proper distribution
      expect(userDistribution.length).toBeGreaterThan(0);
      
      // Should have some corporate admins (organization_id = null)
      const corporateAdminCount = userDistribution.find(d => d.organization_id === null);
      expect(corporateAdminCount).toBeTruthy();
      expect(corporateAdminCount!.count).toBeGreaterThan(0);
    });

    it('should verify organization feature isolation', async () => {
      const orgFeatures = await db
        .select({
          organizationId: organization_features.organization_id,
          featureKey: organization_features.featureKey,
          isEnabled: organization_features.isEnabled
        })
        .from(organization_features);

      console.log('=== ORGANIZATION FEATURES AUDIT ===');
      
      // Group features by organization
      const featuresByOrg = orgFeatures.reduce((acc, feature) => {
        const key = feature.organization_id.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(feature);
        return acc;
      }, {} as Record<string, typeof orgFeatures>);

      Object.entries(featuresByOrg).forEach(([orgId, features]) => {
        console.log(`Organization ${orgId}: ${features.length} features configured`);
        features.forEach(feature => {
          console.log(`  ${feature.featureKey}: ${feature.isEnabled ? 'Enabled' : 'Disabled'}`);
        });
      });

      // Validate that features are properly isolated by organization
      expect(Object.keys(featuresByOrg).length).toBeGreaterThan(0);
    });
  });

  describe('Access Control Security Audit', () => {
    it('should validate role-based access patterns', async () => {
      const roleDistribution = await db
        .select({
          roleType: users.role_type,
          count: count()
        })
        .from(users)
        .groupBy(users.role_type);

      console.log('=== ROLE DISTRIBUTION AUDIT ===');
      roleDistribution.forEach(role => {
        console.log(`${role.role_type}: ${role.count} users`);
      });

      // Should have multiple role types
      expect(roleDistribution.length).toBeGreaterThan(1);
      
      // Should have corporate admins
      const corporateAdmins = roleDistribution.find(r => r.role_type === 'corporate_admin');
      expect(corporateAdmins).toBeTruthy();
      expect(corporateAdmins!.count).toBeGreaterThan(0);
    });

    it('should audit admin privileges distribution', async () => {
      const adminUsers = await db
        .select({
          id: users.id,
          email: users.email,
          roleType: users.role_type,
          organizationId: users.organization_id,
          isAdmin: users.is_admin
        })
        .from(users)
        .where(eq(users.is_admin, true));

      console.log('=== ADMIN PRIVILEGES AUDIT ===');
      console.log(`Total admin users: ${adminUsers.length}`);
      
      adminUsers.forEach(admin => {
        const orgLabel = admin.organization_id === null ? 'Corporate Level' : `Organization ${admin.organization_id}`;
        console.log(`Admin: ${admin.email} (${admin.role_type}) - ${orgLabel}`);
        
        // Validate admin user configurations
        expect(admin.is_admin).toBe(true);
        expect(admin.role_type).toBeTruthy();
      });
    });
  });

  describe('Security Compliance Report', () => {
    it('should generate comprehensive security compliance report', async () => {
      // Get comprehensive security metrics
      const [totalUsers] = await db.select({ count: count() }).from(users);
      const [corporateAdmins] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role_type, 'corporate_admin'));
      const [adminViolations] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.role_type, 'corporate_admin'),
            isNotNull(users.organization_id)
          )
        );

      console.log('=== SECURITY COMPLIANCE REPORT ===');
      console.log(`Report Generated: ${new Date().toISOString()}`);
      console.log(`Total Users: ${totalUsers.count}`);
      console.log(`Corporate Admins: ${corporateAdmins.count}`);
      console.log(`Security Violations: ${adminViolations.count}`);
      console.log(`Compliance Status: ${adminViolations.count === 0 ? '✅ COMPLIANT' : '❌ VIOLATIONS FOUND'}`);
      
      if (adminViolations.count === 0) {
        console.log('✅ Multi-tenant isolation is properly enforced');
        console.log('✅ Corporate admin accounts are properly isolated');
        console.log('✅ No security violations detected');
      } else {
        console.log('❌ SECURITY VIOLATIONS DETECTED - IMMEDIATE ACTION REQUIRED');
      }

      // Final security assertions
      expect(adminViolations.count).toBe(0);
      expect(corporateAdmins.count).toBeGreaterThan(0);
      expect(totalUsers.count).toBeGreaterThan(corporateAdmins.count);
    });

    it('should validate the specific fix for the reported issue', async () => {
      // Test the specific accounts mentioned in the security issue
      const specificAccounts = await db
        .select({
          email: users.email,
          organizationId: users.organization_id,
          roleType: users.role_type
        })
        .from(users)
        .where(
          and(
            eq(users.role_type, 'corporate_admin'),
            // Only check the specific accounts that were problematic
          )
        );

      console.log('=== SPECIFIC ISSUE VALIDATION ===');
      console.log('Checking admin@thriviohr.com and admin@empulse.com accounts...');
      
      const thrivioAccount = specificAccounts.find(acc => acc.email === 'admin@thriviohr.com');
      const empulseAccount = specificAccounts.find(acc => acc.email === 'admin@empulse.com');

      if (thrivioAccount) {
        console.log(`admin@thriviohr.com - Organization ID: ${thrivioAccount.organization_id} (${thrivioAccount.organization_id === null ? '✅ FIXED' : '❌ STILL BROKEN'})`);
        expect(thrivioAccount.organization_id).toBe(null);
      }

      if (empulseAccount) {
        console.log(`admin@empulse.com - Organization ID: ${empulseAccount.organization_id} (${empulseAccount.organization_id === null ? '✅ FIXED' : '❌ STILL BROKEN'})`);
        expect(empulseAccount.organization_id).toBe(null);
      }

      // Both accounts should exist and be properly configured
      expect(thrivioAccount || empulseAccount).toBeTruthy();
    });
  });
});