import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "./use-toast";

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  surname: string | null;
  isAdmin: boolean;
  firebaseUid?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  avatarUrl?: string | null;
  balance?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  checkingSession: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checkingSession, setCheckingSession] = useState(true);

  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['/api/users/me'],
    queryFn: async () => {
      try {
        // Get token from local storage (set by Firebase auth in FirebaseAuthContext)
        const token = localStorage.getItem('firebaseToken');
        
        if (!token) {
          console.log('No token found, user not authenticated');
          return null;
        }
        
        const res = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            console.log('Unauthorized: Token may be invalid or expired');
            return null;
          }
          throw new Error(`Failed to fetch user: ${res.statusText}`);
        }
        
        return await res.json();
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      } finally {
        setCheckingSession(false);
      }
    },
    refetchOnWindowFocus: false,
  });

  // Check Firebase auth state on mount
  useEffect(() => {
    const checkSession = async () => {
      // We'll rely on the Firebase provider to set the token
      // Just trigger a refetch to get user data if token exists
      refetch();
    };
    
    checkSession();
  }, [refetch]);

  const logout = () => {
    // We'll let Firebase handle the token clearing
    // Just clear the user data from the query cache
    queryClient.setQueryData(['/api/users/me'], null);
    
    // We don't clear the token here because Firebase Auth Context handles that
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error: error as Error,
        checkingSession,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}