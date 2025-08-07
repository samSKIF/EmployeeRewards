import { Switch, Route, useLocation } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';
import Shop from '@/pages/shop';
import Transactions from '@/pages/transactions';
import Admin from '@/pages/admin';
import Seller from '@/pages/seller';
import AuthPage from '@/pages/auth-page';
import SocialPage from '@/pages/social-page';
import ProfilePage from '@/pages/profile-page';
import NewProfilePage from '@/pages/new-profile-page';
import UpdatedProfilePage from '@/pages/updated-profile-page';
// New modular admin components
import EmployeeDirectory from '@/pages/admin/people/EmployeeDirectory';
import EmployeeProfile from '@/pages/admin/people/EmployeeProfile';
import EmployeeOnboarding from '@/pages/admin/people/EmployeeOnboarding';
import EmployeeBulkActions from '@/pages/admin/people/EmployeeBulkActions';
import SpaceDirectory from '@/pages/admin/workspaces/SpaceDirectory';
import SpaceManagement from '@/pages/admin/workspaces/SpaceManagement';
import MembershipManagement from '@/pages/admin/relationships/MembershipManagement';
import OrganizationSettings from '@/pages/admin/system/OrganizationSettings';
import AdminPermissions from '@/pages/admin-permissions';
import EmployeePromotion from '@/pages/employee-promotion';
import AdminSurveys from '@/pages/admin-surveys';
import AdminSurveyCreator from '@/pages/admin-survey-creator';
import AdminSurveyTemplates from '@/pages/admin-survey-templates';
import AdminSurveyTemplatePreview from '@/pages/admin-survey-template-preview';
import AdminSurveyEditor from '@/pages/admin-survey-editor';
import LeaveManagement from '@/pages/leave-management';
import HRConfig from '@/pages/hr-config';
import AdminDashboard from '@/pages/admin/admin-dashboard';
import AdminDashboardNew from '@/pages/admin/dashboard';
import AdminOrgChart from '@/pages/admin/org-chart';
import BrandingPage from '@/pages/admin/branding';
import ShopConfigPage from '@/pages/admin/shop-config';
import ManagementDashboard from '@/pages/management-dashboard';
import CreateOrganization from '@/pages/CreateOrganization';
import OnboardingPage from '@/pages/admin/onboarding';
import AdminLeaveManagement from '@/pages/admin/leave-management';
import RecognitionSettingsPage from '@/pages/admin/recognition-settings';
import Recognition from '@/pages/recognition';
import RecognitionAnalytics from '@/pages/recognition-analytics';
import AdminStatusTypes from '@/pages/admin-status-types';
import StatusDemo from '@/pages/status-demo';
import OrgChart from '@/pages/org-chart';
import GroupsPage from '@/pages/groups';
import GroupsPageFacebook from '@/pages/groups-facebook';
import SpacesPage from '@/pages/spaces-new-design';
import SpaceDetailPage from '@/pages/space-detail';
import CorporateLoginPage from '@/pages/corporate-login';
import DepartmentManagement from '@/pages/admin/settings/DepartmentManagement';
import LocationManagement from '@/pages/admin/settings/LocationManagement';
import MassUpload from '@/pages/admin/people/MassUpload';
import DualWriteMonitor from '@/pages/admin/DualWriteMonitor';

import { BrandingProvider } from '@/context/BrandingContext';
import { AuthProvider } from '@/hooks/useAuth';
import AuthGuard from '@/components/AuthGuard';
import { useState, useEffect, lazy, Suspense } from 'react';
import SocialLayout from '@/layouts/SocialLayout';
import { Loader2 } from 'lucide-react';

// Lazy loaded components
const OnboardingTemplates = lazy(
  () => import('./pages/admin/onboarding/templates')
);
const OnboardingNew = lazy(() => import('./pages/admin/onboarding/new'));

function App() {
  const [location, setLocation] = useLocation();
  const [appReady, setAppReady] = useState(false);

  // Only initialize the app once to avoid refresh loops
  useEffect(() => {
    setAppReady(true);
  }, []);

  useEffect(() => {
    console.log('Current location:', location);

    const token = localStorage.getItem('token');

    // Only handle routing for unauthenticated users
    if (!token) {
      if (location !== '/auth' && location !== '/corporate-login') {
        console.log('No token found, redirecting to auth');
        setLocation('/auth');
      }
      return;
    }

    // Only redirect from root path, and only once
    if (location === '/' && token) {
      // Check if this is a corporate admin with management token
      const managementToken = localStorage.getItem('managementToken');
      if (managementToken) {
        console.log(
          'Corporate admin authenticated, routing to management dashboard'
        );
        setLocation('/management');
      } else {
        console.log('User authenticated, routing to social by default');
        setLocation('/social');
      }
    }
  }, []); // Remove location dependency to prevent constant re-routing

  // Separate effect to handle initial route check without dependencies
  useEffect(() => {
    const token = localStorage.getItem('token');

    // Handle initial load routing
    if (token && location === '/') {
      const managementToken = localStorage.getItem('managementToken');
      if (managementToken) {
        setLocation('/management');
      } else {
        setLocation('/social');
      }
    } else if (
      !token &&
      location !== '/auth' &&
      location !== '/corporate-login'
    ) {
      setLocation('/auth');
    }
  }, []);

  // Main application
  return (
    <TooltipProvider>
      <Toaster />
      {appReady && (
        <Switch>
          {/* Public routes - No authentication required */}
          <Route path="/auth">
            <AuthPage />
          </Route>
          <Route path="/corporate-login">
            <CorporateLoginPage />
          </Route>

          {/* Management Dashboard - Separate from social platform (no AuthProvider) */}
          <Route path="/management">
            <ManagementDashboard />
          </Route>
          <Route path="/management/organizations/new">
            <CreateOrganization />
          </Route>

          {/* All other routes use AuthProvider with AuthGuard */}
          <Route>
            <AuthProvider>
              <AuthGuard>
                <BrandingProvider>
                  <Switch>
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
                      <EmployeeDirectory />
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/employees/profile/:id">
                    <SocialLayout>
                      <EmployeeProfile />
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/employees/onboarding">
                    <SocialLayout>
                      <EmployeeOnboarding />
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/employees/bulk-actions">
                    <SocialLayout>
                      <EmployeeBulkActions />
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/workspaces">
                    <SocialLayout>
                      <SpaceDirectory />
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/workspaces/management">
                    <SocialLayout>
                      <SpaceManagement />
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/relationships/memberships">
                    <SocialLayout>
                      <MembershipManagement />
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/system/organization">
                    <SocialLayout>
                      <OrganizationSettings />
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/settings/departments">
                    <SocialLayout>
                      <DepartmentManagement />
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/employees/mass-upload">
                    <SocialLayout>
                      <MassUpload />
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/settings/locations">
                    <SocialLayout>
                      <LocationManagement />
                    </SocialLayout>
                  </Route>
                  {/* Legacy route redirects */}
                  <Route path="/admin-employees-groups">
                    <SocialLayout>
                      <EmployeeDirectory />
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
                      <AdminDashboardNew />
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/org-chart">
                    <SocialLayout>
                      <AdminOrgChart />
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
                      <Suspense
                        fallback={
                          <div className="flex items-center justify-center min-h-screen">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        }
                      >
                        <OnboardingTemplates />
                      </Suspense>
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/onboarding/new">
                    <SocialLayout>
                      <Suspense
                        fallback={
                          <div className="flex items-center justify-center min-h-screen">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        }
                      >
                        <OnboardingNew />
                      </Suspense>
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/onboarding">
                    <SocialLayout>
                      <OnboardingPage />
                    </SocialLayout>
                  </Route>
                  <Route path="/admin/dual-write-monitor">
                    <SocialLayout>
                      <DualWriteMonitor />
                    </SocialLayout>
                  </Route>
                  <Route path="/hr-config">
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center min-h-screen">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      }
                    >
                      <HRConfig />
                    </Suspense>
                  </Route>
                  <Route path="/seller">
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center min-h-screen">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      }
                    >
                      <Seller />
                    </Suspense>
                  </Route>
                  <Route path="/shop-config">
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center min-h-screen">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      }
                    >
                      <ShopConfig />
                    </Suspense>
                  </Route>

                  {/* ThrivioHR Social Platform routes */}
                  <Route path="/auth">
                    <AuthPage />
                  </Route>
                  <Route path="/corporate-login">
                    <CorporateLoginPage />
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
                  <Route path="/user/:id">
                    <SocialLayout>
                      <UpdatedProfilePage />
                    </SocialLayout>
                  </Route>
                  <Route path="/profile/:id">
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
                      <svg
                        className="animate-spin h-8 w-8 text-green-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </div>
                  </Route>
                    <Route>
                      <NotFound />
                    </Route>
                  </Switch>
                </BrandingProvider>
              </AuthGuard>
            </AuthProvider>
          </Route>
        </Switch>
      )}
    </TooltipProvider>
  );
}

export default App;

const ShopConfig = lazy(() => import('./pages/shop-config'));
