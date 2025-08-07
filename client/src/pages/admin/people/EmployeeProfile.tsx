import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building,
  Save,
  Edit,
  ArrowLeft,
} from 'lucide-react';
import { formatDate } from 'date-fns';
import { Link } from 'wouter';

interface Employee {
  id: number;
  name: string;
  surname?: string;
  email: string;
  phone_number?: string;
  job_title?: string;
  department?: string;
  location?: string;
  status: string;
  avatar_url?: string;
  hire_date?: string;
  birth_date?: string;
  manager_id?: number;
  manager_email?: string;
  responsibilities?: string;
  about_me?: string;
  nationality?: string;
  sex?: string;
}

interface UpdateEmployeeData {
  name: string;
  surname?: string;
  email: string;
  phone_number?: string;
  job_title?: string;
  department?: string;
  location?: string;
  status: string;
  hire_date?: string;
  birth_date?: string;
  manager_email?: string;
  responsibilities?: string;
  about_me?: string;
  nationality?: string;
  sex?: string;
}

export default function EmployeeProfile() {
  const [match, params] = useRoute('/admin/people/employee-profile/:id');
  const employeeId = params?.id;
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateEmployeeData>({
    name: '',
    surname: '',
    email: '',
    phone_number: '',
    job_title: '',
    department: '',
    location: '',
    status: 'active',
    hire_date: '',
    birth_date: '',
    manager_email: '',
    responsibilities: '',
    about_me: '',
    nationality: '',
    sex: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employee, isLoading } = useQuery<Employee>({
    queryKey: [`/api/admin/employees/${employeeId}`],
    enabled: !!employeeId,
  });

  const { data: departments = [] } = useQuery<string[]>({
    queryKey: ['/api/users/departments'],
  });

  const { data: locations = [] } = useQuery<string[]>({
    queryKey: ['/api/users/locations'],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateEmployeeData) => {
      return await apiRequest(`/api/admin/employees/${employeeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Employee profile updated successfully',
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: [`/api/admin/employees/${employeeId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update employee profile',
        variant: 'destructive',
      });
    },
  });

  // Initialize form data when employee data loads
  if (employee && !isEditing && formData.email !== employee.email) {
    setFormData({
      name: employee.name || '',
      surname: employee.surname || '',
      email: employee.email || '',
      phone_number: employee.phone_number || '',
      job_title: employee.job_title || '',
      department: employee.department || '',
      location: employee.location || '',
      status: employee.status || 'active',
      hire_date: employee.hire_date || '',
      birth_date: employee.birth_date || '',
      manager_email: employee.manager_email || '',
      responsibilities: employee.responsibilities || '',
      about_me: employee.about_me || '',
      nationality: employee.nationality || '',
      sex: employee.sex || '',
    });
  }

  const handleInputChange = (field: keyof UpdateEmployeeData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to original employee data
    if (employee) {
      setFormData({
        name: employee.name || '',
        surname: employee.surname || '',
        email: employee.email || '',
        phone_number: employee.phone_number || '',
        job_title: employee.job_title || '',
        department: employee.department || '',
        location: employee.location || '',
        status: employee.status || 'active',
        hire_date: employee.hire_date || '',
        birth_date: employee.birth_date || '',
        manager_email: employee.manager_email || '',
        responsibilities: employee.responsibilities || '',
        about_me: employee.about_me || '',
        nationality: employee.nationality || '',
        sex: employee.sex || '',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Employee Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested employee profile could not be found.
            </p>
            <Link href="/admin/people/employee-directory">
              <Button>Back to Directory</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/people/employee-directory">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {employee.name} {employee.surname}
            </h1>
            <p className="text-muted-foreground">{employee.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={employee.avatar_url} />
              <AvatarFallback className="text-lg">
                {employee.name.charAt(0)}
                {employee.surname?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold">
                  {employee.name} {employee.surname}
                </h2>
                <Badge
                  className={getStatusColor(employee.status)}
                  variant="secondary"
                >
                  {employee.status}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  {employee.job_title || 'No job title'}
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {employee.department || 'No department'}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {employee.location || 'No location'}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Hired: {employee.hire_date 
                    ? formatDate(new Date(employee.hire_date), 'MMM dd, yyyy')
                    : 'Not specified'
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Information */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="job">Job Details</TabsTrigger>
          <TabsTrigger value="contact">Contact Info</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Basic personal details and information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">{employee.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="surname"
                      value={formData.surname}
                      onChange={(e) => handleInputChange('surname', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">{employee.surname || 'Not specified'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Birth Date</Label>
                  {isEditing ? (
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => handleInputChange('birth_date', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">
                      {employee.birth_date 
                        ? formatDate(new Date(employee.birth_date), 'MMM dd, yyyy')
                        : 'Not specified'
                      }
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex">Gender</Label>
                  {isEditing ? (
                    <Select
                      value={formData.sex}
                      onValueChange={(value) => handleInputChange('sex', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Not specified</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{employee.sex || 'Not specified'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  {isEditing ? (
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">{employee.nationality || 'Not specified'}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aboutMe">About Me</Label>
                {isEditing ? (
                  <Textarea
                    id="aboutMe"
                    value={formData.about_me}
                    onChange={(e) => handleInputChange('about_me', e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm">{employee.about_me || 'No description provided'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="job" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Information</CardTitle>
              <CardDescription>
                Employment details and organizational information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  {isEditing ? (
                    <Input
                      id="jobTitle"
                      value={formData.job_title}
                      onChange={(e) => handleInputChange('job_title', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">{employee.job_title || 'Not specified'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  {isEditing ? (
                    <Select
                      value={formData.department}
                      onValueChange={(value) => handleInputChange('department', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Not assigned</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{employee.department || 'Not assigned'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  {isEditing ? (
                    <Select
                      value={formData.location}
                      onValueChange={(value) => handleInputChange('location', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Not specified</SelectItem>
                        {locations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{employee.location || 'Not specified'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hireDate">Hire Date</Label>
                  {isEditing ? (
                    <Input
                      id="hireDate"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => handleInputChange('hire_date', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">
                      {employee.hire_date 
                        ? formatDate(new Date(employee.hire_date), 'MMM dd, yyyy')
                        : 'Not specified'
                      }
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  {isEditing ? (
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      className={getStatusColor(employee.status)}
                      variant="secondary"
                    >
                      {employee.status}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="managerEmail">Manager Email</Label>
                  {isEditing ? (
                    <Input
                      id="managerEmail"
                      type="email"
                      value={formData.manager_email}
                      onChange={(e) => handleInputChange('manager_email', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">{employee.manager_email || 'No manager assigned'}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsibilities">Responsibilities</Label>
                {isEditing ? (
                  <Textarea
                    id="responsibilities"
                    value={formData.responsibilities}
                    onChange={(e) => handleInputChange('responsibilities', e.target.value)}
                    placeholder="Describe key responsibilities..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm">{employee.responsibilities || 'No responsibilities listed'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                How to reach this team member
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    ) : (
                      <p className="text-sm">{employee.email}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phone_number}
                        onChange={(e) => handleInputChange('phone_number', e.target.value)}
                      />
                    ) : (
                      <p className="text-sm">{employee.phone_number || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}