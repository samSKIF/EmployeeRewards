// User Types Package - Authentication and session types
import { z } from 'zod';

// Authentication User Type (used in auth contexts)
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  department?: string;
  avatarUrl?: string;
  organization_id?: number;
  role_type?: string;
}

// User session data (used across auth system)
export interface UserSession {
  user: AuthUser;
  token: string;
  expiresAt: Date;
  permissions: string[];
}

// User profile data (extended user info)
export interface UserProfile extends AuthUser {
  surname?: string;
  phone_number?: string;
  job_title?: string;
  sex?: string;
  nationality?: string;
  birth_date?: string;
  hire_date?: string;
  title?: string;
  location?: string;
  responsibilities?: string;
  about_me?: string;
  cover_photo_url?: string;
  last_seen_at?: Date;
  manager_id?: number;
  manager_email?: string;
}

// User login credentials
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginCredentials = z.infer<typeof loginSchema>;

// User registration data
export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  surname: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  organization_id: z.number().optional(),
});
export type UserRegistration = z.infer<typeof registerSchema>;

// User permissions (used in authorization)
export interface UserPermissions {
  canViewUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canManageOrganization: boolean;
  canAccessAdmin: boolean;
  canManageBilling: boolean;
}
