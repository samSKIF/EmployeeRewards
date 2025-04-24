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
import { FirebaseAuthProvider } from "@/context/FirebaseAuthContext";

function App() {

  // Main application
  return (
    <TooltipProvider>
      <Toaster />
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
          
          {/* Empulse Social Platform routes (manual login) */}
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
    </TooltipProvider>
  );
}

export default App;