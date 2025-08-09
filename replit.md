# ThrivioHR Platform

## ⚠️ MANDATORY ARCHITECTURE COMPLIANCE
**ALL CODE MUST FOLLOW:** [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- This is the single source of truth for all architectural decisions
- Non-compliance will result in code rejection
- Review BEFORE writing any code
- Validate compliance using the Architecture Compliance Checklist (Section 10.1)

## Overview
ThrivioHR is a comprehensive, modular HR and employee engagement platform designed for multi-tenant SaaS deployment. It provides social features, recognition systems, leave management, and marketplace functionality. The platform aims to enhance employee engagement and streamline HR processes, offering a scalable solution for organizations.

## Recent Major Milestones (August 2025)
- **ARCHITECTURE DOCS NORMALIZED** (August 9, 2025): Updated SYSTEM_ARCHITECTURE.md and replit.md to gold standard specifications. Established clear MVP architecture defaults, naming conventions, and migration strategy from monolith to microservices.
- **EMPLOYEE CORE SERVICE MIGRATION** (August 7, 2025): 85% complete - Service structure, authentication, user management, and department management migrated to `/services/employee-core/`. API Gateway routing configured. Remaining: org chart, comprehensive tests, separate database setup.
- **MICROSERVICES FOUNDATION ESTABLISHED** (August 7, 2025): Created event bus, API gateway infrastructure, base service template, and service registry. Foundation ready for service migrations.
- **EMPLOYEE MANAGEMENT LSP CRISIS RESOLVED** (August 6, 2025): Fixed all 16 LSP diagnostics in employee management module. Implemented complete storage interface with getEmployeesWithFilters, getUserById, updateUser, deleteUser, searchEmployees, and checkUserDependencies methods.
- **PHASE 3 INTEGRATION TESTING COMPLETED** (August 6, 2025): Achieved 90% frontend and backend test coverage targets with comprehensive integration testing framework.
- **TEST INFRASTRUCTURE FULLY RESTORED** (August 6, 2025): Successfully restored automated testing capability with 13/13 auth middleware tests passing.

## User Preferences
- **Communication Style**: Simple, everyday language
- **Development Standards**: Maintain Gold Standard compliance with MVP coverage targets (BL 85%, API 90%, Security 100%, Events 85%)
- **Code Quality**: Zero tolerance for LSP diagnostics, enterprise-grade error handling with AppError.normalize()
- **Architecture**: Follow microservices pattern with strict service boundaries and event-driven communication
- **Error Handling**: Use `unknown` in catch clauses, normalize through @platform/sdk AppError
- **Current Migration Status**: Employee Core 85% complete, HR Operations next priority

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript
- **Tailwind CSS** with Shadcn/UI for modern, responsive design
- **TanStack Query** for data fetching and caching
- **Wouter** for lightweight client-side routing
- **React Hook Form** with Zod validation for forms
- **Vite** for fast development and optimized builds

### Backend Architecture - Target Microservices
- **Employee Core Service** (`/services/employee-core/`, Port 3001, PostgreSQL)
- **Social Engagement Service** (`/services/social-engagement/`, Port 3002, MongoDB)
- **Recognition & Rewards Service** (`/services/recognition-rewards/`, Port 3003, PostgreSQL + Redis)
- **HR Operations Service** (`/services/hr-operations/`, Port 3004, PostgreSQL)

### Infrastructure Defaults (MVP)
- **API Gateway**: Nginx Ingress
- **Event Bus**: Kafka for async communication
- **Observability**: OpenTelemetry tracing + logs + metrics
- **Contracts**: OpenAPI/JSON-Schema with generated typed clients
- **Shared Code**: Only `@platform/sdk` (no domain logic in shared/)

### Database Strategy
- **PostgreSQL**: Employee Core, Recognition & Rewards, HR Operations
- **MongoDB**: Social Engagement (flexible schema for posts/comments)
- **Redis**: Caching layer for Recognition & Rewards
- **Multi-tenancy**: Postgres RLS + MongoDB tenant filters

### Key Features
- Authentication & User Management with RBAC
- Social Feed & Engagement with real-time interactions
- Recognition & Rewards System with points-based economy
- Leave Management workflow
- Employee Directory and Org Chart
- Admin Dashboard for comprehensive control

### Security & Multi-tenancy
- JWT authentication with RS256 signing
- Role-based access control with organizational boundaries
- Multi-tenant architecture with data isolation via organization_id
- TLS 1.3 for all external communication

### Code Quality Standards (MVP Targets)
- **Business Logic**: 85% test coverage minimum
- **API Routes**: 90% test coverage minimum  
- **Security Functions**: 100% test coverage required
- **Event Handlers**: 85% test coverage minimum
- **Error Handling**: All catch blocks use `unknown` type with AppError.normalize()
- **Naming Conventions**: snake_case for DB/wire, camelCase for app code, PascalCase for types
- **Zero LSP Diagnostics**: No TypeScript errors permitted

### Architecture Compliance Rules
- Every service must have its own database
- No shared domain logic between services (only @platform/sdk utilities)
- All state changes must publish events through Kafka
- Service communication only through APIs, never direct DB access
- Soft deletes only (no hard deletes)
- W3C traceparent propagation for observability

### Migration Status
- **Current**: Hybrid monolith with emerging microservices
- **Employee Core**: 85% migrated to `/services/employee-core/`
- **Legacy Monolith**: `/server/` still serving traffic during gradual migration
- **Next Priority**: HR Operations Service migration
- **Target**: Full microservices architecture with event-driven communication

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **@nestjs/**: Microservices framework
- **@radix-ui/**: Accessible UI component primitives
- **drizzle-orm**: Type-safe database ORM
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT token management
- **kafkajs**: Kafka client for event bus communication

### Development Dependencies
- **Vite**: Build tool and dev server
- **ESLint & Prettier**: Code quality and formatting
- **TypeScript**: Type checking and compilation
- **Tailwind CSS**: Utility-first CSS framework

### Target Dependencies (Post-Migration)
- **@platform/sdk**: Shared utilities (logging, errors, tracing, HTTP client)
- **Kafka**: Event bus for service communication
- **OpenTelemetry**: Observability and monitoring
- **MongoDB**: Social engagement service database

### Event Bus Configuration
- **BUS feature flag**:
  - `BUS=stub` (default) → console-only bus for development
  - `BUS=kafka` → use KafkaJS for production event-driven communication
- **Required Kafka environment variables** (when BUS=kafka):
  - `KAFKA_BROKERS=broker1:9092,broker2:9092`
  - `KAFKA_CLIENT_ID=thrivio`
  - `KAFKA_SSL=true|false`
  - `KAFKA_SASL_MECHANISM=plain|scram-sha-256|scram-sha-512` (optional)
  - `KAFKA_SASL_USERNAME=...`, `KAFKA_SASL_PASSWORD=...` (optional)

## Architecture Enforcement

### Before Writing Any Code
1. **READ**: [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
2. **CHECK**: Service boundaries and ownership (Section 4)
3. **FOLLOW**: Code quality and error handling standards (Section 3)
4. **VALIDATE**: Architecture Compliance Checklist (Section 10.1)

### Service Development Rules
- Use `unknown` in catch clauses, normalize with AppError
- Publish events for all state changes
- Maintain strict service boundaries (no cross-service DB access)
- Implement health checks and observability
- Follow naming conventions (snake_case DB, camelCase app code)
- Achieve minimum test coverage targets

### Migration Strategy
- **Strangler Fig Pattern**: Build new services alongside existing system
- **Dual-write**: Maintain data consistency during migration
- **Feature Flags**: Control traffic routing to new services
- **Progressive Rollout**: Gradual migration with rollback capability

## Next Steps
1. Complete Employee Core Service (org chart, tests, separate DB)
2. Begin HR Operations Service migration from `/server/features/leave-management/`
3. Extract Recognition & Rewards Service
4. Migrate Social Engagement to MongoDB
5. Implement full Kafka event bus
6. Sunset legacy monolith endpoints