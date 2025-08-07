# ThrivioHR System Architecture & Development Standards
**Version:** 2.0 | **Last Updated:** August 2025 | **Status:** ENFORCED

> **⚠️ MANDATORY**: This document is the single source of truth for all architectural decisions and development standards. All code MUST comply with these guidelines. Non-compliance will result in rejection during code review.

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Service Architecture](#2-service-architecture)
3. [Golden Development Standards](#3-golden-development-standards)
4. [Service Boundaries & Responsibilities](#4-service-boundaries--responsibilities)
5. [Communication Patterns](#5-communication-patterns)
6. [Data Management Strategy](#6-data-management-strategy)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Code Organization Rules](#8-code-organization-rules)
9. [Implementation Checklist](#9-implementation-checklist)
10. [Compliance Validation](#10-compliance-validation)

---

## 1. Architecture Overview

### Core Architecture Pattern: Domain-Driven Microservices
```
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway                          │
│                    (Kong/Traefik/Nginx)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                     Service Mesh                            │
│                    (Istio/Linkerd)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┬──────────────┐
     │               │               │              │
┌────▼────┐    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
│Employee │    │ Social  │    │   HR    │    │Recognition│
│  Core   │    │Engagement│   │Operations│   │ & Rewards │
│    DB   │    │    DB   │    │    DB   │    │    DB    │
└─────────┘    └─────────┘    └─────────┘    └──────────┘
     │               │               │              │
     └───────────────┼───────────────┼──────────────┘
                     │               │
              ┌──────▼───────────────▼──────┐
              │      Event Bus (Kafka)      │
              └─────────────────────────────┘
```

### Key Principles
1. **Database per Service**: Each service owns its data exclusively
2. **API-First Communication**: Services communicate only through APIs
3. **Event-Driven Architecture**: Asynchronous communication via event bus
4. **No Shared Code**: Services are completely independent
5. **Domain Boundaries**: Clear separation of business domains

---

## 2. Service Architecture

### 2.1 Employee Core Service
**Path:** `/services/employee-core/`
**Port:** 3001
**Database:** PostgreSQL (employee_core_db)

**Responsibilities:**
- User authentication & authorization
- Employee profiles and personal data
- Department & team management
- Organizational hierarchy
- Role-based access control (RBAC)
- Account lifecycle management

**Owned Entities:**
```typescript
- User (id, username, email, password_hash, status)
- Employee (id, user_id, employee_code, personal_details)
- Department (id, name, parent_id, manager_id)
- Team (id, department_id, name, lead_id)
- Role (id, name, permissions[])
- OrgChart (employee_id, reports_to_id, position)
```

### 2.2 Social Engagement Service
**Path:** `/services/social-engagement/`
**Port:** 3002
**Database:** MongoDB (social_engagement_db)

**Responsibilities:**
- Social posts, comments, likes
- Activity feeds and timelines
- Interest groups and communities
- Channels and communication hubs
- User interactions and engagement
- Social profiles and connections

**Owned Entities:**
```typescript
- Post (id, author_id, content, type, attachments[])
- Comment (id, post_id, author_id, content)
- Like (id, target_type, target_id, user_id)
- InterestGroup (id, name, description, members[])
- Channel (id, name, type, privacy, members[])
- Activity (id, user_id, action, target, timestamp)
```

### 2.3 Recognition & Rewards Service
**Path:** `/services/recognition-rewards/`
**Port:** 3003
**Database:** PostgreSQL (recognition_db) + Redis Cache

**Responsibilities:**
- Peer-to-peer recognition
- Manager recognition
- Points management and ledger
- Badges and achievements
- Leaderboards and rankings
- Reward redemption tracking

**Owned Entities:**
```typescript
- Recognition (id, from_user_id, to_user_id, type, message, points)
- PointsLedger (id, user_id, transaction_type, amount, balance)
- Badge (id, name, criteria, icon_url)
- UserBadge (user_id, badge_id, earned_date)
- Leaderboard (id, type, period, rankings[])
```

### 2.4 HR Operations Service
**Path:** `/services/hr-operations/`
**Port:** 3004
**Database:** PostgreSQL (hr_operations_db)

**Responsibilities:**
- Leave management
- Performance reviews
- Employee lifecycle events
- Compliance and documentation
- HR policies and procedures
- Workforce planning

**Owned Entities:**
```typescript
- LeaveRequest (id, employee_id, type, start_date, end_date, status)
- LeaveBalance (employee_id, leave_type, balance, used)
- PerformanceReview (id, employee_id, reviewer_id, period, ratings)
- Document (id, employee_id, type, url, status)
- Policy (id, name, content, effective_date)
```

### 2.5 Communication Service
**Path:** `/services/communication/`
**Port:** 3005
**Database:** PostgreSQL (communication_db) + Redis

**Responsibilities:**
- Mass communications and broadcasts
- Email notifications
- Push notifications
- In-app notifications
- Announcement management
- Newsletter distribution

**Owned Entities:**
```typescript
- Announcement (id, title, content, audience, priority)
- Notification (id, user_id, type, content, read_status)
- EmailTemplate (id, name, subject, body, variables[])
- Campaign (id, name, audience, channels[], schedule)
- NotificationPreference (user_id, channel, types[])
```

### 2.6 Onboarding Service
**Path:** `/services/onboarding/`
**Port:** 3006
**Database:** PostgreSQL (onboarding_db)

**Responsibilities:**
- Onboarding workflows
- Task assignment and tracking
- Document collection
- Training schedules
- Buddy/mentor assignment
- Progress monitoring

**Owned Entities:**
```typescript
- OnboardingPlan (id, employee_id, start_date, template_id)
- OnboardingTask (id, plan_id, title, assignee_id, status)
- DocumentRequest (id, plan_id, document_type, status)
- Training (id, plan_id, name, scheduled_date, completed)
- BuddyAssignment (plan_id, buddy_id, start_date, end_date)
```

### 2.7 Analytics Service
**Path:** `/services/analytics/`
**Port:** 3007
**Database:** ClickHouse/TimescaleDB (analytics_db)

**Responsibilities:**
- Data aggregation and warehousing
- Report generation
- Dashboard metrics
- Predictive analytics
- AI/ML model serving
- Business intelligence

**Owned Entities:**
```typescript
- Metric (id, name, value, timestamp, dimensions{})
- Report (id, name, type, parameters, schedule)
- Dashboard (id, name, widgets[], refresh_rate)
- DataPipeline (id, source, transformations[], destination)
- MLModel (id, name, version, endpoint, metrics{})
```

### 2.8 Marketplace Service
**Path:** `/services/marketplace/`
**Port:** 3008
**Database:** PostgreSQL (marketplace_db)

**Responsibilities:**
- Product catalog management
- Points redemption
- Order processing
- Vendor management
- Inventory tracking
- Transaction processing

**Owned Entities:**
```typescript
- Product (id, name, description, points_cost, stock)
- Order (id, user_id, items[], total_points, status)
- Transaction (id, order_id, points, timestamp, status)
- Vendor (id, name, products[], commission_rate)
- Inventory (product_id, quantity, reserved, available)
```

---

## 3. Golden Development Standards

### 3.1 Code Quality Standards (Target: 95/100)

#### MANDATORY Requirements:
```typescript
// ✅ CORRECT: Enterprise Error Handling
try {
  const result = await someOperation();
  return result;
} catch (error: any) {
  logger.error('Operation failed', {
    error: error?.message || 'unknown_error',
    stack: error?.stack,
    context: { /* relevant context */ }
  });
  throw new ServiceError(
    'OPERATION_FAILED',
    error?.message || 'Operation failed',
    500
  );
}

// ❌ WRONG: Poor error handling
try {
  const result = await someOperation();
  return result;
} catch (error) {
  console.log(error);
  throw error;
}
```

#### Database Operations:
```typescript
// ✅ CORRECT: Soft delete with audit trail
async deleteEmployee(id: number, deletedBy: number): Promise<void> {
  await db.transaction(async (trx) => {
    // Archive current state
    const current = await trx.select().from(employees).where(eq(employees.id, id)).single();
    await trx.insert(employeeAudit).values({
      ...current,
      action: 'DELETE',
      performed_by: deletedBy,
      performed_at: new Date()
    });
    
    // Soft delete
    await trx.update(employees)
      .set({ 
        status: 'deleted',
        deleted_at: new Date(),
        deleted_by: deletedBy
      })
      .where(eq(employees.id, id));
  });
}

// ❌ WRONG: Hard delete
await db.delete(employees).where(eq(employees.id, id));
```

### 3.2 API Design Standards

#### RESTful Endpoints:
```typescript
// ✅ CORRECT: Consistent API design
GET    /api/v1/employees?page=1&limit=20&sort=name
GET    /api/v1/employees/:id
POST   /api/v1/employees
PATCH  /api/v1/employees/:id
DELETE /api/v1/employees/:id  // Soft delete

// Response format
{
  "success": true,
  "data": { /* entity or array */ },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasMore": true
  },
  "message": "Employees retrieved successfully"
}

// Error format
{
  "success": false,
  "error": "VALIDATION_FAILED",
  "message": "Email is already in use",
  "details": { /* field-specific errors */ }
}
```

### 3.3 Event Standards

#### Event Publishing:
```typescript
// ✅ CORRECT: Rich event with full context
await eventBus.publish({
  type: 'employee.created',
  version: '1.0',
  id: generateEventId(),
  timestamp: new Date().toISOString(),
  source: 'employee-core-service',
  correlationId: req.correlationId,
  data: {
    employee: {
      id: employee.id,
      username: employee.username,
      department_id: employee.department_id
    },
    organization: {
      id: org.id
    },
    created_by: {
      id: user.id
    }
  },
  metadata: {
    ip_address: req.ip,
    user_agent: req.headers['user-agent']
  }
});
```

### 3.4 Testing Standards

#### Coverage Requirements:
- Business Logic: **95%** minimum
- API Routes: **90%** minimum
- Security Functions: **100%** required
- Event Handlers: **85%** minimum

#### Test Structure:
```typescript
describe('EmployeeService', () => {
  describe('createEmployee', () => {
    it('should create employee with valid data', async () => {
      // Arrange
      const data = buildEmployeeData();
      
      // Act
      const result = await service.createEmployee(data);
      
      // Assert
      expect(result).toMatchObject({
        id: expect.any(Number),
        username: data.username
      });
      
      // Verify events
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'employee.created'
        })
      );
    });
    
    it('should handle duplicate username error', async () => {
      // Test error scenarios
    });
  });
});
```

---

## 4. Service Boundaries & Responsibilities

### 4.1 Strict Boundary Rules

#### ALLOWED:
- Service owns its database exclusively
- Service exposes REST/GraphQL/gRPC APIs
- Service publishes domain events
- Service maintains its own cache

#### FORBIDDEN:
- Direct database access across services
- Shared libraries between services
- Synchronous cascading calls (max 1 hop)
- Storing another service's data (except IDs)

### 4.2 Data Ownership Matrix

| Data Type | Owner Service | Consumers | Access Method |
|-----------|--------------|-----------|---------------|
| User Authentication | Employee Core | All | JWT Token |
| Employee Profile | Employee Core | All | API/Events |
| Social Posts | Social Engagement | Analytics | API/Events |
| Leave Requests | HR Operations | Employee Core | API/Events |
| Recognition | Recognition & Rewards | Social, Analytics | Events |
| Notifications | Communication | All | API |
| Points Balance | Recognition & Rewards | Marketplace | API |

---

## 5. Communication Patterns

### 5.1 Synchronous Communication (REST/gRPC)

#### When to Use:
- User-initiated requests requiring immediate response
- Data queries for UI rendering
- Authentication/authorization checks

#### Implementation:
```typescript
// Service-to-service client
class EmployeeServiceClient {
  private readonly baseUrl = process.env.EMPLOYEE_SERVICE_URL;
  private readonly timeout = 5000; // 5 seconds
  
  async getEmployee(id: number): Promise<Employee> {
    const response = await fetch(`${this.baseUrl}/internal/employees/${id}`, {
      headers: {
        'X-Service-Auth': this.getServiceToken(),
        'X-Correlation-Id': this.correlationId
      },
      timeout: this.timeout
    });
    
    if (!response.ok) {
      throw new ServiceUnavailableError('Employee service unavailable');
    }
    
    return response.json();
  }
}
```

### 5.2 Asynchronous Communication (Events)

#### When to Use:
- State changes that multiple services care about
- Long-running operations
- Eventual consistency scenarios
- Decoupled workflows

#### Event Categories:
```typescript
// Domain Events (state changes)
'employee.created'
'employee.updated'
'employee.deleted'
'employee.department_changed'

// Command Events (trigger actions)
'send.welcome_email'
'calculate.leave_balance'
'update.org_chart'

// Integration Events (external systems)
'payroll.sync_required'
'ad.user_created'
```

### 5.3 Saga Pattern for Distributed Transactions

```typescript
// Employee Onboarding Saga
class OnboardingSaga {
  private steps = [
    { service: 'employee-core', action: 'createAccount', compensate: 'deleteAccount' },
    { service: 'hr-operations', action: 'initializeLeaveBalance', compensate: 'removeLeaveBalance' },
    { service: 'communication', action: 'sendWelcomeEmail', compensate: null },
    { service: 'onboarding', action: 'createPlan', compensate: 'deletePlan' }
  ];
  
  async execute(data: OnboardingData): Promise<void> {
    const executedSteps = [];
    
    try {
      for (const step of this.steps) {
        await this.executeStep(step, data);
        executedSteps.push(step);
      }
    } catch (error) {
      // Compensate in reverse order
      await this.compensate(executedSteps.reverse(), data);
      throw error;
    }
  }
}
```

---

## 6. Data Management Strategy

### 6.1 Database Selection Guide

| Service | Database | Rationale |
|---------|----------|-----------|
| Employee Core | PostgreSQL | ACID compliance, relationships |
| Social Engagement | MongoDB | Flexible schema, nested documents |
| Recognition & Rewards | PostgreSQL + Redis | Transactions + Caching |
| HR Operations | PostgreSQL | Compliance, audit trails |
| Communication | PostgreSQL + Redis | Queue management |
| Onboarding | PostgreSQL | Workflow state management |
| Analytics | ClickHouse | Time-series, aggregations |
| Marketplace | PostgreSQL | Transactions, inventory |

### 6.2 Data Synchronization Patterns

#### Event-Carried State Transfer:
```typescript
// When employee department changes
await eventBus.publish({
  type: 'employee.department_changed',
  data: {
    employee_id: 123,
    old_department: { id: 1, name: 'Engineering' },
    new_department: { id: 2, name: 'Product' },
    effective_date: '2025-08-01'
  }
});

// Social service updates user's display info
eventBus.subscribe('employee.department_changed', async (event) => {
  await updateUserDisplay(event.data.employee_id, {
    department: event.data.new_department.name
  });
});
```

### 6.3 CQRS Implementation

```typescript
// Command Model (Write)
class EmployeeCommandService {
  async createEmployee(data: CreateEmployeeDto): Promise<void> {
    const employee = await this.repository.create(data);
    await this.eventBus.publish('employee.created', employee);
  }
}

// Query Model (Read)
class EmployeeQueryService {
  private readonly cache = new Redis();
  
  async getEmployeeView(id: number): Promise<EmployeeView> {
    // Check cache first
    const cached = await this.cache.get(`employee:${id}`);
    if (cached) return JSON.parse(cached);
    
    // Build view from multiple sources
    const employee = await this.getEmployeeData(id);
    const recognition = await this.recognitionClient.getStats(id);
    const social = await this.socialClient.getProfile(id);
    
    const view = {
      ...employee,
      recognition_points: recognition.total_points,
      social_connections: social.connections_count
    };
    
    await this.cache.setex(`employee:${id}`, 300, JSON.stringify(view));
    return view;
  }
}
```

---

## 7. Frontend Architecture

### 7.1 Micro-Frontend Structure

```
/apps
  /employee-portal          # Main employee application
    /src
      /features
        /profile           # Employee profile module
        /dashboard         # Dashboard module
        /leave            # Leave management module
      /shared
        /api              # API clients
        /components       # Shared components
        /hooks           # Shared hooks
        
  /admin-dashboard         # Admin application
    /src
      /features
        /employees       # Employee management
        /analytics      # Analytics dashboard
        /settings       # System settings
        
  /marketplace           # Marketplace application
    /src
      /features
        /catalog        # Product catalog
        /cart          # Shopping cart
        /orders        # Order history
```

### 7.2 State Management

```typescript
// Feature-based state slices
/store
  /slices
    /auth.slice.ts
    /employee.slice.ts
    /notification.slice.ts
  /middleware
    /api.middleware.ts
    /websocket.middleware.ts
  /selectors
    /employee.selectors.ts
```

### 7.3 API Integration Layer

```typescript
// Generated API client from OpenAPI spec
import { EmployeeServiceApi } from '@generated/employee-service';

// Wrapper with authentication and error handling
class EmployeeApiClient {
  private api: EmployeeServiceApi;
  
  constructor() {
    this.api = new EmployeeServiceApi({
      basePath: process.env.VITE_API_GATEWAY_URL,
      headers: {
        'Authorization': () => `Bearer ${getAuthToken()}`
      }
    });
  }
  
  async getEmployee(id: number): Promise<Employee> {
    try {
      return await this.api.getEmployee(id);
    } catch (error) {
      this.handleApiError(error);
    }
  }
  
  private handleApiError(error: any): never {
    if (error.status === 401) {
      // Trigger re-authentication
      store.dispatch(logout());
    }
    throw new ApiError(error.message, error.status);
  }
}
```

---

## 8. Code Organization Rules

### 8.1 Service Structure

```
/services/[service-name]/
  /src
    /api
      /controllers      # HTTP request handlers
      /routes          # Route definitions
      /middleware      # Service-specific middleware
      /validators      # Request validation
    /domain
      /entities        # Domain models
      /services        # Business logic
      /events         # Domain events
      /exceptions     # Domain exceptions
    /infrastructure
      /database       # Database configuration
      /repositories   # Data access layer
      /cache         # Cache implementations
      /messaging     # Event bus integration
    /application
      /commands      # Command handlers (CQRS)
      /queries       # Query handlers (CQRS)
      /sagas        # Saga orchestrators
    /tests
      /unit         # Unit tests
      /integration  # Integration tests
      /e2e         # End-to-end tests
  /config           # Configuration files
  /scripts         # Deployment/migration scripts
  Dockerfile       # Container definition
  package.json     # Dependencies
  README.md        # Service documentation
```

### 8.2 Naming Conventions

```typescript
// Files
employee.entity.ts        // Entities
employee.service.ts       // Services
employee.controller.ts    // Controllers
employee.repository.ts    // Repositories
employee.created.event.ts // Events
employee.dto.ts          // DTOs

// Variables & Functions
const employee_id = 123;  // Snake_case for database fields
const userId = 123;       // camelCase for application code
const CACHE_TTL = 300;    // UPPER_CASE for constants

// Classes & Interfaces
class EmployeeService {}
interface IEmployeeRepository {}
type EmployeeCreateDto = {}
enum EmployeeStatus {}
```

### 8.3 Import Order

```typescript
// 1. Node modules
import express from 'express';
import { Injectable } from '@nestjs/common';

// 2. Service imports
import { EmployeeService } from '@services/employee-core';

// 3. Domain imports
import { Employee } from '@domain/entities/employee.entity';
import { EmployeeCreatedEvent } from '@domain/events';

// 4. Infrastructure imports
import { PostgresRepository } from '@infrastructure/database';

// 5. Shared/Common imports
import { logger } from '@shared/logger';
import { BaseController } from '@shared/base';

// 6. Relative imports
import { validateEmployee } from './validators';
import type { EmployeeDto } from './types';
```

---

## 9. Implementation Checklist

### Before Writing Any Code:

#### Architecture Compliance
- [ ] Service boundary clearly defined?
- [ ] Database isolation maintained?
- [ ] No shared code between services?
- [ ] Event-driven communication used?
- [ ] API contracts defined?

#### Code Quality
- [ ] Error handling follows gold standard?
- [ ] All catch blocks typed properly?
- [ ] Soft delete implemented?
- [ ] Audit trail included?
- [ ] Snake_case for database fields?

#### Testing
- [ ] Unit tests written (95% coverage)?
- [ ] Integration tests included?
- [ ] Event handlers tested?
- [ ] Error scenarios covered?
- [ ] Performance benchmarks met?

#### Documentation
- [ ] API documentation updated?
- [ ] Event schemas documented?
- [ ] README updated?
- [ ] Architecture decision recorded?

#### Security
- [ ] Authentication required?
- [ ] Authorization checked?
- [ ] Input validation complete?
- [ ] SQL injection prevented?
- [ ] Sensitive data encrypted?

---

## 10. Compliance Validation

### Automated Checks

```typescript
// Pre-commit hook validation
export function validateArchitectureCompliance(files: string[]): ValidationResult {
  const violations = [];
  
  // Check service boundaries
  if (hasSharedDatabaseAccess(files)) {
    violations.push('Services must not share database access');
  }
  
  // Check error handling
  if (hasUnTypedCatchBlocks(files)) {
    violations.push('All catch blocks must be typed as (error: any)');
  }
  
  // Check soft deletes
  if (hasHardDeletes(files)) {
    violations.push('Hard deletes are forbidden - use soft delete pattern');
  }
  
  // Check event publishing
  if (hasMissingEventPublishing(files)) {
    violations.push('State changes must publish domain events');
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
}
```

### Manual Review Checklist

#### Service Review
- [ ] Single responsibility principle followed?
- [ ] Bounded context properly defined?
- [ ] Dependencies minimized?
- [ ] Resilience patterns implemented?

#### API Review
- [ ] RESTful conventions followed?
- [ ] Versioning implemented?
- [ ] Rate limiting configured?
- [ ] Documentation complete?

#### Database Review
- [ ] Schema optimized?
- [ ] Indexes appropriate?
- [ ] Migrations versioned?
- [ ] Backup strategy defined?

#### Security Review
- [ ] OWASP Top 10 addressed?
- [ ] Secrets management proper?
- [ ] Encryption at rest/transit?
- [ ] Audit logging complete?

---

## Enforcement & Governance

### Violation Consequences

| Severity | Examples | Action |
|----------|----------|--------|
| CRITICAL | Shared database access, Hard deletes, No error handling | Block deployment |
| HIGH | Missing events, Poor test coverage, No audit trail | Require immediate fix |
| MEDIUM | Naming violations, Import order, File size | Fix in next sprint |
| LOW | Documentation gaps, Code formatting | Track for cleanup |

### Architecture Review Board

**Weekly Reviews:**
- New service proposals
- Major refactoring plans
- Technology additions
- Pattern changes

**Approval Required For:**
- New services
- Database changes
- API breaking changes
- New dependencies
- Infrastructure changes

---

## Living Document Notice

This architecture document is maintained and enforced through:
1. Automated CI/CD checks
2. Code review requirements
3. Quarterly architecture reviews
4. Team training sessions

**Last Architecture Review:** August 2025
**Next Scheduled Review:** November 2025
**Contact:** architecture@thriviohr.com

---

**Remember:** Every line of code contributes to either technical debt or technical wealth. Choose wealth.