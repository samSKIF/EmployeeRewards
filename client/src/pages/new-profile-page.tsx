import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Edit,
  Camera,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  History,
  User,
  Home,
  ShoppingBag,
  Trophy,
  FileText,
  Zap,
  Heart,
  Camera as CameraIcon,
  Search,
  Settings,
  BarChart4,
  Share2,
} from 'lucide-react';
import { User as BaseUserType } from '@shared/types';

// Extended UserType with additional profile fields
interface UserType extends BaseUserType {
  title?: string;
  location?: string;
  responsibilities?: string;
}

const NewProfilePage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({
    name: '',
    title: '',
    department: '',
    location: '',
    responsibilities: '',
  });

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery<UserType>({
    queryKey: ['/api/users/me'],
    retry: false,
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
      });
    }
  }, [user]);

  // Mock data for profile sections
  const personalityType = {
    title: 'The Champion',
    description:
      'Enthusiastic, involved team member who is interested in exploring the possibilities for innovation. Little interest in rules, and will encourage team mates to think outside the box to create a solution that is uniquely theirs.',
  };

  const interests = [
    { id: 1, name: 'Camping', count: 5 },
    { id: 2, name: 'Parties', count: 9 },
    { id: 3, name: 'Photography', count: 3 },
    { id: 4, name: 'Politics', count: 1 },
    { id: 5, name: 'Sci-fi', count: 5 },
  ];

  const strengths = [
    { id: 1, name: 'Belief', count: 6 },
    { id: 2, name: 'Ideation', count: 2 },
    { id: 3, name: 'Includer', count: 3 },
    { id: 4, name: 'Input', count: 4 },
  ];

  const similarPeople = [
    { id: 101, name: 'John Smith', avatar: '/avatars/john.jpg' },
    { id: 102, name: 'Sarah Lee', avatar: '/avatars/sarah.jpg' },
    { id: 103, name: 'Mike Chen', avatar: '/avatars/mike.jpg' },
  ];

  // Format dates properly
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // User details (use real database values only)
  const userDetails = {
    email: user?.email || '',
    title: user?.jobTitle || '',
    location: user?.location || '',
    department: user?.department || '',
    responsibilities: user?.responsibilities || '',
    hireDate: formatDate((user as any)?.hireDate || (user as any)?.hire_date),
    birthday: formatDate((user as any)?.birthDate || (user as any)?.birth_date),
    profileStatus: 89, // This can remain as a calculated value
  };

  // Avatar upload mutation
  const avatarUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('firebaseToken')}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to upload avatar');
      }

      const data = await res.json();
      return data.user.avatarUrl;
    },
    onSuccess: (avatarUrl) => {
      // Update the user data in the cache with the new avatar URL
      const currentUser = queryClient.getQueryData<UserType>(['/api/users/me']);
      if (currentUser) {
        queryClient.setQueryData(['/api/users/me'], {
          ...currentUser,
          avatarUrl,
        });
      }

      toast({
        title: 'Avatar uploaded',
        description: 'Your profile picture has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload avatar',
        variant: 'destructive',
      });
    },
  });

  // Handle avatar file upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      avatarUploadMutation.mutate(file);
    }
  };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<UserType>) => {
      const res = await apiRequest('PATCH', '/api/users/me', userData);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/users/me'], data);
      setIsEditing(false);
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
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
    <div className="max-w-[2100px] mx-auto">
      {/* Top Navigation with icons */}
      <div className="bg-white shadow-sm mb-4 py-3 px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-10">
            {/* Logo */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-teal-500 text-white p-2"
            >
              <Home className="h-5 w-5" />
            </Button>

            {/* Search Box */}
            <div className="relative w-60">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                className="pl-8 h-9 bg-gray-50 border-gray-200"
              />
            </div>
          </div>

          {/* Main navigation tabs */}
          <div className="flex items-center space-x-8">
            <Button variant="ghost" className="flex items-center">
              <Home className="h-5 w-5 mr-2" />
              <span>Home</span>
            </Button>
            <Button variant="ghost" className="flex items-center">
              <ShoppingBag className="h-5 w-5 mr-2" />
              <span>Store</span>
            </Button>
            <Button variant="ghost" className="flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              <span>Milestones</span>
            </Button>
            <Button variant="ghost" className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              <span>Awards</span>
            </Button>
            <Button variant="ghost" className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              <span>Manage</span>
            </Button>
            <Button variant="ghost" className="flex items-center">
              <BarChart4 className="h-5 w-5 mr-2" />
              <span>Insights</span>
            </Button>
            <Button variant="ghost" className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              <span>Setup</span>
            </Button>
            <Button variant="ghost" className="flex items-center">
              <Share2 className="h-5 w-5 mr-2" />
              <span>Org Chart</span>
            </Button>
          </div>

          {/* User profile */}
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-8 w-8 p-0 flex items-center justify-center"
            >
              <span className="text-red-500">1</span>
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatarUrl} alt={user?.name || 'User'} />
              <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-12 gap-6 p-6 bg-gray-50">
        {/* Left column - user profile card */}
        <div className="col-span-3">
          {/* Profile image and edit button */}
          <Card className="mb-6 overflow-hidden">
            <div className="relative h-60 bg-orange-100 p-6 flex flex-col justify-center items-center">
              <Button
                variant="outline"
                size="sm"
                className="absolute right-4 top-4 bg-white"
                onClick={handleEditToggle}
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>

              <div className="relative mt-4">
                <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                  <AvatarImage
                    src={user?.avatarUrl}
                    alt={user?.name || 'User'}
                  />
                  <AvatarFallback className="text-3xl bg-teal-100 text-teal-600">
                    {user?.name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('') || 'AU'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white shadow-md"
                  onClick={() =>
                    document.getElementById('new-avatar-upload')?.click()
                  }
                >
                  <CameraIcon className="h-4 w-4" />
                  <input
                    type="file"
                    id="new-avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                </Button>
              </div>

              <div className="text-center mt-4">
                <h2 className="text-xl font-bold">{user?.name || 'User'}</h2>
                <p className="text-gray-600">{userDetails.title}</p>
              </div>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">
                  Profile Status {userDetails.profileStatus}%
                </div>
                <Progress value={userDetails.profileStatus} className="h-2" />
              </div>

              {isEditing && (
                <Button
                  className="w-full"
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending
                    ? 'Saving...'
                    : 'Save Profile'}
                </Button>
              )}
            </div>

            <div className="border-t">
              <TabsList className="w-full justify-start rounded-none bg-transparent">
                <TabsTrigger
                  value="about"
                  className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 pb-3 flex-1"
                >
                  About Me
                </TabsTrigger>
                <TabsTrigger
                  value="appreciations"
                  className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 pb-3 flex-1"
                >
                  Appreciations
                </TabsTrigger>
                <TabsTrigger
                  value="highlights"
                  className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 pb-3 flex-1"
                >
                  Highlights
                </TabsTrigger>
              </TabsList>
            </div>
          </Card>

          {/* Contact information */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle>Contact me</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-sm text-gray-500">
                  Email:
                </Label>
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
                <Label htmlFor="title" className="text-sm text-gray-500">
                  Title:
                </Label>
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
                <Label htmlFor="department" className="text-sm text-gray-500">
                  Department:
                </Label>
                {isEditing ? (
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
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
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{userDetails.department}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="location" className="text-sm text-gray-500">
                  Location:
                </Label>
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
            </CardContent>
          </Card>

          {/* Responsibilities */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle>Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <textarea
                  id="responsibilities"
                  name="responsibilities"
                  value={formValues.responsibilities}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border rounded-md p-2 text-sm"
                />
              ) : (
                <p className="text-sm">{userDetails.responsibilities}</p>
              )}
            </CardContent>
          </Card>

          {/* Important dates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Important Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <div>
                    <span className="text-sm text-gray-500 block">
                      Hire Date:
                    </span>
                    <span className="text-sm">{userDetails.hireDate}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <div>
                    <span className="text-sm text-gray-500 block">
                      Birthday:
                    </span>
                    <span className="text-sm">{userDetails.birthday}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - personality, interests, strengths */}
        <div className="col-span-9 space-y-6">
          {/* Personality */}
          <Card>
            <CardHeader>
              <CardTitle>Personality</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {personalityType.title}
                </h3>
                <p className="text-gray-700">{personalityType.description}</p>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-700 mb-3">
                  People most like {user?.name?.split(' ')[0] || 'you'}
                </h4>
                <div className="flex space-x-3">
                  {similarPeople.map((person) => (
                    <Avatar
                      key={person.id}
                      className="h-10 w-10 border border-gray-200"
                    >
                      <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">
                        {person.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interests */}
          <Card>
            <CardHeader className="flex justify-between items-start">
              <CardTitle>Interests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {interests.map((interest) => (
                  <div
                    key={interest.id}
                    className="flex items-center gap-2 border rounded-md p-3"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Heart className="h-4 w-4 text-gray-500" />
                    </div>
                    <span>{interest.name}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Button variant="link" className="p-0 text-blue-500">
                  See company-wide interests
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Strengths */}
          <Card>
            <CardHeader>
              <CardTitle>Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {strengths.map((strength) => (
                  <div
                    key={strength.id}
                    className="flex items-center gap-2 border rounded-md p-3"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Zap className="h-4 w-4 text-gray-500" />
                    </div>
                    <span>{strength.name}</span>
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

export default NewProfilePage;
