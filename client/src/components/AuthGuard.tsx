import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthGuard component that ensures user authentication before rendering children
 * Redirects to login if user is not authenticated
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback = (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
    </div>
  )
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      console.log('AuthGuard: User not authenticated, redirecting to login');
      setLocation('/auth');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  // Show loading while authentication is being checked
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Show loading if user is not authenticated (during redirect)
  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  // Render children only if user is authenticated
  return <>{children}</>;
};

export default AuthGuard;