import { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { auth, signInWithGoogle } from "@/lib/firebase";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, displayName: string) => Promise<User>;
  signInWithGooglePopup: () => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useFirebaseAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useFirebaseAuth must be used within a FirebaseAuthProvider");
  }
  return context;
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    console.log("Setting up Firebase auth state listener");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Firebase auth state changed:", user ? `User: ${user.displayName} (${user.email})` : "No user");
      setCurrentUser(user);
      setLoading(false);
      
      // Save firebase auth token to localStorage for future API calls
      if (user) {
        // When we have a user, get their ID token to use for API calls
        user.getIdToken().then(token => {
          console.log("Firebase ID token obtained");
          localStorage.setItem("firebaseToken", token);
        });
      } else {
        // Clear any saved token
        localStorage.removeItem("firebaseToken");
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      console.error("Email sign-in error:", error);
      throw error;
    }
  };

  // Register with email and password
  const register = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Update the user profile with display name
      if (result.user) {
        await updateProfile(result.user, { displayName });
      }
      return result.user;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGooglePopup = async () => {
    try {
      console.log("Starting Google sign-in with popup");
      const user = await signInWithGoogle();
      console.log("Google sign-in successful, storing result in state");
      
      // Manually update our currentUser state since onAuthStateChanged might be delayed
      setCurrentUser(user);
      
      return user;
    } catch (error) {
      console.error("Google sign-in popup error:", error);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      console.log("FirebaseAuthContext: Starting sign out");
      
      // Set user to null first to avoid redirect attempts during sign out
      setCurrentUser(null);
      
      // Clear token from localStorage
      localStorage.removeItem("firebaseToken");
      
      // Then sign out from Firebase
      await firebaseSignOut(auth);
      
      console.log("FirebaseAuthContext: Sign out completed");
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    signIn,
    register,
    signInWithGooglePopup,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}