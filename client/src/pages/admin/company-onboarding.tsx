import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Settings,
  Send,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  automated: boolean;
}

interface CompanyOnboarding {
  id: number;
  companyName: string;
  adminEmail: string;
  currentStep: number;
  totalSteps: number;
  status: 'draft' | 'active' | 'completed' | 'paused';
  steps: OnboardingStep[];
  createdAt: string;
}

export default function CompanyOnboardingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch onboarding processes
  const { data: onboardings = [], isLoading } = useQuery({
    queryKey: ['/management/onboarding'],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return [
        {
          id: 1,
          companyName: 'TechCorp Solutions',
          adminEmail: 'admin@techcorp.com',
          currentStep: 3,
          totalSteps: 6,
          status: 'active',
          steps: [
            {
              id: 'company_setup',
              title: 'Company Setup',
              description: 'Basic company information',
              status: 'completed',
              automated: true,
            },
            {
              id: 'admin_account',
              title: 'Admin Account',
              description: 'Create admin user',
              status: 'completed',
              automated: true,
            },
            {
              id: 'branding',
              title: 'Branding Setup',
              description: 'Upload logo and set colors',
              status: 'in_progress',
              automated: false,
            },
            {
              id: 'departments',
              title: 'Department Structure',
              description: 'Define departments and locations',
              status: 'pending',
              automated: false,
            },
            {
              id: 'features',
              title: 'Feature Configuration',
              description: 'Enable/disable features',
              status: 'pending',
              automated: false,
            },
            {
              id: 'employee_import',
              title: 'Employee Import',
              description: 'Bulk import employees',
              status: 'pending',
              automated: false,
            },
          ],
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 2,
          companyName: 'Green Energy Inc',
          adminEmail: 'admin@greenenergy.com',
          currentStep: 6,
          totalSteps: 6,
          status: 'completed',
          steps: [
            {
              id: 'company_setup',
              title: 'Company Setup',
              description: 'Basic company information',
              status: 'completed',
              automated: true,
            },
            {
              id: 'admin_account',
              title: 'Admin Account',
              description: 'Create admin user',
              status: 'completed',
              automated: true,
            },
            {
              id: 'branding',
              title: 'Branding Setup',
              description: 'Upload logo and set colors',
              status: 'completed',
              automated: false,
            },
            {
              id: 'departments',
              title: 'Department Structure',
              description: 'Define departments and locations',
              status: 'completed',
              automated: false,
            },
            {
              id: 'features',
              title: 'Feature Configuration',
              description: 'Enable/disable features',
              status: 'completed',
              automated: false,
            },
            {
              id: 'employee_import',
              title: 'Employee Import',
              description: 'Bulk import employees',
              status: 'completed',
              automated: false,
            },
          ],
          createdAt: '2024-01-10T10:00:00Z',
        },
      ] as CompanyOnboarding[];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return (
          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
        );
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Company Onboarding
          </h1>
          <p className="text-gray-600">
            Manage client company onboarding processes
          </p>
        </div>
        <Button onClick={() => navigate('/admin/company-onboarding/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Onboarding
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Companies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{onboardings.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Onboardings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {onboardings.filter((o) => o.status === 'active').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {onboardings.filter((o) => o.status === 'completed').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Completion Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">7 days</div>
              </CardContent>
            </Card>
          </div>

          {/* Onboarding List */}
          <div className="space-y-4">
            {onboardings.map((onboarding) => (
              <Card key={onboarding.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {onboarding.companyName}
                      </CardTitle>
                      <CardDescription>{onboarding.adminEmail}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(onboarding.status)}>
                        {onboarding.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>
                          Progress: {onboarding.currentStep}/
                          {onboarding.totalSteps}
                        </span>
                        <span>
                          {Math.round(
                            (onboarding.currentStep / onboarding.totalSteps) *
                              100
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(onboarding.currentStep / onboarding.totalSteps) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {onboarding.steps.map((step, index) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          {getStepStatusIcon(step.status)}
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {step.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {step.description}
                            </div>
                            {step.automated && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Automated
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Templates</CardTitle>
              <CardDescription>
                Pre-configured onboarding workflows for different company types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Standard Enterprise</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Full-featured onboarding for enterprise clients with all
                    modules enabled
                  </p>
                  <div className="text-sm text-gray-500">
                    6 steps • 7-10 days
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">SMB Basic</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Streamlined onboarding for small-medium businesses
                  </p>
                  <div className="text-sm text-gray-500">
                    4 steps • 3-5 days
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation Rules</CardTitle>
              <CardDescription>
                Configure automated steps and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Auto-create admin account</div>
                    <div className="text-sm text-gray-600">
                      Automatically create admin user when company is created
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Send welcome email</div>
                    <div className="text-sm text-gray-600">
                      Send welcome email with login instructions
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Follow-up reminders</div>
                    <div className="text-sm text-gray-600">
                      Send reminders for incomplete onboarding steps
                    </div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Inactive
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
