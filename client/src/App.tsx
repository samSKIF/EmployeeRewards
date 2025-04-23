import { Switch, Route } from "wouter";
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
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      {/* Protected dashboard routes */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/shop" component={Shop} />
      <ProtectedRoute path="/transactions" component={Transactions} />
      <ProtectedRoute path="/admin" component={Admin} />
      <ProtectedRoute path="/admin/employees" component={AdminEmployees} />
      <ProtectedRoute path="/seller" component={Seller} />
      
      {/* Protected social platform routes */}
      <ProtectedRoute path="/social" component={SocialPage} />
      <ProtectedRoute path="/social/:tab" component={SocialPage} />
      
      {/* Authentication route */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Default route - redirect to dashboard */}
      <ProtectedRoute path="/" component={Dashboard} />
      
      {/* Not found route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;