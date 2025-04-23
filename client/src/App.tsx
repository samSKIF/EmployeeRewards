import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Shop from "@/pages/shop";
import Transactions from "@/pages/transactions";
import Admin from "@/pages/admin";
import Seller from "@/pages/seller";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Award } from "lucide-react";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Instead of sending to /login, auto-login and redirect to dashboard
      window.location.href = "/";
    } else if (!isLoading && adminOnly && !user?.isAdmin) {
      setLocation("/dashboard");
    }
  }, [isLoading, isAuthenticated, adminOnly, user, setLocation]);

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  return isAuthenticated && (!adminOnly || user?.isAdmin) ? <Component /> : null;
}

// Auto-login component
function AutoLogin() {
  const [status, setStatus] = useState("Logging in automatically...");
  
  useEffect(() => {
    const performAutoLogin = async () => {
      try {
        // Clear any existing tokens first
        localStorage.removeItem("token");
        
        console.log("Performing automatic login as admin...");
        
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
        console.log("Auto-login successful, setting token");
        
        // Store token
        localStorage.setItem("token", data.token);
        
        setStatus("Login successful! Redirecting to dashboard...");
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
        
      } catch (error) {
        console.error("Auto-login failed:", error);
        setStatus("Login failed. Please refresh the page to try again.");
      }
    };
    
    performAutoLogin();
  }, []);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center space-y-6 bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="7"></circle>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">RewardHub</h1>
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 text-center">
          {status}
        </p>
      </div>
    </div>
  );
}

function RouterLogic() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();

  console.log("App routing state:", { isAuthenticated, isLoading, location, user });

  // Simple loading indicator while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="text-xl font-medium">Loading your profile...</div>
        </div>
      </div>
    );
  }

  // If not authenticated, perform auto-login
  if (!isAuthenticated) {
    return <AutoLogin />;
  }

  return (
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
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <RouterLogic />
    </TooltipProvider>
  );
}

export default App;
