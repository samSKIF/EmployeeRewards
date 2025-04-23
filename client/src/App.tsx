import { Switch, Route, useLocation, Router } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Shop from "@/pages/shop";
import Transactions from "@/pages/transactions";
import Admin from "@/pages/admin";
import Seller from "@/pages/seller";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    } else if (!isLoading && adminOnly && !user?.isAdmin) {
      setLocation("/dashboard");
    }
  }, [isLoading, isAuthenticated, adminOnly, user, setLocation]);

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  return isAuthenticated && (!adminOnly || user?.isAdmin) ? <Component /> : null;
}

function RouterLogic() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();

  console.log("App routing state:", { isAuthenticated, isLoading, location, user });

  useEffect(() => {
    if (isAuthenticated && location === "/login") {
      console.log("User is authenticated and on login page, redirecting to dashboard");
      window.location.href = "/dashboard";
    }
  }, [isAuthenticated, location]);

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

  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? 
          (() => {
            // This is a immediately-invoked function expression (IIFE) to handle the redirect
            setTimeout(() => { window.location.href = "/dashboard"; }, 1000);
            return (
              <div className="h-screen flex items-center justify-center">
                <div className="text-xl">Already logged in. Redirecting...</div>
              </div>
            );
          })()
          : <Login />
        }
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/shop">
        <ProtectedRoute component={Shop} />
      </Route>
      <Route path="/transactions">
        <ProtectedRoute component={Transactions} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={Admin} adminOnly={true} />
      </Route>
      <Route path="/seller">
        <ProtectedRoute component={Seller} adminOnly={true} />
      </Route>
      <Route path="/">
        {isAuthenticated ? <Dashboard /> : <Login />}
      </Route>
      <Route component={NotFound} />
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
