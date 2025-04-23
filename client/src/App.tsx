import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Shop from "@/pages/shop";
import Transactions from "@/pages/transactions";
import Admin from "@/pages/admin";
import Seller from "@/pages/seller";
import { queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";

// Direct access implementation
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function login() {
      try {
        // Clear any existing token first
        localStorage.removeItem("token");
        
        console.log("Performing automatic login...");
        
        // Make login request
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
          throw new Error(`Login failed: ${response.status}`);
        }
    
        const data = await response.json();
        console.log("Login successful");
        
        // Store token in localStorage
        localStorage.setItem("token", data.token);
        
        // Fetch the user profile
        const userResponse = await fetch("/api/users/me", {
          headers: {
            Authorization: `Bearer ${data.token}`
          }
        });
        
        if (!userResponse.ok) {
          throw new Error("Failed to fetch user profile");
        }
        
        const userData = await userResponse.json();
        console.log("User profile loaded:", userData);
        
        // Store user in state
        setUser(userData);
        
        // Also store in query cache for components that may use useQuery
        queryClient.setQueryData(["/api/user"], userData);
        
      } catch (error: any) {
        console.error("Login error:", error.message);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }
    
    // Run login on component mount
    login();
  }, []);

  // Show loading spinner while authenticating
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-500"></div>
          <div className="text-xl font-medium">Logging in...</div>
        </div>
      </div>
    );
  }

  // Display error message if login failed
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4 p-8 bg-white shadow-lg rounded-lg max-w-md">
          <div className="w-16 h-16 flex items-center justify-center bg-red-100 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Login Failed</h2>
          <p className="text-gray-600 text-center">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  // Create request interceptor for authenticated API calls
  useEffect(() => {
    if (!isLoading && user) {
      const token = localStorage.getItem("token");
      
      // Every 5 seconds, check for /dashboard/stats and refresh it
      const interval = setInterval(() => {
        const fetchData = async () => {
          try {
            // Fetch dashboard stats with authorization header
            const response = await fetch("/api/dashboard/stats", {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              queryClient.setQueryData(["/api/dashboard/stats"], data);
            }
          } catch (error) {
            console.error("Failed to fetch dashboard stats:", error);
          }
        };
        
        fetchData();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isLoading, user]);

  // Main app content
  return (
    <TooltipProvider>
      <Toaster />
      <Switch>
        <Route path="/dashboard">
          <Dashboard />
        </Route>
        <Route path="/shop">
          <Shop />
        </Route>
        <Route path="/transactions">
          <Transactions />
        </Route>
        <Route path="/admin">
          <Admin />
        </Route>
        <Route path="/seller">
          <Seller />
        </Route>
        <Route path="/">
          <Dashboard />
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </TooltipProvider>
  );
}

export default App;