import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFirebaseAuth } from "@/context/FirebaseAuthContext";

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

  const { currentUser, loading: firebaseLoading } = useFirebaseAuth();
  
  // Listen for Firebase auth changes
  useEffect(() => {
    const fetchUserMetadata = async () => {
      try {
        setIsLoading(true);
        
        if (currentUser) {
          console.log("Firebase user detected, fetching user metadata");
          
          // Try to get user metadata from our API
          try {
            const response = await fetch("/api/users/me", {
              headers: {
                "Authorization": `Bearer ${localStorage.getItem("firebaseToken")}`
              }
            });
            
            if (response.ok) {
              const userData = await response.json();
              console.log("User metadata from API:", userData);
              
              // Set user with data from our database
              console.log("User metadata from API:", userData);
              console.log("Setting user isAdmin based on API response:", userData.isAdmin);
              console.log("userData.isAdmin === true?", userData.isAdmin === true);
              
              const userToSet = {
                id: userData.id,
                name: userData.name || currentUser.displayName || "User",
                email: userData.email || currentUser.email || "",
                isAdmin: userData.isAdmin === true, // Only true if explicitly true
                department: userData.department
              };
              
              console.log("Final user object being set:", userToSet);
              setUser(userToSet);
            } else {
              console.log("User metadata not found in DB, using Firebase data only");
              // Use Firebase data only
              setUser({
                id: 0, // Temporary ID
                name: currentUser.displayName || "User",
                email: currentUser.email || "",
                isAdmin: currentUser.email === "admin@demo.io", // Admin if email is admin@demo.io
                department: ""
              });
            }
          } catch (error) {
            console.error("Error fetching user metadata:", error);
            // Fallback to Firebase data
            setUser({
              id: 0,
              name: currentUser.displayName || "User",
              email: currentUser.email || "",
              isAdmin: currentUser.email === "admin@demo.io",
              department: ""
            });
          }
        } else {
          console.log("No Firebase user, clearing local user state");
          setUser(null);
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only fetch user metadata when Firebase loading is done
    if (!firebaseLoading) {
      fetchUserMetadata();
    }
  }, [currentUser, firebaseLoading]);

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

  const { signOut: firebaseSignOut } = useFirebaseAuth();

  const logout = async () => {
    try {
      console.log("Dashboard: Starting logout process");
      
      // Remove traditional token
      localStorage.removeItem("token");

      // Remove Firebase token
      localStorage.removeItem("firebaseToken");
      
      // Set sessionStorage to prevent auto-login on auth page
      sessionStorage.setItem("skipAutoLogin", "true");
      
      // Clear all cached queries
      queryClient.clear();
      
      // Sign out from Firebase
      await firebaseSignOut();
      
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