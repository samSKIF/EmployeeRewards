// Authentication Service Interface - Dependency Injection Pattern
// Decouples auth from direct context usage to reduce coupling

import { AuthUser, UserSession, LoginCredentials } from '../types';

// Core auth service interface for dependency injection
export interface IAuthService {
  // Authentication state
  getCurrentUser(): Promise<AuthUser | null>;
  isAuthenticated(): Promise<boolean>;
  getToken(): Promise<string | null>;
  
  // Authentication actions
  login(credentials: LoginCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  refreshToken(): Promise<string | null>;
  
  // User management
  updateUser(userData: Partial<AuthUser>): Promise<AuthUser>;
  
  // Session management
  getSession(): Promise<UserSession | null>;
  clearSession(): Promise<void>;
  
  // Event subscriptions for reactive updates
  onAuthChange(callback: (user: AuthUser | null) => void): () => void;
  onSessionExpired(callback: () => void): () => void;
}

// Authentication result type
export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

// Auth storage interface for different storage strategies
export interface IAuthStorage {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  removeToken(): Promise<void>;
  getUser(): Promise<AuthUser | null>;
  setUser(user: AuthUser): Promise<void>;
  removeUser(): Promise<void>;
}

// Auth HTTP client interface for API calls
export interface IAuthHttpClient {
  post<T>(url: string, data: any): Promise<T>;
  get<T>(url: string): Promise<T>;
  setAuthHeader(token: string): void;
  removeAuthHeader(): void;
}
