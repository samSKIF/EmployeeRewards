import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Shop from "@/pages/shop";
import Transactions from "@/pages/transactions";
import Admin from "@/pages/admin";
import Seller from "@/pages/seller";
import { useEffect, useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useLocation();

  // Auto-login and fetch user profile
  useEffect(() => {
    async function autoLogin() {
      try {
        // Clear any existing token
        localStorage.removeItem("token");

        console.log("Starting auto-login process...");
        
        // Perform automatic login
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            username: "admin", 
            password: "admin123" 
          }),
        });

        if (!loginResponse.ok) {
          throw new Error(`Login failed: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        console.log("Login successful, token received");
        
        // Store token
        localStorage.setItem("token", loginData.token);
        
        // Fetch user profile with token
        const userResponse = await fetch("/api/users/me", {
          headers: {
            Authorization: `Bearer ${loginData.token}`
          }
        });
        
        if (!userResponse.ok) {
          throw new Error("Failed to fetch user profile");
        }
        
        const userData = await userResponse.json();
        console.log("User profile loaded:", userData);
        
        // Store user data
        setUser(userData);
        queryClient.setQueryData(["/api/user"], userData);
        
        // Go to dashboard if on root URL
        if (location === "/") {
          setLocation("/dashboard");
        }
      } catch (error: any) {
        console.error("Authentication error:", error.message);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }

    autoLogin();
  }, [location, setLocation]);

  // Display loading indicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="w-16 h-16 mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">RewardHub</h1>
          <p className="text-gray-600">Logging in automatically...</p>
        </div>
      </div>
    );
  }

  // Display error message
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="w-16 h-16 flex items-center justify-center bg-red-100 rounded-full mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Login Failed</h1>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main application
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
          {user?.isAdmin ? <Admin /> : <Dashboard />}
        </Route>
        <Route path="/seller">
          {user?.isAdmin ? <Seller /> : <Dashboard />}
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