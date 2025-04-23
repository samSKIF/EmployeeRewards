import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Shop from "@/pages/shop";
import Transactions from "@/pages/transactions";
import Admin from "@/pages/admin";
import Seller from "@/pages/seller";
import AuthPage from "@/pages/auth-page";
import FirebaseAuthPage from "@/pages/firebase-auth-page";
import SocialPage from "@/pages/social-page";
import AdminEmployees from "@/pages/admin-employees";
import AnalyticsDashboard from "@/pages/analytics";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { FirebaseProtectedRoute } from "./lib/firebase-protected-route";
import { useFirebaseAuth } from "./hooks/use-firebase-auth";

function Router() {
  // Get authentication state from both systems during migration
  const authContext = useAuth();
  const firebaseAuthContext = useFirebaseAuth();
  
  const user = authContext?.user;
  const firebaseUser = firebaseAuthContext?.firebaseUser;
  
  // Use either authentication system (prioritize Firebase)
  const isAuthenticated = !!firebaseUser || !!user;
  
  return (
    <Switch>
      {/* Protected dashboard routes */}
      <FirebaseProtectedRoute path="/dashboard" component={Dashboard} />
      <FirebaseProtectedRoute path="/shop" component={Shop} />
      <FirebaseProtectedRoute path="/transactions" component={Transactions} />
      <FirebaseProtectedRoute path="/admin" component={Admin} adminOnly={true} />
      <FirebaseProtectedRoute path="/admin/employees" component={AdminEmployees} adminOnly={true} />
      <FirebaseProtectedRoute path="/admin/analytics" component={AnalyticsDashboard} adminOnly={true} />
      <FirebaseProtectedRoute path="/seller" component={Seller} />
      
      {/* Protected social platform routes */}
      <FirebaseProtectedRoute path="/social" component={SocialPage} />
      <FirebaseProtectedRoute path="/social/:tab" component={SocialPage} />
      
      {/* Firebase Authentication route */}
      <Route path="/firebase-auth">
        {() => {
          if (isAuthenticated) {
            return <Redirect to="/social" />;
          }
          return <FirebaseAuthPage />;
        }}
      </Route>
      
      {/* Legacy Authentication route */}
      <Route path="/auth">
        {() => {
          if (isAuthenticated) {
            return <Redirect to="/social" />;
          }
          return <AuthPage />;
        }}
      </Route>
      
      {/* Default route - redirect to firebase-auth if not logged in, dashboard if logged in */}
      <Route path="/">
        {() => {
          if (!isAuthenticated) {
            return <Redirect to="/firebase-auth" />;
          }
          return <Dashboard />;
        }}
      </Route>
      
      {/* Not found route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    // Note: AuthProvider and QueryClientProvider are already provided in main.tsx
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

export default App;