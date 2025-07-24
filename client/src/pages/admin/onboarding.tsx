import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PlusCircle,
  Trash2,
  Edit,
  Eye,
  BarChart4,
  Users,
  Calendar,
  Clock,
  Briefcase,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { OnboardingPlan } from '@shared/onboarding';

// Extended interface that adds statistics for display
interface OnboardingPlanWithStats {
  id: number;
  title: string;
  description?: string | null;
  departmentId?: number | null;
  jobTitleId?: number | null;
  locationId?: number | null;
  duration: number;
  isActive: boolean;
  isTemplate: boolean;
  organizationId: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: number | null;
  // Stats for UI display
  activeAssignments: number;
  completedAssignments: number;
  missionCount: number;
  avgCompletionDays?: number;
}

export default function OnboardingPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [, navigate] = useLocation();

  // Fetch onboarding plans - this will be implemented later on the backend
  const { data: plans = [], isLoading } = useQuery<OnboardingPlanWithStats[]>({
    queryKey: ['/api/onboarding/plans', activeTab],
    queryFn: async () => {
      try {
        // Mock data while API is being implemented
        return [
          {
            id: 1,
            title: 'Marketing Department Onboarding',
            description:
              'Comprehensive onboarding plan for new marketing team members',
            departmentId: 101,
            jobTitleId: 201,
            locationId: 301,
            duration: 30,
            isActive: true,
            isTemplate: true,
            organizationId: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 1,
            activeAssignments: 3,
            completedAssignments: 12,
            missionCount: 5,
            avgCompletionDays: 28,
          },
          {
            id: 2,
            title: 'Engineering Onboarding',
            description: 'Technical onboarding program for software engineers',
            departmentId: 102,
            jobTitleId: 202,
            locationId: 302,
            duration: 45,
            isActive: true,
            isTemplate: false,
            organizationId: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 1,
            activeAssignments: 7,
            completedAssignments: 5,
            missionCount: 8,
            avgCompletionDays: 42,
          },
          {
            id: 3,
            title: 'Customer Support Specialist Onboarding',
            description:
              'Training program for customer service representatives',
            departmentId: 103,
            jobTitleId: 203,
            locationId: 303,
            duration: 21,
            isActive: false,
            isTemplate: false,
            organizationId: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 1,
            activeAssignments: 0,
            completedAssignments: 18,
            missionCount: 6,
            avgCompletionDays: 20,
          },
        ];
      } catch (error) {
        console.error('Error fetching onboarding plans:', error);
        return [];
      }
    },
  });

  // Delete onboarding plan mutation - will be implemented later
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      // This will be implemented with the backend
      console.log('Deleting plan', planId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/plans'] });
      toast({
        title: 'Plan deleted',
        description: 'The onboarding plan has been successfully deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete plan',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getPlanStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-200 text-gray-800';
  };

  const handleDeletePlan = (planId: number) => {
    if (
      confirm(
        'Are you sure you want to delete this onboarding plan? This action cannot be undone.'
      )
    ) {
      deletePlanMutation.mutate(planId);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Employee Onboarding
        </h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Onboarding Plan
        </Button>
      </div>

      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="all">All Plans</TabsTrigger>
          <TabsTrigger value="active">Active Plans</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                No onboarding plans found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new onboarding plan for your
                employees.
              </p>
              <div className="mt-6">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Onboarding Plan
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan: OnboardingPlanWithStats) => (
                <Card key={plan.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{plan.title}</CardTitle>
                      <Badge className={getPlanStatusColor(plan.isActive)}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <CardDescription>
                      Created{' '}
                      {plan.createdAt
                        ? formatDistanceToNow(new Date(plan.createdAt), {
                            addSuffix: true,
                          })
                        : 'recently'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {plan.description || 'No description provided'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-blue-500" />
                        <span>{plan.duration} days program</span>
                      </div>
                      <div className="flex items-center">
                        <FileText className="h-3 w-3 mr-1 text-green-500" />
                        <span>{plan.missionCount} missions</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-1 text-purple-500" />
                        <span>{plan.activeAssignments} active onboardings</span>
                      </div>
                      <div className="flex items-center">
                        <BarChart4 className="h-3 w-3 mr-1 text-amber-500" />
                        <span>{plan.completedAssignments} completed</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 border-t flex justify-between pt-3 pb-3">
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mr-2"
                        onClick={() => navigate(`/admin/onboarding/${plan.id}`)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      {plan.activeAssignments > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/admin/onboarding/${plan.id}/tracking`)
                          }
                        >
                          <BarChart4 className="h-3 w-3 mr-1" />
                          Tracking
                        </Button>
                      )}
                    </div>
                    <div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2"
                        onClick={() =>
                          navigate(`/admin/onboarding/${plan.id}/edit`)
                        }
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Onboarding Plan Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Onboarding Plan</DialogTitle>
            <DialogDescription>
              Design an onboarding journey for your new employees.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-center mb-6 text-sm text-gray-600">
              Select one of the options below to start creating your onboarding
              plan.
            </p>

            <div className="grid grid-cols-1 gap-4">
              <Button
                className="w-full h-auto py-6 flex flex-col items-center"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  navigate('/admin/onboarding/new');
                }}
              >
                <PlusCircle className="h-8 w-8 mb-2" />
                <span className="font-bold">Create from Scratch</span>
                <span className="text-xs mt-1">
                  Build a completely custom onboarding plan
                </span>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto py-6 flex flex-col items-center"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  navigate('/admin/onboarding/templates');
                }}
              >
                <FileText className="h-8 w-8 mb-2" />
                <span className="font-bold">Use Template</span>
                <span className="text-xs mt-1">
                  Start with a pre-built onboarding template
                </span>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
