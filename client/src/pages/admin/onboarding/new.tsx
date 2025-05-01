import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  ChevronRight, 
  Save, 
  Plus,
  Briefcase,
  Clock
} from "lucide-react";

// Form schema for onboarding plan
const onboardingPlanSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  jobTitleId: z.string().optional(),
  locationId: z.string().optional(),
  duration: z.coerce.number().min(1, "Duration must be at least 1 day"),
  isTemplate: z.boolean().default(false),
  organizationId: z.number().default(1), // Default value, will be replaced with actual org ID
});

type OnboardingPlanFormValues = z.infer<typeof onboardingPlanSchema>;

export default function NewOnboardingPlanPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form with default values
  const form = useForm<OnboardingPlanFormValues>({
    resolver: zodResolver(onboardingPlanSchema),
    defaultValues: {
      title: "",
      description: "",
      departmentId: "",
      jobTitleId: "",
      locationId: "",
      duration: 30,
      isTemplate: false,
    },
  });

  // Mutation for creating a new onboarding plan
  const createPlanMutation = useMutation({
    mutationFn: async (values: OnboardingPlanFormValues) => {
      // This will be connected to the API later
      console.log("Creating new onboarding plan:", values);
      // Mock API request
      return { id: Math.floor(Math.random() * 1000), ...values };
    },
    onSuccess: (data) => {
      toast({
        title: "Onboarding plan created",
        description: "Your onboarding plan has been created successfully.",
      });
      // Navigate to the plan detail page
      navigate(`/admin/onboarding/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create onboarding plan",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Handle form submission
  const onSubmit = (values: OnboardingPlanFormValues) => {
    setIsSubmitting(true);
    createPlanMutation.mutate(values);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/onboarding")}
          className="mr-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Plans
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Create Onboarding Plan</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main content - plan details form */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Plan Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Marketing Department Onboarding"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Give your onboarding plan a descriptive title.
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
                            placeholder="Describe the purpose and goals of this onboarding plan"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="jobTitleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
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
                              <SelectItem value="201">Marketing Specialist</SelectItem>
                              <SelectItem value="202">Software Engineer</SelectItem>
                              <SelectItem value="203">Sales Representative</SelectItem>
                              <SelectItem value="204">HR Coordinator</SelectItem>
                              <SelectItem value="205">Customer Support Specialist</SelectItem>
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
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
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
                              <SelectItem value="305">South Office</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (days)</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} />
                          </FormControl>
                          <FormDescription>
                            Total length of the onboarding program in days
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                            Make this plan available as a template for future onboarding processes
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/admin/onboarding")}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Saving..." : "Create Plan"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - next steps */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                After creating your onboarding plan, you'll be able to:
              </p>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="bg-blue-100 text-blue-700 p-1 rounded">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Add Missions</p>
                    <p className="text-gray-600">
                      Create structured groups of tasks for your onboarding process
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="bg-green-100 text-green-700 p-1 rounded">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Assign to Employees</p>
                    <p className="text-gray-600">
                      Assign this plan to new hires and track their progress
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="bg-purple-100 text-purple-700 p-1 rounded">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Set Timelines</p>
                    <p className="text-gray-600">
                      Schedule when each mission should start and be completed
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}