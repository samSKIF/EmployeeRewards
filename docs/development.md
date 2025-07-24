# ThrivioHR Development Guide

## Testing

### Running Tests

We use Jest for our testing framework. Tests are configured to use TypeScript via ts-jest.

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

Coverage reports are generated in the `coverage/` directory. Open `coverage/lcov-report/index.html` in your browser to view detailed coverage information.

Current coverage thresholds:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### Writing Tests

Tests should be placed next to the files they test with a `.test.ts` extension.

Example test structure:
```typescript
import { functionToTest } from './module';

describe('Module Name', () => {
  describe('functionToTest', () => {
    it('should handle expected behavior', () => {
      // Test implementation
    });
    
    it('should handle error cases', () => {
      // Error case testing
    });
  });
});
```

### Mocking

Jest is configured to automatically mock certain modules. Module path mappings are configured:
- `@shared/*` maps to `shared/*`
- `@/*` maps to `client/src/*`

## Development Workflow

1. Make changes to your code
2. Run tests to ensure nothing is broken
3. Write tests for new functionality
4. Ensure coverage thresholds are met
5. Commit your changes

## Environment Setup

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `SESSION_SECRET`: Secret key for session management

See `.env.example` for a complete list of environment variables.