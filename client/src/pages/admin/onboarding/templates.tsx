import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, FileText, Clock, PlusCircle } from 'lucide-react';

export default function OnboardingTemplatesPage() {
  const [, navigate] = useLocation();

  // Fetch templates - this will be connected to API later
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/onboarding/templates'],
    queryFn: async () => {
      // Mock data while API is being implemented
      return [
        {
          id: 101,
          title: 'New Sales Representative Onboarding',
          description: 'Complete onboarding process for new sales team members',
          departmentId: 103,
          duration: 21,
          missionCount: 4,
          popularity: 'High',
        },
        {
          id: 102,
          title: 'Technical Support Specialist Onboarding',
          description:
            'Training program for customer support specialists focused on technical troubleshooting',
          departmentId: 105,
          duration: 30,
          missionCount: 7,
          popularity: 'Medium',
        },
        {
          id: 103,
          title: 'Finance Team Member Onboarding',
          description:
            'Comprehensive onboarding for finance and accounting personnel',
          departmentId: 106,
          duration: 45,
          missionCount: 8,
          popularity: 'Low',
        },
        {
          id: 104,
          title: 'Marketing Intern Onboarding',
          description: 'Streamlined onboarding process for marketing interns',
          departmentId: 101,
          duration: 14,
          missionCount: 3,
          popularity: 'Medium',
        },
        {
          id: 105,
          title: 'Junior Developer Onboarding',
          description: 'Technical onboarding for junior software engineers',
          departmentId: 102,
          duration: 60,
          missionCount: 10,
          popularity: 'High',
        },
      ];
    },
  });

  const getPopularityBadge = (popularity: string) => {
    switch (popularity) {
      case 'High':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/onboarding')}
          className="mr-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Plans
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          Onboarding Templates
        </h1>
      </div>

      <p className="text-gray-600 mb-8">
        Choose from these pre-built templates to quickly create an onboarding
        plan for your employees. Each template can be customized to fit your
        organization's specific needs.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{template.title}</CardTitle>
                  <Badge className={getPopularityBadge(template.popularity)}>
                    {template.popularity} usage
                  </Badge>
                </div>
                <CardDescription>
                  {getDepartmentName(template.departmentId)} Department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {template.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1 text-blue-500" />
                    <span>{template.duration} days program</span>
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-3 w-3 mr-1 text-green-500" />
                    <span>{template.missionCount} missions</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 border-t pt-3 pb-3">
                <div className="w-full">
                  <Button
                    className="w-full"
                    onClick={() =>
                      navigate(`/admin/onboarding/templates/${template.id}`)
                    }
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Use This Template
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}

          {/* Create from scratch card */}
          <Card className="border-dashed border-2 bg-gray-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Create From Scratch</CardTitle>
              <CardDescription>
                Build a completely custom onboarding plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Design your own onboarding process with custom missions, tasks,
                and timelines.
              </p>
            </CardContent>
            <CardFooter className="bg-gray-50 pt-3 pb-3">
              <div className="w-full">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/admin/onboarding/new')}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Start From Scratch
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

// Helper function to get department name from ID
function getDepartmentName(id: number): string {
  const departments: Record<number, string> = {
    101: 'Marketing',
    102: 'Engineering',
    103: 'Sales',
    104: 'Human Resources',
    105: 'Customer Support',
    106: 'Finance',
  };

  return departments[id] || 'General';
}
