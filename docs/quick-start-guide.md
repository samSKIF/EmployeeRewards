# Quick Start Guide for New Developers

## Setup Checklist (30 minutes)

### 1. Environment Setup
```bash
# 1. Clone and explore the codebase
git clone <repository-url>
cd thriviohr-platform

# 2. Review the main documentation
cat replit.md  # Project overview and architecture
cat docs/development-standards.md  # Development rules

# 3. Install dependencies (if needed)
npm install

# 4. Set up environment variables
cp .env.example .env
# Add required secrets (ask team lead for values)
```

### 2. Verify Setup
```bash
# 1. Run the application
npm run dev
# Should see: "10:XX:XX AM [express] serving on port 5000"

# 2. Run tests to verify everything works
npx jest
# Should show test results (some may be failing - that's expected)

# 3. Check database connection
curl http://localhost:5000/api/users/me
# Should return 401 (unauthorized) - this means API is working
```

### 3. First Code Changes
```bash
# 1. Find your first task
# Look for files marked with TODO or pick a failing test to fix

# 2. Make a small change
# Example: Fix a simple test or add a console.log

# 3. Verify your change
npm run dev  # Restart the server
npx jest path/to/your/test.ts  # Run specific test
```

## Key Concepts (15 minutes reading)

### Architecture Overview
```
ThrivioHR Platform
├── Frontend (React + TypeScript)
├── Backend (Node.js + Express)
├── Database (PostgreSQL + MongoDB)
└── Testing (Jest + Supertest)
```

### Most Important Files
1. `replit.md` - Project overview and recent changes
2. `shared/schema.ts` - All database models and types
3. `server/routes.ts` - Main API endpoint definitions
4. `client/src/App.tsx` - Frontend application entry
5. `jest.config.cjs` - Testing configuration

### Common Patterns You'll Use

#### 1. Database Operations
```typescript
// Always use Drizzle ORM, never raw SQL
const users = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.organizationId, organizationId));
```

#### 2. API Endpoints
```typescript
// Standard pattern for protected routes
app.get('/api/endpoint', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await someOperation();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### 3. React Components
```typescript
// Use hooks and proper typing
export function MyComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/my-data'],
  });

  if (isLoading) return <div>Loading...</div>;
  
  return <div>{data?.something}</div>;
}
```

#### 4. Testing
```typescript
// Mock database and test behavior
const mockDb = { select: jest.fn(), insert: jest.fn() };
const mockQuery = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockResolvedValue([mockData]),
};
mockDb.select.mockReturnValue(mockQuery);
```

## Your First Week Plan

### Day 1: Exploration
- [ ] Set up environment and run application
- [ ] Read `replit.md` and `docs/development-standards.md`
- [ ] Explore the codebase structure
- [ ] Run test suite and identify patterns

### Day 2: Fix a Simple Test
- [ ] Pick a failing test from `npx jest --listTests`
- [ ] Understand what the test should do
- [ ] Fix the mocking or assertion
- [ ] Get the test passing

### Day 3: Small Feature Addition
- [ ] Add a simple API endpoint (like GET /api/hello)
- [ ] Include proper typing and error handling
- [ ] Add a test for your endpoint
- [ ] Test manually with curl or frontend

### Day 4-5: Bigger Challenge
- [ ] Pick a feature from the TODO list
- [ ] Plan the implementation (database, API, frontend)
- [ ] Implement following the established patterns
- [ ] Add comprehensive tests

## Getting Help

### Code Questions
1. **Check Documentation First**: `docs/` directory has detailed guides
2. **Search Existing Code**: Find similar patterns in the codebase
3. **Ask Team**: Use specific examples and show what you've tried

### Common Issues & Solutions

#### Tests Failing
```bash
# Check if it's a timeout issue
npx jest --testTimeout=30000 your-test.ts

# Check if mocks are properly configured
# Look at working tests like server/storage.test.ts for patterns
```

#### Database Errors
```bash
# Verify environment variables are set
echo $DATABASE_URL

# Check if database schema is up to date
npm run db:push
```

#### TypeScript Errors
```typescript
// Always import types from shared schema
import { User, type InsertUser } from '@shared/schema';

// Use proper typing for requests
interface AuthenticatedRequest extends Request {
  user?: User;
}
```

### Best Practices Checklist

#### Before Writing Code
- [ ] Understand the requirement completely
- [ ] Check if similar functionality already exists
- [ ] Plan the database schema changes needed
- [ ] Consider multi-tenant implications (organizationId)

#### While Writing Code
- [ ] Follow existing code patterns
- [ ] Add proper TypeScript types
- [ ] Include error handling
- [ ] Consider performance implications

#### Before Submitting
- [ ] Add/update tests
- [ ] Run the test suite
- [ ] Test manually in the browser
- [ ] Update documentation if needed

## Success Metrics

### Week 1 Goals
- [ ] Environment setup complete
- [ ] Fixed at least one failing test
- [ ] Made first code contribution
- [ ] Understanding of architecture

### Month 1 Goals
- [ ] Contributed to multiple services
- [ ] Led implementation of new feature
- [ ] Comfortable with testing patterns
- [ ] Can review other developers' code

Remember: The codebase is large, but the patterns are consistent. Focus on understanding the patterns first, then applying them to new features.