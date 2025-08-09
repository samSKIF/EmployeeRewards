/**
 * TEMPORARY COMPATIBILITY SHIM
 * Re-exports types from legacy @shared/types so callers can switch to @platform/sdk/types
 * without breaking. Remove once domain types are split into per-service packages.
 */

// Core domain types (temporary shim)
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  department?: string;
  isAdmin?: boolean;
  birthDate?: string;
  avatarUrl?: string;
  jobTitle?: string;
  title?: string;
  location?: string;
  responsibilities?: string;
  createdAt: Date;
}

export interface UserWithBalance extends User {
  balance: number;
}

export interface Account {
  id: number;
  userId: number;
  accountType: string;
  balance: number;
  createdAt: Date;
}

export interface Transaction {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  description: string;
  createdAt: Date;
}

// Employee management types
export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  hire_date: string;
  department: string;
  role: string;
  organization_id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Social feature types
export interface Post {
  id: number;
  content: string;
  authorId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: number;
  content: string;
  postId: number;
  authorId: number;
  createdAt: Date;
}

// Recognition types
export interface Recognition {
  id: number;
  fromUserId: number;
  toUserId: number;
  points: number;
  message: string;
  createdAt: Date;
}