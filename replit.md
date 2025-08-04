# ThrivioHR Platform

## Overview
ThrivioHR is a comprehensive, modular HR and employee engagement platform designed for multi-tenant SaaS deployment. It provides social features, recognition systems, leave management, and marketplace functionality. The platform aims to enhance employee engagement and streamline HR processes, offering a scalable solution for organizations.

## Recent Major Milestones (August 2025)
- **LSP DIAGNOSTICS CLEARED** (August 4, 2025): Successfully eliminated ALL 30 LSP diagnostics through systematic type fixes, schema validation corrections, and error handling enhancements. Achieved 100% type safety compliance with gold standard error handling patterns.
- **GOLD STANDARD TYPE SAFETY** (August 4, 2025): Implemented enterprise-grade error handling with proper TypeScript strict mode compliance, soft delete patterns, and comprehensive audit trail preservation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript.
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

### Scalability & Performance
- Built to handle 100,000+ concurrent users.
- Database sharding, read replicas, and partitioning for scalability.
- Redis caching for frequently accessed data, CDN for static assets.
- API response times within 200ms, with rate limiting and background job processing.
- Horizontal scaling capability, load balancing, and microservice architecture.
- Efficient memory usage, streaming for large files, and pagination.
- Comprehensive monitoring and alerting for performance.

### File & Upload Management
- Defined limits for CSV/Excel uploads (10MB, 1000 rows), avatar images (2MB), document attachments (25MB).
- Strict file type restrictions (JPG, PNG, WebP, PDF, DOCX, XLSX, CSV, ZIP).
- File validation and path sanitization.
- Enforcement of organization-specific storage quotas.

### API Design
- RESTful conventions with consistent response formats.
- Rate limiting and bulk operation support.
- Pagination for all list endpoints.

### Code Quality & Standards
- Mandatory snake_case for database fields, API parameters, and backend variables.
- Full TypeScript strict mode.
- File size limits for individual files, React components, and API routes.
- Consistent code homogeneity standards for imports, error handling, function signatures, and component structure.
- Comprehensive internationalization support for all pages, labels, dates, numbers, and error messages.
- Input validation using Zod schemas and SQL injection prevention via parameterized queries.
- Strict authentication and authorization for sensitive endpoints.

### Testing & Quality Assurance
- Minimum 80% code coverage for business logic, 100% for security functions.
- Mandatory unit, integration, component, and end-to-end tests.
- Automated regression testing before deployment.

### AI-Ready Architecture & Comprehensive Activity Tracking
- **Every Single User Action Must Be Tracked**:
  - User ID, precise timestamp, action type, affected resources, IP address, user agent
  - Session details, organization context, role permissions at time of action
  - Before/after states for all data modifications (complete audit trail)
  - Performance metrics (response time, resource usage) per action
  - Geographic location, device type, and browser information
  - Failed attempts and security events (login failures, permission denials)

- **AI Connector Infrastructure**:
  - Standardized data export APIs for AI model training and analysis
  - Real-time event streaming for live AI processing (WebSocket/SSE)
  - Structured JSON schemas for consistent AI data consumption
  - Integration-ready endpoints for AI platforms (OpenAI, Anthropic, Google AI)
  - Webhook support for external AI service notifications and callbacks
  - API versioning for AI connector backward compatibility

- **Data Analytics Foundation**:
  - Time-series data storage for user behavior pattern analysis
  - Pre-computed aggregation tables for instant analytics queries
  - Data warehouse-ready export formats (Parquet, JSON, CSV)
  - GDPR-compliant data retention and automated deletion policies
  - User consent management for AI processing and data usage
  - Data lineage tracking for compliance and debugging

- **Event-Driven Architecture for AI**:
  - Publish-subscribe pattern for all major user interactions
  - Event sourcing for complete action history reconstruction
  - Message queues for reliable AI data processing pipelines
  - Dead letter queues for failed AI integrations and retry logic
  - Event replay capability for AI model retraining

- **AI Training Data Standards**:
  - Anonymized user interaction datasets with privacy protection
  - Feature engineering pipelines for ML model preparation
  - A/B testing framework for AI-driven feature rollouts
  - Model performance tracking and feedback loops
  - Bias detection and fairness monitoring in AI recommendations
  - Automated data quality checks for AI training datasets

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
- **MongoDB**: For social features.
- **Redis**: For caching.
- **Elasticsearch**: For audit logging and search.