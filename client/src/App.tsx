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
import ProfilePage from "@/pages/profile-page";
import NewProfilePage from "@/pages/new-profile-page";
import UpdatedProfilePage from "@/pages/updated-profile-page";
import AdminEmployees from "@/pages/admin-employees";
import AdminEmployeesGroups from "@/pages/admin-employees-groups";
import AdminPermissions from "@/pages/admin-permissions";
import EmployeePromotion from "@/pages/employee-promotion";
import AdminSurveys from "@/pages/admin-surveys";
import AdminSurveyCreator from "@/pages/admin-survey-creator";
import AdminSurveyTemplates from "@/pages/admin-survey-templates";
import AdminSurveyTemplatePreview from "@/pages/admin-survey-template-preview";
import AdminSurveyEditor from "@/pages/admin-survey-editor";
import LeaveManagement from "@/pages/leave-management";
import HRConfig from "@/pages/hr-config";
import AdminDashboard from "@/pages/admin/admin-dashboard";
import BrandingPage from "@/pages/admin/branding";
import ShopConfigPage from "@/pages/admin/shop-config";
import ManagementDashboard from "@/pages/management-dashboard";
import OnboardingPage from "@/pages/admin/onboarding";
import AdminLeaveManagement from "@/pages/admin/leave-management";
import RecognitionSettingsPage from "@/pages/admin/recognition-settings";
import Recognition from "@/pages/recognition";
import RecognitionAnalytics from "@/pages/recognition-analytics";
import AdminStatusTypes from "@/pages/admin-status-types";
import StatusDemo from "@/pages/status-demo";
import OrgChart from "@/pages/org-chart";
import GroupsPage from "@/pages/groups";
import GroupsPageFacebook from "@/pages/groups-facebook";
import SpacesPage from "@/pages/spaces-new";
import SpaceDetailPage from "@/pages/space-detail";

import { BrandingProvider } from "@/context/BrandingContext";
import { AuthProvider } from "@/hooks/useAuth";
import { useState, useEffect, lazy, Suspense } from "react";
import SocialLayout from "@/layouts/SocialLayout";
import { Loader2 } from "lucide-react";

// Lazy loaded components
const OnboardingTemplates = lazy(() => import('./pages/admin/onboarding/templates'));
const OnboardingNew = lazy(() => import('./pages/admin/onboarding/new'));

function App() {
  const [location, setLocation] = useLocation();
  const [appReady, setAppReady] = useState(false);

  // Only initialize the app once to avoid refresh loops
  useEffect(() => {
    setAppReady(true);
  }, []);

  useEffect(() => {
    console.log("Current location:", location);

    const token = localStorage.getItem("token");

    // Only handle routing for unauthenticated users
    if (!token) {
      if (location !== "/auth") {
        console.log("No token found, redirecting to auth");
        setLocation("/auth");
      }
      return;
    }

    // Only redirect from root path, and only once
    if (location === "/" && token) {
      console.log("User authenticated, routing to social by default");
      setLocation("/social");
    }
  }, []); // Remove location dependency to prevent constant re-routing

  // Separate effect to handle initial route check without dependencies
  useEffect(() => {
    const token = localStorage.getItem("token");

    // Handle initial load routing
    if (token && location === "/") {
      setLocation("/social");
    } else if (!token && location !== "/auth") {
      setLocation("/auth");
    }
  }, []);

  // Main application
  return (
    <TooltipProvider>
      <Toaster />
      {appReady && (
        <AuthProvider>
          <BrandingProvider>
            <Switch>
              {/* Management Dashboard - Separate from social platform */}
              <Route path="/management">
                <ManagementDashboard />
              </Route>

              {/* Main dashboard routes */}
              <Route path="/social">
                <SocialLayout>
                  <SocialPage />
                </SocialLayout>
              </Route>
              <Route path="/social/shop">
                <SocialLayout>
                  <Shop />
                </SocialLayout>
              </Route>
              <Route path="/social/admin">
                <SocialLayout>
                  <Admin />
                </SocialLayout>
              </Route>
              <Route path="/social/transactions">
                <SocialLayout>
                  <Transactions />
                </SocialLayout>
              </Route>
              <Route path="/admin/employees">
                <SocialLayout>
                  <AdminEmployeesGroups />
                </SocialLayout>
              </Route>
              <Route path="/admin/permissions">
                <SocialLayout>
                  <AdminPermissions />
                </SocialLayout>
              </Route>
              <Route path="/admin/employee-promotion">
                <SocialLayout>
                  <EmployeePromotion />
                </SocialLayout>
              </Route>
              <Route path="/admin/surveys/templates/:templateId">
                <SocialLayout>
                  <AdminSurveyTemplatePreview />
                </SocialLayout>
              </Route>
              <Route path="/admin/surveys/templates">
                <SocialLayout>
                  <AdminSurveyTemplates />
                </SocialLayout>
              </Route>
              <Route path="/admin/surveys/editor/:templateId">
                <SocialLayout>
                  <AdminSurveyEditor />
                </SocialLayout>
              </Route>
              <Route path="/admin/surveys/new">
                <SocialLayout>
                  <AdminSurveyCreator />
                </SocialLayout>
              </Route>
              <Route path="/admin/surveys/:id/edit">
                <SocialLayout>
                  <AdminSurveyCreator />
                </SocialLayout>
              </Route>
              <Route path="/admin/surveys">
                <SocialLayout>
                  <AdminSurveys />
                </SocialLayout>
              </Route>
              <Route path="/admin/dashboard">
                <SocialLayout>
                  <AdminDashboard />
                </SocialLayout>
              </Route>
              <Route path="/admin/branding">
                <SocialLayout>
                  <BrandingPage />
                </SocialLayout>
              </Route>
              <Route path="/admin/leave-management">
                <SocialLayout>
                  <AdminLeaveManagement />
                </SocialLayout>
              </Route>
              <Route path="/admin/recognition-settings">
                <SocialLayout>
                  <RecognitionSettingsPage />
                </SocialLayout>
              </Route>
              <Route path="/admin/recognition-analytics">
                <SocialLayout>
                  <RecognitionAnalytics isAdmin={true} />
                </SocialLayout>
              </Route>
              <Route path="/insights/recognition">
                <SocialLayout>
                  <RecognitionAnalytics isAdmin={false} />
                </SocialLayout>
              </Route>
              <Route path="/admin/status-types">
                <SocialLayout>
                  <AdminStatusTypes />
                </SocialLayout>
              </Route>
              <Route path="/admin/shop/config">
                <SocialLayout>
                  <ShopConfigPage />
                </SocialLayout>
              </Route>
              <Route path="/admin/onboarding/templates">
                <SocialLayout>
                  <Suspense fallback={
                    <div className="flex items-center justify-center min-h-screen">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  }>
                    <OnboardingTemplates />
                  </Suspense>
                </SocialLayout>
              </Route>
              <Route path="/admin/onboarding/new">
                <SocialLayout>
                  <Suspense fallback={
                    <div className="flex items-center justify-center min-h-screen">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  }>
                    <OnboardingNew />
                  </Suspense>
                </SocialLayout>
              </Route>
              <Route path="/admin/onboarding">
                <SocialLayout>
                  <OnboardingPage />
                </SocialLayout>
              </Route>
              <Route path="/hr-config">
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }>
                  <HRConfig />
                </Suspense>
              </Route>
              <Route path="/seller">
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }>
                  <Seller />
                </Suspense>
              </Route>
              <Route path="/shop-config">
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }>
                  <ShopConfig />
                </Suspense>
              </Route>

              {/* ThrivioHR Social Platform routes */}
              <Route path="/auth">
                <AuthPage />
              </Route>
              <Route path="/social/:tab">
                <SocialLayout>
                  <SocialPage />
                </SocialLayout>
              </Route>
              <Route path="/user/surveys">
                <SocialLayout>
                  <SocialPage />
                </SocialLayout>
              </Route>
              <Route path="/user/profile">
                <SocialLayout>
                  <UpdatedProfilePage />
                </SocialLayout>
              </Route>
              <Route path="/profile">
                <SocialLayout>
                  <ProfilePage />
                </SocialLayout>
              </Route>

              <Route path="/recognition">
                <SocialLayout>
                  <Recognition />
                </SocialLayout>
              </Route>

              <Route path="/leave-management">
                <SocialLayout>
                  <LeaveManagement />
                </SocialLayout>
              </Route>

              <Route path="/status-demo">
                <SocialLayout>
                  <StatusDemo />
                </SocialLayout>
              </Route>

              <Route path="/org-chart">
                <SocialLayout>
                  <OrgChart />
                </SocialLayout>
              </Route>

              <Route path="/groups">
                <SocialLayout>
                  <GroupsPageFacebook />
                </SocialLayout>
              </Route>

              <Route path="/spaces/:id">
                <SocialLayout>
                  <SpaceDetailPage />
                </SocialLayout>
              </Route>

              {/* Alias route for backward compatibility */}
              <Route path="/channels/:id">
                <SocialLayout>
                  <SpaceDetailPage />
                </SocialLayout>
              </Route>

              <Route path="/spaces">
                <SocialLayout>
                  <SpacesPage />
                </SocialLayout>
              </Route>

              <Route path="/employee/:id">
                <SocialLayout>
                  <ProfilePage />
                </SocialLayout>
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
        </AuthProvider>
      )}
    </TooltipProvider>
  );
}

export default App;

const ShopConfig = lazy(() => import('./pages/shop-config'));