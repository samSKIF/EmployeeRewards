# ThrivioHR Coding Standards

## File Size Standards (MANDATORY)

### 🎯 Perfect Ideal File Sizes

#### React Components (.tsx)
- **Maximum**: 200 lines
- **Ideal**: 100-150 lines
- **Rule**: Single responsibility, focused functionality

#### Backend Files (.ts)
- **Maximum**: 300 lines
- **Ideal**: 150-250 lines
- **Rule**: One domain per file

#### Schema Files
- **Maximum**: 200 lines
- **Ideal**: 100-150 lines per domain
- **Rule**: Split by business domain

#### Test Files
- **Maximum**: 300 lines
- **Ideal**: 200-250 lines
- **Rule**: One test file per source file

#### Utility Files
- **Maximum**: 150 lines
- **Ideal**: 50-100 lines
- **Rule**: Related functions only

### 🚫 Enforcement Rules

1. **Pre-commit Hook**: Files exceeding limits will be rejected
2. **Code Review**: Any file >150 lines requires justification
3. **ESLint Rule**: Automatic warnings at 150+ lines
4. **CI/CD**: Build fails if any file exceeds 200 lines

### 📏 How to Measure

```bash
# Check file sizes
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn

# Files over 200 lines (will fail CI)
find . -name "*.ts" -o -name "*.tsx" -exec wc -l {} + | awk '$1 > 200'
```

## Component Splitting Guidelines

### When to Split
1. **Size**: >150 lines
2. **Responsibilities**: >2 concerns
3. **Props**: >10 props
4. **State**: >5 state variables

### How to Split

#### Large Page Components
```typescript
// ❌ BAD: admin-employees.tsx (1947 lines)
export default function AdminEmployees() {
  // 1947 lines of mixed concerns
}

// ✅ GOOD: Split into focused components
// AdminEmployeesPage.tsx (100 lines)
// EmployeeList.tsx (150 lines)
// EmployeeFilters.tsx (80 lines)
// BulkActions.tsx (120 lines)
// CreateEmployeeForm.tsx (180 lines)
```

#### Backend Services
```typescript
// ❌ BAD: storage.ts (2548 lines)
export class Storage {
  // All database operations
}

// ✅ GOOD: Domain-specific services
// user-storage.ts (200 lines)
// organization-storage.ts (180 lines)
// leave-storage.ts (220 lines)
// recognition-storage.ts (150 lines)
```

## Testing Requirements

### 100% Function Coverage Rule
- **Every function must have tests**
- **Every component must have tests**
- **Every API endpoint must have tests**
- **No untested code in production**

### Test Structure
```typescript
// ComponentName.test.tsx
describe('ComponentName', () => {
  describe('Rendering', () => {
    // Render tests
  });
  
  describe('User Interactions', () => {
    // Event tests
  });
  
  describe('API Integration', () => {
    // API tests
  });
  
  describe('Edge Cases', () => {
    // Error handling
  });
});
```

## Architecture Principles

### Single Responsibility
- One component = one responsibility
- One file = one domain
- One function = one task

### Composition Over Inheritance
```typescript
// ✅ GOOD: Compose smaller components
const AdminPage = () => (
  <div>
    <Header />
    <Filters />
    <DataTable />
    <Actions />
  </div>
);
```

### Dependency Injection
```typescript
// ✅ GOOD: Inject dependencies
interface UserService {
  getUsers(): Promise<User[]>;
}

const UserList = ({ userService }: { userService: UserService }) => {
  // Component logic
};
```

## Naming Conventions

### Files
- **Components**: PascalCase.tsx (`UserProfile.tsx`)
- **Services**: kebab-case.ts (`user-service.ts`)
- **Tests**: ComponentName.test.tsx
- **Types**: kebab-case.types.ts

### Functions
- **Components**: PascalCase (`UserProfile`)
- **Hooks**: camelCase starting with `use` (`useUserData`)
- **Services**: camelCase (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)

## Import Organization

```typescript
// 1. External libraries
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal components
import { Button } from '@/components/ui/button';

// 3. Local imports
import { UserService } from './user-service';
import { UserTypes } from './user.types';
```

## Error Handling Standards

### Components
```typescript
const UserProfile = () => {
  const { data, error, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorBoundary error={error} />;
  
  return <UserDisplay user={data} />;
};
```

### Services
```typescript
export const userService = {
  async getUser(id: string): Promise<User> {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get user', { id, error });
      throw new UserNotFoundError(`User ${id} not found`);
    }
  }
};
```

## Performance Standards

### Component Optimization
```typescript
// Use memo for expensive calculations
const expensiveValue = useMemo(() => 
  heavyCalculation(data), [data]
);

// Use callback for event handlers
const handleClick = useCallback(() => {
  // Handler logic
}, [dependency]);

// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### Bundle Size Limits
- **Individual chunks**: <500KB
- **Total bundle**: <2MB
- **First contentful paint**: <2s

## Security Standards

### Input Validation
```typescript
// ✅ GOOD: Validate all inputs
const createUser = (userData: unknown): User => {
  const validatedData = userSchema.parse(userData);
  return userService.create(validatedData);
};
```

### SQL Injection Prevention
```typescript
// ✅ GOOD: Use parameterized queries
db.select().from(users).where(eq(users.id, userId));

// ❌ BAD: String concatenation
db.execute(`SELECT * FROM users WHERE id = ${userId}`);
```

## Documentation Requirements

### Component Documentation
```typescript
/**
 * UserProfile component displays user information and edit capabilities
 * 
 * @param user - User object containing profile data
 * @param onEdit - Callback fired when edit button is clicked
 * @param isEditable - Whether the profile can be edited
 * 
 * @example
 * <UserProfile 
 *   user={currentUser} 
 *   onEdit={handleEdit}
 *   isEditable={true}
 * />
 */
```

### API Documentation
```typescript
/**
 * Creates a new user in the system
 * 
 * @param userData - User data to create
 * @returns Promise resolving to created user
 * @throws UserValidationError when data is invalid
 * @throws UserExistsError when email already exists
 */
```

## Git Commit Standards

### Commit Message Format
```
type(scope): description

feat(auth): add password reset functionality
fix(ui): resolve button spacing issue
refactor(storage): split user storage into separate file
test(api): add integration tests for user endpoints
```

### Pre-commit Checks
1. File size validation
2. Lint checks
3. Test coverage >80%
4. Type checking
5. Security scan

## Review Checklist

### Code Review Requirements
- [ ] No file exceeds 200 lines
- [ ] All functions have tests
- [ ] Single responsibility maintained
- [ ] Proper error handling
- [ ] Performance optimizations
- [ ] Security considerations
- [ ] Documentation complete

### Architecture Review
- [ ] Follows domain separation
- [ ] Uses composition patterns
- [ ] Proper dependency injection
- [ ] Scalable structure
- [ ] Maintainable code

## Tooling Setup

### ESLint Configuration
```json
{
  "rules": {
    "max-lines": ["error", 200],
    "max-lines-per-function": ["error", 50],
    "complexity": ["error", 10]
  }
}
```

### Pre-commit Hook
```bash
#!/bin/sh
# Check file sizes
find . -name "*.ts" -o -name "*.tsx" -exec wc -l {} + | awk '$1 > 200 {print "File " $2 " exceeds 200 lines: " $1; exit 1}'
```

These standards ensure code quality, maintainability, and prevent the creation of oversized files that harm developer productivity.