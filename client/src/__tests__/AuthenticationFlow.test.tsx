import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { useAuth } from '@/hooks/useAuth';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.location
const mockLocation = {
  href: '',
  pathname: '/',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Test component that uses useAuth
const TestAuthComponent = () => {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  if (!isAuthenticated) {
    return (
      <div>
        <div>Not Authenticated</div>
        <button onClick={() => login('test@example.com', 'password')}>
          Login
        </button>
      </div>
    );
  }
  
  return (
    <div>
      <div>Authenticated as {user?.email}</div>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('Authentication Flow Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocation.href = '';
    mockLocation.pathname = '/';
    (global.fetch as Mock).mockClear();
  });

  it('should redirect to login when token is expired', async () => {
    // Mock expired token in localStorage
    mockLocalStorage.getItem.mockReturnValue('expired-token');
    
    // Mock API call returning 401 for expired token
    (global.fetch as Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Unauthorized: Invalid token' }),
    });

    const { AuthProvider } = await import('@/hooks/useAuth');
    
    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Should initially show loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for auth check to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/users/me', {
        headers: { Authorization: 'Bearer expired-token' },
      });
    });

    // Should redirect to login page
    await waitFor(() => {
      expect(mockLocation.href).toBe('/auth');
    });

    // Should clear the expired token
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
  });

  it('should redirect to login when no token exists', async () => {
    // No token in localStorage
    mockLocalStorage.getItem.mockReturnValue(null);
    
    const { AuthProvider } = await import('@/hooks/useAuth');
    
    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Should initially show loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for auth check to complete
    await waitFor(() => {
      expect(mockLocation.href).toBe('/auth');
    });

    // Should not make API call when no token
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should allow access when token is valid', async () => {
    // Mock valid token
    mockLocalStorage.getItem.mockReturnValue('valid-token');
    
    // Mock successful API response
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        isAdmin: false,
      }),
    });

    const { AuthProvider } = await import('@/hooks/useAuth');
    
    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Wait for authentication to complete
    await waitFor(() => {
      expect(screen.getByText('Authenticated as test@example.com')).toBeInTheDocument();
    });

    // Should not redirect
    expect(mockLocation.href).toBe('');
    
    // Should have called the API
    expect(global.fetch).toHaveBeenCalledWith('/api/users/me', {
      headers: { Authorization: 'Bearer valid-token' },
    });
  });

  it('should handle network errors by redirecting to login', async () => {
    // Mock valid token but network error
    mockLocalStorage.getItem.mockReturnValue('valid-token');
    
    // Mock network error
    (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

    const { AuthProvider } = await import('@/hooks/useAuth');
    
    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Wait for error handling
    await waitFor(() => {
      expect(mockLocation.href).toBe('/auth');
    });

    // Should clear all tokens on error
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('firebaseToken');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('managementToken');
  });

  it('should not redirect when already on auth pages', async () => {
    // Set current path to auth page
    mockLocation.pathname = '/auth';
    
    // Mock expired token
    mockLocalStorage.getItem.mockReturnValue('expired-token');
    (global.fetch as Mock).mockResolvedValue({
      ok: false,
      status: 401,
    });

    const { AuthProvider } = await import('@/hooks/useAuth');
    
    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Should not redirect when already on auth page
    expect(mockLocation.href).toBe('');
  });

  it('should clear all authentication data on logout', async () => {
    // Start with authenticated user
    mockLocalStorage.getItem.mockReturnValue('valid-token');
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        isAdmin: false,
      }),
    });

    const { AuthProvider } = await import('@/hooks/useAuth');
    
    render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    // Wait for authentication
    await waitFor(() => {
      expect(screen.getByText('Authenticated as test@example.com')).toBeInTheDocument();
    });

    // Click logout
    fireEvent.click(screen.getByText('Logout'));

    // Should clear all tokens and redirect
    await waitFor(() => {
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('managementToken');
      expect(mockLocation.href).toBe('/auth');
    });
  });

  it('should prevent access to protected routes without authentication', async () => {
    // No authentication
    mockLocalStorage.getItem.mockReturnValue(null);
    
    const { AuthProvider } = await import('@/hooks/useAuth');
    const AuthGuard = (await import('@/components/AuthGuard')).default;
    
    render(
      <AuthProvider>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </AuthProvider>
    );

    // Should not show protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    
    // Should redirect to login
    await waitFor(() => {
      expect(mockLocation.href).toBe('/auth');
    });
  });
});