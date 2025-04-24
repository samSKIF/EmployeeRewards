import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  auth, 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser, 
  getUserData, 
  signInWithGoogle,
  FirebaseUser
} from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

type UserData = {
  uid: string;
  email: string | null;
  name: string | null;
  username: string;
  photoURL?: string | null;
  isAdmin: boolean;
  department: string | null;
  points: number;
  [key: string]: any;
};

type RegisterData = {
  username: string;
  password: string;
  name: string;
  email: string;
  department?: string;
  isAdmin?: boolean;
};

type LoginData = {
  email: string;
  password: string;
};

type AuthContextType = {
  firebaseUser: FirebaseUser | null;
  userData: UserData | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: {
    mutate: (credentials: LoginData) => void;
    isPending: boolean;
    error: Error | null;
  };
  googleLoginMutation: {
    mutate: () => void;
    isPending: boolean;
    error: Error | null;
  };
  logoutMutation: {
    mutate: () => void;
    isPending: boolean;
    error: Error | null;
  };
  registerMutation: {
    mutate: (credentials: RegisterData) => void;
    isPending: boolean;
    error: Error | null;
  };
};

export const FirebaseAuthContext = createContext<AuthContextType | null>(null);

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // Fetch user data from Firestore when Firebase auth user changes
  const {
    data: userData,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["userData", firebaseUser?.uid],
    queryFn: async () => {
      if (!firebaseUser?.uid) return null;
      return await getUserData(firebaseUser.uid) as UserData;
    },
    enabled: !!firebaseUser?.uid && authInitialized,
  });

  // Login with email/password
  const login = useMutation({
    mutationFn: async (credentials: LoginData) => {
      return await loginWithEmail(credentials.email, credentials.password);
    },
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  // Login with Google
  const googleLogin = useMutation({
    mutationFn: async () => {
      return await signInWithGoogle();
    },
    onSuccess: () => {
      toast({
        title: "Google login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Google login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register with email/password
  const register = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      return await registerWithEmail(
        credentials.email,
        credentials.password,
        credentials.name,
        credentials.username,
        credentials.department,
        credentials.isAdmin
      );
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "Your account has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  // Logout
  const logout = useMutation({
    mutationFn: async () => {
      await logoutUser();
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      queryClient.clear();
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <FirebaseAuthContext.Provider
      value={{
        firebaseUser,
        userData: userData || null,
        isLoading: isLoading || !authInitialized,
        error,
        loginMutation: {
          mutate: login.mutate,
          isPending: login.isPending,
          error: login.error,
        },
        googleLoginMutation: {
          mutate: googleLogin.mutate,
          isPending: googleLogin.isPending,
          error: googleLogin.error,
        },
        logoutMutation: {
          mutate: logout.mutate,
          isPending: logout.isPending,
          error: logout.error,
        },
        registerMutation: {
          mutate: register.mutate,
          isPending: register.isPending,
          error: register.error,
        },
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error("useFirebaseAuth must be used within a FirebaseAuthProvider");
  }
  return context;
}