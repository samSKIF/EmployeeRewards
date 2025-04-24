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
import { FirebaseAuthProvider, useFirebaseAuth } from "@/context/FirebaseAuthContext";
import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Root redirect component
function RootRedirect() {
  const { currentUser } = useFirebaseAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (currentUser) {
      setLocation("/dashboard");
    } else {
      setLocation("/auth");
    }
  }, [currentUser, setLocation]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
    </div>
  );
}

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
            {/* Main dashboard routes - All protected */}
            <ProtectedRoute path="/dashboard" component={Dashboard} />
            <ProtectedRoute path="/shop" component={Shop} />
            <ProtectedRoute path="/transactions" component={Transactions} />
            <ProtectedRoute path="/admin" component={Admin} />
            <ProtectedRoute path="/admin/employees" component={AdminEmployees} />
            <ProtectedRoute path="/seller" component={Seller} />
            
            {/* Empulse Social Platform routes */}
            <Route path="/auth">
              <AuthPage />
            </Route>
            <ProtectedRoute path="/social" component={SocialPage} />
            <ProtectedRoute path="/social/:tab" component={SocialPage} />
            
            {/* Default route - redirects to dashboard if authenticated, otherwise to auth page */}
            <Route path="/">
              <RootRedirect />
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