# File Size Analysis & Standards for ThrivioHR

## Current Large Files (Lines of Code)

### 🚨 Critical - Immediate Split Needed (>2000 lines)
1. **admin-employees-groups.tsx** - 2,559 lines
   - Contains: Employee list, group management, bulk actions, filters
   - Should split into: EmployeeList, GroupManagement, BulkActions, Filters components

2. **server/storage.ts** - 2,548 lines  
   - Contains: All database operations (users, orgs, leaves, recognition, social)
   - Should split into: user-storage.ts, org-storage.ts, leave-storage.ts, etc.

3. **admin/leave-management.tsx** - 2,529 lines
   - Contains: Leave requests, approvals, calendar, reports
   - Should split into: LeaveRequests, LeaveApprovals, LeaveCalendar components

4. **hr-config.tsx** - 2,047 lines
   - Contains: Multiple HR configuration sections
   - Should split by feature area

5. **shared/schema.ts** - 2,040 lines
   - Contains: All database schemas
   - Should split into: user-schema.ts, org-schema.ts, leave-schema.ts, etc.

6. **management-dashboard.tsx** - 2,030 lines
   - Contains: Corporate admin dashboard with multiple sections
   - Should split into: Analytics, Organizations, Users, Settings components

### ⚠️ High Priority - Split Soon (1000-2000 lines)
7. **admin-employees.tsx** - 1,947 lines
8. **CreateOrganization.tsx** - 1,499 lines
9. **leave-management.tsx** - 1,291 lines
10. **admin-survey-creator.tsx** - 1,277 lines
11. **space-detail.tsx** - 1,096 lines

### 📋 Medium Priority (500-1000 lines)
12. **admin/shop-config.tsx** - 978 lines
13. **admin-survey-editor.tsx** - 974 lines
14. **recognition-analytics.tsx** - 948 lines
15. **microservices/interests/index.ts** - 938 lines
16. **updated-profile-page.tsx** - 923 lines

## Gold Standards for File Sizes

### 📏 Recommended File Size Limits

#### React Components (.tsx)
- **Small Components**: 50-150 lines
  - Single responsibility, focused UI elements
  - Examples: Button, Input, Card components

- **Medium Components**: 150-300 lines
  - Feature components with local state
  - Examples: UserProfile, SearchBar, Modal components

- **Large Components**: 300-500 lines
  - Page-level components or complex features
  - Examples: Dashboard sections, Forms with validation

- **⚠️ Maximum Limit**: 500 lines
  - Beyond this, component should be split
  - Exception: Complex forms might reach 600-700 lines

#### Backend Files (.ts)
- **Utilities**: 100-200 lines
- **Route Files**: 200-400 lines
- **Service Files**: 300-500 lines
- **⚠️ Maximum Limit**: 600 lines
  - Storage/database files should be split by domain

#### Schema Files
- **Single Domain**: 100-300 lines
- **⚠️ Maximum Limit**: 400 lines per schema file

#### Test Files
- **Unit Tests**: 200-400 lines
- **Integration Tests**: 400-600 lines

### 🎯 Industry Best Practices

#### Google Style Guide Recommendations:
- **Maximum**: 500 lines per file
- **Ideal**: 200-300 lines for most files
- **Functions**: 30 lines max (with exceptions)

#### React Community Standards:
- **Components**: 300 lines max
- **Custom Hooks**: 100 lines max
- **Pages**: 500 lines max (split into sections)

#### Node.js Best Practices:
- **Route Files**: 400 lines max
- **Service Files**: 500 lines max
- **Models/Schemas**: 300 lines per domain

### 📊 ThrivioHR Current vs Target

| File Type | Current Avg | Target Max | Worst Offender |
|-----------|------------|------------|----------------|
| Components | 800 lines | 500 lines | 2,559 lines |
| Pages | 1,200 lines | 500 lines | 2,559 lines |
| Backend | 900 lines | 600 lines | 2,548 lines |
| Schemas | 2,040 lines | 400 lines | 2,040 lines |

### 🔧 Refactoring Strategy

#### Phase 1: Critical Files (Week 1-2)
1. Split `server/storage.ts` into 5 domain files
2. Split `shared/schema.ts` into 5 schema files
3. Break down `admin-employees-groups.tsx`

#### Phase 2: High Priority (Week 3-4)
1. Refactor large admin pages
2. Split management dashboard
3. Break down form components

#### Phase 3: Medium Priority (Week 5-6)
1. Optimize remaining 500+ line files
2. Extract common utilities
3. Create shared component library

### 🎯 Benefits of Proper File Sizes

#### Developer Experience:
- ✅ Easier to navigate and understand
- ✅ Faster IDE performance
- ✅ Reduced merge conflicts
- ✅ Better code reviews

#### Maintainability:
- ✅ Single responsibility principle
- ✅ Easier testing
- ✅ Better error isolation
- ✅ Improved reusability

#### Performance:
- ✅ Better tree-shaking
- ✅ Faster compilation
- ✅ Improved hot reload
- ✅ Smaller bundle chunks

### 📝 File Splitting Guidelines

#### When to Split a File:
1. **Size**: Exceeds recommended limits
2. **Complexity**: Multiple concerns/responsibilities
3. **Reusability**: Parts could be shared
4. **Testing**: Difficult to test as one unit

#### How to Split:
1. **By Feature**: Group related functionality
2. **By Layer**: Separate UI, logic, data
3. **By Domain**: Separate business areas
4. **By Type**: Group similar operations

#### Naming Conventions:
- `UserProfile.tsx` → `UserProfileForm.tsx`, `UserProfileDisplay.tsx`
- `storage.ts` → `user-storage.ts`, `organization-storage.ts`
- `schema.ts` → `user-schema.ts`, `leave-schema.ts`

### 🚀 Next Steps for ThrivioHR

1. **Immediate**: Split the 6 files over 2,000 lines
2. **Short-term**: Address 11 files over 1,000 lines  
3. **Long-term**: Establish 500-line maximum policy
4. **Tools**: Add ESLint rule for file size limits
5. **Process**: Code review checklist for file sizes