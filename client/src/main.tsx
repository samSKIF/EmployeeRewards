import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';

// Import and initialize i18n before rendering the app
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
import { Route, Router } from "wouter";
import AuthPage from "./pages/auth-page";
import SocialPage from "./pages/social-page";
import NotFound from "./pages/not-found";
import Dashboard from "./pages/dashboard";
import ProfilePage from "./pages/profile-page";
import NewProfilePage from "./pages/new-profile-page";
import UpdatedProfilePage from "./pages/updated-profile-page";
import RecognitionPage from "./pages/recognition";
import TransactionsPage from "./pages/transactions";
import LeaveRequestPage from "./pages/leave-request";
import LeaveManagementPage from "./pages/leave-management";
import SpacesPage from "./pages/spaces";
import SpaceDetailPage from "./pages/space-detail";
import SpacesNewPage from "./pages/spaces-new";
import SpacesNewDesignPage from "./pages/spaces-new-design";
import GroupsPage from "./pages/groups";
import GroupsFacebookPage from "./pages/groups-facebook";
import ShopPage from "./pages/shop";
import ShopConfigPage from "./pages/shop-config";
import AdminPage from "./pages/admin";
import AdminEmployeesPage from "./pages/admin-employees";
import AdminEmployeesGroupsPage from "./pages/admin-employees-groups";
import AdminSurveysPage from "./pages/admin-surveys";
import AdminSurveyCreatorPage from "./pages/admin-survey-creator";
import AdminSurveyEditorPage from "./pages/admin-survey-editor";
import AdminSurveyTemplatesPage from "./pages/admin-survey-templates";
import AdminSurveyTemplatePreviewPage from "./pages/admin-survey-template-preview";
import AdminFeaturedPostsPage from "./pages/admin-featured-posts";
import AdminStatusTypesPage from "./pages/admin-status-types";
import AdminPermissionsPage from "./pages/admin-permissions";
import Login from "./pages/login";
import CorporateLoginPage from "./pages/corporate-login";
import RecognitionAnalyticsPage from "./pages/recognition-analytics";
import { BrandingProvider } from "./context/BrandingContext";
import OrgChartPage from "./pages/org-chart";
import ManagementDashboardPage from "./pages/management-dashboard";
import StatusDemoPage from "./pages/status-demo";
import EmployeePromotionPage from "./pages/employee-promotion";
import SellerPage from "./pages/seller";
import AdminDashboardPage from "./pages/admin/admin-dashboard";
import AdminOnboardingPage from "./pages/admin/onboarding";
import AdminBrandingPage from "./pages/admin/branding";
import AdminRecognitionSettingsPage from "./pages/admin/recognition-settings";
import AdminLeaveManagementPage from "./pages/admin/leave-management";
import AdminShopConfigPage from "./pages/admin/shop-config";
import AdminCompanyOnboardingPage from "./pages/admin/company-onboarding";
import OnboardingNewPage from "./pages/admin/onboarding/new";
import OnboardingTemplatesPage from "./pages/admin/onboarding/templates";
import HrConfigPage from "./pages/hr-config";
import { Toaster } from "@/components/ui/toaster";
import "./i18n";

<Route path="/" component={AuthPage} />
          <Route path="/social" component={SocialPage} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/new-profile" component={NewProfilePage} />
          <Route path="/updated-profile" component={UpdatedProfilePage} />
          <Route path="/recognition" component={RecognitionPage} />
          <Route path="/transactions" component={TransactionsPage} />
          <Route path="/leave-request" component={LeaveRequestPage} />
          <Route path="/leave-management" component={LeaveManagementPage} />
          <Route path="/spaces" component={SpacesPage} />
          <Route path="/spaces/:id" component={SpaceDetailPage} />
          <Route path="/spaces-new" component={SpacesNewPage} />
          <Route path="/spaces-new-design" component={SpacesNewDesignPage} />
          <Route path="/groups" component={GroupsPage} />
          <Route path="/groups-facebook" component={GroupsFacebookPage} />
          <Route path="/shop" component={ShopPage} />
          <Route path="/shop-config" component={ShopConfigPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin-employees" component={AdminEmployeesPage} />
          <Route path="/admin-employees-groups" component={AdminEmployeesGroupsPage} />
          <Route path="/admin-surveys" component={AdminSurveysPage} />
          <Route path="/admin-survey-creator" component={AdminSurveyCreatorPage} />
          <Route path="/admin-survey-editor/:id" component={AdminSurveyEditorPage} />
          <Route path="/admin-survey-templates" component={AdminSurveyTemplatesPage} />
          <Route path="/admin-survey-template-preview/:id" component={AdminSurveyTemplatePreviewPage} />
          <Route path="/admin-featured-posts" component={AdminFeaturedPostsPage} />
          <Route path="/admin-status-types" component={AdminStatusTypesPage} />
          <Route path="/admin-permissions" component={AdminPermissionsPage} />
          <Route path="/login" component={Login} />
          <Route path="/corporate-login" component={CorporateLoginPage} />
          <Route path="/recognition-analytics" component={RecognitionAnalyticsPage} />
          <Route path="/org-chart" component={OrgChartPage} />
          <Route path="/management-dashboard" component={ManagementDashboardPage} />
          <Route path="/status-demo" component={StatusDemoPage} />
          <Route path="/employee-promotion" component={EmployeePromotionPage} />
          <Route path="/seller" component={SellerPage} />
          <Route path="/admin/dashboard" component={AdminDashboardPage} />
          <Route path="/admin/onboarding" component={AdminOnboardingPage} />
          <Route path="/admin/branding" component={AdminBrandingPage} />
          <Route path="/admin/recognition-settings" component={AdminRecognitionSettingsPage} />
          <Route path="/admin/leave-management" component={AdminLeaveManagementPage} />
          <Route path="/admin/shop-config" component={AdminShopConfigPage} />
          <Route path="/admin/company-onboarding" component={AdminCompanyOnboardingPage} />
          <Route path="/admin/onboarding/new" component={OnboardingNewPage} />
          <Route path="/admin/onboarding/templates" component={OnboardingTemplatesPage} />
          <Route path="/hr-config" component={HrConfigPage} />
          <Route component={NotFound} />