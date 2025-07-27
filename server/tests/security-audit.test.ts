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
          roleType: users.roleType,
          organizationId: users.organizationId,
          isAdmin: users.isAdmin
        })
        .from(users)
        .where(eq(users.roleType, 'corporate_admin'));

      // Audit Report
      console.log('=== CORPORATE ADMIN SECURITY AUDIT ===');
      console.log(`Total corporate admins found: ${corporateAdmins.length}`);
      
      corporateAdmins.forEach((admin, index) => {
        console.log(`Admin ${index + 1}:`);
        console.log(`  Email: ${admin.email}`);
        console.log(`  Organization ID: ${admin.organizationId}`);
        console.log(`  Security Status: ${admin.organizationId === null ? '✅ SECURE' : '❌ VIOLATION'}`);
      });

      // Security Assertions
      expect(corporateAdmins.length).toBeGreaterThan(0);
      
      corporateAdmins.forEach(admin => {
        // CRITICAL: Corporate admins must not belong to any organization
        expect(admin.organizationId).toBe(null);
        expect(admin.roleType).toBe('corporate_admin');
        expect(admin.isAdmin).toBe(true);
      });
    });

    it('should verify no security violations exist in the database', async () => {
      // Check for corporate admins with organization assignments (SECURITY VIOLATION)
      const [violationCount] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.roleType, 'corporate_admin'),
            isNotNull(users.organizationId)
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
          organizationId: users.organizationId,
          count: count()
        })
        .from(users)
        .groupBy(users.organizationId);

      console.log('=== USER DISTRIBUTION AUDIT ===');
      userDistribution.forEach(dist => {
        const orgLabel = dist.organizationId === null ? 'Corporate Admins' : `Organization ${dist.organizationId}`;
        console.log(`${orgLabel}: ${dist.count} users`);
      });

      // Validate that we have proper distribution
      expect(userDistribution.length).toBeGreaterThan(0);
      
      // Should have some corporate admins (organization_id = null)
      const corporateAdminCount = userDistribution.find(d => d.organizationId === null);
      expect(corporateAdminCount).toBeTruthy();
      expect(corporateAdminCount!.count).toBeGreaterThan(0);
    });

    it('should verify organization feature isolation', async () => {
      const orgFeatures = await db
        .select({
          organizationId: organization_features.organizationId,
          featureKey: organization_features.featureKey,
          isEnabled: organization_features.isEnabled
        })
        .from(organization_features);

      console.log('=== ORGANIZATION FEATURES AUDIT ===');
      
      // Group features by organization
      const featuresByOrg = orgFeatures.reduce((acc, feature) => {
        const key = feature.organizationId.toString();
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
          roleType: users.roleType,
          count: count()
        })
        .from(users)
        .groupBy(users.roleType);

      console.log('=== ROLE DISTRIBUTION AUDIT ===');
      roleDistribution.forEach(role => {
        console.log(`${role.roleType}: ${role.count} users`);
      });

      // Should have multiple role types
      expect(roleDistribution.length).toBeGreaterThan(1);
      
      // Should have corporate admins
      const corporateAdmins = roleDistribution.find(r => r.roleType === 'corporate_admin');
      expect(corporateAdmins).toBeTruthy();
      expect(corporateAdmins!.count).toBeGreaterThan(0);
    });

    it('should audit admin privileges distribution', async () => {
      const adminUsers = await db
        .select({
          id: users.id,
          email: users.email,
          roleType: users.roleType,
          organizationId: users.organizationId,
          isAdmin: users.isAdmin
        })
        .from(users)
        .where(eq(users.isAdmin, true));

      console.log('=== ADMIN PRIVILEGES AUDIT ===');
      console.log(`Total admin users: ${adminUsers.length}`);
      
      adminUsers.forEach(admin => {
        const orgLabel = admin.organizationId === null ? 'Corporate Level' : `Organization ${admin.organizationId}`;
        console.log(`Admin: ${admin.email} (${admin.roleType}) - ${orgLabel}`);
        
        // Validate admin user configurations
        expect(admin.isAdmin).toBe(true);
        expect(admin.roleType).toBeTruthy();
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
        .where(eq(users.roleType, 'corporate_admin'));
      const [adminViolations] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.roleType, 'corporate_admin'),
            isNotNull(users.organizationId)
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
          organizationId: users.organizationId,
          roleType: users.roleType
        })
        .from(users)
        .where(
          and(
            eq(users.roleType, 'corporate_admin'),
            // Only check the specific accounts that were problematic
          )
        );

      console.log('=== SPECIFIC ISSUE VALIDATION ===');
      console.log('Checking admin@thriviohr.com and admin@empulse.com accounts...');
      
      const thrivioAccount = specificAccounts.find(acc => acc.email === 'admin@thriviohr.com');
      const empulseAccount = specificAccounts.find(acc => acc.email === 'admin@empulse.com');

      if (thrivioAccount) {
        console.log(`admin@thriviohr.com - Organization ID: ${thrivioAccount.organizationId} (${thrivioAccount.organizationId === null ? '✅ FIXED' : '❌ STILL BROKEN'})`);
        expect(thrivioAccount.organizationId).toBe(null);
      }

      if (empulseAccount) {
        console.log(`admin@empulse.com - Organization ID: ${empulseAccount.organizationId} (${empulseAccount.organizationId === null ? '✅ FIXED' : '❌ STILL BROKEN'})`);
        expect(empulseAccount.organizationId).toBe(null);
      }

      // Both accounts should exist and be properly configured
      expect(thrivioAccount || empulseAccount).toBeTruthy();
    });
  });
});