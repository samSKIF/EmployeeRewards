import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { FirebaseAuthProvider } from "./context/FirebaseAuthContext";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <FirebaseAuthProvider>
      <App />
    </FirebaseAuthProvider>
  </QueryClientProvider>
);
