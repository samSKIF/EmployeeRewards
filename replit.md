# ThrivioHR Platform

## Overview

This is a comprehensive, modular HR and employee engagement platform built with React, TypeScript, Express, and modern web technologies. ThrivioHR provides social features, recognition systems, leave management, and marketplace functionality with a microservices architecture designed for multi-tenant SaaS deployment.

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

- July 24, 2025: Cleaned up repository by removing attached_assets directory containing development screenshots and logs. Enhanced .gitignore to prevent tracking of log files (*.log), screenshot images (image_*.png, *screenshot*.png), backup files (*.bak), temporary files (*.tmp), and local environment overrides (.env.local). Note: @assets alias remains in vite.config.ts but is unused and harmless.
- July 24, 2025: Implemented active-only employee count system for subscription capacity management. Modified employee count calculations to only include employees with 'active' status for subscription limits validation, excluding inactive, terminated, and pending employees. Added employee status filter toggle in directory to view "All Employees" or "Active Only". Updated usage statistics dashboard to display active employees count vs total employees with clear labeling. Updated subscription validation in user registration to enforce limits based only on active employees. This ensures accurate capacity management where non-active employees don't consume subscription seats.
- July 21, 2025: Fixed critical employee birthday edit persistence bug in Employee Directory. Issue was caused by field mapping mismatch between frontend camelCase (birthDate, phoneNumber, jobTitle, hireDate, avatarUrl, managerEmail) and database snake_case (birth_date, phone_number, job_title, hire_date, avatar_url, manager_email). Updated adminRoutes.ts field mapping to correctly translate frontend field names to database column names. Employee birthday updates now save permanently and persist across browser sessions. Also completed implementation of automatic celebration post generation system with daily cron job (6 AM), distinctive pink/blue gradient styling for birthdays/anniversaries, employee tagging, duplicate prevention, and clickable names navigation to profiles.
- July 21, 2025: Enhanced Team Celebrations feature with clickable names that navigate to user profiles and updated notification timeframe. Made celebration person names clickable throughout the celebrations interface to navigate to profile pages using navigate(`/profile/${userId}`). Updated celebration notifications from 5-day range to 3-day range (3 days before + today + 3 days after) for both upcoming and extended celebrations endpoints. Fixed missing /api/celebrations/extended endpoint that was causing empty Team Celebrations modal. Restructured Team Celebrations modal to remove the top grid section and organize events with clear sections: "Today" first, then "Earlier" events, then "Upcoming" events. All celebration timeframes now properly use 3-day window for more focused notifications. Fixed celebration preview in feed to prioritize today's celebrations first before upcoming ones, with "Today" label in pink text. Added profile navigation routes and clickable employee names in directory with proper multi-tenant security.
- July 17, 2025: Enhanced social feed with Facebook-style like functionality. Implemented POST /api/social/reactions and DELETE /api/social/reactions/:postId endpoints with proper timestamp storage for engagement metrics. Added LikesModal component showing clickable user profiles who liked posts. Implemented comment liking with comment_reactions table. Updated GET /posts endpoint to include reactionCounts broken down by type and userReaction for current user. Removed sharing features from social feed UI as requested. All reactions now store created_at timestamps for proper engagement tracking.
- July 17, 2025: Fixed critical multi-tenant security vulnerability in Employee Directory. Implemented proper data isolation by adding organizationId filtering to storage.getUsers() and getUserCount() methods. Updated /api/users endpoint to filter employees by req.user.organizationId, ensuring users only see employees from their own organization. Confirmed departments and locations endpoints already had proper organization filtering. Multi-tenant data isolation now properly enforced throughout the system.
- July 15, 2025: Successfully completed transition to subscribedUsers as single source of truth for user capacity limits. Removed maxUsers field from organizations and subscriptions tables throughout the entire system. Updated user registration validation to enforce limits based on subscribedUsers from active subscription service. Modified management dashboard to display subscribedUsers as "Max Employees" with real user counts from database. Updated organization creation form to remove maxUsers field. All user limit enforcement now properly validates against subscription's subscribedUsers value, ensuring accurate capacity management across the multi-tenant platform.
- July 14, 2025: Implemented comprehensive subscription-based access control system. Organizations without active subscriptions are automatically marked as "inactive" and their team members cannot login, receiving message "The system is inactive please contact the admin: [superuser_email]". Corporate admins can always access the system. Management dashboard correctly displays subscription status with real-time validation. Fixed SQL parameter errors in management API. Updated platform branding from "Empulse" to "ThrivioHR" throughout the entire codebase. Changed all user-facing text from "Employee" references to "Team Member" terminology. Updated management dashboard, README, and all documentation to reflect ThrivioHR branding. Also implemented comprehensive subscription management system for multi-tenant organizations with PostgreSQL schema migration, backend API endpoints, and management dashboard integration.
- July 13, 2025: Successfully completed organization edit form implementation with proper field population. Fixed critical database schema issue by adding missing 'type' column to organizations table. Enhanced API response handling for cached requests and improved form data mapping to correctly populate all fields with existing organization data including contact information, address details, and organizational settings. Form now displays authentic data from database for editing capabilities.
- July 13, 2025: Enhanced organization creation form with comprehensive world countries list (240+ countries) featuring keyboard navigation, dynamic address fields, and manual number input for maximum users. Fixed database schema synchronization issues by adding missing columns (logo_url, settings, parent_org_id) and resolved organization display bugs to properly show max employees field.
- July 13, 2025: Implemented direct corporate login routing. "Login as Corporate" button now redirects directly to `/management` dashboard instead of intermediate corporate-login page, providing streamlined access to corporate admin features including company management, platform analytics, merchant management, product management, wallet management, and financial overview.
- July 3, 2025: Cleaned up codebase by removing all data creation scripts and unnecessary files. Removed attached_assets folder, all setup/migration scripts, and documentation files not needed for production. Application now contains only essential files for functionality.
- June 30, 2025: Implemented comprehensive profile navigation system with clickable employee names/avatars throughout spaces interface. All test data now uses authentic employee information from database instead of mock data.
- June 24, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.