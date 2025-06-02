import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@shared/types";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useFirebaseAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing JWT token on app load
    const token = localStorage.getItem("token");
    if (token) {
      // Verify token by fetching user data
      fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        if (user) {
          setCurrentUser(user);
        } else {
          localStorage.removeItem("token");
        }
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("token");
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const { token } = await response.json();
      localStorage.setItem("token", token);

      // Fetch user data
      const userResponse = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user data");
      }

      const user = await userResponse.json();
      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setCurrentUser(null);
      localStorage.removeItem("token");
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}