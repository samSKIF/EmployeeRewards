import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

type ProtectedRouteProps = {
  path: string;
  component: () => React.JSX.Element;
  adminOnly?: boolean;
};

export function FirebaseProtectedRoute({ 
  path, 
  component: Component,
  adminOnly = false 
}: ProtectedRouteProps) {
  const { firebaseUser, userData, isLoading } = useFirebaseAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!firebaseUser) {
    return (
      <Route path={path}>
        <Redirect to="/firebase-auth" />
      </Route>
    );
  }

  if (adminOnly && !userData?.isAdmin) {
    return (
      <Route path={path}>
        <Redirect to="/social" />
      </Route>
    );
  }

  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}