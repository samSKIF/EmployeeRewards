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
import { 
  Edit, Camera, Mail, Phone, MapPin, Calendar, Award, 
  History, User, Home, ShoppingBag, Trophy, FileText, 
  Zap, Heart, ImageIcon, Camera as CameraIcon
} from "lucide-react";
import { User as BaseUserType } from "@shared/types";

// Extended UserType with additional profile fields
interface UserType extends BaseUserType {
  title?: string;
  location?: string;
  responsibilities?: string;
  coverPhotoUrl?: string;
}

const UpdatedProfilePage = () => {
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

  // Cover photo upload mutation
  const updateCoverPhotoMutation = useMutation({
    mutationFn: async (data: { coverPhotoUrl: string }) => {
      const res = await fetch("/api/users/cover-photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("firebaseToken")}`
        },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to upload cover photo");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      // Update the user data in the cache with the new cover photo URL
      const currentUser = queryClient.getQueryData<UserType>(["/api/users/me"]);
      if (currentUser) {
        queryClient.setQueryData(["/api/users/me"], {
          ...currentUser,
          coverPhotoUrl: data.user.coverPhotoUrl
        });
      }
      
      toast({
        title: "Cover photo updated",
        description: "Your cover photo has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload cover photo",
        variant: "destructive",
      });
    }
  });
  
  // Handle cover photo upload
  const handleCoverPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Compress image before uploading
    const compressImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          
          img.onload = () => {
            const canvas = document.createElement('canvas');
            // Cover photos should be wider
            const MAX_WIDTH = 1200;
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
            
            // Convert to base64 with reduced quality
            resolve(canvas.toDataURL('image/jpeg', 0.7));
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
      .then(base64Data => {
        updateCoverPhotoMutation.mutate({ coverPhotoUrl: base64Data });
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
    <div className="container max-w-[2200px] mx-auto py-6">
      {/* Main grid layout - matching front page layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 max-w-[2200px] mx-auto justify-center">
        {/* Left column - Picture area, contact, responsibilities */}
        <div className="lg:col-span-9 w-full space-y-6 max-w-[1800px] 4xl:max-w-[1800px] 3xl:max-w-[1600px] 2xl:max-w-[1400px] xl:max-w-[1200px] lg:max-w-[1000px]">
          {/* Profile picture card with tabs */}
          <Card className="overflow-hidden shadow-sm">
            {/* Cover Image & Profile Picture */}
            <div
              className="h-48 bg-gradient-to-r from-teal-400 to-teal-500 relative"
              style={{
                backgroundImage: `url('${user?.coverPhotoUrl || '/assets/cover-background.jpg'}')`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              }}
            >
              {/* Edit Button */}
              <div className="absolute top-4 right-4 flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/80 hover:bg-white"
                  onClick={() => document.getElementById('cover-photo-upload')?.click()}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Upload Cover
                  <input 
                    type="file"
                    id="cover-photo-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleCoverPhotoUpload}
                  />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/80 hover:bg-white"
                  onClick={handleEditToggle}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>
              </div>
              
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
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-white shadow-sm"
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
            <div className="pt-14 px-8 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold">{user?.name || "User"}</h1>
                  <p className="text-gray-600">{userDetails.title}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Profile Status {userDetails.profileStatus}%</div>
                  <div className="w-48 mt-1">
                    <Progress value={userDetails.profileStatus} className="h-2" />
                  </div>
                  {isEditing && (
                    <Button 
                      className="mt-3" 
                      onClick={handleSaveProfile} 
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Profile Tabs */}
            <div className="border-t border-gray-100">
              <Tabs defaultValue="about" className="w-full">
                <TabsList className="w-full justify-start rounded-none bg-transparent">
                  <TabsTrigger
                    value="about"
                    className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 data-[state=active]:shadow-none py-3 text-gray-500"
                  >
                    About Me
                  </TabsTrigger>
                  <TabsTrigger
                    value="appreciations"
                    className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 data-[state=active]:shadow-none py-3 text-gray-500"
                  >
                    Appreciations
                  </TabsTrigger>
                  <TabsTrigger
                    value="highlights"
                    className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 data-[state=active]:shadow-none py-3 text-gray-500"
                  >
                    Highlights
                  </TabsTrigger>
                </TabsList>
                
                {/* About Me Content */}
                <TabsContent value="about" className="px-8 py-6">
                  <div className="space-y-6">
                    <p className="text-gray-500">Your profile information and interests will appear here.</p>
                  </div>
                </TabsContent>
                
                {/* Appreciations Tab Content */}
                <TabsContent value="appreciations" className="px-8 py-6">
                  <div className="min-h-[200px] flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Award className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <h3 className="text-lg font-medium">No appreciations yet</h3>
                      <p>Your recognitions and kudos will appear here</p>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Highlights Tab Content */}
                <TabsContent value="highlights" className="px-8 py-6">
                  <div className="min-h-[200px] flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <h3 className="text-lg font-medium">No highlights yet</h3>
                      <p>Your achievements and milestones will appear here</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </Card>
          
          {/* Contact, Bio, & Responsibilities - Combined in one card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Profile Details</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-md font-medium mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <span>{userDetails.title}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="department" className="text-sm text-gray-500">Department:</Label>
                    {isEditing ? (
                      <div className="flex items-center">
                        <Award className="h-4 w-4 mr-2 text-gray-500" />
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
                        <Award className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{userDetails.department}</span>
                      </div>
                    )}
                  </div>
                  
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
                        />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{userDetails.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Biographical Information */}
              <div>
                <h3 className="text-md font-medium mb-4">Biographical Information</h3>
                <p className="text-sm mb-4">A passionate team member with a focus on innovation and creative solutions.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      <span className="text-sm text-gray-500 block">Hire Date:</span>
                      <span>{userDetails.hireDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      <span className="text-sm text-gray-500 block">Birthday:</span>
                      <span>{userDetails.birthday}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />
              
              {/* Responsibilities */}
              <div>
                <h3 className="text-md font-medium mb-4">Responsibilities</h3>
                {isEditing ? (
                  <div>
                    <textarea
                      id="responsibilities"
                      name="responsibilities"
                      value={formValues.responsibilities}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border rounded-md p-2 text-sm"
                    />
                  </div>
                ) : (
                  <p className="text-sm">{userDetails.responsibilities}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right sidebar - 3/12 columns matching front page layout */}
        <div className="lg:col-span-3 w-full mt-6 lg:mt-0 space-y-6" style={{ maxWidth: "400px" }}>
          {/* Personality Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Personality</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <span className="font-medium">{personalityType.title}</span>
              </div>
              <p className="text-sm text-gray-700">
                {personalityType.description}
              </p>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">People most like {user?.name?.split(' ')[0] || 'you'}</h4>
                <div className="flex gap-2">
                  {similarPeople.map(person => (
                    <Avatar key={person.id} className="h-9 w-9 border border-gray-200">
                      <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">
                        {person.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Interests Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Interests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {interests.map(interest => (
                  <div 
                    key={interest.id} 
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <div className="flex-shrink-0 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                      <Heart className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <span className="text-sm">{interest.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Strengths Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {strengths.map(strength => (
                  <div 
                    key={strength.id} 
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <div className="flex-shrink-0 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                      <Zap className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <span className="text-sm">{strength.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UpdatedProfilePage;