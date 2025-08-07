# Service Template Structure

This template defines the standard structure for all microservices.

## Directory Structure
```
/services/[service-name]/
  /src
    /api
      /controllers      # HTTP request handlers
      /routes          # Route definitions
      /middleware      # Service-specific middleware
      /validators      # Request validation schemas
    /domain
      /entities        # Domain models
      /services        # Business logic
      /events         # Domain events
      /exceptions     # Domain-specific exceptions
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
  .env.example     # Environment variables template
  Dockerfile       # Container definition
  package.json     # Dependencies
  tsconfig.json    # TypeScript configuration
  README.md        # Service documentation
```

## Base Files Required
- Service entry point (index.ts)
- Database connection
- Event bus connection
- Health check endpoint
- Service discovery registration