import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  departmentId: z.string().min(1, 'Department is required'),
  jobTitleId: z.string().optional(),
  locationId: z.string().optional(),
  duration: z.string().min(1, 'Duration is required'),
  isTemplate: z.boolean().default(false),
});

export default function NewOnboardingPlanPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      departmentId: '',
      jobTitleId: '',
      locationId: '',
      duration: '30',
      isTemplate: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await apiRequest('POST', '/api/onboarding/plans', {
        ...values,
        departmentId: parseInt(values.departmentId),
        jobTitleId: values.jobTitleId ? parseInt(values.jobTitleId) : null,
        locationId: values.locationId ? parseInt(values.locationId) : null,
        duration: parseInt(values.duration),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/plans'] });
      toast({
        title: 'Success',
        description: 'Onboarding plan created successfully.',
      });
      navigate(`/admin/onboarding/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create plan',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createMutation.mutate(values);
  }

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
          Create Onboarding Plan
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Provide details about the onboarding plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Marketing Team Onboarding"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The name of the onboarding plan
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the purpose and goals of this onboarding plan..."
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A detailed description of the onboarding plan
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="101">Marketing</SelectItem>
                          <SelectItem value="102">Engineering</SelectItem>
                          <SelectItem value="103">Sales</SelectItem>
                          <SelectItem value="104">Human Resources</SelectItem>
                          <SelectItem value="105">Customer Support</SelectItem>
                          <SelectItem value="106">Finance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Department this plan is designed for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobTitleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select job title" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="201">Manager</SelectItem>
                          <SelectItem value="202">Team Lead</SelectItem>
                          <SelectItem value="203">Associate</SelectItem>
                          <SelectItem value="204">Specialist</SelectItem>
                          <SelectItem value="205">Director</SelectItem>
                          <SelectItem value="206">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Specific job title this plan targets
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="301">Headquarters</SelectItem>
                          <SelectItem value="302">Remote</SelectItem>
                          <SelectItem value="303">East Office</SelectItem>
                          <SelectItem value="304">West Office</SelectItem>
                          <SelectItem value="305">International</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Location this plan is designed for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="365" {...field} />
                    </FormControl>
                    <FormDescription>
                      Expected number of days to complete this onboarding plan
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isTemplate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Save as Template</FormLabel>
                      <FormDescription>
                        Make this plan available as a template for future use
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate('/admin/onboarding')}
            >
              Cancel
            </Button>
            <div>
              <Button
                type="button"
                variant="outline"
                className="mr-2"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {isPreviewMode ? 'Edit Mode' : 'Preview'}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {createMutation.isPending ? 'Saving...' : 'Save Plan'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
