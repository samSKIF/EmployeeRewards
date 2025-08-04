# ThrivioHR Platform

## Overview
ThrivioHR is a comprehensive, modular HR and employee engagement platform designed for multi-tenant SaaS deployment. It provides social features, recognition systems, leave management, and marketplace functionality. The platform aims to enhance employee engagement and streamline HR processes, offering a scalable solution for organizations.

## User Preferences
Preferred communication style: Simple, everyday language.

## Development Rules & Guidelines

### Code Quality & Standards
- **Naming Convention**: MANDATORY snake_case for all database fields, API parameters, and backend variables
- **TypeScript Strict Mode**: All code must be fully typed - no `any` types without explicit justification
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
- **File Validation**: Validate file types, sizes, and content before processing
- **Path Sanitization**: Prevent directory traversal attacks in file operations
- **Temporary File Cleanup**: Always clean up uploaded files after processing
- **Storage Limits**: Enforce organization-specific storage quotas

### API Design Standards
- **RESTful Routes**: Follow REST conventions for all API endpoints
- **Consistent Responses**: Use standardized response formats (success/error/data structure)
- **Rate Limiting**: Implement rate limiting on all public endpoints
- **Bulk Operations**: Provide batch processing for large data operations
- **Pagination**: Implement pagination for all list endpoints

### Code Maintenance
- **Temporary Script Policy**: Delete all one-time scripts immediately after use
- **Code Reviews**: No direct commits to main - all changes via pull requests
- **Testing Requirements**: Unit tests required for all business logic functions
- **Documentation**: Update API documentation with every endpoint change
- **Performance Monitoring**: Log slow operations and memory usage

### Error Handling & Logging
- **Structured Logging**: Use consistent log formats with severity levels
- **Error Tracking**: Log all errors with context and user-friendly messages
- **Audit Trail**: Log all admin actions and data modifications
- **Graceful Degradation**: System must function even if optional services fail
- **User Feedback**: Provide clear, actionable error messages to end users

### Deployment & Reliability
- **Environment Separation**: Strict separation between dev/staging/production
- **Backup Strategy**: Automated daily backups with tested restore procedures
- **Monitoring**: Health checks on all critical system components
- **Rollback Plan**: Quick rollback capability for failed deployments
- **Dependency Management**: Keep all dependencies updated and secure

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