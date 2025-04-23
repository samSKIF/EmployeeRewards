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
          return;
        }
        
        // Otherwise perform auto-login
        console.log("No token found, performing automatic admin login");
        
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            username: "admin", 
            password: "admin123" 
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Auto login failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Auto-login successful, token received");
        
        // Store token
        localStorage.setItem("token", data.token);
        
        // Get user profile
        await fetchUserProfile();
        
      } catch (error) {
        console.error("Auto-login failed:", error);
        setIsLoading(false);
      }
    };
    
    // Perform auto-login on initial load
    performAutoLogin();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem("token");
      console.log("Fetching user profile with token:", token ? token.substring(0, 20) + "..." : "none");
      
      if (!token) {
        console.log("No token found in localStorage");
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      const response = await fetch("/api/users/me", {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("User profile response status:", response.status);
      
      if (response.ok) {
        const userData = await response.json();
        console.log("User profile data:", userData);
        
        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          isAdmin: userData.isAdmin || false,
          department: userData.department
        });
        
        console.log("User profile set successfully");
      } else {
        // Token is invalid, clear it
        console.error("Failed to fetch user profile, clearing token");
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
      
      try {
        // Direct attempt to the auth endpoint to check if it's valid
        const testResponse = await fetch("/api/auth/login", {
          method: "HEAD"
        });
        console.log("Auth endpoint check:", testResponse.status, testResponse.statusText);
      } catch (err) {
        console.error("Auth endpoint test failed:", err);
      }
      
      const loginData = {
        email: email,
        password: password
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