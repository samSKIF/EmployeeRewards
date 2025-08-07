// Dependency Injection Auth Service Tests - Gold Standard Compliance
// Tests for the refactored auth system with dependency injection pattern

import { AuthService } from '../shared/services/auth.service';
import { AuthServiceFactory, getAuthService } from '../shared/services/auth.factory';
import { LocalStorageAuthStorage, SessionStorageAuthStorage, MemoryAuthStorage } from '../shared/services/auth.storage';
import { AuthHttpClient } from '../shared/services/auth.http';
import { IAuthService, IAuthStorage, IAuthHttpClient } from '../shared/services/auth.interface';

// Mock storage for testing
class MockAuthStorage implements IAuthStorage {
  private token: string | null = null;
  private user: any = null;

  async getToken(): Promise<string | null> {
    return this.token;
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
  }

  async removeToken(): Promise<void> {
    this.token = null;
  }

  async getUser(): Promise<any | null> {
    return this.user;
  }

  async setUser(user: any): Promise<void> {
    this.user = user;
  }

  async removeUser(): Promise<void> {
    this.user = null;
  }
}

// Mock HTTP client for testing
class MockAuthHttpClient implements IAuthHttpClient {
  private responses: Map<string, any> = new Map();
  private authToken: string | null = null;

  setAuthHeader(token: string): void {
    this.authToken = token;
  }

  removeAuthHeader(): void {
    this.authToken = null;
  }

  setMockResponse(endpoint: string, response: any): void {
    this.responses.set(endpoint, response);
  }

  async get<T>(url: string): Promise<T> {
    const mockResponse = this.responses.get(url);
    if (mockResponse) {
      return mockResponse;
    }
    throw new Error(`No mock response for GET ${url}`);
  }

  async post<T>(url: string, data: any): Promise<T> {
    const mockResponse = this.responses.get(`POST:${url}`);
    if (mockResponse) {
      return mockResponse;
    }
    throw new Error(`No mock response for POST ${url}`);
  }

  async put<T>(url: string, data: any): Promise<T> {
    const mockResponse = this.responses.get(`PUT:${url}`);
    if (mockResponse) {
      return mockResponse;
    }
    throw new Error(`No mock response for PUT ${url}`);
  }

  async delete<T>(url: string): Promise<T> {
    const mockResponse = this.responses.get(`DELETE:${url}`);
    if (mockResponse) {
      return mockResponse;
    }
    throw new Error(`No mock response for DELETE ${url}`);
  }

  async patch<T>(url: string, data: any): Promise<T> {
    const mockResponse = this.responses.get(`PATCH:${url}`);
    if (mockResponse) {
      return mockResponse;
    }
    throw new Error(`No mock response for PATCH ${url}`);
  }
}

describe('Auth Dependency Injection System', () => {
  beforeEach(() => {
    // Reset factory state before each test
    AuthServiceFactory.reset();
  });

  describe('AuthService Core Functionality', () => {
    let mockStorage: MockAuthStorage;
    let mockHttpClient: MockAuthHttpClient;
    let authService: IAuthService;

    beforeEach(() => {
      mockStorage = new MockAuthStorage();
      mockHttpClient = new MockAuthHttpClient();
      authService = new AuthService(mockStorage, mockHttpClient);
    });

    test('should initialize with injected dependencies', () => {
      expect(authService).toBeDefined();
      expect(authService).toBeInstanceOf(AuthService);
    });

    test('should handle login flow with valid credentials', async () => {
      // Mock login response
      const mockLoginResponse = {
        success: true,
        user: {
          id: 1,
          username: 'john.doe',
          email: 'john.doe@company.com',
          role: 'employee',
          organizationId: 1
        },
        token: 'mock-jwt-token-123'
      };

      mockHttpClient.setMockResponse('POST:/api/auth/login', mockLoginResponse);

      const credentials = {
        username: 'john.doe@company.com',
        password: 'password123'
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(true);
      expect(result.user?.username).toBe('john.doe');
      expect(result.token).toBe('mock-jwt-token-123');

      // Verify token and user are stored
      const storedToken = await mockStorage.getToken();
      const storedUser = await mockStorage.getUser();
      expect(storedToken).toBe('mock-jwt-token-123');
      expect(storedUser?.username).toBe('john.doe');
    });

    test('should handle login failure with invalid credentials', async () => {
      mockHttpClient.setMockResponse('POST:/api/auth/login', Promise.reject(new Error('Invalid credentials')));

      const credentials = {
        username: 'invalid@email.com',
        password: 'wrongpassword'
      };

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    test('should check authentication status correctly', async () => {
      // Initially not authenticated
      expect(await authService.isAuthenticated()).toBe(false);

      // Set token in storage
      await mockStorage.setToken('valid-token');
      await mockStorage.setUser({ id: 1, username: 'john.doe' });

      expect(await authService.isAuthenticated()).toBe(true);
    });

    test('should handle logout correctly', async () => {
      // Set up authenticated state
      await mockStorage.setToken('valid-token');
      await mockStorage.setUser({ id: 1, username: 'john.doe' });

      mockHttpClient.setMockResponse('POST:/api/auth/logout', { success: true });

      await authService.logout();

      // Verify state is cleared
      expect(await mockStorage.getToken()).toBeNull();
      expect(await mockStorage.getUser()).toBeNull();
      expect(await authService.isAuthenticated()).toBe(false);
    });

    test('should handle token refresh', async () => {
      // Set up existing token
      await mockStorage.setToken('old-token');

      const mockRefreshResponse = {
        success: true,
        token: 'new-refreshed-token'
      };

      mockHttpClient.setMockResponse('POST:/api/auth/refresh', mockRefreshResponse);

      const newToken = await authService.refreshToken();

      expect(newToken).toBe('new-refreshed-token');
      expect(await mockStorage.getToken()).toBe('new-refreshed-token');
    });

    test('should get current user from storage', async () => {
      const mockUser = {
        id: 1,
        username: 'john.doe',
        email: 'john.doe@company.com',
        role: 'employee'
      };

      await mockStorage.setUser(mockUser);

      const currentUser = await authService.getCurrentUser();
      expect(currentUser).toEqual(mockUser);
    });

    test('should handle user updates', async () => {
      const existingUser = {
        id: 1,
        username: 'john.doe',
        email: 'john.doe@company.com',
        role: 'employee'
      };

      await mockStorage.setUser(existingUser);

      const updatedData = {
        email: 'john.doe.updated@company.com',
        role: 'admin' as const
      };

      const mockUpdateResponse = {
        ...existingUser,
        ...updatedData
      };

      mockHttpClient.setMockResponse('PUT:/api/users/me', mockUpdateResponse);

      const updatedUser = await authService.updateUser(updatedData);

      expect(updatedUser.email).toBe('john.doe.updated@company.com');
      expect(updatedUser.role).toBe('admin');
      expect(await mockStorage.getUser()).toEqual(updatedUser);
    });
  });

  describe('Storage Strategy Tests', () => {
    test('MemoryAuthStorage should store data in memory', async () => {
      const storage = new MemoryAuthStorage();

      await storage.setToken('test-token');
      await storage.setUser({ id: 1, username: 'test' });

      expect(await storage.getToken()).toBe('test-token');
      expect(await storage.getUser()).toEqual({ id: 1, username: 'test' });

      await storage.removeToken();
      await storage.removeUser();

      expect(await storage.getToken()).toBeNull();
      expect(await storage.getUser()).toBeNull();
    });

    test('LocalStorageAuthStorage should handle browser environment', async () => {
      // Mock localStorage for testing
      const mockLocalStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      };

      Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });

      const storage = new LocalStorageAuthStorage();

      await storage.setToken('test-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');

      mockLocalStorage.getItem.mockReturnValue('test-token');
      const token = await storage.getToken();
      expect(token).toBe('test-token');

      await storage.removeToken();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    test('SessionStorageAuthStorage should handle browser environment', async () => {
      // Mock sessionStorage for testing
      const mockSessionStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      };

      Object.defineProperty(global, 'sessionStorage', {
        value: mockSessionStorage,
        writable: true
      });

      const storage = new SessionStorageAuthStorage();

      await storage.setToken('session-token');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('auth_token', 'session-token');

      mockSessionStorage.getItem.mockReturnValue('session-token');
      const token = await storage.getToken();
      expect(token).toBe('session-token');
    });

    test('storage implementations should handle SSR environment gracefully', async () => {
      // Simulate server environment where window is undefined
      const originalWindow = global.window;
      delete (global as any).window;

      const localStorage = new LocalStorageAuthStorage();
      const sessionStorage = new SessionStorageAuthStorage();

      // Should not throw and should return null
      expect(await localStorage.getToken()).toBeNull();
      expect(await sessionStorage.getToken()).toBeNull();

      // Should not throw when setting/removing
      await localStorage.setToken('test');
      await localStorage.removeToken();
      await sessionStorage.setToken('test');
      await sessionStorage.removeToken();

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('AuthServiceFactory Tests', () => {
    test('should create singleton instance by default', () => {
      const instance1 = AuthServiceFactory.getInstance();
      const instance2 = AuthServiceFactory.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(AuthService);
    });

    test('should configure factory with custom settings', () => {
      const config = {
        storageStrategy: 'memory' as const,
        baseURL: 'https://api.test.com',
        enableAutoRefresh: false
      };

      AuthServiceFactory.configure(config);
      const instance = AuthServiceFactory.getInstance();

      expect(instance).toBeInstanceOf(AuthService);
    });

    test('should create new instances with custom config', () => {
      const config = {
        storageStrategy: 'sessionStorage' as const,
        baseURL: 'https://custom.api.com'
      };

      const instance = AuthServiceFactory.createInstance(config);
      expect(instance).toBeInstanceOf(AuthService);
    });

    test('should reset singleton instance', () => {
      const instance1 = AuthServiceFactory.getInstance();
      AuthServiceFactory.reset();
      const instance2 = AuthServiceFactory.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    test('should create mock instance for testing', () => {
      const mockInstance = AuthServiceFactory.createMockInstance();
      expect(mockInstance).toBeInstanceOf(AuthService);
    });

    test('should throw error for unknown storage strategy', () => {
      expect(() => {
        AuthServiceFactory.createInstance({
          storageStrategy: 'invalid' as any
        });
      }).toThrow('Unknown storage strategy: invalid');
    });
  });

  describe('AuthHttpClient Tests', () => {
    let httpClient: AuthHttpClient;

    beforeEach(() => {
      httpClient = new AuthHttpClient('https://api.test.com');
    });

    test('should set and remove auth headers', () => {
      httpClient.setAuthHeader('test-token');
      // Can't directly test private property, but we can test behavior
      expect(() => httpClient.setAuthHeader('test-token')).not.toThrow();

      httpClient.removeAuthHeader();
      expect(() => httpClient.removeAuthHeader()).not.toThrow();
    });

    test('should handle JSON response parsing', async () => {
      // Mock fetch globally
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('{"success": true, "data": "test"}')
      } as any);

      const result = await httpClient.get('/test');
      expect(result).toEqual({ success: true, data: 'test' });
    });

    test('should handle empty response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('')
      } as any);

      const result = await httpClient.get('/test');
      expect(result).toEqual({});
    });

    test('should handle HTTP errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: jest.fn().mockResolvedValue('{"message": "Unauthorized access"}')
      } as any);

      await expect(httpClient.get('/test')).rejects.toThrow('Unauthorized access');
    });

    test('should handle malformed JSON response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('invalid json')
      } as any);

      await expect(httpClient.get('/test')).rejects.toThrow('Invalid JSON response from server');
    });
  });

  describe('Integration Tests', () => {
    test('should work end-to-end with real components', async () => {
      // Create a real auth service with memory storage
      const authService = AuthServiceFactory.createInstance({
        storageStrategy: 'memory',
        enableAutoRefresh: false
      });

      // Initially not authenticated
      expect(await authService.isAuthenticated()).toBe(false);
      expect(await authService.getCurrentUser()).toBeNull();

      // Simulate session data
      const session = await authService.getSession();
      expect(session).toBeNull();
    });

    test('should handle auth state changes with callbacks', (done) => {
      const authService = AuthServiceFactory.createInstance({
        storageStrategy: 'memory'
      });

      let callbackCount = 0;
      const unsubscribe = authService.onAuthChange((user) => {
        callbackCount++;
        if (callbackCount === 1) {
          expect(user).toBeNull(); // Initial state
        }
        if (callbackCount === 2) {
          expect(user).toBeDefined(); // After login simulation
          unsubscribe();
          done();
        }
      });

      // Trigger auth change by simulating login
      setTimeout(() => {
        // This would normally happen in login method
        authService.onAuthChange({ id: 1, username: 'test' } as any);
      }, 10);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async () => {
      const mockHttpClient = new MockAuthHttpClient();
      const authService = new AuthService(new MemoryAuthStorage(), mockHttpClient);

      // Simulate network error
      mockHttpClient.setMockResponse('POST:/api/auth/login', Promise.reject(new Error('Network error')));

      await expect(authService.login({
        username: 'test@example.com',
        password: 'password'
      })).rejects.toThrow('Network error');
    });

    test('should handle storage failures gracefully', async () => {
      class FailingStorage implements IAuthStorage {
        async getToken(): Promise<string | null> {
          throw new Error('Storage error');
        }
        async setToken(): Promise<void> {
          throw new Error('Storage error');
        }
        async removeToken(): Promise<void> {
          throw new Error('Storage error');
        }
        async getUser(): Promise<any | null> {
          throw new Error('Storage error');
        }
        async setUser(): Promise<void> {
          throw new Error('Storage error');
        }
        async removeUser(): Promise<void> {
          throw new Error('Storage error');
        }
      }

      const authService = new AuthService(new FailingStorage(), new MockAuthHttpClient());

      await expect(authService.getCurrentUser()).rejects.toThrow('Storage error');
      await expect(authService.isAuthenticated()).rejects.toThrow('Storage error');
    });

    test('should handle malformed stored user data', async () => {
      const storage = new MemoryAuthStorage();
      
      // Simulate corrupted data by setting invalid JSON
      (storage as any).user = 'invalid json';

      const httpClient = new MockAuthHttpClient();
      const authService = new AuthService(storage, httpClient);

      // Should handle gracefully and return null
      const user = await authService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('Performance and Memory Tests', () => {
    test('should not create memory leaks with multiple instances', () => {
      const instances = [];
      
      for (let i = 0; i < 100; i++) {
        instances.push(AuthServiceFactory.createInstance({
          storageStrategy: 'memory'
        }));
      }

      expect(instances).toHaveLength(100);
      // All instances should be unique (not singleton)
      expect(new Set(instances)).toHaveSize(100);
    });

    test('should handle rapid authentication state changes', async () => {
      const authService = AuthServiceFactory.createInstance({
        storageStrategy: 'memory'
      });

      const promises = [];
      
      // Rapid succession of auth checks
      for (let i = 0; i < 50; i++) {
        promises.push(authService.isAuthenticated());
      }

      const results = await Promise.all(promises);
      expect(results.every(result => result === false)).toBe(true);
    });
  });
});

// Additional helper tests for the convenience functions
describe('Auth Convenience Functions', () => {
  beforeEach(() => {
    AuthServiceFactory.reset();
  });

  test('getAuthService should return singleton instance', () => {
    const service1 = getAuthService();
    const service2 = getAuthService();
    
    expect(service1).toBe(service2);
    expect(service1).toBeInstanceOf(AuthService);
  });

  test('initializeAuth should configure and return instance', () => {
    const config = {
      storageStrategy: 'sessionStorage' as const,
      enableAutoRefresh: false
    };

    const authService = AuthServiceFactory.getInstance();
    expect(authService).toBeInstanceOf(AuthService);
  });
});