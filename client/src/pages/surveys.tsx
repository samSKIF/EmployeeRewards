import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/useAuth";
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
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Eye 
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Types for survey responses
interface SurveyResponse {
  questionId: number;
  responseText?: string;
  responseValue?: number;
  responseOptions?: string[];
}

// Component for employee surveys page
export default function EmployeeSurveys() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSurvey, setActiveSurvey] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

  // Fetch notifications count
  const { data: notificationsCount } = useQuery({
    queryKey: ['/api/surveys/notifications/count'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/surveys/notifications/count');
      return await res.json();
    }
  });

  // Fetch assigned surveys
  const { 
    data: assignedSurveys = [], 
    isLoading 
  } = useQuery({
    queryKey: ['/api/surveys/assigned'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/surveys/assigned');
      return await res.json();
    }
  });

  // Filter surveys based on active tab
  const filteredSurveys = assignedSurveys.filter((survey: any) => {
    if (activeTab === "pending") return survey.status === "pending";
    if (activeTab === "completed") return survey.status === "completed";
    return true;
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold">Surveys</h1>
        
        {notificationsCount && notificationsCount.count > 0 && (
          <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md flex items-center mt-2 md:mt-0">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>You have {notificationsCount.count} pending {notificationsCount.count === 1 ? "survey" : "surveys"} to complete</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="pending" className="relative">
            Pending
            {notificationsCount && notificationsCount.count > 0 && (
              <span className="absolute top-0 right-1 -mt-1 -mr-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notificationsCount.count}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {renderSurveyList("pending")}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {renderSurveyList("completed")}
        </TabsContent>
      </Tabs>

      {activeSurvey && (
        <SurveyResponseDialog
          surveyId={activeSurvey}
          onClose={() => setActiveSurvey(null)}
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

    if (!filteredSurveys.length) {
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
        {filteredSurveys.map((survey: any) => (
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
function SurveyResponseDialog({ surveyId, onClose }: { surveyId: number, onClose: () => void }) {
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

  // Submit survey response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async (responseData: SurveyResponse[]) => {
      const res = await apiRequest('POST', `/api/surveys/${surveyId}/respond`, {
        responses: responseData
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
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error submitting survey",
        description: error.message || "Failed to submit survey responses",
        variant: "destructive",
      });
    }
  });

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
      submitResponseMutation.mutate(allResponses);
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

  // Render survey question based on its type
  const renderQuestion = (question: any, sectionIndex: number, questionIndex: number) => {
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
                <div className="mt-3 space-y-3">
                  {(question.options?.choices || []).map((choice: string, i: number) => (
                    <div key={i} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`${fieldName}_${i}`}
                        checked={(field.value || []).includes(choice)}
                        onCheckedChange={(checked) => {
                          const values = [...(field.value || [])];
                          if (checked) {
                            values.push(choice);
                          } else {
                            const index = values.indexOf(choice);
                            if (index !== -1) {
                              values.splice(index, 1);
                            }
                          }
                          field.onChange(values);
                        }}
                      />
                      <Label htmlFor={`${fieldName}_${i}`}>{choice}</Label>
                    </div>
                  ))}
                </div>
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
                  className="resize-none"
                  rows={4}
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
  };

  const currentSectionData = surveyDetails.sections[currentSection];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{surveyDetails.title}</DialogTitle>
          <DialogDescription>
            {surveyDetails.description}
            {surveyDetails.isAnonymous && (
              <div className="mt-2 bg-amber-50 text-amber-700 p-2 rounded-md flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                This is an anonymous survey. Your responses will not be linked to your identity.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <div>Section {currentSection + 1} of {surveyDetails.sections.length}</div>
            <div>{Math.round(((currentSection + 1) / surveyDetails.sections.length) * 100)}% complete</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full" 
              style={{ width: `${((currentSection + 1) / surveyDetails.sections.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-medium mb-1">{currentSectionData.title}</h3>
          {currentSectionData.description && (
            <p className="text-gray-500 text-sm mb-4">{currentSectionData.description}</p>
          )}
          <Separator className="mb-6" />

          <Form {...form}>
            <form className="space-y-8">
              {currentSectionData.questions.map((question: any, questionIndex: number) => (
                <div key={question.id} className="border-b pb-6 last:border-0">
                  {renderQuestion(question, currentSection, questionIndex)}
                </div>
              ))}
            </form>
          </Form>
        </div>

        <DialogFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={goToPreviousSection}
            disabled={currentSection === 0}
          >
            Previous
          </Button>
          <Button 
            type="button" 
            onClick={goToNextSection}
            disabled={submitResponseMutation.isPending}
          >
            {currentSection < surveyDetails.sections.length - 1 
              ? "Next" 
              : submitResponseMutation.isPending 
                ? "Submitting..." 
                : "Submit"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}