# Test-Driven Development Standards

## Overview

All new features, bug fixes, and improvements MUST include comprehensive tests. This document outlines mandatory testing practices for the ThrivioHR platform.

## Testing Requirements

### 1. Test-First Development
- Write tests BEFORE implementing functionality
- Every new API endpoint requires corresponding test coverage
- UI components must have behavior tests
- Database operations require integration tests

### 2. Coverage Requirements
- **Minimum 70% code coverage** (enforced by Jest configuration)
- **100% coverage for critical business logic** (authentication, payments, user management)
- **Integration tests for all API endpoints**
- **Component tests for all React components with user interactions**

### 3. Test Categories

#### Backend Tests
```typescript
// API Endpoint Tests
describe('API: /api/users', () => {
  it('should return filtered users by organization', async () => {
    // Test implementation
  });
});

// Database Operation Tests  
describe('Storage: getUsersByOrganization', () => {
  it('should enforce organization isolation', async () => {
    // Test implementation
  });
});

// Business Logic Tests
describe('SubscriptionService', () => {
  it('should validate user limits correctly', async () => {
    // Test implementation
  });
});
```

#### Frontend Tests
```typescript
// Component Behavior Tests
describe('SubscriptionManagement', () => {
  it('should collapse renewal section when subscription is active', () => {
    // Test implementation
  });
});

// Integration Tests
describe('Management Dashboard Integration', () => {
  it('should handle complete organization workflow', () => {
    // Test implementation
  });
});
```

## Implementation Process

### For New Features
1. **Write failing test first** - Define expected behavior
2. **Implement minimum code** to make test pass
3. **Refactor** while keeping tests green
4. **Add edge case tests** for error handling
5. **Verify integration** with existing system

### For Bug Fixes
1. **Write test that reproduces the bug** (should fail)
2. **Fix the bug** until test passes
3. **Add regression tests** to prevent future occurrences
4. **Verify no existing functionality broken**

### For UI Improvements
1. **Test existing behavior** before changes
2. **Add tests for new UI states** (collapsed, expanded, loading)
3. **Test user interactions** (clicks, form submissions)
4. **Verify accessibility** and responsiveness

## Testing Tools and Setup

### Jest Configuration
```javascript
// jest.config.cjs
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server', '<rootDir>/shared'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: [
    'server/**/*.{ts,tsx}',
    'shared/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

### Test Structure
```
server/
├── __tests__/
│   ├── unit/           # Unit tests for individual functions
│   ├── integration/    # API and database integration tests
│   └── e2e/           # End-to-end workflow tests
├── routes/
│   └── users.test.ts   # Co-located with route files
└── services/
    └── subscription.test.ts  # Co-located with service files
```

## Test Patterns

### 1. Database Mocking
```typescript
// Mock database operations consistently
const mockStorage = {
  getUsers: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
} as jest.Mocked<IStorage>;

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 2. API Testing
```typescript
// Use supertest for API testing
import request from 'supertest';
import { app } from '../index';

describe('API Tests', () => {
  it('should handle authenticated requests', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
    
    expect(response.body).toHaveLength(expectedLength);
  });
});
```

### 3. React Component Testing
```typescript
// Use React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { SubscriptionManagement } from './SubscriptionManagement';

describe('SubscriptionManagement', () => {
  it('should toggle collapse state', () => {
    render(<SubscriptionManagement organizationId={1} />);
    
    const toggleButton = screen.getByText('Show Renewal Options');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('Hide Renewal Options')).toBeInTheDocument();
  });
});
```

## Enforcement Strategy

### 1. Pre-commit Hooks
- Run tests before allowing commits
- Ensure coverage thresholds met
- Lint and format code automatically

### 2. CI/CD Pipeline
- All tests must pass before merge
- Coverage reports generated automatically
- Failed tests block deployment

### 3. Code Review Requirements
- Every PR must include tests
- Test coverage cannot decrease
- Edge cases must be covered

### 4. Development Workflow
```bash
# Development cycle
npm test -- --watch          # Run tests in watch mode
npm run test:coverage        # Check coverage
npm run test:integration     # Run integration tests
```

## Testing Checklist

### Before Feature Implementation
- [ ] Requirements clearly defined
- [ ] Test cases identified
- [ ] Mock data prepared
- [ ] Test environment configured

### During Development
- [ ] Tests written first (TDD)
- [ ] All tests passing
- [ ] Coverage thresholds met
- [ ] Edge cases covered

### Before Code Review
- [ ] All tests documented
- [ ] Integration tests included
- [ ] No test skipping without justification
- [ ] Performance tests for critical paths

### Before Deployment
- [ ] All tests passing in CI
- [ ] No test coverage regression
- [ ] Integration tests verified
- [ ] Documentation updated

## Examples of Comprehensive Testing

### Feature: Collapsible Subscription Section
```typescript
describe('Collapsible Subscription Section', () => {
  describe('UI Behavior', () => {
    it('should start collapsed when subscription is active');
    it('should expand when toggle button clicked');
    it('should show correct button text for each state');
    it('should display appropriate content in each state');
  });

  describe('State Management', () => {
    it('should persist collapse state during component updates');
    it('should reset state when subscription status changes');
  });

  describe('Integration', () => {
    it('should work with subscription data loading');
    it('should handle subscription renewal workflow');
  });
});
```

This comprehensive testing approach ensures reliability, maintainability, and confidence in all code changes.