// Route Definitions for API Gateway
// Centralizes all route configurations with standardized patterns

import { z } from 'zod';
import { RouteConfig } from '../../shared/gateway/api-gateway.service';

// Common validation schemas
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const paginationSchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('50').transform(Number),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

const organizationContextSchema = z.object({
  organizationId: z.string().optional().transform(val => val ? Number(val) : undefined),
});

// Employee management routes
export const employeeRoutes: RouteConfig[] = [
  {
    method: 'GET',
    path: '/employees',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true, adminRequired: true },
    validation: { query: paginationSchema.merge(organizationContextSchema) },
    featureFlag: { flagKey: 'api_gateway_routing' },
    rateLimit: { max: 100, windowMs: 60 * 1000 },
    description: 'Get all employees with pagination and filtering',
  },
  {
    method: 'GET',
    path: '/employees/:id',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true },
    validation: { params: idParamSchema },
    featureFlag: { flagKey: 'api_gateway_routing' },
    description: 'Get employee details by ID',
  },
  {
    method: 'POST',
    path: '/employees',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true, adminRequired: true },
    validation: {
      body: z.object({
        username: z.string().min(1),
        email: z.string().email(),
        name: z.string().min(1),
        surname: z.string().optional(),
        department: z.string().optional(),
        role: z.string().default('employee'),
        organization_id: z.number(),
      }),
    },
    featureFlag: { flagKey: 'api_gateway_routing' },
    rateLimit: { max: 10, windowMs: 60 * 1000 },
    description: 'Create new employee',
  },
  {
    method: 'PUT',
    path: '/employees/:id',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true, adminRequired: true },
    validation: {
      params: idParamSchema,
      body: z.object({
        username: z.string().optional(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        surname: z.string().optional(),
        department: z.string().optional(),
        role: z.string().optional(),
      }),
    },
    featureFlag: { flagKey: 'api_gateway_routing' },
    rateLimit: { max: 30, windowMs: 60 * 1000 },
    description: 'Update employee information',
  },
  {
    method: 'DELETE',
    path: '/employees/:id',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true, adminRequired: true },
    validation: { params: idParamSchema },
    featureFlag: { flagKey: 'api_gateway_routing' },
    rateLimit: { max: 10, windowMs: 60 * 1000 },
    description: 'Soft delete employee',
  },
];

// User management routes
export const userRoutes: RouteConfig[] = [
  {
    method: 'GET',
    path: '/users/me',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true },
    featureFlag: { flagKey: 'api_gateway_routing' },
    cache: { ttl: 60 }, // Cache for 1 minute
    description: 'Get current user profile',
  },
  {
    method: 'PUT',
    path: '/users/me',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true },
    validation: {
      body: z.object({
        name: z.string().optional(),
        surname: z.string().optional(),
        phone_number: z.string().optional(),
        avatar_url: z.string().url().optional(),
      }),
    },
    featureFlag: { flagKey: 'api_gateway_routing' },
    rateLimit: { max: 10, windowMs: 60 * 1000 },
    description: 'Update current user profile',
  },
];

// Authentication routes (will use existing implementation)
export const authRoutes: RouteConfig[] = [
  {
    method: 'POST',
    path: '/auth/login',
    handler: async (req, res) => {
      // TODO: Proxy to existing auth service
      res.status(501).json({ message: 'Route will be proxied to existing auth service' });
    },
    auth: { required: false },
    validation: {
      body: z.object({
        username: z.string().email(),
        password: z.string().min(1),
      }),
    },
    featureFlag: { flagKey: 'api_gateway_routing', required: false },
    rateLimit: { max: 5, windowMs: 5 * 60 * 1000 }, // 5 attempts per 5 minutes
    description: 'User login',
  },
  {
    method: 'POST',
    path: '/auth/logout',
    handler: async (req, res) => {
      // TODO: Proxy to existing auth service
      res.status(501).json({ message: 'Route will be proxied to existing auth service' });
    },
    auth: { required: true },
    featureFlag: { flagKey: 'api_gateway_routing', required: false },
    description: 'User logout',
  },
  {
    method: 'POST',
    path: '/auth/refresh',
    handler: async (req, res) => {
      // TODO: Proxy to existing auth service
      res.status(501).json({ message: 'Route will be proxied to existing auth service' });
    },
    auth: { required: true },
    featureFlag: { flagKey: 'api_gateway_routing', required: false },
    rateLimit: { max: 10, windowMs: 60 * 1000 },
    description: 'Refresh authentication token',
  },
];

// Recognition system routes
export const recognitionRoutes: RouteConfig[] = [
  {
    method: 'GET',
    path: '/recognition/received',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer to recognition microservice
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true },
    validation: { query: paginationSchema },
    featureFlag: { flagKey: 'api_gateway_routing' },
    cache: { ttl: 300 }, // Cache for 5 minutes
    description: 'Get recognitions received by current user',
  },
  {
    method: 'POST',
    path: '/recognition/give',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer to recognition microservice
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true },
    validation: {
      body: z.object({
        recipientId: z.number(),
        badgeType: z.string(),
        points: z.number().min(1),
        message: z.string().min(1),
      }),
    },
    featureFlag: { flagKey: 'api_gateway_routing' },
    rateLimit: { max: 20, windowMs: 60 * 1000 },
    description: 'Give recognition to another employee',
  },
];

// Social features routes
export const socialRoutes: RouteConfig[] = [
  {
    method: 'GET',
    path: '/posts',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer to social microservice
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true },
    validation: { query: paginationSchema },
    featureFlag: { flagKey: 'api_gateway_routing' },
    cache: { ttl: 60 }, // Cache for 1 minute
    description: 'Get social feed posts',
  },
  {
    method: 'POST',
    path: '/posts',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer to social microservice
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true },
    validation: {
      body: z.object({
        content: z.string().min(1).max(2000),
        imageUrl: z.string().url().optional(),
        type: z.string().default('standard'),
      }),
    },
    featureFlag: { flagKey: 'api_gateway_routing' },
    rateLimit: { max: 50, windowMs: 60 * 1000 },
    description: 'Create new social post',
  },
  {
    method: 'POST',
    path: '/posts/:id/like',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer to social microservice
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true },
    validation: { params: idParamSchema },
    featureFlag: { flagKey: 'api_gateway_routing' },
    rateLimit: { max: 100, windowMs: 60 * 1000 },
    description: 'Like or unlike a post',
  },
];

// Dashboard and analytics routes
export const dashboardRoutes: RouteConfig[] = [
  {
    method: 'GET',
    path: '/dashboard/stats',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true, roles: ['corporate_admin', 'client_admin'] },
    featureFlag: { flagKey: 'api_gateway_routing' },
    cache: { ttl: 300 }, // Cache for 5 minutes
    description: 'Get dashboard statistics',
  },
  {
    method: 'GET',
    path: '/analytics/overview',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true, adminRequired: true },
    validation: {
      query: z.object({
        period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
        organizationId: z.string().transform(Number).optional(),
      }),
    },
    featureFlag: { flagKey: 'api_gateway_routing' },
    cache: { ttl: 600 }, // Cache for 10 minutes
    description: 'Get analytics overview',
  },
];

// Leave management routes
export const leaveRoutes: RouteConfig[] = [
  {
    method: 'GET',
    path: '/leave/requests',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer to leave microservice
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true },
    validation: { query: paginationSchema },
    featureFlag: { flagKey: 'api_gateway_routing' },
    description: 'Get user leave requests',
  },
  {
    method: 'POST',
    path: '/leave/requests',
    handler: async (req, res) => {
      // TODO: Implement via adapter layer to leave microservice
      res.status(501).json({ message: 'Route will be implemented via adapter layer' });
    },
    auth: { required: true },
    validation: {
      body: z.object({
        leaveType: z.string(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        reason: z.string().min(1),
      }),
    },
    featureFlag: { flagKey: 'api_gateway_routing' },
    rateLimit: { max: 10, windowMs: 60 * 1000 },
    description: 'Create leave request',
  },
];

// Demo adapter routes
export const adapterDemoRoutes: RouteConfig[] = [
  {
    method: 'GET',
    path: '/demo/employees',
    handler: async (req, res) => {
      // Proxy to adapter demo route
      res.status(501).json({ message: 'Demo route will be implemented via proxy' });
    },
    auth: { required: true },
    featureFlag: { flagKey: 'adapter_layer_integration' },
    description: 'Demo employee adapter functionality',
  },
  {
    method: 'GET',
    path: '/demo/adapter-health',
    handler: async (req, res) => {
      // Proxy to adapter demo route
      res.status(501).json({ message: 'Demo route will be implemented via proxy' });
    },
    auth: { required: true, adminRequired: true },
    featureFlag: { flagKey: 'adapter_layer_integration' },
    description: 'Show adapter health status',
  },
];

// Export all route collections
export const allGatewayRoutes: RouteConfig[] = [
  ...employeeRoutes,
  ...userRoutes,
  ...authRoutes,
  ...recognitionRoutes,
  ...socialRoutes,
  ...dashboardRoutes,
  ...leaveRoutes,
  ...adapterDemoRoutes,
];