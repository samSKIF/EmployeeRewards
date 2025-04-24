import { useEffect } from "react";
import { Route, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useFirebaseAuth } from "@/context/FirebaseAuthContext";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { currentUser, loading } = useFirebaseAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !currentUser) {
      console.log("User not authenticated, redirecting to /auth");
      setLocation("/auth");
    }
  }, [currentUser, loading, setLocation]);

  return (
    <Route path={path}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      ) : currentUser ? (
        <Component />
      ) : null}
    </Route>
  );
}