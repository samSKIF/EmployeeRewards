import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useFirebaseAuth } from "@/context/FirebaseAuthContext";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showAdminSetup, setShowAdminSetup] = useState(false);
  
  // Admin account setup form fields
  const [adminEmail, setAdminEmail] = useState("admin@demo.io");
  const [adminPassword, setAdminPassword] = useState("admin123");
  const [adminCompanyName, setAdminCompanyName] = useState("");
  const [adminCountry, setAdminCountry] = useState("");
  const [adminAddress, setAdminAddress] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  
  // Function to show admin setup dialog
  const openAdminSetupDialog = () => {
    setShowAdminSetup(true);
  };
  
  // Function to create admin account in Firebase
  const createAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Check if admin already exists by trying to sign in
      try {
        await signIn(adminEmail, adminPassword);
        console.log("Admin account already exists in Firebase");
        
        // If login succeeded, sign out to allow regular login
        await signOut();
        
        toast({
          title: "Admin Account Check",
          description: "Admin account already exists in Firebase",
        });
        
        setShowAdminSetup(false);
        return;
      } catch (signInError) {
        // If login failed with auth/user-not-found, it means we need to create the account
        console.log("Admin sign-in failed, will create account:", signInError);
      }
      
      // Create admin account in Firebase
      console.log("Creating admin account in Firebase");
      const firebaseUser = await register(adminEmail, adminPassword, adminCompanyName || "Admin User");
      
      // Save user metadata to our database
      await apiRequest("POST", "/api/users/metadata", {
        name: adminCompanyName || "Admin User",
        email: adminEmail,
        username: "admin",
        department: "Administration",
        firebaseUid: firebaseUser.uid,
        isAdmin: true,  // Ensure this is set to true
        companyName: adminCompanyName,
        country: adminCountry, 
        address: adminAddress,
        phone: adminPhone
      });
      
      console.log("Admin account created successfully");
      
      toast({
        title: "Success",
        description: "Admin account created successfully",
      });
      
      // Close the dialog after successful creation
      setShowAdminSetup(false);
    } catch (error: any) {
      console.error("Admin account creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create admin account",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Parse the redirectTo parameter from the URL query and check user role
  const getRedirectPath = () => {
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get('redirectTo');
    
    if (redirectTo === 'social') {
      return '/social'; // Corrected path to match the route in App.tsx
    }
    
    // Check Firebase token to see if user is registered in our system
    const token = localStorage.getItem("firebaseToken");
    if (token) {
      try {
        // Decode Firebase token to check user data (without verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // If we have custom claims for admin role, use them
        if (payload && payload.claims && payload.claims.isAdmin === true) {
          return '/dashboard'; // Admin users go to dashboard
        }
        
        // Default to shop for regular employees
        return '/shop';
      } catch (e) {
        console.error("Error decoding token:", e);
      }
    }
    
    // If we can't determine role or no token, default to shop
    return '/shop';
  };
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerDepartment, setRegisterDepartment] = useState("");
  
  // Add a state to track if we should skip auto-login
  // Initialize from sessionStorage to persist across page refreshes
  const [skipAutoLogin, setSkipAutoLogin] = useState(() => {
    return sessionStorage.getItem("skipAutoLogin") === "true";
  });
  
  // Check if already logged in with Firebase
  const { currentUser, loading, signIn, register, signInWithGooglePopup, signOut } = useFirebaseAuth();
  
  // Add a button handler to log out
  const handleLogout = async () => {
    try {
      console.log("Attempting to sign out from Firebase");
      // Set the flag first to prevent auto redirection
      setSkipAutoLogin(true);
      // Store in sessionStorage to persist across page refreshes
      sessionStorage.setItem("skipAutoLogin", "true");
      
      // Remove the token from localStorage
      localStorage.removeItem("firebaseToken");
      
      // Call Firebase signOut
      await signOut();
      
      console.log("Sign out successful");
      
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  useEffect(() => {
    // Only auto-login if not specifically canceled
    if (!loading && currentUser && !skipAutoLogin) {
      console.log("User already logged in with Firebase:", currentUser);
      
      // For Google login, make sure we save the user metadata to our backend
      const saveUserMetadata = async () => {
        try {
          console.log("Saving Firebase user metadata on auto-detection");
          
          // Get the Firebase ID token for authentication
          const token = await currentUser.getIdToken();
          console.log("Got Firebase ID token");
          
          // Log token details for debugging (without exposing the full token)
          console.log("Token prefix:", token.substring(0, 10) + "...");
          
          // Store token in localStorage for API authentication
          localStorage.setItem("firebaseToken", token);
          
          // Test if token works
          try {
            const response = await fetch("/api/users/me", {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            });
            console.log("Token test response:", response.status, await response.text());
          } catch (error) {
            console.error("Token test failed:", error);
          }
          
          // Save user data to our backend
          await apiRequest("POST", "/api/users/metadata", {
            name: currentUser.displayName,
            email: currentUser.email,
            username: currentUser.email?.split('@')[0],
            department: null,
            firebaseUid: currentUser.uid
          });
          console.log("Auto-detected user metadata saved successfully");
        } catch (error) {
          console.error("Failed to save auto-detected user metadata:", error);
        } finally {
          // Use the redirect path from URL query parameter if available
          const redirectPath = getRedirectPath();
          console.log(`Redirecting to ${redirectPath} after authentication`);
          setLocation(redirectPath);
        }
      };
      
      saveUserMetadata();
    }
  }, [currentUser, loading, skipAutoLogin, setLocation]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use Firebase for authentication
      await signIn(loginEmail, loginPassword);
      
      toast({
        title: "Success",
        description: "You have successfully logged in",
      });
      
      setLocation(getRedirectPath());
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to login",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerName || !registerEmail || !registerPassword) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use Firebase for registration
      const firebaseUser = await register(registerEmail, registerPassword, registerName);
      console.log("Firebase registration successful:", firebaseUser);
      
      // Also save user metadata to our database for additional info
      try {
        // Get the Firebase UID to link accounts
        const firebaseUid = firebaseUser.uid;
        
        console.log("Saving user metadata with Firebase UID:", firebaseUid);
        await apiRequest("POST", "/api/users/metadata", {
          name: registerName,
          email: registerEmail,
          username: registerUsername || registerEmail.split('@')[0],
          department: registerDepartment || undefined,
          firebaseUid: firebaseUid // Include the Firebase UID
        });
        console.log("User metadata saved successfully");
      } catch (metadataError) {
        console.error("Failed to save user metadata:", metadataError);
        // Continue even if metadata save fails
      }
      
      toast({
        title: "Success",
        description: "Account created successfully",
      });
      
      setLocation(getRedirectPath());
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Admin setup dialog */}
      <Dialog open={showAdminSetup} onOpenChange={setShowAdminSetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Admin Account</DialogTitle>
            <DialogDescription>
              Enter company information to create an admin account with full privileges.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={createAdminAccount} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={isLoading}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="********"
                disabled={isLoading}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={adminCompanyName}
                onChange={(e) => setAdminCompanyName(e.target.value)}
                placeholder="Your Company"
                disabled={isLoading}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={adminCountry}
                onChange={(e) => setAdminCountry(e.target.value)}
                placeholder="Your Country"
                disabled={isLoading}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={adminAddress}
                onChange={(e) => setAdminAddress(e.target.value)}
                placeholder="Company Address"
                disabled={isLoading}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="+1234567890"
                disabled={isLoading}
              />
            </div>
            
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdminSetup(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Admin Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Left side - Logo and branding */}
      <div className="md:w-1/2 bg-white p-8 flex flex-col justify-center items-center">
        <div className="max-w-md mx-auto w-full">
          <div className="flex items-center gap-3 mb-8">
            <svg viewBox="0 0 24 24" width="42" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="4" fill="#00A389" />
              <path d="M7 12H17M7 8H13M7 16H15" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-2xl font-bold text-gray-800">piedpiper</span>
          </div>
          
          <Card className="border-none shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Welcome to Empulse</h1>
                  <p className="text-gray-500 text-sm">Please sign in to continue to your account</p>
                </div>
                
                {currentUser && (
                  <Button 
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Sign Out
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login" className="text-sm">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-sm">Create Account</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm text-gray-600">Email or Username</Label>
                      <Input 
                        id="email" 
                        type="text" 
                        placeholder="Enter your email or username"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)} 
                        className="focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="password" className="text-sm text-gray-600">Password</Label>
                        <a href="#" className="text-sm text-green-600 hover:text-green-700">Forgot password?</a>
                      </div>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4 pt-2">
                    <Button 
                      type="submit" 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                    
                    <div className="relative my-3">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="outline"
                      className="w-full"
                      onClick={() => signInWithGooglePopup()}
                      disabled={isLoading}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Sign in with Google
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="secondary"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
                      onClick={openAdminSetupDialog}
                      disabled={isLoading}
                    >
                      Create Admin Account
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister}>
                  <CardContent className="space-y-3 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm text-gray-600">Full Name</Label>
                      <Input 
                        id="name" 
                        placeholder="Enter your full name"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)} 
                        className="focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-sm text-gray-600">Email</Label>
                      <Input 
                        id="register-email" 
                        type="email" 
                        placeholder="Enter your email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)} 
                        className="focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-sm text-gray-600">Username</Label>
                      <Input 
                        id="username" 
                        placeholder="Choose a username"
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)} 
                        className="focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-sm text-gray-600">Password</Label>
                      <Input 
                        id="register-password" 
                        type="password" 
                        placeholder="Create a password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-sm text-gray-600">Department</Label>
                      <Input 
                        id="department" 
                        placeholder="Your department (Optional)"
                        value={registerDepartment}
                        onChange={(e) => setRegisterDepartment(e.target.value)}
                        className="focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4 pt-2">
                    <Button 
                      type="submit" 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                    
                    <div className="relative my-3">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="outline"
                      className="w-full"
                      onClick={() => signInWithGooglePopup()}
                      disabled={isLoading}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Sign in with Google
                    </Button>
                    
                    <p className="text-xs text-gray-500 text-center mt-4">
                      By creating an account, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
      
      {/* Right side - Hero image and features */}
      <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-green-50 to-green-100 p-8">
        <div className="max-w-md mx-auto h-full flex flex-col">
          <div className="mb-8 text-center">
            <div className="inline-block p-4 bg-white rounded-2xl shadow-md mb-4">
              <img 
                src="https://img.freepik.com/free-vector/people-celebrating-achievement-award-ceremony-winners-competition-company-managers-achievement-announcement-award-receiving-ceremony-concept-illustration_335657-2378.jpg?w=700" 
                alt="Employee Recognition" 
                className="h-64 w-auto rounded-xl"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Empower Your Workplace</h2>
            <p className="text-gray-600">
              Connect, engage and recognize your colleagues with our comprehensive employee engagement platform
            </p>
          </div>
          
          <div className="space-y-4 mt-auto">
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Peer Recognition</h3>
                <p className="text-sm text-gray-500">Celebrate achievements and milestones with colleagues</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                  <path d="M2 7h20" />
                  <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Rewards & Redemption</h3>
                <p className="text-sm text-gray-500">Earn and redeem points for real-world rewards</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M7 10h10" />
                  <path d="M7 14h10" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Polls & Surveys</h3>
                <p className="text-sm text-gray-500">Voice your opinion and participate in company decisions</p>
              </div>
            </div>
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-8">
            © 2025 Empulse. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}