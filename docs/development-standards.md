# Development Standards & Guidelines

## Overview
This document establishes comprehensive rules for scalable, structured development that ensures easy developer onboarding and maintainable code quality across the ThrivioHR platform.

## Architecture Principles

### 1. Modular Design
- **Microservices Pattern**: Each major feature (recognition, social, leave management) operates as independent service
- **API-First Development**: All features expose REST APIs before implementing UI
- **Database Isolation**: Use appropriate database technology per service (PostgreSQL for transactional, MongoDB for social)
- **Clear Service Boundaries**: Services communicate only through defined API contracts

### 2. Code Organization
```
server/
├── api/              # Core API endpoints
├── microservices/    # Independent service modules
├── middleware/       # Shared middleware (auth, validation)
├── routes/           # Express route handlers
└── mongodb/          # Database-specific code

client/
├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Route-specific pages
│   ├── hooks/        # Custom React hooks
│   └── lib/          # Utility functions
```

## Development Rules

### 1. Database Standards
- **Single Source of Truth**: Use PostgreSQL for user management, organizations, core business logic
- **Specialized Storage**: MongoDB for social features, comments, feeds
- **No Direct SQL**: Always use Drizzle ORM for type safety
- **Migration Strategy**: Use `npm run db:push` for schema changes, never manual SQL

### 2. Type Safety Requirements
- **Schema First**: Define all data models in `shared/schema.ts` before implementation
- **Consistent Types**: Use `createInsertSchema` and `$inferSelect` for database operations
- **No `any` Types**: Explicit typing required for all functions and variables
- **Interface Contracts**: Define clear interfaces for all service communications

### 3. Authentication & Security
- **JWT Standard**: Use `generateToken` and `verifyToken` middleware consistently
- **Multi-tenant Isolation**: All queries must include `organizationId` filtering
- **Role-based Access**: Implement `verifyAdmin` for privileged operations
- **Environment Secrets**: Never hardcode credentials, use environment variables

### 4. API Design Standards
- **RESTful Conventions**: 
  - GET for retrieval
  - POST for creation
  - PUT for updates
  - DELETE for removal
- **Consistent Response Format**:
  ```typescript
  {
    success: boolean,
    data?: any,
    message?: string,
    error?: string
  }
  ```
- **Error Handling**: Always return appropriate HTTP status codes
- **Validation**: Use Zod schemas for request validation

### 5. Frontend Architecture
- **Component Reusability**: Build components in `components/ui/` for reuse
- **State Management**: Use TanStack Query for server state, React state for UI
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: Wouter for lightweight client-side routing

## Testing Standards

### 1. Test Coverage Requirements
- **70% Minimum Coverage**: Enforced by Jest configuration
- **Unit Tests**: All utility functions and middleware
- **Integration Tests**: API endpoints and database operations
- **Component Tests**: Critical UI components

### 2. Testing Patterns
- **Database Mocking**:
  ```typescript
  const mockQuery = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([mockData]),
  };
  mockDb.select.mockReturnValue(mockQuery);
  ```
- **Middleware Mocking**:
  ```typescript
  mockVerifyToken.mockImplementation((req: any, res, next) => {
    req.user = { id: 1, organizationId: 1 };
    next();
  });
  ```
- **Async Testing**: Proper promise handling in all async tests

### 3. Test Organization
- **Co-location**: Tests alongside source files with `.test.ts` suffix
- **Descriptive Names**: Test descriptions should explain behavior clearly
- **Setup/Teardown**: Consistent `beforeEach` and `afterEach` patterns

## Code Quality Standards

### 1. Naming Conventions
- **Files**: kebab-case for files (`user-routes.ts`)
- **Variables**: camelCase for variables and functions
- **Constants**: UPPER_SNAKE_CASE for constants
- **Components**: PascalCase for React components
- **Database**: snake_case for database columns, camelCase for TypeScript

### 2. Documentation Requirements
- **API Documentation**: Every endpoint must have JSDoc comments
- **Function Documentation**: Complex functions require parameter and return descriptions
- **README Updates**: Architecture changes must update `replit.md`
- **Change Logs**: Document all major changes with dates

### 3. Code Review Checklist
- [ ] Type safety (no `any` types)
- [ ] Multi-tenant security (organizationId filtering)
- [ ] Error handling implemented
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Performance considerations addressed

## Deployment Standards

### 1. Environment Management
- **Development**: Local Replit environment with hot reload
- **Production**: Optimized build with `npm run build`
- **Environment Variables**: All secrets managed through environment variables
- **Database Migrations**: Automated through Drizzle ORM

### 2. Performance Guidelines
- **Database Queries**: Always use indexes for frequent queries
- **API Response Times**: Target <200ms for most endpoints
- **Frontend Loading**: Show loading states for operations >100ms
- **Caching Strategy**: Use appropriate caching for static data

## Onboarding Process

### 1. New Developer Checklist
- [ ] Clone repository and review `replit.md`
- [ ] Set up development environment with required secrets
- [ ] Run test suite to verify setup: `npx jest`
- [ ] Review architecture documentation in `docs/`
- [ ] Complete first task: Fix failing test or small feature

### 2. Learning Path
1. **Week 1**: Understand architecture, run local environment, fix tests
2. **Week 2**: Implement small feature following established patterns
3. **Week 3**: Review microservices architecture, contribute to existing service
4. **Week 4**: Lead implementation of new API endpoint with tests

### 3. Mentoring Guidelines
- **Code Reviews**: Senior developers review all new developer contributions
- **Pair Programming**: Schedule weekly pair programming sessions
- **Architecture Discussions**: Include new developers in design decisions
- **Knowledge Sharing**: Weekly team technical discussions

## Scalability Considerations

### 1. Database Scaling
- **Read Replicas**: Implement for high-read operations
- **Connection Pooling**: Already configured with Neon serverless
- **Query Optimization**: Regular query performance reviews
- **Data Archiving**: Plan for old data management

### 2. Service Scaling
- **Stateless Services**: All services must be stateless for horizontal scaling
- **Message Queues**: Plan for async processing with Redis/message queues
- **API Rate Limiting**: Implement for public endpoints
- **Monitoring**: Add comprehensive logging and metrics

### 3. Frontend Scaling
- **Code Splitting**: Implement route-based code splitting
- **CDN Strategy**: Plan for static asset distribution
- **Progressive Loading**: Implement for large datasets
- **Mobile Optimization**: Responsive design patterns

## Maintenance Standards

### 1. Regular Tasks
- **Weekly**: Review test coverage reports
- **Monthly**: Update dependencies and security patches  
- **Quarterly**: Architecture review and refactoring
- **Annually**: Technology stack evaluation

### 2. Monitoring & Alerts
- **Error Tracking**: Implement comprehensive error logging
- **Performance Monitoring**: Track API response times
- **Database Health**: Monitor connection pools and query performance
- **User Analytics**: Track feature usage and performance

## Communication Standards

### 1. Documentation
- **Technical Decisions**: Document in `docs/` directory
- **API Changes**: Update OpenAPI specifications
- **Architecture Changes**: Update `replit.md` immediately
- **Deployment Notes**: Maintain deployment checklist

### 2. Team Communication
- **Daily Standups**: Quick progress and blocker identification
- **Code Reviews**: Constructive feedback focused on standards compliance
- **Architecture Discussions**: Include all developers in major decisions
- **Knowledge Sharing**: Regular technical presentations

This comprehensive framework ensures that ThrivioHR maintains high code quality, remains scalable, and provides an excellent developer experience for new team members.