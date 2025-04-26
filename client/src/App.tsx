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
import AdminSurveys from "@/pages/admin-surveys";
import EmployeeSurveys from "@/pages/surveys";
import UnifiedSurveys from "@/pages/unified-surveys";
import HRConfig from "@/pages/hr-config";
import { FirebaseAuthProvider } from "@/context/FirebaseAuthContext";
import { BrandingProvider } from "@/context/BrandingContext";
import { AuthProvider } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

function App() {
  const [location, setLocation] = useLocation();
  const [appReady, setAppReady] = useState(false);

  // Only initialize the app once to avoid refresh loops
  useEffect(() => {
    setAppReady(true);
  }, []);

  // Role-based redirect from root based on user type
  useEffect(() => {
    if (location === "/") {
      // Check if user is logged in via Firebase
      const token = localStorage.getItem("firebaseToken");
      
      if (token) {
        const checkAdminStatus = async () => {
          try {
            // First attempt to decode the token to determine user role
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log("Token payload in App.tsx:", { 
              email: payload.email,
              hasAdminClaim: payload.claims?.isAdmin === true 
            });
            
            // Special case for admin@demo.io which should always be admin
            if (payload.email === "admin@demo.io") {
              console.log("Admin email detected in App.tsx (admin@demo.io), redirecting to dashboard");
              setLocation("/dashboard");
              return;
            }
            
            // Check if user is admin via token claims
            if (payload && payload.claims && payload.claims.isAdmin === true) {
              console.log("Admin detected from token claims in App.tsx");
              // Admin users go to dashboard
              setLocation("/dashboard");
              return;
            }
            
            // If not determined by token, check with server
            try {
              const response = await fetch("/api/users/me", {
                headers: {
                  "Authorization": `Bearer ${token}`
                }
              });
              
              if (response.ok) {
                const userData = await response.json();
                console.log("User data from API in App.tsx:", userData);
                
                // Check if user is admin based on server response
                if (userData && userData.isAdmin) {
                  console.log("Admin status confirmed by server in App.tsx");
                  setLocation("/dashboard");
                  return;
                }
              }
              
              // Regular employees go to social platform
              console.log("Regular employee detected in App.tsx, redirecting to social");
              setLocation("/social");
            } catch (serverError) {
              console.error("Server check failed:", serverError);
              // If server check fails but we have token, go to social as default
              setLocation("/social");
            }
          } catch (e) {
            console.error("Error decoding token:", e);
            // If there's an error decoding, go to auth page
            setLocation("/auth");
          }
        };
        
        checkAdminStatus();
      } else {
        // No token found, redirect to auth page
        setLocation("/auth");
      }
    }
  }, [location, setLocation]);

  // Main application
  return (
    <TooltipProvider>
      <Toaster />
      {appReady && (
        <FirebaseAuthProvider>
          <BrandingProvider>
            <AuthProvider>
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
              <Route path="/admin/surveys">
                <AdminSurveys />
              </Route>
              <Route path="/hr-config">
                <HRConfig />
              </Route>
              <Route path="/seller">
                <Seller />
              </Route>
              <Route path="/surveys">
                <EmployeeSurveys />
              </Route>
              
              {/* ThrivioHR Social Platform routes */}
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
              </AuthProvider>
          </BrandingProvider>
        </FirebaseAuthProvider>
      )}
    </TooltipProvider>
  );
}

export default App;