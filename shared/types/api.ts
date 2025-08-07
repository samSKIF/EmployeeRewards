// API Types Package - Standardized API interface types
import { z } from 'zod';
import { ApiResponse, PaginationParams, PaginatedResponse } from './common';
import { Employee, EmployeeFilters, EmployeeSearchResult } from './employee';
import { AuthUser, UserProfile } from './user';
import { Organization, Department, Location } from './organization';

// Authentication API types
export interface AuthEndpoints {
  '/api/auth/login': {
    POST: {
      body: { email: string; password: string };
      response: ApiResponse<{ user: AuthUser; token: string }>;
    };
  };
  '/api/auth/logout': {
    POST: {
      response: ApiResponse<void>;
    };
  };
  '/api/auth/refresh': {
    POST: {
      response: ApiResponse<{ token: string }>;
    };
  };
}

// User Management API types
export interface UserEndpoints {
  '/api/users/me': {
    GET: {
      response: ApiResponse<UserProfile>;
    };
    PUT: {
      body: Partial<UserProfile>;
      response: ApiResponse<UserProfile>;
    };
  };
  '/api/users/:id': {
    GET: {
      params: { id: string };
      response: ApiResponse<UserProfile>;
    };
    PUT: {
      params: { id: string };
      body: Partial<UserProfile>;
      response: ApiResponse<UserProfile>;
    };
    DELETE: {
      params: { id: string };
      response: ApiResponse<void>;
    };
  };
}

// Employee Management API types
export interface EmployeeEndpoints {
  '/api/employee': {
    GET: {
      query?: EmployeeFilters & PaginationParams;
      response: ApiResponse<PaginatedResponse<Employee>>;
    };
    POST: {
      body: Omit<Employee, 'id' | 'created_at'>;
      response: ApiResponse<Employee>;
    };
  };
  '/api/employee/:id': {
    GET: {
      params: { id: string };
      response: ApiResponse<Employee>;
    };
    PUT: {
      params: { id: string };
      body: Partial<Employee>;
      response: ApiResponse<Employee>;
    };
    DELETE: {
      params: { id: string };
      response: ApiResponse<void>;
    };
  };
  '/api/employee/search': {
    GET: {
      query: { q: string } & EmployeeFilters;
      response: ApiResponse<EmployeeSearchResult>;
    };
  };
}

// Admin API types
export interface AdminEndpoints {
  '/api/admin/employee': {
    GET: {
      query?: EmployeeFilters & PaginationParams;
      response: ApiResponse<PaginatedResponse<Employee>>;
    };
    POST: {
      body: Omit<Employee, 'id' | 'created_at'>;
      response: ApiResponse<Employee>;
    };
  };
  '/api/admin/employee/bulk': {
    POST: {
      body: {
        action: 'delete' | 'update_status' | 'update_department';
        employeeIds: number[];
        payload?: any;
      };
      response: ApiResponse<{ affectedCount: number }>;
    };
  };
  '/api/admin/departments': {
    GET: {
      response: ApiResponse<Department[]>;
    };
    POST: {
      body: Omit<Department, 'id' | 'created_at'>;
      response: ApiResponse<Department>;
    };
  };
  '/api/admin/locations': {
    GET: {
      response: ApiResponse<Location[]>;
    };
    POST: {
      body: Omit<Location, 'id' | 'created_at'>;
      response: ApiResponse<Location>;
    };
  };
}

// Combined API interface for type safety
export interface ApiRoutes extends 
  AuthEndpoints,
  UserEndpoints, 
  EmployeeEndpoints,
  AdminEndpoints {}

// Request/Response helper types
export type ApiRequest<T extends keyof ApiRoutes, M extends keyof ApiRoutes[T]> = 
  ApiRoutes[T][M] extends { body: infer B } ? B : never;

export type ApiResponseType<T extends keyof ApiRoutes, M extends keyof ApiRoutes[T]> = 
  ApiRoutes[T][M] extends { response: infer R } ? R : never;

// Generic API client interface
export interface ApiClient {
  get<T>(url: string, config?: any): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: any): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: any): Promise<ApiResponse<T>>;
  delete<T>(url: string): Promise<ApiResponse<T>>;
}
