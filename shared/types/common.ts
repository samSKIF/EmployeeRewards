// Common Types Package - Shared utility types across all features
import { z } from 'zod';

// API Response types (standardized across all endpoints)
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

// Pagination types (used across all list endpoints)
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter and search types (used across features)
export interface BaseFilters {
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  createdBy?: number;
}

// Audit trail types (used across all entities)
export interface AuditFields {
  created_at: Date;
  updated_at?: Date;
  created_by?: number;
  updated_by?: number;
}

// File upload types (used across features)
export interface FileUpload {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: Date;
  uploadedBy: number;
}

export const fileUploadSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  mimetype: z.string(),
  size: z.number(),
});

// Status types (commonly used across entities)
export type EntityStatus = 'active' | 'inactive' | 'pending' | 'archived' | 'deleted';

// Permission types (used in authorization)
export type Permission = 
  | 'read' 
  | 'write' 
  | 'delete' 
  | 'admin' 
  | 'manage_users' 
  | 'manage_billing' 
  | 'view_analytics';

// Color scheme types (used in branding)
export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

// Validation schemas (reusable)
export const emailSchema = z.string().email('Please enter a valid email address');
export const phoneSchema = z.string().regex(/^[+]?[1-9]?[0-9]{7,15}$/, 'Please enter a valid phone number');
export const urlSchema = z.string().url('Please enter a valid URL');

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & globalThis.Required<Pick<T, K>>;
