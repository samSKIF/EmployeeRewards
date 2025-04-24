import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Shop from "@/pages/shop";
import Transactions from "@/pages/transactions";
import Admin from "@/pages/admin";
import Seller from "@/pages/seller";
import AuthPage from "@/pages/auth-page";
import SocialPage from "@/pages/social-page";
import AdminEmployees from "@/pages/admin-employees";
import HRConfig from "@/pages/hr-config";
import { FirebaseAuthProvider } from "@/context/FirebaseAuthContext";
import { useState, useEffect } from "react";

function App() {
  const [location, setLocation] = useLocation();
  const [appReady, setAppReady] = useState(false);

  // Only initialize the app once to avoid refresh loops
  useEffect(() => {
    setAppReady(true);
  }, []);

  // Redirect to auth page if at root
  useEffect(() => {
    if (location === "/") {
      setLocation("/auth");
    }
  }, [location, setLocation]);

  // Main application
  return (
    <TooltipProvider>
      <Toaster />
      {appReady && (
        <FirebaseAuthProvider>
          <Switch>
            {/* Main dashboard routes */}
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
            <Route path="/admin/employees">
              <AdminEmployees />
            </Route>
            <Route path="/hr/config">
              <HRConfig />
            </Route>
            <Route path="/seller">
              <Seller />
            </Route>
            
            {/* Empulse Social Platform routes */}
            <Route path="/auth">
              <AuthPage />
            </Route>
            <Route path="/social">
              <SocialPage />
            </Route>
            <Route path="/social/:tab">
              <SocialPage />
            </Route>
            
            <Route path="/">
              <div className="flex items-center justify-center min-h-screen">
                <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </Route>
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </FirebaseAuthProvider>
      )}
    </TooltipProvider>
  );
}

export default App;