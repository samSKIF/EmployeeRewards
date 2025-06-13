import React, { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Edit, Camera, Mail, Phone, MapPin, Calendar, Award, 
  History, User, Home, ShoppingBag, Trophy, FileText, 
  Zap, Heart, Camera as CameraIcon, Loader2
} from "lucide-react";
import { User as BaseUserType } from "@shared/types";
import InterestsSection from "@/components/profile/InterestsSection";

// Extended UserType with additional profile fields
interface UserType extends BaseUserType {
  title?: string;
  location?: string;
  responsibilities?: string;
  hireDate?: string;
  birthDate?: string;
  aboutMe?: string;
  surname?: string;
  jobTitle?: string;
}

const ProfilePage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const employeeId = params.id;
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({
    name: '',
    title: '',
    department: '',
    location: '',
    responsibilities: '',
    aboutMe: ''
  });

  // Check if viewing own profile or another employee's profile
  const isOwnProfile = !employeeId;

  // Fetch user data - either current user or specific employee
  const { data: user, isLoading: userLoading } = useQuery<UserType>({
    queryKey: isOwnProfile ? ["/api/users/me"] : [`/api/users/${employeeId}`],
    retry: false
  });

  // Update form values when user data is fetched
  useEffect(() => {
    if (user) {
      // Initialize form values with user data only
      setFormValues({
        name: user.name || '',
        title: user.jobTitle || '',
        department: user.department || '',
        location: user.location || '',
        responsibilities: user.responsibilities || '',
        aboutMe: user.aboutMe || ''
      });
    }
  }, [user]);



  // Mock data for profile sections
  const personalityType = {
    title: "The Champion",
    description: "Enthusiastic, involved team member who is interested in exploring the possibilities for innovation. Little interest in rules, and will encourage team mates to think outside the box to create a solution that is uniquely theirs."
  };

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

  // Format dates properly
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // User details (use real database values only)
  const userDetails = {
    email: user?.email || "",
    title: user?.jobTitle || "",
    location: user?.location || "", 
    department: user?.department || "",
    responsibilities: user?.responsibilities || "",
    hireDate: formatDate(user?.hireDate),
    birthday: formatDate(user?.birthDate),
    profileStatus: 89 // This can remain as a calculated value
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
      {/* Profile Header with Cover Image */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
        {/* Cover Image */}
        <div
          className="h-48 bg-gradient-to-r from-amber-300 to-amber-500 relative"
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
            className="absolute top-4 right-4 bg-white"
            onClick={handleEditToggle}
          >
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? "Cancel" : "Edit User"}
          </Button>
          
          {/* Profile Image */}
          <div className="absolute -bottom-12 left-8">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-white">
                <AvatarFallback className="text-2xl bg-blue-100 text-blue-700">
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
        <div className="pt-14 px-8 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{user?.name} {user?.surname}</h1>
              <p className="text-gray-600">{userDetails.title}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Profile Status {userDetails.profileStatus}%</div>
              <div className="w-48 mt-1">
                <Progress value={userDetails.profileStatus} className="h-2" />
              </div>
              {isEditing ? (
                <Button 
                  className="mt-3" 
                  onClick={handleSaveProfile} 
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Edit Profile"}
                </Button>
              ) : (
                <Button variant="outline" className="mt-3">
                  View Public Profile
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-8">
          <Tabs defaultValue="about" className="w-full">
            <TabsList className="border-b w-full justify-start rounded-none bg-transparent pb-0 mb-6">
              <TabsTrigger
                value="about"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 data-[state=active]:shadow-none pb-3 text-gray-500"
              >
                About Me
              </TabsTrigger>
              <TabsTrigger
                value="appreciations"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 data-[state=active]:shadow-none pb-3 text-gray-500"
              >
                Appreciations
              </TabsTrigger>
              <TabsTrigger
                value="highlights"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 data-[state=active]:shadow-none pb-3 text-gray-500"
              >
                Highlights
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
                                value={userDetails.email}
                                disabled
                                className="bg-gray-50 h-8 text-sm"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-gray-500" />
                              <span className="text-blue-500">{userDetails.email}</span>
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
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{userDetails.title}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="department" className="text-sm text-gray-500">Department:</Label>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{userDetails.department}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* About Me */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">About Me</h3>
                    {isEditing ? (
                      <div>
                        <Label htmlFor="aboutMe" className="sr-only">About Me</Label>
                        <textarea
                          id="aboutMe"
                          name="aboutMe"
                          value={formValues.aboutMe || ''}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-200 rounded-md text-sm min-h-24"
                          placeholder="Tell us about yourself"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-700">{user?.aboutMe || 'No information provided'}</p>
                    )}
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
                      <p className="text-gray-700">{userDetails.responsibilities}</p>
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
                  
                  {/* History Section */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">History</h3>
                    <div className="text-gray-500 text-center py-8">
                      <History className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                      <p>No history records to display</p>
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Personality, Interests, Strengths */}
                <div className="space-y-6">
                  {/* Personality Type */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-2">Personality</h3>
                    <h4 className="font-medium text-gray-800 mb-2">{user?.name?.split(' ')[0] || 'User'} - The {personalityType.title}</h4>
                    <p className="text-gray-600 text-sm">{personalityType.description}</p>
                  </div>
                  
                  {/* People Like You */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-3">People most like {user?.name?.split(' ')[0] || 'User'}</h3>
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
                  {(user?.id || employeeId) && (
                    <InterestsSection 
                      userId={isOwnProfile && user ? user.id : (employeeId ? parseInt(employeeId as string) : 0)} 
                      isCurrentUser={isOwnProfile}
                    />
                  )}
                  
                  {/* Strengths */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-3">Strengths</h3>
                    <div className="flex flex-wrap gap-2">
                      {strengths.map(strength => (
                        <Badge key={strength.id} variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200">
                          <span className="bg-gray-200 text-gray-700 rounded-full h-5 w-5 inline-flex items-center justify-center mr-1.5 text-xs">
                            {strength.count}
                          </span>
                          {strength.name}
                        </Badge>
                      ))}
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