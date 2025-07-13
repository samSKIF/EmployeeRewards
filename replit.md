# Employee Engagement Platform

## Overview

This is a comprehensive, modular employee engagement platform built with React, TypeScript, Express, and modern web technologies. The platform provides social features, recognition systems, leave management, and marketplace functionality with a microservices architecture designed for multi-tenant SaaS deployment.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for type safety
- **Tailwind CSS** with Shadcn/UI component library for modern, responsive design
- **TanStack Query** for efficient data fetching and caching
- **Wouter** for lightweight client-side routing
- **React Hook Form** with Zod validation for form management
- **Vite** for fast development and optimized production builds

### Backend Architecture
- **Node.js** with Express.js as the main API server
- **NestJS microservices** for modular service architecture
- **TypeScript** throughout the entire stack for consistency
- **Drizzle ORM** for type-safe database operations
- **JWT authentication** for secure user sessions
- **Multer** for file upload handling
- **WebSocket** support for real-time features

### Database Strategy
The platform uses a hybrid database approach optimized for different data types:
- **PostgreSQL** (primary): User management, organizations, leave requests, points system
- **MongoDB** (planned): Social feed, posts, comments, notifications
- **Redis** (optional): Caching layer for performance optimization
- **Elasticsearch** (planned): Audit logging and search functionality

## Key Components

### Core Modules
1. **Authentication & User Management**: JWT-based auth with role-based access control
2. **Social Feed & Engagement**: Real-time social interactions and community features
3. **Recognition & Rewards System**: Peer-to-peer recognition with points-based economy
4. **Leave Management**: Complete workflow for leave requests and approvals
5. **Spaces & Groups Management**: Workplace communities and interest groups
6. **Survey System**: Custom surveys with analytics
7. **Employee Directory**: Comprehensive employee profiles and management
8. **Admin Dashboard**: Full administrative control panel
9. **Shop & Marketplace**: Points redemption system with rewards catalog

### Microservices Architecture
- **Recognition Service** (Port 3001): Handles employee recognition and rewards
- **Social Service** (Port 3002): Manages social feed and interactions
- **Main Application** (Port 5000): Core API and frontend serving

### Security Features
- Environment variable-based configuration (no hardcoded credentials)
- Role-based access control with multiple user types
- Corporate admin, client admin, and employee permission levels
- Secure file upload handling with type validation

## Data Flow

### Authentication Flow
1. User submits credentials via login form
2. Server validates against PostgreSQL user table
3. JWT token generated and returned to client
4. Token included in Authorization header for protected routes
5. Middleware verifies token and attaches user context

### Recognition System Flow
1. Employee submits recognition through UI
2. Recognition service processes and validates request
3. Points calculated and added to recipient's balance
4. Notification sent to recipient
5. Recognition appears in company-wide feed

### Multi-tenant Architecture
1. Organizations table manages multiple client companies
2. Each user belongs to an organization via organizationId
3. Data isolation enforced at application level
4. Features can be enabled/disabled per organization

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **@nestjs/**: Microservices framework components
- **@radix-ui/**: Accessible UI component primitives
- **drizzle-orm**: Type-safe database ORM
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT token management
- **multer**: File upload handling

### Development Dependencies
- **Vite**: Build tool and dev server
- **ESLint & Prettier**: Code quality and formatting
- **TypeScript**: Type checking and compilation
- **Tailwind CSS**: Utility-first CSS framework

### Optional Dependencies
- **MongoDB**: For social features (migration in progress)
- **Redis**: For caching (optional enhancement)
- **Elasticsearch**: For audit logging and search

## Deployment Strategy

### Development Environment
- **Replit**: Primary development platform
- **Vite dev server**: Hot module replacement for frontend
- **tsx**: TypeScript execution for backend development
- **Workflows**: Automated development tasks

### Production Deployment
- **Build process**: `npm run build` compiles both frontend and backend
- **Start command**: `npm run start` runs production server
- **Auto-scaling**: Configured for autoscale deployment target
- **Static assets**: Served via Express static middleware

### Database Provisioning
- **Drizzle migrations**: Schema management and versioning
- **Environment variables**: Database URLs and secrets
- **Connection pooling**: Optimized for serverless environments

### File Management
- **Upload directory**: `server/uploads/` for user-generated content
- **Static serving**: Express middleware for file access
- **Avatar management**: Automated profile picture assignment

## Changelog

- July 13, 2025: Implemented direct corporate login routing. "Login as Corporate" button now redirects directly to `/management` dashboard instead of intermediate corporate-login page, providing streamlined access to corporate admin features including company management, platform analytics, merchant management, product management, wallet management, and financial overview.
- July 3, 2025: Cleaned up codebase by removing all data creation scripts and unnecessary files. Removed attached_assets folder, all setup/migration scripts, and documentation files not needed for production. Application now contains only essential files for functionality.
- June 30, 2025: Implemented comprehensive profile navigation system with clickable employee names/avatars throughout spaces interface. All test data now uses authentic employee information from database instead of mock data.
- June 24, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.