import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  ClipboardCheck, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Eye, 
  Plus, 
  Users, 
  Trash2,
  Save,
  ArrowRight,
  ArrowLeft,
  BarChart2,
  PieChart,
  Edit,
  UserPlus
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Survey Templates
const surveyTemplates = {
  enps: {
    name: "Employee Net Promoter Score (eNPS)",
    description: "Measure employee loyalty and satisfaction",
    structure: {
      sections: [
        {
          title: "Employee Satisfaction",
          description: "Help us understand how satisfied you are working here",
          questions: [
            {
              content: "On a scale of 0-10, how likely are you to recommend our company as a place to work?",
              type: "rating",
              options: { min: 0, max: 10, step: 1 },
              isRequired: true
            },
            {
              content: "What is the primary reason for your score?",
              type: "text",
              isRequired: true
            }
          ]
        }
      ]
    }
  },
  engagement: {
    name: "Employee Engagement Survey",
    description: "Measure overall employee engagement and identify improvement areas",
    structure: {
      sections: [
        {
          title: "Work Environment",
          description: "Please rate your agreement with the following statements",
          questions: [
            {
              content: "I have the resources I need to do my job well",
              type: "rating",
              options: { min: 1, max: 5, step: 1, labels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
              isRequired: true
            },
            {
              content: "I feel valued for the work that I do",
              type: "rating",
              options: { min: 1, max: 5, step: 1, labels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
              isRequired: true
            },
            {
              content: "I see myself still working here in two years' time",
              type: "rating",
              options: { min: 1, max: 5, step: 1, labels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
              isRequired: true
            }
          ]
        },
        {
          title: "Management",
          description: "Please rate your agreement with the following statements about management",
          questions: [
            {
              content: "My manager gives me clear directions and guidance",
              type: "rating",
              options: { min: 1, max: 5, step: 1, labels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
              isRequired: true
            },
            {
              content: "I receive regular feedback about my performance",
              type: "rating",
              options: { min: 1, max: 5, step: 1, labels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
              isRequired: true
            },
            {
              content: "What could management do to improve your work experience?",
              type: "text",
              isRequired: false
            }
          ]
        }
      ]
    }
  },
  "360": {
    name: "360° Feedback Survey",
    description: "Comprehensive feedback from peers, managers, and reports",
    structure: {
      sections: [
        {
          title: "Communication Skills",
          description: "Evaluate this person's communication effectiveness",
          questions: [
            {
              content: "How effectively does this person communicate ideas and information?",
              type: "rating",
              options: { min: 1, max: 5, step: 1, labels: ["Poor", "Fair", "Good", "Very Good", "Excellent"] },
              isRequired: true
            },
            {
              content: "How well does this person listen to others?",
              type: "rating",
              options: { min: 1, max: 5, step: 1, labels: ["Poor", "Fair", "Good", "Very Good", "Excellent"] },
              isRequired: true
            }
          ]
        },
        {
          title: "Teamwork",
          description: "Evaluate this person's collaboration abilities",
          questions: [
            {
              content: "How well does this person collaborate with team members?",
              type: "rating",
              options: { min: 1, max: 5, step: 1, labels: ["Poor", "Fair", "Good", "Very Good", "Excellent"] },
              isRequired: true
            },
            {
              content: "How effectively does this person contribute to team goals?",
              type: "rating",
              options: { min: 1, max: 5, step: 1, labels: ["Poor", "Fair", "Good", "Very Good", "Excellent"] },
              isRequired: true
            },
            {
              content: "What is this person's greatest strength as a team member?",
              type: "text",
              isRequired: true
            }
          ]
        }
      ]
    }
  }
};

// Form schema for creating a survey
const surveyFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long"),
  description: z.string().optional(),
  templateType: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  isMandatory: z.boolean().default(false),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  status: z.string().default("draft"),
  sections: z.array(
    z.object({
      title: z.string().min(1, "Section title is required"),
      description: z.string().optional(),
      questions: z.array(
        z.object({
          content: z.string().min(1, "Question content is required"),
          type: z.string().min(1, "Question type is required"),
          options: z.any().optional(),
          isRequired: z.boolean().default(true)
        })
      )
    })
  ),
  recipients: z.array(z.number()).min(1, "At least one recipient is required")
});

type SurveyFormValues = z.infer<typeof surveyFormSchema>;

// Types for survey responses
interface SurveyResponse {
  questionId: number;
  responseText?: string;
  responseValue?: number;
  responseOptions?: string[];
}

// Status badge component
function SurveyStatusBadge({ status }: { status: string }) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  
  switch (status) {
    case "active":
      variant = "default";
      break;
    case "draft":
      variant = "secondary";
      break;
    case "completed":
      variant = "outline";
      break;
    case "archived":
      variant = "destructive";
      break;
  }
  
  return <Badge variant={variant}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

// Unified Surveys Page Component
export default function UnifiedSurveys() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState(user?.isAdmin ? "manage" : "respond");
  const [activeTab, setActiveTab] = useState(user?.isAdmin ? "active" : "pending");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof surveyTemplates | null>(null);
  const [viewingSurvey, setViewingSurvey] = useState<number | null>(null);
  const [activeSurvey, setActiveSurvey] = useState<number | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch notifications count (for regular users)
  const { data: notificationsData } = useQuery({
    queryKey: ['/api/surveys/notifications/count'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/surveys/notifications/count');
        return await res.json();
      } catch (error) {
        console.error("Error fetching notifications:", error);
        return { count: 0 };
      }
    },
    enabled: !user?.isAdmin
  });

  useEffect(() => {
    if (notificationsData && notificationsData.count) {
      setNotificationCount(notificationsData.count);
    }
  }, [notificationsData]);

  // Fetch admin surveys
  const { data: adminSurveys, isLoading: isAdminLoading } = useQuery({
    queryKey: ['/api/surveys'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/surveys');
        return await res.json();
      } catch (error) {
        console.error("Error fetching admin surveys:", error);
        return [];
      }
    },
    enabled: user?.isAdmin && activeView === "manage"
  });

  // Fetch assigned surveys (for regular users)
  const { data: assignedSurveys, isLoading: isUserLoading } = useQuery({
    queryKey: ['/api/surveys/assigned'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/surveys/assigned');
        return await res.json();
      } catch (error) {
        console.error("Error fetching assigned surveys:", error);
        return [];
      }
    },
    enabled: (!user?.isAdmin || activeView === "respond")
  });

  // Fetch users for recipient selection
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/users');
        return await res.json();
      } catch (error) {
        console.error("Error fetching users:", error);
        return [];
      }
    },
    enabled: user?.isAdmin
  });

  // Filter surveys based on activeTab
  const filteredAdminSurveys = adminSurveys?.filter((survey: any) => {
    if (activeTab === "active") return survey.status === "active";
    if (activeTab === "draft") return survey.status === "draft";
    if (activeTab === "completed") return survey.status === "completed";
    if (activeTab === "archived") return survey.status === "archived";
    return true;
  });

  const filteredUserSurveys = assignedSurveys?.filter((survey: any) => {
    if (activeTab === "pending") return survey.status === "pending";
    if (activeTab === "completed") return survey.status === "completed";
    return true;
  });

  // Create survey form
  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveyFormSchema),
    defaultValues: {
      title: "",
      description: "",
      templateType: "",
      isAnonymous: false,
      isMandatory: false,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "draft",
      sections: [
        {
          title: "Section 1",
          description: "",
          questions: [
            {
              content: "",
              type: "rating",
              options: { min: 1, max: 5, step: 1 },
              isRequired: true
            }
          ]
        }
      ],
      recipients: []
    }
  });

  // Mutation to create a survey
  const createSurveyMutation = useMutation({
    mutationFn: async (data: SurveyFormValues) => {
      const res = await apiRequest('POST', '/api/surveys', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Survey created",
        description: "The survey has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating survey",
        description: error.message || "Failed to create survey",
        variant: "destructive",
      });
    }
  });

  // Apply a template to the form
  const applyTemplate = (templateKey: keyof typeof surveyTemplates) => {
    const template = surveyTemplates[templateKey];
    form.setValue("title", template.name);
    form.setValue("description", template.description);
    form.setValue("templateType", templateKey);
    form.setValue("sections", template.structure.sections);
    setIsTemplateModalOpen(false);
    setSelectedTemplate(templateKey);
  };

  // Add a new section to the form
  const addSection = () => {
    const sections = form.getValues("sections") || [];
    form.setValue("sections", [
      ...sections,
      {
        title: `Section ${sections.length + 1}`,
        description: "",
        questions: [
          {
            content: "",
            type: "rating",
            options: { min: 1, max: 5, step: 1 },
            isRequired: true
          }
        ]
      }
    ]);
  };

  // Add a new question to a section
  const addQuestion = (sectionIndex: number) => {
    const sections = form.getValues("sections");
    const updatedSections = [...sections];
    updatedSections[sectionIndex].questions.push({
      content: "",
      type: "rating",
      options: { min: 1, max: 5, step: 1 },
      isRequired: true
    });
    form.setValue("sections", updatedSections);
  };

  // Remove a question from a section
  const removeQuestion = (sectionIndex: number, questionIndex: number) => {
    const sections = form.getValues("sections");
    const updatedSections = [...sections];
    updatedSections[sectionIndex].questions.splice(questionIndex, 1);
    form.setValue("sections", updatedSections);
  };

  // Remove a section
  const removeSection = (sectionIndex: number) => {
    const sections = form.getValues("sections");
    const updatedSections = [...sections];
    updatedSections.splice(sectionIndex, 1);
    form.setValue("sections", updatedSections);
  };

  // Handle form submission
  const onSubmit = (data: SurveyFormValues) => {
    createSurveyMutation.mutate(data);
  };

  // Submit survey response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async (data: { surveyId: number, responses: SurveyResponse[] }) => {
      const res = await apiRequest('POST', `/api/surveys/${data.surveyId}/respond`, {
        responses: data.responses
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Survey submitted",
        description: "Thank you for completing the survey!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/surveys/assigned'] });
      queryClient.invalidateQueries({ queryKey: ['/api/surveys/notifications/count'] });
      setActiveSurvey(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error submitting survey",
        description: error.message || "Failed to submit survey responses",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Surveys</h1>
          <p className="text-gray-500 mt-1">
            {user?.isAdmin
              ? "Create, manage, and analyze employee surveys"
              : "View and respond to assigned surveys"}
          </p>
        </div>

        {user?.isAdmin && (
          <div className="flex mt-4 md:mt-0 space-x-2">
            {activeView === "manage" && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Survey
              </Button>
            )}
            <Button
              variant={activeView === "manage" ? "default" : "outline"}
              onClick={() => setActiveView("manage")}
            >
              Manage Surveys
            </Button>
            <Button
              variant={activeView === "respond" ? "default" : "outline"}
              onClick={() => setActiveView("respond")}
            >
              My Surveys
            </Button>
          </div>
        )}
        
        {!user?.isAdmin && notificationCount > 0 && (
          <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md flex items-center mt-2 md:mt-0">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>You have {notificationCount} pending {notificationCount === 1 ? "survey" : "surveys"} to complete</span>
          </div>
        )}
      </div>

      {/* Administrator View */}
      {activeView === "manage" && user?.isAdmin && (
        <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {renderAdminSurveyList("active")}
          </TabsContent>
          
          <TabsContent value="draft" className="space-y-4">
            {renderAdminSurveyList("draft")}
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-4">
            {renderAdminSurveyList("completed")}
          </TabsContent>
          
          <TabsContent value="archived" className="space-y-4">
            {renderAdminSurveyList("archived")}
          </TabsContent>
        </Tabs>
      )}

      {/* Employee View */}
      {activeView === "respond" && (
        <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="pending" className="relative">
              Pending
              {notificationCount > 0 && (
                <span className="absolute top-0 right-1 -mt-1 -mr-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {renderUserSurveyList("pending")}
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-4">
            {renderUserSurveyList("completed")}
          </TabsContent>
        </Tabs>
      )}

      {/* Create Survey Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Survey</DialogTitle>
            <DialogDescription>
              Create a new survey to gather feedback from your employees.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Use Template</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(surveyTemplates).map(([key, template]) => (
                <Card 
                  key={key} 
                  className={`cursor-pointer hover:border-primary transition-colors ${
                    selectedTemplate === key ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => applyTemplate(key as keyof typeof surveyTemplates)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">{template.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Survey Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter survey title" {...field} />
                        </FormControl>
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
                            placeholder="Enter survey description" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex space-x-4">
                    <FormField
                      control={form.control}
                      name="isAnonymous"
                      render={({ field }) => (
                        <FormItem className="flex-1 flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div>
                            <FormLabel>Anonymous</FormLabel>
                            <FormDescription>Responses will not be linked to individuals</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isMandatory"
                      render={({ field }) => (
                        <FormItem className="flex-1 flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div>
                            <FormLabel>Mandatory</FormLabel>
                            <FormDescription>Employees are required to complete</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Survey Structure</h3>
                  <Button type="button" variant="outline" onClick={addSection}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>
                </div>

                {form.getValues("sections").map((section, sectionIndex) => (
                  <div key={sectionIndex} className="mb-6 border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 space-y-2">
                        <FormField
                          control={form.control}
                          name={`sections.${sectionIndex}.title`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Section Title</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`sections.${sectionIndex}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Section Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the entire section and all its questions.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeSection(sectionIndex)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Questions</h4>
                      
                      {form.getValues(`sections.${sectionIndex}.questions`).map((question, questionIndex) => (
                        <div key={questionIndex} className="border rounded p-3 bg-gray-50">
                          <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-3 space-y-2">
                              <FormField
                                control={form.control}
                                name={`sections.${sectionIndex}.questions.${questionIndex}.content`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Question</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="grid grid-cols-2 gap-2">
                                <FormField
                                  control={form.control}
                                  name={`sections.${sectionIndex}.questions.${questionIndex}.type`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Type</FormLabel>
                                      <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select question type" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="rating">Rating Scale</SelectItem>
                                          <SelectItem value="text">Text Response</SelectItem>
                                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`sections.${sectionIndex}.questions.${questionIndex}.isRequired`}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-end space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormLabel>Required question</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeQuestion(sectionIndex, questionIndex)}
                                className="text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addQuestion(sectionIndex)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-2">Recipients</h3>
                <FormField
                  control={form.control}
                  name="recipients"
                  render={({ field }) => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel>Select Recipients</FormLabel>
                        <FormDescription>
                          Choose which employees will receive this survey
                        </FormDescription>
                      </div>
                      <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                        {users?.map((user: any) => (
                          <div key={user.id} className="flex items-center space-x-2 py-2 border-b last:border-0">
                            <Checkbox
                              id={`user-${user.id}`}
                              checked={field.value.includes(user.id)}
                              onCheckedChange={(checked) => {
                                const updatedValue = checked
                                  ? [...field.value, user.id]
                                  : field.value.filter((id) => id !== user.id);
                                field.onChange(updatedValue);
                              }}
                            />
                            <label
                              htmlFor={`user-${user.id}`}
                              className="flex-1 cursor-pointer flex items-center space-x-3"
                            >
                              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-sm font-semibold text-white">
                                  {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-sm">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          // Select all users
                          field.onChange(users.map((user: any) => user.id));
                        }}
                        className="mt-2"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Select All
                      </Button>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSurveyMutation.isPending}>
                  {createSurveyMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>Save Survey</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Survey Response Dialog */}
      {activeSurvey && (
        <SurveyResponseDialog
          surveyId={activeSurvey}
          onClose={() => setActiveSurvey(null)}
          onSubmit={(responses) => {
            submitResponseMutation.mutate({
              surveyId: activeSurvey,
              responses
            });
          }}
        />
      )}
    </div>
  );

  // Helper function to render the admin survey list
  function renderAdminSurveyList(status: string) {
    if (isAdminLoading) {
      return (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (!filteredAdminSurveys?.length) {
      return (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No {status} surveys found.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create a Survey
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAdminSurveys.map((survey) => (
          <Card key={survey.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{survey.title}</CardTitle>
                <SurveyStatusBadge status={survey.status} />
              </div>
              <CardDescription>{survey.description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{new Date(survey.startDate).toLocaleDateString()} - {new Date(survey.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{survey.totalRecipients} recipients</span>
                </div>
                <div className="flex items-center text-gray-500">
                  {survey.isAnonymous ? (
                    <div className="flex items-center text-amber-600">
                      <Eye className="h-4 w-4 mr-1" />
                      <span>Anonymous</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-green-600">
                      <ClipboardCheck className="h-4 w-4 mr-1" />
                      <span>Identified</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center text-gray-500">
                  {survey.isMandatory ? (
                    <div className="flex items-center text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>Required</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Optional</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <div className="flex space-x-2">
                {status === "active" && (
                  <Button variant="outline" size="sm">
                    <PieChart className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                )}
                
                {status === "draft" && (
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                
                {status === "completed" && (
                  <Button variant="outline" size="sm">
                    <BarChart2 className="h-4 w-4 mr-2" />
                    Results
                  </Button>
                )}
              </div>
              
              {status === "draft" && (
                <Button size="sm">
                  Publish
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  // Helper function to render the user survey list
  function renderUserSurveyList(status: string) {
    if (isUserLoading) {
      return (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (!filteredUserSurveys?.length) {
      return (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">
            {status === "pending"
              ? "You don't have any pending surveys to complete."
              : "You haven't completed any surveys yet."}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUserSurveys.map((survey: any) => (
          <Card key={survey.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{survey.title}</CardTitle>
                {survey.isMandatory && (
                  <Badge variant="destructive">Required</Badge>
                )}
              </div>
              <CardDescription>{survey.description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Due: {new Date(survey.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-gray-500">
                  {survey.isAnonymous ? (
                    <div className="flex items-center text-amber-600">
                      <Eye className="h-4 w-4 mr-1" />
                      <span>Anonymous</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-green-600">
                      <ClipboardCheck className="h-4 w-4 mr-1" />
                      <span>Identified</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              {status === "pending" ? (
                <Button onClick={() => setActiveSurvey(survey.id)}>
                  Take Survey
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Completed
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
}

// Survey response dialog component
function SurveyResponseDialog({ 
  surveyId, 
  onClose,
  onSubmit
}: { 
  surveyId: number,
  onClose: () => void,
  onSubmit: (responses: SurveyResponse[]) => void
}) {
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<SurveyResponse[]>([]);
  
  // Fetch survey details
  const { data: surveyDetails, isLoading } = useQuery({
    queryKey: [`/api/surveys/${surveyId}`],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/surveys/${surveyId}`);
      return await res.json();
    }
  });

  // Initialize form schema based on survey structure
  const createResponseSchema = (survey: any) => {
    if (!survey || !survey.sections || !survey.sections.length) {
      return z.object({});
    }

    const schemaFields: any = {};
    
    survey.sections.forEach((section: any) => {
      section.questions.forEach((question: any) => {
        const fieldName = `question_${question.id}`;
        
        if (question.type === 'rating') {
          schemaFields[fieldName] = question.isRequired 
            ? z.number().min(0) 
            : z.number().min(0).optional();
        } 
        else if (question.type === 'multiple_choice') {
          schemaFields[fieldName] = question.isRequired 
            ? z.array(z.string()).min(1, "At least one option must be selected") 
            : z.array(z.string()).optional();
        } 
        else if (question.type === 'text') {
          schemaFields[fieldName] = question.isRequired 
            ? z.string().min(1, "This field is required") 
            : z.string().optional();
        }
      });
    });
    
    return z.object(schemaFields);
  };

  // Create form
  const form = useForm<any>({
    resolver: zodResolver(createResponseSchema(surveyDetails)),
    defaultValues: {}
  });

  // Update form schema when survey details change
  useEffect(() => {
    if (surveyDetails && surveyDetails.sections) {
      form.reset({});
    }
  }, [surveyDetails, form]);

  // Navigate to next section
  const goToNextSection = () => {
    // Validate current section and save responses
    const currentSectionQuestions = surveyDetails.sections[currentSection].questions;
    const currentSectionValid = currentSectionQuestions.every((question: any) => {
      if (!question.isRequired) return true;
      
      const fieldName = `question_${question.id}`;
      const value = form.getValues(fieldName);
      
      if (question.type === 'rating') {
        return typeof value === 'number';
      } 
      else if (question.type === 'multiple_choice') {
        return Array.isArray(value) && value.length > 0;
      } 
      else if (question.type === 'text') {
        return typeof value === 'string' && value.trim().length > 0;
      }
      
      return true;
    });

    if (!currentSectionValid) {
      // Trigger validation for all fields in this section
      currentSectionQuestions.forEach((question: any) => {
        form.trigger(`question_${question.id}`);
      });
      return;
    }

    // Save current section responses
    const currentResponses = currentSectionQuestions.map((question: any) => {
      const fieldName = `question_${question.id}`;
      const value = form.getValues(fieldName);
      
      const response: SurveyResponse = {
        questionId: question.id
      };
      
      if (question.type === 'rating') {
        response.responseValue = value;
      } 
      else if (question.type === 'multiple_choice') {
        response.responseOptions = value;
      } 
      else if (question.type === 'text') {
        response.responseText = value;
      }
      
      return response;
    });

    setFormData([...formData, ...currentResponses]);

    if (currentSection < surveyDetails.sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      // Submit all responses
      const allResponses = [...formData, ...currentResponses];
      onSubmit(allResponses);
    }
  };

  // Go back to previous section
  const goToPreviousSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  // If loading, show loading spinner
  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If survey details not available, show error
  if (!surveyDetails || !surveyDetails.sections || !surveyDetails.sections.length) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Failed to load survey details. Please try again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const currentSectionData = surveyDetails.sections[currentSection];
  const isLastSection = currentSection === surveyDetails.sections.length - 1;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{surveyDetails.title}</DialogTitle>
          <DialogDescription>
            {surveyDetails.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{currentSectionData.title}</h2>
          <span className="text-sm text-gray-500">
            Section {currentSection + 1} of {surveyDetails.sections.length}
          </span>
        </div>

        {currentSectionData.description && (
          <p className="mb-6 text-gray-600">{currentSectionData.description}</p>
        )}

        <form className="space-y-8">
          {currentSectionData.questions.map((question: any, index: number) => (
            <div key={question.id} className="bg-gray-50 p-4 rounded-lg">
              {renderQuestion(question, currentSection, index)}
            </div>
          ))}
        </form>

        <DialogFooter className="flex justify-between">
          <div>
            {currentSection > 0 && (
              <Button type="button" variant="outline" onClick={goToPreviousSection}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Save for Later
            </Button>
            <Button type="button" onClick={goToNextSection}>
              {isLastSection ? 'Submit' : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Render survey question based on its type
  function renderQuestion(question: any, sectionIndex: number, questionIndex: number) {
    const fieldName = `question_${question.id}`;

    if (question.type === 'rating') {
      // Render rating question
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className={question.isRequired ? "font-medium after:content-['*'] after:text-red-500 after:ml-0.5" : "font-medium"}>
                {question.content}
              </FormLabel>
              <FormControl>
                <div className="mt-3">
                  <div className="flex justify-between mb-1 text-sm text-gray-500">
                    {question.options?.labels ? (
                      <>
                        <span>{question.options.labels[0]}</span>
                        <span>{question.options.labels[question.options.labels.length - 1]}</span>
                      </>
                    ) : (
                      <>
                        <span>{question.options?.min || 0}</span>
                        <span>{question.options?.max || 10}</span>
                      </>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    {Array.from({ length: (question.options?.max || 10) - (question.options?.min || 0) + 1 }).map((_, i) => {
                      const value = (question.options?.min || 0) + i;
                      
                      return (
                        <div 
                          key={i} 
                          className={`flex-1 text-center py-2 border rounded-md cursor-pointer transition ${field.value === value ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                          onClick={() => field.onChange(value)}
                        >
                          {value}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    } 
    else if (question.type === 'multiple_choice') {
      // Render multiple choice question
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className={question.isRequired ? "font-medium after:content-['*'] after:text-red-500 after:ml-0.5" : "font-medium"}>
                {question.content}
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => field.onChange([value])}
                  value={field.value?.[0]}
                  className="mt-3 space-y-3"
                >
                  {(question.options?.choices || []).map((choice: string, i: number) => (
                    <div key={i} className="flex items-center space-x-2">
                      <RadioGroupItem value={choice} id={`${fieldName}-${i}`} />
                      <Label htmlFor={`${fieldName}-${i}`}>{choice}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    } 
    else if (question.type === 'text') {
      // Render text question
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className={question.isRequired ? "font-medium after:content-['*'] after:text-red-500 after:ml-0.5" : "font-medium"}>
                {question.content}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter your response here"
                  className="min-h-24"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }
    
    return null;
  }
}