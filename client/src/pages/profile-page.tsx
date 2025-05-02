import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Edit, Camera, Mail, Phone, MapPin, Calendar, Award, History, User, Mail as MailIcon } from "lucide-react";
import { User as BaseUserType } from "@shared/types";

// Extended UserType with additional profile fields
interface UserType extends BaseUserType {
  title?: string;
  location?: string;
  responsibilities?: string;
}

const ProfilePage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({
    name: '',
    title: '',
    department: '',
    location: '',
    responsibilities: ''
  });

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery<UserType>({
    queryKey: ["/api/users/me"],
    retry: false
  });

  // User details fallback values
  const userDetailsFallback = {
    title: "Deputy Director",
    location: "Pawnee",
    department: "Parks",
    responsibilities: "Citizen Outreach, Council Meetings, Making Pawnee great",
    hireDate: "8/24/17",
    birthday: "Aug 15",
    profileStatus: 89
  };

  // Update form values when user data is fetched
  useEffect(() => {
    if (user) {
      // Initialize form values with user data
      setFormValues({
        name: user.name || '',
        title: user.title || userDetailsFallback.title || '',
        department: user.department || userDetailsFallback.department || '',
        location: user.location || userDetailsFallback.location || '',
        responsibilities: user.responsibilities || userDetailsFallback.responsibilities || ''
      });
    }
  }, [user]);

  // Mock data for profile sections
  const personalityType = {
    title: "The Champion",
    description: "Enthusiastic, involved team member who is interested in exploring the possibilities for innovation. Little interest in rules, and will encourage team mates to think outside the box to create a solution that is uniquely theirs."
  };

  const interests = [
    { id: 1, name: "Camping", count: 5 },
    { id: 2, name: "Parties", count: 9 },
    { id: 3, name: "Photography", count: 3 },
    { id: 4, name: "Politics", count: 1 },
    { id: 5, name: "Sci-fi", count: 5 }
  ];

  const strengths = [
    { id: 1, name: "Belief", count: 6 },
    { id: 2, name: "Ideation", count: 2 },
    { id: 3, name: "Includer", count: 3 },
    { id: 4, name: "Input", count: 4 }
  ];

  const similarPeople = [
    { id: 101, name: "John Smith", avatar: "/avatars/john.jpg" },
    { id: 102, name: "Sarah Lee", avatar: "/avatars/sarah.jpg" },
    { id: 103, name: "Mike Chen", avatar: "/avatars/mike.jpg" }
  ];

  // User details (combine with the fallback values)
  const userDetails = {
    email: user?.email || "admin@demo.io",
    title: user?.title || userDetailsFallback.title,
    location: user?.location || userDetailsFallback.location, 
    department: user?.department || userDetailsFallback.department,
    responsibilities: user?.responsibilities || userDetailsFallback.responsibilities,
    hireDate: userDetailsFallback.hireDate,
    birthday: userDetailsFallback.birthday,
    profileStatus: userDetailsFallback.profileStatus
  };

  // Avatar upload mutation
  const avatarUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const reader = new FileReader();
      return new Promise<string>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result as string;
            
            const res = await fetch("/api/users/avatar", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("firebaseToken")}`
              },
              body: JSON.stringify({ avatarUrl: base64Data })
            });
            
            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.message || "Failed to upload avatar");
            }
            
            const data = await res.json();
            resolve(data.user.avatarUrl);
          } catch (error: any) {
            reject(error);
          }
        };
        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };
        reader.readAsDataURL(file);
      });
    },
    onSuccess: (avatarUrl) => {
      // Update the user data in the cache with the new avatar URL
      const currentUser = queryClient.getQueryData<UserType>(["/api/users/me"]);
      if (currentUser) {
        queryClient.setQueryData(["/api/users/me"], {
          ...currentUser,
          avatarUrl
        });
      }
      
      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    },
  });

  // Handle avatar file upload with image compression
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Compress image before uploading
    const compressImage = (file: File): Promise<File> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          
          img.onload = () => {
            const canvas = document.createElement('canvas');
            // Max dimensions while maintaining aspect ratio
            const MAX_WIDTH = 400;
            const MAX_HEIGHT = 400;
            
            let width = img.width;
            let height = img.height;
            
            // Calculate new dimensions
            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Convert to Blob with reduced quality
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              // Create new file from blob
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              
              resolve(compressedFile);
            }, 'image/jpeg', 0.7); // 70% quality
          };
          
          img.onerror = () => {
            reject(new Error('Failed to load image'));
          };
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
      });
    };
    
    // Process and upload the compressed image
    compressImage(file)
      .then(compressedFile => {
        avatarUploadMutation.mutate(compressedFile);
      })
      .catch(error => {
        toast({
          title: "Error processing image",
          description: error.message || "Failed to process image for upload",
          variant: "destructive"
        });
      });
  };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<UserType>) => {
      const res = await apiRequest("PATCH", "/api/users/me", userData);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/users/me"], data);
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    }
  });

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Send the form data to the server
    updateProfileMutation.mutate(formValues);
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-7xl">
      {/* Main header with navigation icons (similar to image) */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-teal-500 rounded-full p-2 mr-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatarUrl} alt={user?.name || "User"} />
              <AvatarFallback className="text-xl bg-teal-500 text-white">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex space-x-8">
            <div className="flex flex-col items-center opacity-80">
              <div className="text-gray-500 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <span className="text-xs">Home</span>
            </div>
            <div className="flex flex-col items-center opacity-80">
              <div className="text-gray-500 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
              </div>
              <span className="text-xs">Store</span>
            </div>
            <div className="flex flex-col items-center opacity-80">
              <div className="text-gray-500 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <span className="text-xs">Milestones</span>
            </div>
            <div className="flex flex-col items-center opacity-80">
              <div className="text-gray-500 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="7"></circle>
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                </svg>
              </div>
              <span className="text-xs">Awards</span>
            </div>
            <div className="flex flex-col items-center opacity-80">
              <div className="text-gray-500 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <span className="text-xs">Manage</span>
            </div>
            <div className="flex flex-col items-center opacity-80">
              <div className="text-gray-500 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </div>
              <span className="text-xs">Insights</span>
            </div>
            <div className="flex flex-col items-center opacity-80">
              <div className="text-gray-500 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </div>
              <span className="text-xs">Setup</span>
            </div>
            <div className="flex flex-col items-center opacity-80">
              <div className="text-gray-500 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3z"></path>
                </svg>
              </div>
              <span className="text-xs">Org Chart</span>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <div className="relative mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">1</span>
          </div>
          <Avatar className="h-10 w-10 border-2 border-teal-100">
            <AvatarImage src={user?.avatarUrl} alt={user?.name || "User"} />
            <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
              {user?.name?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      
      {/* Profile Header with Cover Image */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
        {/* Cover Image */}
        <div
          className="h-48 bg-gradient-to-r from-orange-300 to-yellow-500 relative"
          style={{
            backgroundImage: "url('/assets/cover-background.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          {/* Edit Button */}
          <Button
            variant="outline"
            size="sm"
            className="absolute top-4 left-4 bg-white"
            onClick={handleEditToggle}
          >
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? "Cancel" : "Edit User"}
          </Button>
          
          {/* Top badge */}
          <div className="absolute top-4 right-4 bg-white rounded-md text-sm py-1 px-3 shadow-sm">
            Top 10%
          </div>
          
          {/* Profile Image */}
          <div className="absolute -bottom-16 left-8">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-white">
                <AvatarFallback className="text-3xl bg-blue-100 text-blue-700">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'AU'}
                </AvatarFallback>
                <AvatarImage src={user?.avatarUrl} alt={user?.name || "User"} />
              </Avatar>
              <Button
                variant="outline"
                size="icon"
                className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-white"
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                <Camera className="h-4 w-4" />
                <input 
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Profile Information */}
        <div className="pt-16 px-8 pb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{user?.name || "Leslie Knope"}</h1>
            <p className="text-gray-600">{userDetails.title}</p>
            <div className="flex items-center mt-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-500 mr-1">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <div className="flex items-center">
            <div className="text-right mr-4">
              <div className="text-sm text-gray-500">Profile Status {userDetails.profileStatus}%</div>
              <div className="w-48 mt-1">
                <Progress value={userDetails.profileStatus} className="h-2" />
              </div>
            </div>
            {isEditing ? (
              <Button 
                className="bg-sky-500 hover:bg-sky-600" 
                onClick={handleSaveProfile} 
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save"}
              </Button>
            ) : (
              <Button 
                className="bg-sky-500 hover:bg-sky-600"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-8">
          <Tabs defaultValue="about" className="w-full">
            <TabsList className="border-b w-full justify-start rounded-none bg-transparent pb-0 mb-6">
              <TabsTrigger
                value="about"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:shadow-none pb-3 text-gray-500"
              >
                About Me
              </TabsTrigger>
              <TabsTrigger
                value="appreciations"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:shadow-none pb-3 text-gray-500"
              >
                Appreciations
              </TabsTrigger>
              <TabsTrigger
                value="highlights"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:shadow-none pb-3 text-gray-500"
              >
                Highlights
              </TabsTrigger>
              <TabsTrigger
                value="motivation"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:shadow-none pb-3 text-gray-500"
              >
                Motiv. Bucks
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:shadow-none pb-3 text-gray-500"
              >
                Orders
              </TabsTrigger>
              <TabsTrigger
                value="oneOnOnes"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:shadow-none pb-3 text-gray-500"
              >
                1 on 1s
              </TabsTrigger>
              <TabsTrigger
                value="coaching"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:shadow-none pb-3 text-gray-500"
              >
                Coaching
              </TabsTrigger>
              <TabsTrigger
                value="bonuses"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:shadow-none pb-3 text-gray-500"
              >
                Spot Bonuses
              </TabsTrigger>
            </TabsList>
            
            {/* About Me Tab Content */}
            <TabsContent value="about" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Contact & Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Contact Information */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Contact me</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="email" className="text-sm text-gray-500">Email:</Label>
                          {isEditing ? (
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-gray-500" />
                              <Input
                                id="email"
                                value={userDetails.email || "leslie@parks.com"}
                                disabled
                                className="bg-gray-50 h-8 text-sm"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-gray-500" />
                              <span className="text-blue-500">{userDetails.email || "leslie@parks.com"}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="phone" className="text-sm text-gray-500">Phone:</Label>
                          {isEditing ? (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-2 text-gray-500" />
                              <Input
                                id="phone"
                                placeholder="Add phone number"
                                className="h-8 text-sm"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-2 text-gray-500" />
                              <span>-</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="title" className="text-sm text-gray-500">Title:</Label>
                          {isEditing ? (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-gray-500" />
                              <Input
                                id="title"
                                name="title"
                                value={formValues.title}
                                onChange={handleInputChange}
                                className="h-8 text-sm"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-gray-500" />
                              <span>{userDetails.title || "Deputy Director"}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="department" className="text-sm text-gray-500">Department:</Label>
                          {isEditing ? (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                              <Input
                                id="department"
                                name="department"
                                value={formValues.department}
                                onChange={handleInputChange}
                                className="h-8 text-sm"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                              <span>{userDetails.department || "Parks"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="location" className="text-sm text-gray-500">Location:</Label>
                          {isEditing ? (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                              <Input
                                id="location"
                                name="location"
                                value={formValues.location}
                                onChange={handleInputChange}
                                className="h-8 text-sm"
                                placeholder="Add location"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                              <span>{userDetails.location || "Pawnee"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Responsibilities */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Responsibilities</h3>
                    {isEditing ? (
                      <div>
                        <Label htmlFor="responsibilities" className="sr-only">Responsibilities</Label>
                        <textarea
                          id="responsibilities"
                          name="responsibilities"
                          value={formValues.responsibilities}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-200 rounded-md text-sm min-h-24"
                          placeholder="Enter your job responsibilities"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-700">{userDetails.responsibilities || "Citizen Outreach, Citizen Outreach, Council Meetings, Council Meetings, Making Pawnee great, Making Pawnee great"}</p>
                    )}
                  </div>
                  
                  {/* Important Dates */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Important Dates</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-sm text-gray-500">Hire Date:</label>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{userDetails.hireDate}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm text-gray-500">Birthday:</label>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{userDetails.birthday}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Personality, Interests, Strengths */}
                <div className="space-y-6">
                  {/* Personality Type */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-2">Personality</h3>
                    <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                      Leslie - The Champion
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Enthusiastic, involved team member who is interested in exploring the possibilities for innovation. Little interest in rules, and will encourage team mates to think outside the box to create a solution that is uniquely theirs.
                    </p>
                  </div>
                  
                  {/* People Like You */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-3">People most like Leslie</h3>
                    <div className="flex space-x-2">
                      {similarPeople.map(person => (
                        <Avatar key={person.id} className="h-10 w-10">
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {person.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                          <AvatarImage src={person.avatar} alt={person.name} />
                        </Avatar>
                      ))}
                    </div>
                  </div>
                  
                  {/* Interests */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-3">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200 px-4 py-2 rounded-full">
                        <span className="bg-blue-200 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-xs">
                          5
                        </span>
                        <span className="text-blue-700">Camping</span>
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200 px-4 py-2 rounded-full">
                        <span className="bg-blue-200 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-xs">
                          9
                        </span>
                        <span className="text-blue-700">Parties</span>
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200 px-4 py-2 rounded-full">
                        <span className="bg-blue-200 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-xs">
                          3
                        </span>
                        <span className="text-blue-700">Photography</span>
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200 px-4 py-2 rounded-full">
                        <span className="bg-blue-200 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-xs">
                          1
                        </span>
                        <span className="text-blue-700">Politics</span>
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200 px-4 py-2 rounded-full">
                        <span className="bg-blue-200 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-xs">
                          5
                        </span>
                        <span className="text-blue-700">Sci-fi</span>
                      </Badge>
                    </div>
                    <Button variant="link" className="text-blue-500 mt-3 px-0">
                      See company-wide interests
                    </Button>
                  </div>
                  
                  {/* Strengths */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-3">Strengths</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-gray-50 hover:bg-gray-100 border-gray-200 px-4 py-2 rounded-full">
                        <span className="bg-gray-200 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-xs text-gray-700">
                          6
                        </span>
                        <span className="text-gray-700">Belief</span>
                      </Badge>
                      <Badge variant="outline" className="bg-gray-50 hover:bg-gray-100 border-gray-200 px-4 py-2 rounded-full">
                        <span className="bg-gray-200 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-xs text-gray-700">
                          2
                        </span>
                        <span className="text-gray-700">Ideation</span>
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Other Tab Contents (placeholders) */}
            <TabsContent value="appreciations" className="mt-0">
              <div className="bg-white rounded-lg shadow-sm p-10 text-center">
                <Award className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                <h3 className="text-xl font-semibold mb-2">Appreciations</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  This section will show appreciations and recognition you've received from your colleagues.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="highlights" className="mt-0">
              <div className="bg-white rounded-lg shadow-sm p-10 text-center">
                <Award className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                <h3 className="text-xl font-semibold mb-2">Your Highlights</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Key achievements and highlights of your work will be displayed here.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;