import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'wouter';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  User,
  ArrowLeft,
  UserPlus,
  Upload,
  CheckCircle,
} from 'lucide-react';

const employeeSchema = z.object({
  name: z.string().min(1, 'First name is required'),
  surname: z.string().optional(),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phoneNumber: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  hireDate: z.string().optional(),
  birthDate: z.string().optional(),
  managerEmail: z.string().email().optional().or(z.literal('')),
  nationality: z.string().optional(),
  sex: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

const defaultOnboardingSteps: OnboardingStep[] = [
  {
    id: 'account',
    title: 'Create Account',
    description: 'Set up basic account information',
    completed: false,
  },
  {
    id: 'profile',
    title: 'Complete Profile',
    description: 'Add personal and job details',
    completed: false,
  },
  {
    id: 'documentation',
    title: 'Upload Documents',
    description: 'Submit required employment documents',
    completed: false,
  },
  {
    id: 'orientation',
    title: 'Schedule Orientation',
    description: 'Book initial orientation session',
    completed: false,
  },
];

export default function EmployeeOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingSteps, setOnboardingSteps] = useState(defaultOnboardingSteps);
  const [isCreating, setIsCreating] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      surname: '',
      email: '',
      username: '',
      password: '',
      phoneNumber: '',
      jobTitle: '',
      department: '',
      location: '',
      hireDate: '',
      birthDate: '',
      managerEmail: '',
      nationality: '',
      sex: '',
    },
  });

  const { data: departments = [] } = useQuery<string[]>({
    queryKey: ['/api/users/departments'],
  });

  const { data: locations = [] } = useQuery<string[]>({
    queryKey: ['/api/users/locations'],
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      return await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (newEmployee) => {
      toast({
        title: 'Success',
        description: 'Employee account created successfully',
      });
      
      // Mark account creation step as completed
      setOnboardingSteps(prev => 
        prev.map(step => 
          step.id === 'account' 
            ? { ...step, completed: true }
            : step
        )
      );
      
      setCurrentStep(1);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create employee account',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EmployeeFormData) => {
    setIsCreating(true);
    createEmployeeMutation.mutate(data);
  };

  const handleStepComplete = (stepId: string) => {
    setOnboardingSteps(prev => 
      prev.map(step => 
        step.id === stepId 
          ? { ...step, completed: true }
          : step
      )
    );
    
    const nextStepIndex = onboardingSteps.findIndex(step => step.id === stepId) + 1;
    if (nextStepIndex < onboardingSteps.length) {
      setCurrentStep(nextStepIndex);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue('password', password);
  };

  const generateUsername = () => {
    const firstName = form.getValues('name');
    const lastName = form.getValues('surname');
    if (firstName) {
      const username = `${firstName.toLowerCase()}${lastName ? '.' + lastName.toLowerCase() : ''}${Math.floor(Math.random() * 1000)}`;
      form.setValue('username', username);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/people/employee-directory">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Directory
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Employee Onboarding</h1>
            <p className="text-muted-foreground">
              Add new team members and guide them through the onboarding process
            </p>
          </div>
        </div>
      </div>

      {/* Onboarding Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Progress</CardTitle>
          <CardDescription>
            Complete each step to ensure proper employee setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {onboardingSteps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  index === currentStep
                    ? 'border-primary bg-primary/5'
                    : step.completed
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  step.completed
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {index === currentStep && !step.completed && (
                  <div className="text-sm text-primary font-medium">Current Step</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create Employee Account
            </CardTitle>
            <CardDescription>
              Enter the basic information to create a new employee account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Account Credentials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username *</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input placeholder="Enter username" {...field} />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={generateUsername}
                              disabled={!form.getValues('name')}
                            >
                              Generate
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Will be used for login
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input type="password" placeholder="Enter password" {...field} />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={generatePassword}
                            >
                              Generate
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Minimum 6 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Job Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter job title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No department</SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No location</SelectItem>
                            {locations.map((location) => (
                              <SelectItem key={location} value={location}>
                                {location}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hire Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="managerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter manager's email" {...field} />
                      </FormControl>
                      <FormDescription>
                        Optional: Assign a manager for this employee
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={createEmployeeMutation.isPending}
                    className="flex-1"
                  >
                    {createEmployeeMutation.isPending ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Complete Profile Information
            </CardTitle>
            <CardDescription>
              Add additional details to complete the employee profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                The basic account has been created successfully. Next steps include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Adding personal information (birth date, nationality, etc.)</li>
                <li>Setting up profile photo and contact details</li>
                <li>Configuring job responsibilities and about me section</li>
              </ul>
              <div className="flex gap-2">
                <Button onClick={() => handleStepComplete('profile')}>
                  Mark Profile Complete
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep(0)}>
                  Back to Account Creation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Required Documents
            </CardTitle>
            <CardDescription>
              Collect necessary employment and identification documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Required documents for employment verification:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Government-issued ID (passport, driver's license)</li>
                <li>Employment contract or offer letter</li>
                <li>Tax forms (W-4, etc.)</li>
                <li>Emergency contact information</li>
                <li>Banking details for payroll (if applicable)</li>
              </ul>
              <div className="flex gap-2">
                <Button onClick={() => handleStepComplete('documentation')}>
                  Mark Documents Complete
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back to Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Schedule Orientation
            </CardTitle>
            <CardDescription>
              Set up initial meetings and orientation sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Final onboarding steps:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Schedule welcome meeting with manager</li>
                <li>Book company orientation session</li>
                <li>Set up workspace and equipment</li>
                <li>Introduce to team members</li>
                <li>Provide access to company systems and tools</li>
              </ul>
              <div className="flex gap-2">
                <Button onClick={() => handleStepComplete('orientation')}>
                  Complete Onboarding
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back to Documents
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Message */}
      {onboardingSteps.every(step => step.completed) && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h2 className="text-xl font-semibold text-green-800">
                Onboarding Complete!
              </h2>
              <p className="text-green-600">
                The employee has been successfully onboarded and is ready to start.
              </p>
              <div className="flex justify-center gap-2">
                <Link href="/admin/people/employee-directory">
                  <Button>View Employee Directory</Button>
                </Link>
                <Button variant="outline" onClick={() => {
                  setCurrentStep(0);
                  setOnboardingSteps(defaultOnboardingSteps);
                  form.reset();
                }}>
                  Onboard Another Employee
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}