# ThrivioHR Platform

## Overview
ThrivioHR is a comprehensive, modular HR and employee engagement platform designed for multi-tenant SaaS deployment. It provides social features, recognition systems, leave management, and marketplace functionality. The platform aims to enhance employee engagement and streamline HR processes, offering a scalable solution for organizations.

## User Preferences
Preferred communication style: Simple, everyday language.

## Development Rules & Guidelines
- **Temporary Script Policy**: All temporary scripts, routes, or utilities created for one-time tasks (like bulk operations, data cleanup, testing) must be deleted immediately after use
- **Code Hygiene**: Keep the codebase clean - no leftover debugging code, temporary files, or unused utilities
- **Documentation**: Always document why temporary code was created and confirm its removal in project updates

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