// Authentication Storage Implementations - Multiple strategies
// Supports different storage backends via dependency injection

import { IAuthStorage } from './auth.interface';
import { AuthUser } from '../types';

// Local Storage implementation (default for web)
export class LocalStorageAuthStorage implements IAuthStorage {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  async getToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  async setToken(token: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  async removeToken(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.TOKEN_KEY);
  }

  async getUser(): Promise<AuthUser | null> {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        await this.removeUser();
      }
    }
    return null;
  }

  async setUser(user: AuthUser): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  async removeUser(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.USER_KEY);
  }
}

// Session Storage implementation (less persistent)
export class SessionStorageAuthStorage implements IAuthStorage {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  async getToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  async setToken(token: string): Promise<void> {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(this.TOKEN_KEY, token);
  }

  async removeToken(): Promise<void> {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(this.TOKEN_KEY);
  }

  async getUser(): Promise<AuthUser | null> {
    if (typeof window === 'undefined') return null;
    const userData = sessionStorage.getItem(this.USER_KEY);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        await this.removeUser();
      }
    }
    return null;
  }

  async setUser(user: AuthUser): Promise<void> {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  async removeUser(): Promise<void> {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(this.USER_KEY);
  }
}

// Memory Storage implementation (for SSR or testing)
export class MemoryAuthStorage implements IAuthStorage {
  private token: string | null = null;
  private user: AuthUser | null = null;

  async getToken(): Promise<string | null> {
    return this.token;
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
  }

  async removeToken(): Promise<void> {
    this.token = null;
  }

  async getUser(): Promise<AuthUser | null> {
    return this.user;
  }

  async setUser(user: AuthUser): Promise<void> {
    this.user = user;
  }

  async removeUser(): Promise<void> {
    this.user = null;
  }
}
