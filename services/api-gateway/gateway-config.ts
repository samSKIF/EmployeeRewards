// API Gateway Configuration
// Defines routing rules and service registry

export interface ServiceConfig {
  name: string;
  url: string;
  prefix: string;
  healthCheck: string;
  version: string;
  rewrite?: boolean;
}

export const gatewayConfig = {
  port: 3000,
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100,
  enableMetrics: true,
  enableHealthChecks: true,
  
  // Service registry with routing rules
  services: [
    {
      name: 'employee-core',
      url: 'http://localhost:3001',
      prefix: '/api/v1/auth',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    {
      name: 'employee-core',
      url: 'http://localhost:3001',
      prefix: '/api/v1/employees',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    {
      name: 'employee-core',
      url: 'http://localhost:3001',
      prefix: '/api/v1/departments',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    {
      name: 'employee-core',
      url: 'http://localhost:3001',
      prefix: '/api/v1/organizations',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    {
      name: 'employee-core',
      url: 'http://localhost:3001',
      prefix: '/api/v1/teams',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    // HR Operations Service (future)
    {
      name: 'hr-operations',
      url: 'http://localhost:3004',
      prefix: '/api/v1/leave',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    {
      name: 'hr-operations',
      url: 'http://localhost:3004',
      prefix: '/api/v1/performance',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    // Recognition & Rewards Service (future)
    {
      name: 'recognition-rewards',
      url: 'http://localhost:3003',
      prefix: '/api/v1/recognition',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    {
      name: 'recognition-rewards',
      url: 'http://localhost:3003',
      prefix: '/api/v1/points',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    {
      name: 'recognition-rewards',
      url: 'http://localhost:3003',
      prefix: '/api/v1/badges',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    // Social Engagement Service (future)
    {
      name: 'social-engagement',
      url: 'http://localhost:3002',
      prefix: '/api/v1/posts',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    {
      name: 'social-engagement',
      url: 'http://localhost:3002',
      prefix: '/api/v1/spaces',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    {
      name: 'social-engagement',
      url: 'http://localhost:3002',
      prefix: '/api/v1/interests',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    // Communication Service (future)
    {
      name: 'communication',
      url: 'http://localhost:3005',
      prefix: '/api/v1/notifications',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    {
      name: 'communication',
      url: 'http://localhost:3005',
      prefix: '/api/v1/messaging',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    // Analytics Service (future)
    {
      name: 'analytics',
      url: 'http://localhost:3007',
      prefix: '/api/v1/analytics',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    {
      name: 'analytics',
      url: 'http://localhost:3007',
      prefix: '/api/v1/reports',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    // Marketplace Service (future)
    {
      name: 'marketplace',
      url: 'http://localhost:3008',
      prefix: '/api/v1/shop',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    {
      name: 'marketplace',
      url: 'http://localhost:3008',
      prefix: '/api/v1/products',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    },
    // Onboarding Service (future)
    {
      name: 'onboarding',
      url: 'http://localhost:3006',
      prefix: '/api/v1/onboarding',
      healthCheck: '/health',
      version: '1.0.0',
      rewrite: false
    }
  ],

  // Circuit breaker configuration
  circuitBreaker: {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  },

  // CORS configuration
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
  },

  // Security headers
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  }
};

export default gatewayConfig;