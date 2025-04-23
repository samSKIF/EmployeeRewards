import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { FirebaseAuthProvider } from "./hooks/use-firebase-auth";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    {/* Keep the original AuthProvider for backward compatibility during migration */}
    <AuthProvider>
      {/* Add the new FirebaseAuthProvider */}
      <FirebaseAuthProvider>
        <App />
      </FirebaseAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);
