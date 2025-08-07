// Authentication Service Implementation - Dependency Injection
// Concrete implementation of auth service interface

import { 
  IAuthService, 
  IAuthStorage, 
  IAuthHttpClient,
  AuthResult 
} from './auth.interface';
import { AuthUser, UserSession, LoginCredentials } from '../types';

export class AuthService implements IAuthService {
  private authChangeCallbacks: Set<(user: AuthUser | null) => void> = new Set();
  private sessionExpiredCallbacks: Set<() => void> = new Set();
  private currentUser: AuthUser | null = null;
  
  constructor(
    private storage: IAuthStorage,
    private httpClient: IAuthHttpClient
  ) {
    // Initialize auth state from storage
    this.initializeAuthState();
  }

  private async initializeAuthState(): Promise<void> {
    try {
      const token = await this.storage.getToken();
      if (token) {
        this.httpClient.setAuthHeader(token);
        const user = await this.validateToken(token);
        if (user) {
          this.currentUser = user;
          await this.storage.setUser(user);
        } else {
          await this.clearSession();
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
      await this.clearSession();
    }
  }

  private async validateToken(token: string): Promise<AuthUser | null> {
    try {
      const response = await this.httpClient.get<{ user: AuthUser }>('/api/users/me');
      return response.user;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }

  private notifyAuthChange(user: AuthUser | null): void {
    this.currentUser = user;
    this.authChangeCallbacks.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('Auth change callback error:', error);
      }
    });
  }

  private notifySessionExpired(): void {
    this.sessionExpiredCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Session expired callback error:', error);
      }
    });
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (this.currentUser) {
      return this.currentUser;
    }
    
    const storedUser = await this.storage.getUser();
    if (storedUser) {
      this.currentUser = storedUser;
    }
    
    return this.currentUser;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.storage.getToken();
    const user = await this.getCurrentUser();
    return !!(token && user);
  }

  async getToken(): Promise<string | null> {
    return await this.storage.getToken();
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const response = await this.httpClient.post<{
        user: AuthUser;
        token: string;
      }>('/api/auth/login', {
        username: credentials.email,
        password: credentials.password
      });

      if (response.user && response.token) {
        await this.storage.setToken(response.token);
        await this.storage.setUser(response.user);
        this.httpClient.setAuthHeader(response.token);
        
        this.notifyAuthChange(response.user);
        
        return {
          success: true,
          user: response.user,
          token: response.token
        };
      }
      
      return {
        success: false,
        error: 'Invalid response from server'
      };
    } catch (error: any) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error?.message || 'Login failed'
      };
    }
  }

  async logout(): Promise<void> {
    try {
      // Optionally call logout endpoint
      await this.httpClient.post('/api/auth/logout', {});
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      await this.clearSession();
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const currentToken = await this.storage.getToken();
      if (!currentToken) {
        return null;
      }

      const response = await this.httpClient.post<{
        token: string;
      }>('/api/auth/refresh', {});

      if (response.token) {
        await this.storage.setToken(response.token);
        this.httpClient.setAuthHeader(response.token);
        return response.token;
      }
      
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearSession();
      this.notifySessionExpired();
      return null;
    }
  }

  async updateUser(userData: Partial<AuthUser>): Promise<AuthUser> {
    try {
      const response = await this.httpClient.post<{
        user: AuthUser;
      }>('/api/users/me', userData);

      if (response.user) {
        await this.storage.setUser(response.user);
        this.notifyAuthChange(response.user);
        return response.user;
      }
      
      throw new Error('Failed to update user');
    } catch (error) {
      console.error('User update failed:', error);
      throw error;
    }
  }

  async getSession(): Promise<UserSession | null> {
    const user = await this.getCurrentUser();
    const token = await this.getToken();
    
    if (user && token) {
      return {
        user,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        permissions: [] // TODO: Extract from user or token
      };
    }
    
    return null;
  }

  async clearSession(): Promise<void> {
    await this.storage.removeToken();
    await this.storage.removeUser();
    this.httpClient.removeAuthHeader();
    this.notifyAuthChange(null);
  }

  onAuthChange(callback: (user: AuthUser | null) => void): () => void {
    this.authChangeCallbacks.add(callback);
    
    // Immediately call with current state
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      this.authChangeCallbacks.delete(callback);
    };
  }

  onSessionExpired(callback: () => void): () => void {
    this.sessionExpiredCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.sessionExpiredCallbacks.delete(callback);
    };
  }
}
