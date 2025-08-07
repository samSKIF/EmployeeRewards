# Employee Management Vertical Slice

A complete vertical slice implementation for employee management functionality using event-driven architecture.

## Overview

This vertical slice provides complete employee management capabilities including:
- Employee CRUD operations with validation
- Event-driven communication for cross-cutting concerns
- Domain-driven design with clear separation of layers
- Comprehensive error handling and logging
- Integration tests and business rule validation

## Architecture

### Layers

1. **API Layer** (`api/`)
   - `employee.controller.ts` - HTTP request handling and coordination
   - `employee.routes.ts` - Route definitions and middleware setup

2. **Domain Layer** (`domain/`)
   - `employee.domain.ts` - Business logic, validation, and domain events

3. **Infrastructure Layer** (`infrastructure/`)
   - `employee.repository.ts` - Data access and persistence

4. **Events Layer** (`events/`)
   - `employee.event-handlers.ts` - Cross-cutting concern handlers

5. **Tests Layer** (`tests/`)
   - `employee.integration.test.ts` - End-to-end vertical slice testing

## Usage

### API Endpoints

All endpoints require authentication and admin permissions.

- `GET /api/employees` - List employees with filters and pagination
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Deactivate employee (soft delete)
- `GET /api/employees/departments` - Get organization departments
- `GET /api/employees/department/:department` - Get employees by department

### Events Published

The employee management slice publishes domain events for:
- `employee.created` - When a new employee is created
- `employee.updated` - When employee data is updated
- `employee.deactivated` - When an employee is deactivated
- `employee.role_changed` - When employee role changes
- `employee.department_changed` - When employee department changes

### Business Rules

- Email addresses must be unique within organization
- Only employees with admin roles can create other employees
- Cannot create corporate admin users through employee creation
- Hire date cannot be in the future
- Employee deactivation requires a reason
- Certain changes trigger additional workflow events

## Integration

The vertical slice is integrated into the main application through:

1. **Route Registration**: Added to `server/routes.ts`
2. **Event Handlers**: Initialized during application startup
3. **Database**: Uses existing user schema and database connection
4. **Authentication**: Leverages existing auth middleware

## Event-Driven Communication

The slice publishes domain events that can be consumed by other features:
- Recognition system can respond to employee role changes
- Social features can update when employees are created/updated
- Leave management can handle employee deactivation
- Analytics can track employee lifecycle metrics

## Testing

Run the integration tests:

```bash
npm test server/features/employee-management/tests/
```

## Development

To extend the employee management slice:

1. **Add new business rules**: Update `domain/employee.domain.ts`
2. **Add new data operations**: Extend `infrastructure/employee.repository.ts`
3. **Add new endpoints**: Update `api/employee.controller.ts` and `api/employee.routes.ts`
4. **Add event handling**: Extend `events/employee.event-handlers.ts`
5. **Add tests**: Extend `tests/employee.integration.test.ts`

## Dependencies

- **Database**: PostgreSQL via Drizzle ORM
- **Events**: Shared event system (`@shared/events`)
- **Validation**: Zod schemas
- **Authentication**: Existing auth middleware
- **Logging**: Shared logger (`@shared/logger`)

## Migration from Legacy Routes

This vertical slice replaces the legacy employee routes in:
- `server/routes/admin/employee/` - Migrated to vertical slice pattern
- Direct database access patterns - Now uses repository pattern
- Scattered business logic - Now centralized in domain layer