import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Edit,
  Camera,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  User,
  Heart,
  Zap
} from "lucide-react";
import { User as BaseUserType } from "@shared/types";

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
    name: "",
    title: "",
    department: "",
    location: "",
    responsibilities: "",
  });

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery<UserType>({
    queryKey: ["/api/users/me"],
    retry: false,
  });

  // User details fallback values
  const userDetailsFallback = {
    title: "Deputy Director",
    location: "Pawnee",
    department: "Parks",
    responsibilities:
      "Citizen Outreach, Council Meetings, Making Pawnee great",
    hireDate: "8/24/17",
    birthday: "Aug 15",
    profileStatus: 89,
  };

  const interests = [
    { id: 1, name: "Camping", count: 5 },
    { id: 2, name: "Parties", count: 9 },
    { id: 3, name: "Photography", count: 3 },
    { id: 4, name: "Politics", count: 1 },
    { id: 5, name: "Sci-fi", count: 5 },
  ];

  const strengths = [
    { id: 1, name: "Belief", count: 6 },
    { id: 2, name: "Ideation", count: 2 },
    { id: 3, name: "Includer", count: 3 },
    { id: 4, name: "Input", count: 4 },
  ];

  const similarPeople = [
    { id: 101, name: "John Smith", avatar: "/avatars/john.jpg" },
    { id: 102, name: "Sarah Lee", avatar: "/avatars/sarah.jpg" },
    { id: 103, name: "Mike Chen", avatar: "/avatars/mike.jpg" },
  ];

  useEffect(() => {
    if (user) {
      setFormValues({
        name: user.name || "",
        title: user.title || userDetailsFallback.title || "",
        department: user.department || userDetailsFallback.department || "",
        location: user.location || userDetailsFallback.location || "",
        responsibilities:
          user.responsibilities || userDetailsFallback.responsibilities || "",
      });
    }
  }, [user]);

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
                Authorization: `Bearer ${localStorage.getItem(
                  "firebaseToken"
                )}`,
              },
              body: JSON.stringify({ avatarUrl: base64Data }),
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
      const currentUser = queryClient.getQueryData<UserType>(["/api/users/me"]);
      if (currentUser) {
        queryClient.setQueryData(["/api/users/me"], {
          ...currentUser,
          avatarUrl,
        });
      }

      toast({
        title: "Avatar uploaded",
        description:
          "Your profile picture has been updated successfully.",
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

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    avatarUploadMutation.mutate(file);
  };


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
        variant: "destructive",
      });
    },
  });

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Profile Header */}
      <div className="relative h-64 bg-gradient-to-r from-amber-300 to-amber-500 rounded-xl overflow-hidden mb-6">
        <Button
          variant="outline"
          size="sm"
          className="absolute top-4 right-4 bg-white"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Edit className="h-4 w-4 mr-2" />
          {isEditing ? "Cancel" : "Edit Profile"}
        </Button>

        {/* Profile Image */}
        <div className="absolute -bottom-12 left-8">
          <Avatar className="h-24 w-24 border-4 border-white">
            <AvatarImage src={user?.avatarUrl} alt={user?.name || "User"} />
            <AvatarFallback className="text-2xl">
              {user?.name?.split(" ").map((n) => n[0]).join("") || "U"}
            </AvatarFallback>
          </Avatar>
          <input
            type="file"
            id="avatar-upload"
            className="hidden"
            accept="image/*"
            onChange={handleAvatarUpload}
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-16">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Personality Card */}
          <Card>
            <CardHeader>
              <CardTitle>Personality</CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="font-medium text-lg mb-2">
                {user?.name?.split(" ")[0] || "User"} - The Champion
              </h4>
              <p className="text-gray-600">
                Enthusiastic, involved team member interested in exploring
                possibilities for innovation. Little interest in rules,
                encourages thinking outside the box.
              </p>
            </CardContent>
          </Card>

          {/* Similar People Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                People most like {user?.name?.split(" ")[0] || "User"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                {similarPeople.map((person) => (
                  <Avatar key={person.id}>
                    <AvatarFallback>
                      {person.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                    <AvatarImage src={person.avatar} />
                  </Avatar>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Column */}
        <div className="space-y-6">
          {/* Contact Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Email</Label>
                  <div className="flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{user?.email}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Department</Label>
                  <div className="flex items-center mt-1">
                    <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{userDetailsFallback.department}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm text-gray-500">Responsibilities</Label>
                <p className="mt-1 text-gray-700">
                  {userDetailsFallback.responsibilities}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Hire Date</Label>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{userDetailsFallback.hireDate}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Birthday</Label>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{userDetailsFallback.birthday}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Interests Card */}
          <Card>
            <CardHeader>
              <CardTitle>Interests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge
                    key={interest.id}
                    variant="outline"
                    className="bg-blue-50 text-blue-700"
                  >
                    <Heart className="h-3 w-3 mr-1" />
                    {interest.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Strengths Card */}
          <Card>
            <CardHeader>
              <CardTitle>Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {strengths.map((strength) => (
                  <Badge
                    key={strength.id}
                    variant="outline"
                    className="bg-amber-50 text-amber-700"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {strength.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;