import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/queryClient";
import { Button } from "@/components/ui/button";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, Calendar, Clock, ClipboardCheck, Eye, PieChart, Plus, Save, Trash2, Users } from "lucide-react";
import { Survey } from "@shared/schema";
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
import { Badge } from "@/components/ui/badge";

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

// Component for managing surveys in the admin dashboard
export default function AdminSurveys() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof surveyTemplates | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [viewingSurvey, setViewingSurvey] = useState<number | null>(null);

  // Fetch surveys
  const { data: surveys, isLoading } = useQuery({
    queryKey: ['/api/surveys'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/surveys');
      return await res.json() as Survey[];
    }
  });

  // Fetch users for recipient selection
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/users');
      return await res.json();
    }
  });

  // Form setup
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

  // Filter surveys based on active tab
  const filteredSurveys = surveys?.filter(survey => {
    if (activeTab === "active") return survey.status === "active";
    if (activeTab === "draft") return survey.status === "draft";
    if (activeTab === "completed") return survey.status === "completed";
    if (activeTab === "archived") return survey.status === "archived";
    return true;
  });

  // Handle form submission
  const onSubmit = (data: SurveyFormValues) => {
    createSurveyMutation.mutate(data);
  };

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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Surveys</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Survey
        </Button>
      </div>

      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {renderSurveyList("active")}
        </TabsContent>
        
        <TabsContent value="draft" className="space-y-4">
          {renderSurveyList("draft")}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {renderSurveyList("completed")}
        </TabsContent>
        
        <TabsContent value="archived" className="space-y-4">
          {renderSurveyList("archived")}
        </TabsContent>
      </Tabs>

      {/* Create Survey Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Survey</DialogTitle>
            <DialogDescription>
              Create a new survey to gather feedback from your employees.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
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
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsTemplateModalOpen(true)}
                    >
                      Start from Template
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                              <Input type="date" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                              <Input type="date" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="isAnonymous"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Anonymous</FormLabel>
                            <FormDescription>
                              Responses will be anonymous
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isMandatory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Mandatory</FormLabel>
                            <FormDescription>
                              Employees must complete
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Survey Content</h3>
                  <Button type="button" variant="outline" onClick={addSection}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>
                </div>

                {form.watch("sections").map((section, sectionIndex) => (
                  <Card key={sectionIndex} className="mt-4">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
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
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeSection(sectionIndex)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormField
                        control={form.control}
                        name={`sections.${sectionIndex}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section Description</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value || ''}
                                className="resize-none"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">Questions</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addQuestion(sectionIndex)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Question
                        </Button>
                      </div>

                      {section.questions.map((question, questionIndex) => (
                        <div key={questionIndex} className="border rounded-md p-4 relative">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`sections.${sectionIndex}.questions.${questionIndex}.content`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Question</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} className="resize-none" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="space-y-4">
                              <FormField
                                control={form.control}
                                name={`sections.${sectionIndex}.questions.${questionIndex}.type`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Question Type</FormLabel>
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
                                        <SelectItem value="rating">Rating</SelectItem>
                                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                        <SelectItem value="text">Text</SelectItem>
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
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>Required question</FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeQuestion(sectionIndex, questionIndex)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Recipients</h3>
                <FormField
                  control={form.control}
                  name="recipients"
                  render={({ field }) => (
                    <FormItem>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <FormLabel>Select Employees</FormLabel>
                        <FormDescription>
                          Choose which employees will receive this survey
                        </FormDescription>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                          {users?.map((user: any) => (
                            <div 
                              key={user.id} 
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`user-${user.id}`}
                                checked={field.value.includes(user.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, user.id]);
                                  } else {
                                    field.onChange(field.value.filter((id: number) => id !== user.id));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`user-${user.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {user.name} {user.surname || ""} ({user.email})
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSurveyMutation.isPending}
                >
                  {createSurveyMutation.isPending ? "Creating..." : "Create Survey"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a Template</DialogTitle>
            <DialogDescription>
              Choose a template to start with or create a survey from scratch.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            {(Object.keys(surveyTemplates) as Array<keyof typeof surveyTemplates>).map((key) => (
              <Card 
                key={key} 
                className={`cursor-pointer hover:border-primary ${selectedTemplate === key ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setSelectedTemplate(key)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{surveyTemplates[key].name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{surveyTemplates[key].description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedTemplate && applyTemplate(selectedTemplate)} 
              disabled={!selectedTemplate}
            >
              Use Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Analytics Dialog */}
      {viewingSurvey && (
        <SurveyDetailsDialog 
          surveyId={viewingSurvey} 
          onClose={() => setViewingSurvey(null)} 
        />
      )}
    </div>
  );

  // Helper function to render the survey list
  function renderSurveyList(status: string) {
    if (isLoading) {
      return (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (!filteredSurveys?.length) {
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
        {filteredSurveys.map((survey) => (
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
                      <span>Mandatory</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-blue-600">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Optional</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setViewingSurvey(survey.id)}
                    >
                      <PieChart className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View Analytics</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
}

// Helper component for survey status badge
function SurveyStatusBadge({ status }: { status: string }) {
  let color;
  switch (status) {
    case "draft":
      color = "bg-gray-100 text-gray-800";
      break;
    case "active":
      color = "bg-green-100 text-green-800";
      break;
    case "completed":
      color = "bg-blue-100 text-blue-800";
      break;
    case "archived":
      color = "bg-amber-100 text-amber-800";
      break;
    default:
      color = "bg-gray-100 text-gray-800";
  }

  return (
    <Badge variant="outline" className={`${color} capitalize`}>
      {status}
    </Badge>
  );
}

// Survey details dialog for viewing analytics
function SurveyDetailsDialog({ surveyId, onClose }: { surveyId: number, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("analytics");
  
  const { data: surveyDetails, isLoading } = useQuery({
    queryKey: [`/api/surveys/${surveyId}/analytics`],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/surveys/${surveyId}/analytics`);
      return await res.json();
    }
  });

  return (
    <Dialog open={!!surveyId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {surveyDetails?.survey.title || "Survey Details"}
          </DialogTitle>
          <DialogDescription>
            View analytics and responses for this survey
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="analytics" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="responses">Responses</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : surveyDetails ? (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3">Overview</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center">
                          <p className="text-gray-500 text-sm">Completion Rate</p>
                          <p className="text-3xl font-bold mt-1">
                            {surveyDetails.recipientStats.completionRate.toFixed(0)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center">
                          <p className="text-gray-500 text-sm">Completed</p>
                          <p className="text-3xl font-bold mt-1">
                            {surveyDetails.recipientStats.completed}/{surveyDetails.recipientStats.total}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center">
                          <p className="text-gray-500 text-sm">Status</p>
                          <div className="mt-1">
                            <SurveyStatusBadge status={surveyDetails.survey.status} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Response Analytics</h3>
                  {surveyDetails.sections.map((section: any) => (
                    <Card key={section.id} className="mb-4">
                      <CardHeader>
                        <CardTitle>{section.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {section.questions.map((question: any) => (
                            <div key={question.id} className="border-t pt-4">
                              <p className="font-medium mb-2">{question.content}</p>
                              
                              {question.type === 'rating' && (
                                <div>
                                  {question.stats.count > 0 ? (
                                    <div className="space-y-2">
                                      <p className="text-sm text-gray-500">
                                        Average rating: <span className="font-medium">{question.stats.average.toFixed(1)}</span> 
                                        ({question.stats.count} responses)
                                      </p>
                                      <div className="bg-gray-100 rounded-md p-3">
                                        {question.stats.distribution && Object.entries(question.stats.distribution).sort((a: any, b: any) => Number(a[0]) - Number(b[0])).map(([rating, count]: [string, any]) => (
                                          <div key={rating} className="flex items-center mb-1 text-sm">
                                            <div className="w-12">{rating}:</div>
                                            <div className="flex-1 mx-2">
                                              <div 
                                                className="bg-blue-500 h-5 rounded-sm" 
                                                style={{ 
                                                  width: `${(count / question.stats.count) * 100}%`,
                                                  minWidth: '1%' 
                                                }}
                                              />
                                            </div>
                                            <div className="w-8 text-right">{count}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500">No responses yet</p>
                                  )}
                                </div>
                              )}
                              
                              {question.type === 'multiple_choice' && (
                                <div>
                                  {question.stats.options && Object.keys(question.stats.options).length > 0 ? (
                                    <div className="bg-gray-100 rounded-md p-3">
                                      {Object.entries(question.stats.options).map(([option, count]: [string, any]) => (
                                        <div key={option} className="flex items-center mb-1 text-sm">
                                          <div className="w-1/3">{option}:</div>
                                          <div className="flex-1 mx-2">
                                            <div 
                                              className="bg-green-500 h-5 rounded-sm" 
                                              style={{ 
                                                width: `${(count / Object.values(question.stats.options).reduce((sum: number, c: any) => sum + (typeof c === 'number' ? c : 0), 0)) * 100}%`,
                                                minWidth: '1%' 
                                              }}
                                            />
                                          </div>
                                          <div className="w-8 text-right">{count}</div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500">No responses yet</p>
                                  )}
                                </div>
                              )}
                              
                              {question.type === 'text' && (
                                <p className="text-sm text-gray-500">
                                  {question.stats.responseCount} text responses received
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-6">
                <p>Failed to load survey analytics.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="responses">
            <div className="text-center p-6">
              {surveyDetails?.survey.isAnonymous ? (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                  <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <h3 className="font-medium text-amber-800">Anonymous Survey</h3>
                  <p className="text-amber-700 mt-1">
                    Individual responses are not available for anonymous surveys to protect employee privacy.
                    Please refer to the Analytics tab for aggregated results.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 mb-4">Individual response data will be shown here.</p>
                  <p className="text-sm text-gray-400">This feature is coming soon.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}