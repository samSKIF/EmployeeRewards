# Employee Core Service

## Overview
The Employee Core Service is the foundational microservice for the ThrivioHR platform. It handles:
- User authentication (JWT)
- Employee management
- Department & team management
- Organization hierarchy
- Audit logging

**Port:** 3001  
**Database:** PostgreSQL (employee_core_db)  
**Architecture:** Event-driven microservice

## Features
- JWT-based authentication
- Complete user CRUD with soft deletes
- Department and team management
- Organization chart support
- Comprehensive audit trail
- Event publishing for all state changes

## Setup

### 1. Install Dependencies
```bash
cd services/employee-core
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Setup Database
```bash
# Create the database
createdb employee_core_db

# Run migrations
npm run migrate
```

### 4. Start Service
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/validate` - Validate session
- `POST /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/reset-password` - Reset password (admin)

### Employee Management
- `GET /api/v1/employees` - List employees
- `GET /api/v1/employees/:id` - Get employee
- `POST /api/v1/employees` - Create employee
- `PATCH /api/v1/employees/:id` - Update employee
- `DELETE /api/v1/employees/:id` - Delete employee (soft)
- `GET /api/v1/employees/:id/subordinates` - Get subordinates

### Department Management
- `GET /api/v1/departments` - List departments
- `GET /api/v1/departments/:id` - Get department
- `POST /api/v1/departments` - Create department
- `PATCH /api/v1/departments/:id` - Update department
- `DELETE /api/v1/departments/:id` - Delete department (soft)
- `GET /api/v1/departments/:id/hierarchy` - Get hierarchy

### Health & Metrics
- `GET /health` - Service health check
- `GET /metrics` - Service metrics

## Events Published

### Authentication Events
- `auth.user_logged_in`
- `auth.user_logged_out`
- `auth.password_changed`
- `auth.password_reset`

### Employee Events
- `employee.created`
- `employee.updated`
- `employee.deleted`
- `employee.department_changed`

### Department Events
- `department.created`
- `department.updated`
- `department.deleted`

## Events Consumed
- `leave.request_approved` - Update user leave status
- `recognition.given` - Update user recognition stats
- `social.post_created` - Track user activity

## Database Schema
- `users` - Employee accounts
- `departments` - Department structure
- `organizations` - Organization data
- `teams` - Team structure
- `team_members` - Team membership
- `sessions` - User sessions
- `audit_logs` - Complete audit trail

## Testing
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

## Monitoring
- Health endpoint: `http://localhost:3001/health`
- Metrics endpoint: `http://localhost:3001/metrics`

## Migration from Monolith
This service replaces:
- `/server/features/employee-management/`
- `/server/middleware/auth.ts`
- User-related routes from the monolith

During migration phase:
1. Service runs in parallel with monolith
2. Dual-write pattern for data consistency
3. Gradual traffic migration via API Gateway
4. Complete cutover after validation

## Architecture Compliance
✅ Follows SYSTEM_ARCHITECTURE.md  
✅ Database per service  
✅ Event-driven communication  
✅ No shared code  
✅ Comprehensive audit logging  
✅ Soft deletes only  
✅ 95% test coverage target