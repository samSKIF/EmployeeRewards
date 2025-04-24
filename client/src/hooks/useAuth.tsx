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
    // Auto-login function that automatically logs in as admin
    const performAutoLogin = async () => {
      try {
        console.log("AuthProvider initializing, checking token");
        
        // First check if we have a token already
        const token = localStorage.getItem("token");
        if (token) {
          console.log("Token found, fetching user profile");
          fetchUserProfile();
        } else {
          // Just set loading to false instead of auto-login
          console.log("No token found, skipping auto-login");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setIsLoading(false);
      }
    };
    
    // Perform initialization on load
    performAutoLogin();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      
      // For now, let's skip the fetchUserProfile since we're transitioning to Firebase auth
      console.log("Skipping user profile fetch during migration to Firebase auth");
      setUser(null);
      
      // Remove any existing token to prevent future API calls
      localStorage.removeItem("token");
      
    } catch (error) {
      console.error("Failed in fetchUserProfile:", error);
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
      
      try {
        // Direct attempt to the auth endpoint to check if it's valid
        const testResponse = await fetch("/api/auth/login", {
          method: "HEAD"
        });
        console.log("Auth endpoint check:", testResponse.status, testResponse.statusText);
      } catch (err) {
        console.error("Auth endpoint test failed:", err);
      }
      
      // ALWAYS use username for the seeded admin user - this is critical
      const loginData = { 
        username: "admin", 
        password: "admin123" 
      };
      
      console.log("Sending login data:", loginData);
      
      // Using fetch directly for debugging purposes
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
        credentials: "include"
      });
      
      console.log("Login response status:", response.status, response.statusText);
      
      const responseText = await response.text();
      console.log("Raw response:", responseText);
      
      if (!response.ok) {
        console.error("Login error response:", responseText);
        throw new Error(`Login failed: ${response.status} ${responseText}`);
      }
      
      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Login success response:", data);
      } catch (err) {
        console.error("Failed to parse JSON response:", err);
        throw new Error("Invalid response format from server");
      }
      
      if (!data.token || !data.user) {
        console.error("Invalid response structure:", data);
        throw new Error("Server response missing required fields");
      }
      
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