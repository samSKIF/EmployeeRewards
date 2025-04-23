import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertUserSchema } from "@shared/schema";

type InsertUser = z.infer<typeof insertUserSchema>;

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

const registerSchema = insertUserSchema.pick({
  name: true,
  username: true,
  password: true,
  email: true,
  department: true,
});

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  
  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      setLocation("/social");
    }
  }, [user, setLocation]);
  
  // Login form
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      department: "",
    },
  });
  
  const handleLogin = (data: LoginData) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        setLocation("/social");
      }
    });
  };
  
  const handleRegister = (data: InsertUser) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        setLocation("/social");
      }
    });
  };
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
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
              <h1 className="text-2xl font-bold text-gray-800">Welcome to Empulse</h1>
              <p className="text-gray-500 text-sm">Please sign in to continue to your account</p>
            </CardHeader>
            
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login" className="text-sm">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-sm">Create Account</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                    <CardContent className="space-y-4 pt-2">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-gray-600">Email or Username</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                placeholder="Enter your email or username"
                                className="focus:border-green-500 focus:ring-green-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <div className="flex justify-between">
                                  <FormLabel className="text-sm text-gray-600">Password</FormLabel>
                                  <a href="#" className="text-sm text-green-600 hover:text-green-700">Forgot password?</a>
                                </div>
                                <FormControl>
                                  <Input 
                                    type="password" 
                                    placeholder="Enter your password"
                                    className="focus:border-green-500 focus:ring-green-500"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 pt-2">
                      <Button 
                        type="submit" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)}>
                    <CardContent className="space-y-3 pt-2">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-gray-600">Full Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your full name"
                                className="focus:border-green-500 focus:ring-green-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-gray-600">Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="Enter your email"
                                className="focus:border-green-500 focus:ring-green-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-gray-600">Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Choose a username"
                                className="focus:border-green-500 focus:ring-green-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-gray-600">Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Create a password"
                                className="focus:border-green-500 focus:ring-green-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-gray-600">Department</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Your department (Optional)"
                                className="focus:border-green-500 focus:ring-green-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 pt-2">
                      <Button 
                        type="submit" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                      </Button>
                      <p className="text-xs text-gray-500 text-center">
                        By creating an account, you agree to our Terms of Service and Privacy Policy
                      </p>
                    </CardFooter>
                  </form>
                </Form>
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