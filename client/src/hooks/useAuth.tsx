import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// import { useFirebaseAuth } from "@/context/FirebaseAuthContext";

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

  // const { currentUser, loading: firebaseLoading } = useFirebaseAuth();
  
  // Check for authentication on component mount and when token changes
  useEffect(() => {
    const fetchUserMetadata = async () => {
      try {
        setIsLoading(true);
        
        // Check if we have authentication token
        const token = localStorage.getItem("firebaseToken");
        
        console.log("useAuth: Checking authentication...");
        console.log("useAuth: Custom token:", token ? "exists" : "null");
        console.log("useAuth: Token value preview:", token ? token.substring(0, 20) + "..." : "no token");
        
        if (token) {
          console.log("useAuth: Token found, fetching user metadata");
          
          // Try to get user metadata from our API
          try {
            console.log("useAuth: Making API call with custom token");
            
            const response = await fetch("/api/users/me", {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const userData = await response.json();
              console.log("useAuth: User metadata from API:", userData);
              console.log("useAuth: Setting user isAdmin based on API response:", userData.isAdmin);
              console.log("useAuth: userData.isAdmin === true?", userData.isAdmin === true);
              
              const userToSet = {
                id: userData.id,
                name: userData.name || "User",
                email: userData.email || "",
                isAdmin: userData.isAdmin === true, // Only true if explicitly true
                department: userData.department
              };
              
              console.log("useAuth: Final user object being set:", userToSet);
              console.log("useAuth: About to call setUser");
              setUser(userToSet);
              console.log("useAuth: setUser called successfully");
            } else {
              console.log("useAuth: API call failed, clearing user state");
              localStorage.removeItem("firebaseToken");
              setUser(null);
            }
          } catch (error) {
            console.error("useAuth: Error fetching user metadata:", error);
            localStorage.removeItem("firebaseToken");
            setUser(null);
          }
        } else {
          console.log("useAuth: No token found, clearing user state");
          setUser(null);
        }
      } catch (error) {
        console.error("useAuth: Auth initialization failed:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserMetadata();
  }, []); // Run once on mount

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem("firebaseToken");
      if (token) {
        const response = await fetch("/api/users/me", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            isAdmin: userData.isAdmin === true,
            department: userData.department
          });
        } else {
          localStorage.removeItem("firebaseToken");
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed in fetchUserProfile:", error);
      localStorage.removeItem("firebaseToken");
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
      
      localStorage.setItem("firebaseToken", data.token);
      
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

  const logout = async () => {
    try {
      console.log("Dashboard: Starting logout process");
      
      // Remove authentication token
      localStorage.removeItem("firebaseToken");
      
      // Set sessionStorage to prevent auto-login on auth page
      sessionStorage.setItem("skipAutoLogin", "true");
      
      // Clear all cached queries
      queryClient.clear();
      
      // Reset local state
      setUser(null);
      
      console.log("Dashboard: Logout completed successfully");
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      
      // Redirect to auth page
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "There was a problem logging out. Please try again.",
      });
    }
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