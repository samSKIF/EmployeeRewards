import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerDepartment, setRegisterDepartment] = useState("");
  
  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Verify token
      fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => {
        if (res.ok) {
          // Token is valid, redirect to main social page
          setLocation("/social");
        }
      })
      .catch(err => {
        // Token is invalid, clear it
        localStorage.removeItem("token");
      });
    }
  }, [setLocation]);
  
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
      const response = await apiRequest("POST", "/api/auth/login", {
        username: loginEmail,
        password: loginPassword
      });
      
      const data = await response.json();
      
      localStorage.setItem("token", data.token);
      
      toast({
        title: "Success",
        description: "You have successfully logged in",
      });
      
      setLocation("/social");
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
    
    if (!registerName || !registerEmail || !registerUsername || !registerPassword) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        name: registerName,
        email: registerEmail,
        username: registerUsername,
        password: registerPassword,
        department: registerDepartment || undefined
      });
      
      const data = await response.json();
      
      localStorage.setItem("token", data.token);
      
      toast({
        title: "Success",
        description: "Account created successfully",
      });
      
      setLocation("/social");
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
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold">Empulse</CardTitle>
            <CardDescription>
              Connect with your colleagues and stay engaged
            </CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email or Username</Label>
                    <Input 
                      id="email" 
                      type="text" 
                      placeholder="Enter your email or username"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Enter your full name"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input 
                      id="register-email" 
                      type="email" 
                      placeholder="Enter your email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      placeholder="Choose a username"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input 
                      id="register-password" 
                      type="password" 
                      placeholder="Create a password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department (Optional)</Label>
                    <Input 
                      id="department" 
                      placeholder="Your department"
                      value={registerDepartment}
                      onChange={(e) => setRegisterDepartment(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
      
      {/* Right side - Hero section */}
      <div className="flex-1 bg-gradient-to-br from-blue-500 to-purple-600 p-8 flex items-center justify-center text-white hidden md:flex">
        <div className="max-w-lg space-y-6">
          <h1 className="text-4xl font-bold">Welcome to Empulse</h1>
          <p className="text-xl">
            A comprehensive employee engagement platform where you can connect with colleagues, participate in polls, receive peer recognition, and earn rewards.
          </p>
          <ul className="space-y-3">
            <li className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-white text-blue-600 flex items-center justify-center">✓</div>
              <span>Social feed with posts and updates</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-white text-blue-600 flex items-center justify-center">✓</div>
              <span>Peer-to-peer recognition system</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-white text-blue-600 flex items-center justify-center">✓</div>
              <span>Interactive polls and surveys</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-white text-blue-600 flex items-center justify-center">✓</div>
              <span>Real-time messaging and chat</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-white text-blue-600 flex items-center justify-center">✓</div>
              <span>Redeemable reward points system</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}