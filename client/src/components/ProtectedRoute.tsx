import { useEffect } from 'react';
import { Route, useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
// Firebase authentication removed - using custom auth

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({
  path,
  component: Component,
}: ProtectedRouteProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Redirect if no token found
    if (!token) {
      console.log('No authentication found, redirecting to /auth');
      setLocation('/auth');
    }
  }, [setLocation]);

  const token = localStorage.getItem('token');

  return (
    <Route path={path}>
      {token ? (
        <Component />
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      )}
    </Route>
  );
}
