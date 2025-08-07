// Authentication Service Factory - Dependency Injection Container
// Creates and configures auth service with dependencies

import { AuthService } from './auth.service';
import { 
  LocalStorageAuthStorage, 
  SessionStorageAuthStorage, 
  MemoryAuthStorage 
} from './auth.storage';
import { AuthHttpClient } from './auth.http';
import { IAuthService, IAuthStorage, IAuthHttpClient } from './auth.interface';

// Storage strategy type
export type AuthStorageStrategy = 'localStorage' | 'sessionStorage' | 'memory';

// Factory configuration
export interface AuthServiceConfig {
  storageStrategy?: AuthStorageStrategy;
  baseURL?: string;
  enableAutoRefresh?: boolean;
  refreshThreshold?: number; // minutes before token expiry
}

// Default configuration
const DEFAULT_CONFIG: Required<AuthServiceConfig> = {
  storageStrategy: 'localStorage',
  baseURL: '',
  enableAutoRefresh: true,
  refreshThreshold: 15, // 15 minutes
};

// Auth service factory
export class AuthServiceFactory {
  private static instance: IAuthService | null = null;
  private static config: Required<AuthServiceConfig> = DEFAULT_CONFIG;

  // Configure the factory (call before first use)
  static configure(config: Partial<AuthServiceConfig>): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // Reset instance to use new config
    this.instance = null;
  }

  // Get or create auth service instance (singleton)
  static getInstance(): IAuthService {
    if (!this.instance) {
      this.instance = this.createInstance();
    }
    return this.instance;
  }

  // Create a new auth service instance (useful for testing)
  static createInstance(config?: Partial<AuthServiceConfig>): IAuthService {
    const finalConfig = { ...this.config, ...config };
    
    const storage = this.createStorage(finalConfig.storageStrategy);
    const httpClient = this.createHttpClient(finalConfig.baseURL);
    
    const authService = new AuthService(storage, httpClient);
    
    // Set up auto-refresh if enabled
    if (finalConfig.enableAutoRefresh) {
      this.setupAutoRefresh(authService, finalConfig.refreshThreshold);
    }
    
    return authService;
  }

  // Create storage implementation based on strategy
  private static createStorage(strategy: AuthStorageStrategy): IAuthStorage {
    switch (strategy) {
      case 'localStorage':
        return new LocalStorageAuthStorage();
      case 'sessionStorage':
        return new SessionStorageAuthStorage();
      case 'memory':
        return new MemoryAuthStorage();
      default:
        throw new Error(`Unknown storage strategy: ${strategy}`);
    }
  }

  // Create HTTP client
  private static createHttpClient(baseURL: string): IAuthHttpClient {
    return new AuthHttpClient(baseURL);
  }

  // Set up automatic token refresh
  private static setupAutoRefresh(
    authService: IAuthService,
    refreshThreshold: number
  ): void {
    // Check for token refresh every minute
    setInterval(async () => {
      try {
        const session = await authService.getSession();
        if (session) {
          const timeUntilExpiry = session.expiresAt.getTime() - Date.now();
          const thresholdMs = refreshThreshold * 60 * 1000;
          
          if (timeUntilExpiry <= thresholdMs && timeUntilExpiry > 0) {
            console.log('Auto-refreshing token...');
            await authService.refreshToken();
          }
        }
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, 60 * 1000); // Check every minute
  }

  // Reset the singleton instance (useful for testing)
  static reset(): void {
    this.instance = null;
  }

  // Create mock auth service for testing
  static createMockInstance(): IAuthService {
    const mockStorage = new MemoryAuthStorage();
    const mockHttpClient = new AuthHttpClient();
    return new AuthService(mockStorage, mockHttpClient);
  }
}

// Convenience function to get auth service
export const getAuthService = (): IAuthService => {
  return AuthServiceFactory.getInstance();
};

// Initialize auth service with default config
export const initializeAuth = (config?: Partial<AuthServiceConfig>): IAuthService => {
  if (config) {
    AuthServiceFactory.configure(config);
  }
  return AuthServiceFactory.getInstance();
};
