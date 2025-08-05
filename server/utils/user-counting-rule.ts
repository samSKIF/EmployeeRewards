// BUSINESS RULE: Consistent User Counting for Credit Usage
// Users counted in credit usage = active + pending (exclude super admins, inactive, terminated)

export interface UserCountingRule {
  includedStatuses: string[];
  excludedRoles: string[];
  excludedAdminScopes: string[];
}

// Business rule definition
export const CREDIT_USAGE_COUNTING_RULE: UserCountingRule = {
  includedStatuses: ['active', 'pending'],
  excludedRoles: ['corporate_admin'],
  excludedAdminScopes: ['super']
};

export function getCreditableUserCount(users: any[]): number {
  return users.filter(user => 
    // Include: active + pending only
    CREDIT_USAGE_COUNTING_RULE.includedStatuses.includes(user.status || 'active') &&
    // Exclude: super admin main accounts
    !CREDIT_USAGE_COUNTING_RULE.excludedRoles.includes(user.role_type) &&
    user.admin_scope !== 'super'
  ).length;
}

export function getCreditableUsers(users: any[]): any[] {
  return users.filter(user => 
    CREDIT_USAGE_COUNTING_RULE.includedStatuses.includes(user.status || 'active') &&
    !CREDIT_USAGE_COUNTING_RULE.excludedRoles.includes(user.role_type) &&
    user.admin_scope !== 'super'
  );
}

export function validateUserCountConsistency(
  corporateCount: number, 
  organizationCount: number, 
  tolerance: number = 0
): { isConsistent: boolean; discrepancy: number } {
  const discrepancy = Math.abs(corporateCount - organizationCount);
  return {
    isConsistent: discrepancy <= tolerance,
    discrepancy
  };
}