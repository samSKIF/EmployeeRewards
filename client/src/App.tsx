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
import AdminSurveyCreator from "@/pages/admin-survey-creator";
import AdminSurveyTemplates from "@/pages/admin-survey-templates";
import AdminSurveyTemplatePreview from "@/pages/admin-survey-template-preview";
import AdminSurveyEditor from "@/pages/admin-survey-editor";
import HRConfig from "@/pages/hr-config";
import AdminDashboard from "@/pages/admin/admin-dashboard";
import BrandingPage from "@/pages/admin/branding";
import ShopConfigPage from "@/pages/admin/shop-config";
import { FirebaseAuthProvider } from "@/context/FirebaseAuthContext";
import { BrandingProvider } from "@/context/BrandingContext";
import { useState, useEffect, lazy } from "react";

function App() {
  const [location, setLocation] = useLocation();
  const [appReady, setAppReady] = useState(false);

  // Only initialize the app once to avoid refresh loops
  useEffect(() => {
    setAppReady(true);
  }, []);

  // Role-based redirect from root based on user type
  useEffect(() => {
    const token = localStorage.getItem("firebaseToken");

    // Only handle routing for unauthenticated users or root path
    if (!token) {
      if (location !== "/auth") {
        console.log("No token found, redirecting to auth");
        setLocation("/auth");
      }
      return;
    }

    // Only proceed with role check if we're on the root path
    if (location !== "/") {
      console.log("Not on root path, skipping redirect checks");
      return;
    }

    const checkAdminStatus = async () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log("Token payload for role check:", {
          email: payload.email,
          hasAdminClaim: payload.claims?.isAdmin === true
        });

        // Set default route - no longer redirecting admin users away from social
        console.log("User authenticated, routing to social by default");
        setLocation("/social");
      } catch (e) {
        console.error("Error checking admin status:", e);
        setLocation("/social"); // Default to social on error
      }
    };

    checkAdminStatus();
  }, [location, setLocation]);

  // Main application
  return (
    <TooltipProvider>
      <Toaster />
      {appReady && (
        <FirebaseAuthProvider>
          <BrandingProvider>
            <Switch>
              {/* Main dashboard routes */}
              <Route path="/social">
                <SocialPage />
              </Route>
              <Route path="/social/shop">
                <Shop />
              </Route>
              <Route path="/social/admin">
                <Admin />
              </Route>
              <Route path="/social/transactions">
                <Transactions />
              </Route>
              <Route path="/admin/employees">
                <AdminEmployees />
              </Route>
              <Route path="/admin/surveys/templates/:templateId">
                <AdminSurveyTemplatePreview />
              </Route>
              <Route path="/admin/surveys/templates">
                <AdminSurveyTemplates />
              </Route>
              <Route path="/admin/surveys/editor/:templateId">
                <AdminSurveyEditor />
              </Route>
              <Route path="/admin/surveys/new">
                <AdminSurveyCreator />
              </Route>
              <Route path="/admin/surveys/:id/edit">
                <AdminSurveyCreator />
              </Route>
              <Route path="/admin/surveys">
                <AdminSurveys />
              </Route>
              <Route path="/admin/dashboard">
                <AdminDashboard />
              </Route>
              <Route path="/admin/branding">
                <BrandingPage />
              </Route>
              <Route path="/admin/shop/config">
                <ShopConfigPage />
              </Route>
              <Route path="/hr-config">
                <HRConfig />
              </Route>
              <Route path="/seller">
                <Seller />
              </Route>
              <Route path="/shop-config">
                <ShopConfig />
              </Route>

              {/* ThrivioHR Social Platform routes */}
              <Route path="/auth">
                <AuthPage />
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
          </BrandingProvider>
        </FirebaseAuthProvider>
      )}
    </TooltipProvider>
  );
}

export default App;

const ShopConfig = lazy(() => import('./pages/shop-config'));