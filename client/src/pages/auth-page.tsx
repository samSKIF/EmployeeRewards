import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useBranding } from "@/context/BrandingContext";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { branding } = useBranding();
  const [isLoading, setIsLoading] = useState(false);
  const [showAdminSetup, setShowAdminSetup] = useState(false);
  
  // Admin account setup form fields
  const [adminEmail, setAdminEmail] = useState("admin@demo.io");
  const [adminPassword, setAdminPassword] = useState("admin123");
  const [adminCompanyName, setAdminCompanyName] = useState("");
  const [adminCountry, setAdminCountry] = useState("");
  const [adminAddress, setAdminAddress] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Add a state to track if we should skip auto-login
  const [skipAutoLogin, setSkipAutoLogin] = useState(() => {
    return sessionStorage.getItem("skipAutoLogin") === "true";
  });
  
  // Remove Firebase dependency - using database authentication
  
  // Function to show admin setup dialog
  const openAdminSetupDialog = () => {
    setShowAdminSetup(true);
  };
  
  // Function to create admin account in our database
  const createAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Create admin account in our database
      console.log("Creating admin account in database");
      const response = await fetch("/api/admin/create-company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminEmail,
          adminPassword,
          companyName: adminCompanyName,
          country: adminCountry,
          address: adminAddress,
          phone: adminPhone
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to create admin account");
      }
      
      const data = await response.json();
      
      console.log("Admin account created successfully");
      
      toast({
        title: "Success",
        description: "Admin account and company created successfully",
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
      // Use our database-based authentication for multi-tenant system
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Login failed");
      }
      
      const data = await response.json();
      
      // Store the authentication token
      localStorage.setItem("token", data.token);
      
      toast({
        title: "Success",
        description: "You have successfully logged in",
      });
      
      // Redirect to admin dashboard or social feed based on user role
      const redirectPath = data.user.isAdmin ? '/admin' : '/social';
      console.log(`Login successful, redirecting to ${redirectPath}`);
      setLocation(redirectPath);
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
            <div className="w-12 h-12 rounded-lg bg-primary-color text-white flex items-center justify-center text-xl font-bold">
              E
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{branding.organizationName}</h1>
              <p className="text-sm text-gray-500">Employee Engagement Platform</p>
            </div>
          </div>
          
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Welcome Back</h2>
              </div>
            </CardHeader>
            
            <div className="w-full">
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
                      className="focus:border-primary-color focus:ring-primary-color"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="password" className="text-sm text-gray-600">Password</Label>
                      <a href="#" className="text-sm text-primary-color hover:text-primary-color/80">Forgot password?</a>
                    </div>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="focus:border-primary-color focus:ring-primary-color"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-gray-700 hover:bg-gray-800 text-white font-medium shadow-md"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  

                </CardFooter>
              </form>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Right side - Hero image and features */}
      <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-primary-color/5 to-primary-color/10 p-8">
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
              <div className="w-10 h-10 bg-primary-color/10 rounded-full flex items-center justify-center text-primary-color mr-3 flex-shrink-0">
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
              <div className="w-10 h-10 bg-primary-color/10 rounded-full flex items-center justify-center text-primary-color mr-3 flex-shrink-0">
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
              <div className="w-10 h-10 bg-primary-color/10 rounded-full flex items-center justify-center text-primary-color mr-3 flex-shrink-0">
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
            © 2025 {branding.organizationName}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}