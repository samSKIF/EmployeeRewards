# System Architecture

## 1. Architecture Overview

### 1.1 Architecture Defaults (MVP)
- **API Gateway:** Nginx Ingress
- **Service Mesh:** None (defer to post-GA)
- **Event Bus:** Kafka
- **Databases:** Postgres per service, except Social Engagement = MongoDB
- **Contracts:** OpenAPI/JSON-Schema; typed clients generated in CI
- **Shared Backend Code:** Only `@platform/sdk` (logging, errors, tracing, HTTP client, event envelope). **No domain logic**.
- **Observability:** OpenTelemetry tracing + logs + metrics; W3C `traceparent` propagation.
- **Tenancy:** App-level checks + DB-level enforcement (Postgres RLS; Mongo tenant filters).
- **Coverage Targets (MVP):** BL 85%, API 90%, Security 100%, Events 85%. (Post-GA: 90/95/100/90)

### 1.2 Naming & Conventions
- **DB & wire payloads:** `snake_case`
- **Application code (TS/JS):** `camelCase`
- **Types/Components:** `PascalCase`
- **Constants/ENV:** `UPPER_SNAKE_CASE`
- **Filenames:** `kebab-case` (React components may be `PascalCase.tsx`)

### 1.3 Repo-specific note
- We currently have `shared/` and `services/shared/`. These are **temporary** and may contain legacy utilities.
- **Deprecated:** add no new domain logic to `shared/`.
- **Target:** move cross-cutting utilities into **`packages/platform-sdk`**; keep domain logic inside each service.

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

## 3. Code Quality & Error Handling

Use `unknown` in catch clauses and normalize to `AppError`.

```typescript
import { logger, AppError } from '@platform/sdk';

try {
  // ...
} catch (error: unknown) {
  const appErr = AppError.normalize(error, 'operation_failed').withHttp(400);
  logger.error({ code: appErr.code, message: appErr.message, stack: appErr.stack });
  throw appErr;
}
```

### 3.1 Error Handling Standards
- All catch blocks must use `unknown` type
- Normalize errors through `AppError.normalize()`
- Include structured logging with error context
- Maintain error traceability across service boundaries

### 3.2 Testing Standards
- Business Logic: 85% minimum coverage (90% post-GA)
- API Routes: 90% minimum coverage (95% post-GA)
- Security Functions: 100% required coverage
- Event Handlers: 85% minimum coverage (90% post-GA)

## 4. Service Boundaries & Communication

### 4.1 Strict Boundary Rules
**ALLOWED:**
- Service owns its database exclusively
- Service exposes REST/GraphQL/gRPC APIs
- Service publishes domain events
- Service maintains its own cache

**FORBIDDEN:**
- Direct database access across services
- Shared domain logic between services
- Synchronous cascading calls (max 1 hop)
- Storing another service's data (except IDs)

### 4.2 Event-Driven Communication
All state changes must publish events through Kafka event bus:

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

## 5. Data Management Strategy

### 5.1 Database Selection Guide
| Service | Database | Rationale |
|---------|----------|-----------|
| Employee Core | PostgreSQL | ACID compliance, relationships |
| Social Engagement | MongoDB | Flexible schema, nested documents |
| Recognition & Rewards | PostgreSQL + Redis | Transactions + Caching |
| HR Operations | PostgreSQL | Compliance, audit trails |

### 5.2 Multi-tenancy Implementation
- **PostgreSQL:** Row Level Security (RLS) policies
- **MongoDB:** Application-level tenant filtering
- **All Services:** Mandatory organization_id validation
- **API Gateway:** Tenant context propagation

## 6. Observability & Monitoring

### 6.1 OpenTelemetry Standards
- **Tracing:** W3C traceparent propagation across all services
- **Metrics:** Service-level SLIs (latency, error rate, throughput)
- **Logging:** Structured JSON logs with correlation IDs
- **Health Checks:** `/health` endpoint on all services

### 6.2 Performance Targets
- API Response Time: <200ms (95th percentile)
- Database Query Time: <100ms (95th percentile)
- Event Processing: <1s end-to-end
- Service Availability: 99.9% uptime

## 7. Security Standards

### 7.1 Authentication & Authorization
- JWT tokens with RS256 signing
- Role-based access control (RBAC)
- API key authentication for service-to-service
- Multi-factor authentication for admin access

### 7.2 Data Protection
- TLS 1.3 for all external communication
- Encryption at rest for sensitive data
- PII data classification and handling
- GDPR compliance for EU users

## 8. Deployment & Infrastructure

### 8.1 Container Strategy
- Docker containers for all services
- Multi-stage builds for optimization
- Distroless base images for security
- Resource limits and health checks

### 8.2 CI/CD Pipeline
- Automated testing on all PRs
- Contract testing between services
- Progressive deployment (canary/blue-green)
- Automated rollback on failure

## 9. Migration Strategy

### 9.1 Current Status
- **Employee Core Service:** 85% complete, production-ready
- **Legacy Monolith:** Still serving traffic, gradual migration
- **Dual-write Pattern:** Implemented for data consistency
- **Feature Flags:** Control traffic routing during migration

### 9.2 Next Steps
1. Complete HR Operations Service migration
2. Extract Recognition & Rewards Service
3. Migrate Social Engagement to MongoDB
4. Implement full event-driven architecture
5. Sunset legacy monolith endpoints

## 10. Compliance & Validation

### 10.1 Architecture Compliance Checklist
- [ ] Service has dedicated database
- [ ] No shared domain logic with other services
- [ ] All state changes publish events
- [ ] Error handling uses AppError.normalize()
- [ ] Test coverage meets minimum thresholds
- [ ] OpenAPI contracts defined and validated
- [ ] Health checks implemented
- [ ] Observability instrumentation complete

### 10.2 Code Review Requirements
- Architecture compliance validation
- Security review for all changes
- Performance impact assessment
- Test coverage verification
- Documentation updates