import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
// import { useFirebaseAuth } from "@/context/FirebaseAuthContext";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  department?: string;
  avatarUrl?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const defaultContext: AuthContextType = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  refreshUser: async () => {},
};

// Create auth context
const AuthContext = createContext<AuthContextType>(defaultContext);

// Auth provider props
type AuthProviderProps = {
  children: ReactNode;
};

// Auth provider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // const { currentUser, loading: firebaseLoading } = useFirebaseAuth();

  // Check for authentication on component mount and when token changes
  useEffect(() => {
    console.log('useAuth: useEffect running - this should always appear!');

    const initAuth = async () => {
      console.log('useAuth: initAuth function starting');
      setIsLoading(true);

      try {
        const token = localStorage.getItem('token');
        console.log('useAuth: Token check:', token ? 'FOUND' : 'NOT FOUND');

        if (token) {
          console.log('useAuth: Making API call to /api/users/me');
          // Get tenant_id from URL params or localStorage
          const urlParams = new URLSearchParams(window.location.search);
          const tenantId = urlParams.get('tenant_id') || localStorage.getItem('tenant_id') || '1';
          
          const response = await fetch(`/api/users/me?tenant_id=${tenantId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const userData = await response.json();
            console.log('useAuth: API SUCCESS - User data:', userData);

            const user = {
              id: userData.id,
              name: userData.name || 'User',
              email: userData.email || '',
              isAdmin: userData.isAdmin === true,
              department: userData.department,
              avatarUrl: userData.avatarUrl,
            };

            console.log('useAuth: Setting user state:', user);
            setUser(user);
          } else {
            console.log('useAuth: API FAILED - clearing state and redirecting to login');
            localStorage.removeItem('token');
            localStorage.removeItem('firebaseToken');
            localStorage.removeItem('managementToken');
            setUser(null);
            // Force redirect to login on authentication failure
            if (window.location.pathname !== '/auth' && window.location.pathname !== '/corporate-login') {
              window.location.href = '/auth';
            }
          }
        } else {
          console.log('useAuth: No token - setting user to null and redirecting to login');
          setUser(null);
          // Force redirect to login if no token
          if (window.location.pathname !== '/auth' && window.location.pathname !== '/corporate-login') {
            window.location.href = '/auth';
          }
        }
      } catch (error) {
        console.error('useAuth: ERROR:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('firebaseToken');
        localStorage.removeItem('managementToken');
        setUser(null);
        // Force redirect to login on error
        if (window.location.pathname !== '/auth' && window.location.pathname !== '/corporate-login') {
          window.location.href = '/auth';
        }
      } finally {
        setIsLoading(false);
        console.log('useAuth: initAuth complete');
      }
    };

    initAuth();
  }, []); // Run once on mount

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);

      const token = localStorage.getItem('firebaseToken');
      if (token) {
        const response = await fetch('/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            isAdmin: userData.isAdmin === true,
            department: userData.department,
          });
        } else {
          localStorage.removeItem('firebaseToken');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed in fetchUserProfile:', error);
      localStorage.removeItem('firebaseToken');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      console.log('Attempting login with:', { email, password });

      try {
        // Direct attempt to the auth endpoint to check if it's valid
        const testResponse = await fetch('/api/auth/login', {
          method: 'HEAD',
        });
        console.log(
          'Auth endpoint check:',
          testResponse.status,
          testResponse.statusText
        );
      } catch (err) {
        console.error('Auth endpoint test failed:', err);
      }

      // Use provided credentials for authentication
      const loginData = {
        username: email.includes('@') ? email : email,
        password: password,
      };

      console.log('Sending login data:', loginData);

      // Using fetch directly for debugging purposes
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
        credentials: 'include',
      });

      console.log(
        'Login response status:',
        response.status,
        response.statusText
      );

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (!response.ok) {
        console.error('Login error response:', responseText);
        throw new Error(`Login failed: ${response.status} ${responseText}`);
      }

      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Login success response:', data);
      } catch (err) {
        console.error('Failed to parse JSON response:', err);
        throw new Error('Invalid response format from server');
      }

      if (!data.token || !data.user) {
        console.error('Invalid response structure:', data);
        throw new Error('Server response missing required fields');
      }

      localStorage.setItem('firebaseToken', data.token);

      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        isAdmin: data.user.isAdmin || false,
        department: data.user.department,
      });

      // Invalidate all queries to refresh data
      await queryClient.invalidateQueries();

      toast({
        title: 'Success',
        description: 'You have been logged in successfully',
      });

      return true;
    } catch (error) {
      console.error('Login failed:', error);

      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: 'Invalid email or password. Please try again.',
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Dashboard: Starting logout process');

      // Remove authentication token
      localStorage.removeItem('token');

      // Set sessionStorage to prevent auto-login on auth page
      sessionStorage.setItem('skipAutoLogin', 'true');

      // Clear all cached queries
      queryClient.clear();

      // Reset local state
      setUser(null);

      console.log('Dashboard: Logout completed successfully');

      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });

      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        variant: 'destructive',
        title: 'Logout failed',
        description: 'There was a problem logging out. Please try again.',
      });
    }
  };

  // Function to refresh user data from server
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const userData = await response.json();
          const user = {
            id: userData.id,
            name: userData.name || 'User',
            email: userData.email || '',
            isAdmin: userData.isAdmin === true,
            department: userData.department,
            avatarUrl: userData.avatarUrl,
          };
          setUser(user);
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const contextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
