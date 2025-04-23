import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  department?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const defaultContext: AuthContextType = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
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

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("token");
    
    if (token) {
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users/me", {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          isAdmin: userData.isAdmin || false,
          department: userData.department
        });
      } else {
        // Token is invalid, clear it
        localStorage.removeItem("token");
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      console.log("Attempting login with:", { email, password });
      const response = await apiRequest("POST", "/api/auth/login", { email, password });
      const data = await response.json();
      
      localStorage.setItem("token", data.token);
      
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        isAdmin: data.user.isAdmin || false,
        department: data.user.department
      });
      
      // Invalidate all queries to refresh data
      await queryClient.invalidateQueries();
      
      toast({
        title: "Success",
        description: "You have been logged in successfully",
      });
      
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Invalid email or password. Please try again.",
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    
    // Clear all cached queries
    queryClient.clear();
    
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  const contextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
};