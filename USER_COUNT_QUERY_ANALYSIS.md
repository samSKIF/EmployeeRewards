# User Count Query Analysis for Canva Organization

## Executive Summary
Found **INCONSISTENT** SQL syntax patterns across the three user count locations. Different queries use different methods to count users, leading to potential data discrepancies.

## Query Analysis Results

### 1. Employee Directory (server/routes/adminRoutes.ts - Line 33-34)
**Location:** `/api/admin/usage-stats`
```sql
COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_employees,
COUNT(CASE WHEN u.status IN ('active', 'pending') THEN 1 END) as billable_employees,
COUNT(u.id) as total_employees
```
**Pattern:** `CASE WHEN ... THEN 1 END` syntax
**Scope:** Organization-scoped (WHERE o.id = $1)

### 2. Corporate Organizations (server/management-routes.ts - Line 243-246)  
**Location:** `/api/management/organizations`
```sql
SELECT organization_id, COUNT(*) as user_count 
FROM users 
WHERE status IN ('active', 'pending')
GROUP BY organization_id
```
**Pattern:** `COUNT(*)` with simple WHERE filter
**Scope:** All organizations grouped

### 3. Subscription Management (server/routes/subscriptionRoutes.ts - Line 42-47)
**Location:** `/api/admin/subscription/usage`  
```sql
COUNT(*) as total_employees,
COUNT(CASE WHEN status = 'active' THEN 1 END) as active_employees,
COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_employees,
COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END) as billable_employees
```
**Pattern:** Mix of `COUNT(*)` and `CASE WHEN ... THEN 1 END` syntax
**Scope:** Organization-scoped (WHERE organization_id = $1)

## 🔍 INCONSISTENCIES IDENTIFIED

### Syntax Pattern Issues:
1. **Employee Directory** uses: `COUNT(CASE WHEN u.status = 'active' THEN 1 END)`
2. **Corporate Organizations** uses: `COUNT(*)` with `WHERE status IN ('active', 'pending')`  
3. **Subscription Management** uses: `COUNT(CASE WHEN status = 'active' THEN 1 END)`

### Table Alias Issues:
- Employee Directory uses `u.status` (with alias)
- Corporate Organizations uses `status` (no alias)
- Subscription Management uses `status` (no alias)

### Filter Scope Issues:
- Employee Directory: Gets ONE organization (WHERE o.id = $1)
- Corporate Organizations: Gets ALL organizations (GROUP BY organization_id)
- Subscription Management: Gets ONE organization (WHERE organization_id = $1)

## 📊 CURRENT DATA RESULTS
Based on test run for Canva (Organization ID 1):

- **Employee Directory (usage-stats)**: 402 billable users
- **Corporate Organizations**: 404 total platform users  
- **Subscription Management**: 402 billable users

**Expected Result**: All three should return the same count for Canva organization.

## 🎯 STANDARDIZATION RECOMMENDATIONS

### Recommended Standard Syntax:
```sql
-- Standard pattern for all user counting queries
COUNT(CASE WHEN users.status IN ('active', 'pending') THEN 1 END) as billable_users
FROM users 
WHERE organization_id = $1
```

### Benefits of Standardization:
1. **Consistent Results** - All endpoints return identical counts
2. **Maintainable Code** - Single pattern across codebase  
3. **Clear Business Logic** - Explicit status filtering
4. **Null Safety** - CASE WHEN handles nulls properly
5. **Performance** - Consistent query execution plans

## 🔧 REQUIRED FIXES

1. **Standardize all queries** to use `CASE WHEN ... THEN 1 END` pattern
2. **Use consistent table aliases** (recommend `users` or `u`)
3. **Ensure identical status filters** across all queries
4. **Add comments** explaining business rules for user counting
5. **Create test suite** to verify query consistency