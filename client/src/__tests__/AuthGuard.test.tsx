import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

// Mock useAuth hook
vi.mock('@/hooks/useAuth');
const mockUseAuth = useAuth as Mock;

// Mock useLocation hook
vi.mock('wouter');
const mockUseLocation = useLocation as Mock;

describe('AuthGuard', () => {
  const mockSetLocation = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue(['/some-path', mockSetLocation]);
  });

  it('should render children when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', email: 'test@example.com', isAdmin: false },
      isLoading: false,
      isAuthenticated: true,
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it('should show loading when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Should show loading spinner, not protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByRole('generic')).toBeInTheDocument(); // loading div
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it('should redirect to login when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/auth');
    });

    // Should not show protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should not render children when user is null', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });

    render(
      <AuthGuard fallback={<div>Custom Loading</div>}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Custom Loading')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should handle authentication state changes', async () => {
    // Start with unauthenticated state
    const { rerender } = render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Initially not authenticated
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    // Should redirect to login
    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/auth');
    });

    // Now authenticate the user
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', email: 'test@example.com', isAdmin: false },
      isLoading: false,
      isAuthenticated: true,
    });

    rerender(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Should now show protected content
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should prevent rendering when isAuthenticated is false even with user object', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', email: 'test@example.com', isAdmin: false },
      isLoading: false,
      isAuthenticated: false, // This is the key - not authenticated
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});