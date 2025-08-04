# ThrivioHR Platform

## Overview
ThrivioHR is a comprehensive, modular HR and employee engagement platform designed for multi-tenant SaaS deployment. It provides social features, recognition systems, leave management, and marketplace functionality. The platform aims to enhance employee engagement and streamline HR processes, offering a scalable solution for organizations.

## User Preferences
Preferred communication style: Simple, everyday language.

## Development Rules & Guidelines

### Code Quality & Standards
- **Naming Convention**: MANDATORY snake_case for all database fields, API parameters, and backend variables
- **TypeScript Strict Mode**: All code must be fully typed - no `any` types without explicit justification
- **File Size Limits**:
  - Individual files: Max 500 lines (split into smaller modules if exceeded)
  - React components: Max 300 lines (use composition for complex components)
  - API route files: Max 400 lines (group related endpoints)
  - Utility functions: Max 100 lines per function
- **Code Homogeneity Standards**:
  - Consistent import order: External libs → Internal modules → Types → Styles
  - Uniform error handling: Use custom error classes with standardized messages
  - Consistent function signatures: (data, options?) pattern for all utilities
  - Standardized component structure: Props interface → Component → Export
  - Uniform async patterns: async/await only, no mixed Promise chains
  - Consistent logging format: [timestamp] [level] [module] message
- **Code Organization**:
  - Group related functionality in dedicated modules
  - Use index.ts files for clean exports
  - Maintain consistent folder structure across features
  - Extract constants to dedicated files (max 50 constants per file)
- **Internationalization Requirements**:
  - ALL pages and labels must support multiple languages from creation
  - Use i18next with translation keys, never hardcoded strings
  - Support minimum: English, Spanish, French, German, Japanese, Chinese
  - Date/time formatting must respect user locale
  - Number formatting (currency, decimals) must be locale-aware
  - All error messages must be translatable
  - Email templates must support multiple languages
  - Database content requiring translation must use separate translation tables
- **Error Handling**: Every API endpoint must have comprehensive error handling with user-friendly messages
- **Input Validation**: All user inputs must be validated using Zod schemas before processing
- **SQL Injection Prevention**: Use parameterized queries only - never string concatenation for SQL
- **Authentication Required**: All sensitive endpoints must verify tokens and permissions

### Security & Multi-tenancy Rules
- **Organization Isolation**: Every database query MUST include organizationId filtering
- **Role-Based Access**: Implement proper admin/employee role checks on all admin endpoints
- **Data Sanitization**: Sanitize all user inputs, especially file uploads and text fields
- **Secret Management**: Never hardcode credentials - use environment variables only
- **Session Security**: JWT tokens must have proper expiration and validation

### Database & Performance
- **Drizzle ORM Only**: Use Drizzle for all database operations - no raw SQL except for complex queries
- **Index Requirements**: All foreign keys and frequently queried fields must be indexed
- **Transaction Usage**: Use database transactions for multi-table operations
- **Connection Pooling**: Implement proper database connection management
- **Query Optimization**: Monitor and optimize slow queries (>100ms)

### File & Upload Management
- **File Size Limits**: 
  - CSV/Excel uploads: Max 10MB per file, 1000 rows per batch
  - Avatar images: Max 2MB, 512x512px recommended
  - Document attachments: Max 25MB per file
  - Bulk operations: Process in chunks of 100 records
- **File Type Restrictions**: 
  - Images: JPG, PNG, WebP only
  - Documents: PDF, DOCX, XLSX, CSV only
  - Archives: ZIP only (scanned for malware)
- **File Validation**: Validate file types, sizes, and content before processing
- **Path Sanitization**: Prevent directory traversal attacks in file operations
- **Temporary File Cleanup**: Always clean up uploaded files after processing
- **Storage Limits**: Enforce organization-specific storage quotas (500MB base, 1GB premium)

### API Design Standards
- **RESTful Routes**: Follow REST conventions for all API endpoints
- **Consistent Responses**: Use standardized response formats (success/error/data structure)
- **Rate Limiting**: Implement rate limiting on all public endpoints
- **Bulk Operations**: Provide batch processing for large data operations
- **Pagination**: Implement pagination for all list endpoints

### Testing & Quality Assurance
- **Test Coverage Requirements**:
  - Minimum 80% code coverage for all business logic
  - 100% coverage for authentication and security functions
  - All API endpoints must have integration tests
  - Database operations must have transaction rollback tests
- **Test Types Mandatory**:
  - Unit tests: All utility functions, validators, and business logic
  - Integration tests: API endpoints with database interactions
  - Component tests: React components with user interactions
  - End-to-end tests: Critical user workflows (login, file upload, data processing)
- **Regression Testing Protocol**:
  - Run full test suite before any deployment
  - Test existing features when adding new ones
  - Automated CI/CD pipeline must pass all tests
  - Breaking changes require explicit approval and migration plan
- **Test Organization**:
  - Mirror production folder structure in test directories
  - Group tests by feature modules, not by test type
  - Use descriptive test names: "should reject invalid email format"
  - Mock external services consistently across test suite
- **Performance Testing**:
  - Load testing for bulk operations (1000+ records)
  - Memory leak detection for long-running processes
  - Database query performance benchmarks
  - File upload stress testing with concurrent users

### Team Development & Handover Standards
- **Code Documentation Requirements**:
  - Every function must have JSDoc comments explaining purpose, parameters, and return values
  - Complex business logic must include inline comments explaining the "why"
  - README files required for each major module/feature
  - Architecture Decision Records (ADRs) for all major technical decisions
  - Database schema must be documented with relationships and constraints
- **Knowledge Transfer Protocols**:
  - All features must have comprehensive documentation before handover
  - Code must be self-documenting with clear variable and function names
  - No tribal knowledge - all processes must be written down
  - Video walkthroughs required for complex features
  - Onboarding documentation for new team members
- **Code Maintainability Standards**:
  - No magic numbers - use named constants with clear explanations
  - No deep nesting (max 3 levels) - extract functions for readability
  - Clear separation of concerns - business logic separate from UI logic
  - Standardized project structure that new developers can navigate easily
  - All environment variables documented with examples and purposes
- **Team Collaboration Rules**:
  - All major changes require design review before implementation
  - Breaking changes must have migration guides and backward compatibility plans
  - Feature flags for gradual rollouts and safe experimentation
  - Standardized Git commit messages following conventional commits
  - Pull request templates with checklists for consistency

### Code Maintenance
- **Temporary Script Policy**: Delete all one-time scripts immediately after use
- **Code Reviews**: No direct commits to main - all changes via pull requests
- **Pre-deployment Checklist**:
  - All tests passing (unit, integration, e2e)
  - Code coverage threshold met
  - No TypeScript errors or warnings
  - Security scan completed
  - Performance benchmarks within acceptable range
  - Documentation updated for any new features
  - Migration scripts tested if database changes included
- **Documentation**: Update API documentation with every endpoint change
- **Performance Monitoring**: Log slow operations and memory usage
- **Knowledge Management**: Keep team wiki updated with troubleshooting guides and FAQs

### Error Handling & Logging
- **Structured Logging**: Use consistent log formats with severity levels
- **Error Tracking**: Log all errors with context and user-friendly messages
- **Audit Trail**: Log all admin actions and data modifications
- **Graceful Degradation**: System must function even if optional services fail
- **User Feedback**: Provide clear, actionable error messages to end users

### Deployment & Reliability
- **Environment Separation**: Strict separation between dev/staging/production
- **Continuous Integration**:
  - Automated testing on every commit
  - Staging deployment for integration testing
  - Production deployment only after full test suite passes
  - Automatic rollback if post-deployment tests fail
- **Backup Strategy**: Automated daily backups with tested restore procedures
- **Monitoring**: Health checks on all critical system components
- **Feature Flags**: Use feature toggles for gradual rollouts of new functionality
- **Rollback Plan**: Quick rollback capability for failed deployments
- **Dependency Management**: Keep all dependencies updated and secure
- **Zero-Downtime Deployments**: Blue-green deployment strategy for production updates

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for type safety.
- **Tailwind CSS** with Shadcn/UI for modern, responsive design.
- **TanStack Query** for data fetching and caching.
- **Wouter** for lightweight client-side routing.
- **React Hook Form** with Zod validation for forms.
- **Vite** for fast development and optimized builds.

### Backend Architecture
- **Node.js** with Express.js as the main API server.
- **NestJS microservices** for modularity (Recognition, Social, Core API).
- **TypeScript** across the entire stack.
- **Drizzle ORM** for type-safe database operations.
- **JWT authentication** for secure user sessions.
- **Multer** for file upload handling.
- **WebSocket** support for real-time features.

### Database Strategy
- **PostgreSQL**: Primary database for user management, organizations, leave requests, and points system.
- **MongoDB** (planned): For social feed, posts, comments, and notifications.
- **Redis** (optional): Caching layer.
- **Elasticsearch** (planned): Audit logging and search functionality.

### Key Features
- Authentication & User Management with role-based access control.
- Social Feed & Engagement with real-time interactions.
- Recognition & Rewards System with points-based economy.
- Leave Management workflow.
- Spaces & Groups Management for workplace communities.
- Survey System with analytics.
- Employee Directory.
- Admin Dashboard for comprehensive control.
- Shop & Marketplace for points redemption.

### Security & Multi-tenancy
- Environment variable-based configuration for credentials.
- Role-based access control with corporate admin, client admin, and employee levels.
- Secure file upload handling.
- Multi-tenant architecture with data isolation enforced at the application level via `organizationId`.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **@nestjs/**: Microservices framework.
- **@radix-ui/**: Accessible UI component primitives.
- **drizzle-orm**: Type-safe database ORM.
- **bcrypt**: Password hashing.
- **jsonwebtoken**: JWT token management.
- **multer**: File upload handling.

### Development Dependencies
- **Vite**: Build tool and dev server.
- **ESLint & Prettier**: Code quality and formatting.
- **TypeScript**: Type checking and compilation.
- **Tailwind CSS**: Utility-first CSS framework.

### Optional Dependencies
- **MongoDB**: For social features (migration in progress).
- **Redis**: For caching.
- **Elasticsearch**: For audit logging and search.

## Recent Changes
- **August 4, 2025**: Enhanced department validation system with strict typo detection (70% similarity threshold)
- **August 4, 2025**: Fixed critical date format conversion bug in bulk upload (DD/MM/YYYY to YYYY-MM-DD)
- **August 4, 2025**: Added comprehensive error reporting with actionable suggestions for HR users
- **August 4, 2025**: Removed temporary bulk delete script after cleaning up test data (40 employees)
```