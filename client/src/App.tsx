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
import { FirebaseAuthProvider } from "@/context/FirebaseAuthContext";
import { useState, useEffect } from "react";

function App() {
  const [location] = useLocation();
  const [appReady, setAppReady] = useState(false);

  // Only initialize the app once to avoid refresh loops
  useEffect(() => {
    setAppReady(true);
  }, []);

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
              <AuthPage />
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