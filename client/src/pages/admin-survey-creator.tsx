import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import MainLayout from '@/components/layout/MainLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import QuestionTypePicker from '@/components/survey/QuestionTypePicker';
import QuestionPreview from '@/components/survey/QuestionPreview';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  ArrowLeft,
  GripVertical,
  Plus,
  Save,
  Trash2,
  Eye,
  Settings,
  CheckCircle2,
  Send,
  Edit,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { InsertSurvey, Survey, InsertSurveyQuestion } from '@shared/schema';
import SurveyTaker from '@/components/survey/SurveyTaker'; // Added import here

// Create a schema for survey creation
const surveyFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  targetAudience: z.string().default('all'),
  targetDepartment: z.string().optional(),
  pointsAwarded: z.number().int().min(0).default(0),
  reminderDays: z.number().int().min(0).max(30).default(0),
  expiresAt: z.date().optional().nullable(),
});

// Create a schema for questions
const questionFormSchema = z.object({
  questionText: z.string().min(1, 'Question text is required'),
  questionType: z.string(),
  isRequired: z.boolean().default(true),
  options: z.array(z.string()).optional(),
  order: z.number().int(),
});

interface QuestionItem {
  id: string;
  questionText: string;
  questionType: string;
  isRequired: boolean;
  options?: string[];
  order: number;
}

export default function AdminSurveyCreator() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const isEditing = !!id;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionItem | null>(
    null
  );
  const [previewMode, setPreviewMode] = useState(false);

  // Form for survey details
  const surveyForm = useForm<z.infer<typeof surveyFormSchema>>({
    resolver: zodResolver(surveyFormSchema),
    defaultValues: {
      title: '',
      description: '',
      isAnonymous: false,
      targetAudience: 'all',
      pointsAwarded: 0,
      reminderDays: 0,
      expiresAt: null,
    },
  });

  // Form for questions
  const questionForm = useForm<z.infer<typeof questionFormSchema>>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      questionText: '',
      questionType: 'single',
      isRequired: true,
      options: [''],
      order: questions.length,
    },
  });

  // Fetch survey if editing
  const { isLoading } = useQuery<Survey>({
    queryKey: [`/api/surveys/${id}`],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/surveys/${id}`);
        return await res.json();
      } catch (error) {
        console.error('Error fetching survey:', error);
        return null;
      }
    },
    enabled: isEditing,
  });

  // Effect to populate form when survey data is loaded
  useEffect(() => {
    if (isLoading || !id) return;

    const fetchSurvey = async () => {
      try {
        const res = await apiRequest('GET', `/api/surveys/${id}`);
        const data = await res.json();

        if (data) {
          surveyForm.reset({
            title: data.title || '',
            description: data.description || '',
            isAnonymous: data.isAnonymous || false,
            targetAudience: data.targetAudience || 'all',
            targetDepartment: data.targetDepartment || '',
            pointsAwarded: data.pointsAwarded || 0,
            reminderDays: data.reminderDays || 0,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          });
        }
      } catch (error) {
        console.error('Error setting form data:', error);
      }
    };

    fetchSurvey();
  }, [id, isLoading, surveyForm]);

  // Fetch questions if editing
  const { isLoading: isLoadingQuestions } = useQuery<any[]>({
    queryKey: [`/api/surveys/${id}/questions`],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/surveys/${id}/questions`);
        return await res.json();
      } catch (error) {
        console.error('Error fetching questions:', error);
        return [];
      }
    },
    enabled: isEditing,
  });

  // Effect to populate questions when data is loaded
  useEffect(() => {
    if (isLoadingQuestions || !id) return;

    const fetchQuestions = async () => {
      try {
        const res = await apiRequest('GET', `/api/surveys/${id}/questions`);
        const data = await res.json();

        if (data && Array.isArray(data)) {
          const formattedQuestions = data.map((q: any, index: number) => ({
            id: q.id.toString(),
            questionText: q.questionText || '',
            questionType: q.questionType || 'single',
            isRequired: q.isRequired !== undefined ? q.isRequired : true,
            options: q.options ? q.options : [],
            order: q.order || index,
          }));
          setQuestions(formattedQuestions);
        }
      } catch (error) {
        console.error('Error setting questions data:', error);
      }
    };

    fetchQuestions();
  }, [id, isLoadingQuestions]);

  // Save survey mutation
  const saveSurveyMutation = useMutation({
    mutationFn: async (data: InsertSurvey) => {
      try {
        if (isEditing) {
          const res = await apiRequest('PUT', `/api/surveys/${id}`, data);
          return await res.json();
        } else {
          const res = await apiRequest('POST', '/api/surveys', data);
          return await res.json();
        }
      } catch (error) {
        console.error('Error in saveSurveyMutation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
      toast({
        title: `Survey ${isEditing ? 'updated' : 'created'}`,
        description: `Your survey has been successfully ${
          isEditing ? 'updated' : 'created'
        }.`,
      });

      // If we're creating a new survey, redirect to the edit page
      if (!isEditing && data?.id) {
        setLocation(`/admin/surveys/${data.id}/edit`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: `Failed to ${isEditing ? 'update' : 'create'} survey`,
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save questions mutation
  const saveQuestionsMutation = useMutation({
    mutationFn: async (data: {
      surveyId: number;
      questions: InsertSurveyQuestion[];
    }) => {
      try {
        const res = await apiRequest(
          'POST',
          `/api/surveys/${data.surveyId}/questions`,
          { questions: data.questions }
        );
        return await res.json();
      } catch (error) {
        console.error('Error in saveQuestionsMutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/surveys/${id}/questions`],
      });
      toast({
        title: 'Questions saved',
        description: 'Your survey questions have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save questions',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Publish survey mutation
  const publishSurveyMutation = useMutation({
    mutationFn: async (surveyId: number) => {
      try {
        const res = await apiRequest(
          'POST',
          `/api/surveys/${surveyId}/publish`
        );
        return await res.json();
      } catch (error) {
        console.error('Error in publishSurveyMutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
      toast({
        title: 'Survey published',
        description:
          'Your survey has been published and is now available to participants.',
      });
      setLocation('/admin/surveys');
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to publish survey',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle reordering of questions
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order property
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index,
    }));

    setQuestions(updatedItems);
  };

  // Add a new question
  const addQuestion = () => {
    const newQuestion: QuestionItem = {
      id: `new-${Date.now()}`,
      questionText: '',
      questionType: 'single',
      isRequired: true,
      options: [''],
      order: questions.length,
    };
    setQuestions([...questions, newQuestion]);
    setCurrentQuestion(newQuestion);
    setActiveTab('questions');
  };

  // Edit a question
  const editQuestion = (question: QuestionItem) => {
    setCurrentQuestion(question);
    questionForm.reset({
      questionText: question.questionText,
      questionType: question.questionType,
      isRequired: question.isRequired,
      options: question.options || [''],
      order: question.order,
    });
  };

  // Save question changes
  const saveQuestionChanges = (data: z.infer<typeof questionFormSchema>) => {
    if (!currentQuestion) return;

    const updatedQuestions = questions.map((q) =>
      q.id === currentQuestion.id
        ? {
            ...q,
            ...data,
          }
        : q
    );
    setQuestions(updatedQuestions);
    setCurrentQuestion(null);
    questionForm.reset();
  };

  // Delete a question
  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId));
    if (currentQuestion?.id === questionId) {
      setCurrentQuestion(null);
      questionForm.reset();
    }
  };

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof surveyFormSchema>) => {
    try {
      // Save survey details
      const survey = await saveSurveyMutation.mutateAsync(data as InsertSurvey);

      // If we have questions and a survey ID, save the questions
      if (questions.length > 0 && survey.id) {
        const formattedQuestions = questions.map((q) => ({
          surveyId: survey.id,
          questionText: q.questionText,
          questionType: q.questionType,
          isRequired: q.isRequired,
          options: q.options,
          order: q.order,
        }));

        await saveQuestionsMutation.mutateAsync({
          surveyId: survey.id,
          questions: formattedQuestions as InsertSurveyQuestion[],
        });
      }

      toast({
        title: 'Survey saved',
        description: 'Your survey has been saved successfully.',
      });

      // Redirect back to surveys list if creating new
      if (!isEditing) {
        setLocation(`/admin/surveys/${survey.id}/edit`);
      }
    } catch (error) {
      console.error('Error saving survey:', error);
    }
  };

  // Publish the survey
  const publishSurvey = () => {
    if (!id) return;

    // Confirm with the user
    if (
      window.confirm(
        'Are you sure you want to publish this survey? Once published, the survey structure cannot be modified.'
      )
    ) {
      publishSurveyMutation.mutate(parseInt(id));
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'nps':
        return 'Net Promoter Score (NPS)';
      case 'single':
        return 'Single Choice';
      case 'multiple':
        return 'Multiple Choice';
      case 'scale':
        return 'Scale (1-5)';
      case 'rating':
        return 'Rating (Legacy)';
      case 'likert':
        return 'Likert Scale';
      case 'dropdown':
        return 'Dropdown Select';
      case 'ranking':
        return 'Ranking';
      case 'slider':
        return 'Slider Scale';
      case 'matrix':
        return 'Matrix/Grid';
      case 'semantic':
        return 'Semantic Differential';
      case 'star':
        return 'Star Rating';
      case 'numeric':
        return 'Numeric Input';
      case 'datetime':
        return 'Date/Time Picker';
      case 'toggle':
        return 'Yes/No Toggle';
      case 'text':
        return 'Text Response';
      case 'file':
        return 'File Upload';
      case 'image':
        return 'Image Choice';
      case 'constant-sum':
        return 'Constant Sum';
      case 'heatmap':
        return 'Heatmap/Click Map';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ');
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="mr-2"
              onClick={() => setLocation('/admin/surveys')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Survey' : 'Create New Survey'}
            </h1>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              className="mr-2"
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? 'Exit Preview' : 'Preview'}
            </Button>
            <Button
              type="button"
              onClick={surveyForm.handleSubmit(onSubmit)}
              disabled={saveSurveyMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveSurveyMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
            {isEditing && (
              <Button
                type="button"
                onClick={publishSurvey}
                disabled={publishSurveyMutation.isPending}
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {publishSurveyMutation.isPending ? 'Publishing...' : 'Publish'}
              </Button>
            )}
          </div>
        </div>

        {previewMode ? (
          <SurveyTaker
            survey={{
              id: 'preview',
              title: surveyForm.getValues('title') || 'Untitled Survey',
              description: surveyForm.getValues('description') || '',
              isAnonymous: surveyForm.getValues('isAnonymous'),
              pointsAwarded: surveyForm.getValues('pointsAwarded'),
              status: 'draft',
              createdAt: new Date(),
              updatedAt: new Date(),
            }}
            questions={questions
              .sort((a, b) => a.order - b.order)
              .map((q) => ({
                ...q,
                surveyId: 'preview',
              }))}
            preview={true}
            onComplete={() => {
              setPreviewMode(false);
              toast({
                title: 'Preview completed',
                description:
                  'This was just a preview - no responses were saved.',
              });
            }}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="details">Survey Details</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Survey Details Tab */}
            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Survey Details</CardTitle>
                  <CardDescription>
                    Provide basic information about your survey
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...surveyForm}>
                    <form className="space-y-6">
                      <FormField
                        control={surveyForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Survey Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter survey title"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Give your survey a descriptive title
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={surveyForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Provide instructions or additional context"
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              This will be shown to employees when they take the
                              survey
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={surveyForm.control}
                        name="targetAudience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Audience</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select audience" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">
                                  All Employees
                                </SelectItem>
                                <SelectItem value="department">
                                  Specific Department
                                </SelectItem>
                                <SelectItem value="custom">
                                  Custom Selection
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Who should receive this survey
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {surveyForm.watch('targetAudience') === 'department' && (
                        <FormField
                          control={surveyForm.control}
                          name="targetDepartment"
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
                                  <SelectItem value="hr">HR</SelectItem>
                                  <SelectItem value="engineering">
                                    Engineering
                                  </SelectItem>
                                  <SelectItem value="marketing">
                                    Marketing
                                  </SelectItem>
                                  <SelectItem value="sales">Sales</SelectItem>
                                  <SelectItem value="finance">
                                    Finance
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={surveyForm.control}
                        name="expiresAt"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Expiration Date (Optional)</FormLabel>
                            <FormControl>
                              <DatePicker
                                date={field.value || undefined}
                                setDate={field.onChange}
                              />
                            </FormControl>
                            <FormDescription>
                              When the survey should close (leave blank for no
                              expiration)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="border-t pt-6 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('questions')}
                  >
                    Next: Questions
                  </Button>
                  <Button onClick={surveyForm.handleSubmit(onSubmit)}>
                    Save Details
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Questions Tab */}
            <TabsContent value="questions">
              <Card>
                <CardHeader>
                  <CardTitle>Survey Questions</CardTitle>
                  <CardDescription>
                    Create and organize your survey questions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentQuestion ? (
                    <div className="border p-4 rounded-lg bg-gray-50">
                      <h3 className="font-medium text-lg mb-4">
                        {questionForm.getValues('questionText')
                          ? 'Edit Question'
                          : 'New Question'}
                      </h3>
                      <Form {...questionForm}>
                        <form className="space-y-4">
                          <FormField
                            control={questionForm.control}
                            name="questionText"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Question Text</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter your question"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={questionForm.control}
                            name="questionType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Question Type</FormLabel>
                                <FormControl>
                                  <QuestionTypePicker
                                    onSelect={(value) => {
                                      field.onChange(value);
                                      // Reset options if switching to a different type that doesn't need options
                                      const optionTypes = [
                                        'single',
                                        'multiple',
                                        'dropdown',
                                        'ranking',
                                        'matrix',
                                        'image',
                                        'constant-sum',
                                      ];
                                      if (!optionTypes.includes(value)) {
                                        questionForm.setValue('options', []);
                                      } else {
                                        // Check if options exists and set a default if missing
                                        const currentOptions =
                                          questionForm.getValues('options');
                                        if (
                                          !currentOptions ||
                                          currentOptions.length === 0
                                        ) {
                                          questionForm.setValue('options', [
                                            '',
                                          ]);
                                        }
                                      }
                                    }}
                                    currentType={field.value}
                                    onClose={() => {}}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Choose from 19 different question types for
                                  your survey
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={questionForm.control}
                            name="isRequired"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Required Question</FormLabel>
                                  <FormDescription>
                                    Make this question mandatory
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

                          {/* Question Preview */}
                          <div className="border rounded-lg p-4 bg-gray-50 mb-4">
                            <h3 className="text-sm font-medium mb-2">
                              Preview
                            </h3>
                            <QuestionPreview
                              question={{
                                id: currentQuestion?.id || 'preview',
                                questionText:
                                  questionForm.watch('questionText') ||
                                  'Question preview',
                                questionType:
                                  questionForm.watch('questionType'),
                                isRequired: questionForm.watch('isRequired'),
                                options: questionForm.watch('options'),
                              }}
                              readOnly={true}
                            />
                          </div>

                          {/* Options for questions that need them */}
                          {[
                            'single',
                            'multiple',
                            'dropdown',
                            'ranking',
                            'matrix',
                            'image',
                            'constant-sum',
                          ].includes(questionForm.watch('questionType')) && (
                            <div className="space-y-2">
                              <FormLabel>
                                {questionForm.watch('questionType') === 'matrix'
                                  ? 'Rows (Items to Rate)'
                                  : 'Answer Options'}
                              </FormLabel>
                              {questionForm
                                .watch('options')
                                ?.map((_, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center space-x-2"
                                  >
                                    <Input
                                      value={
                                        questionForm.watch('options')?.[
                                          index
                                        ] || ''
                                      }
                                      onChange={(e) => {
                                        const newOptions = [
                                          ...(questionForm.getValues(
                                            'options'
                                          ) || []),
                                        ];
                                        newOptions[index] = e.target.value;
                                        questionForm.setValue(
                                          'options',
                                          newOptions
                                        );
                                      }}
                                      placeholder={
                                        questionForm.watch('questionType') ===
                                        'matrix'
                                          ? `Row ${index + 1} (e.g., "Customer Service")`
                                          : questionForm.watch(
                                                'questionType'
                                              ) === 'constant-sum'
                                            ? `Item ${index + 1} (e.g., "Quality")`
                                            : `Option ${index + 1}`
                                      }
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newOptions = [
                                          ...(questionForm.getValues(
                                            'options'
                                          ) || []),
                                        ];
                                        newOptions.splice(index, 1);
                                        questionForm.setValue(
                                          'options',
                                          newOptions
                                        );
                                      }}
                                      className="text-red-500"
                                      disabled={
                                        (questionForm.watch('options') || [])
                                          .length <= 1
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const currentOptions =
                                    questionForm.getValues('options') || [];
                                  questionForm.setValue('options', [
                                    ...currentOptions,
                                    '',
                                  ]);
                                }}
                                className="mt-2"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add{' '}
                                {questionForm.watch('questionType') === 'matrix'
                                  ? 'Row'
                                  : 'Option'}
                              </Button>
                            </div>
                          )}

                          {/* Matrix scale options */}
                          {questionForm.watch('questionType') === 'matrix' && (
                            <div className="space-y-2 mt-4">
                              <FormLabel>
                                Column Headers (Rating Scale)
                              </FormLabel>
                              <div className="text-xs text-gray-500 mb-2">
                                Default scale: Poor, Fair, Good, Excellent
                              </div>
                            </div>
                          )}
                        </form>
                      </Form>
                      <div className="flex justify-between mt-6 pt-4 border-t">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setCurrentQuestion(null);
                            questionForm.reset();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={questionForm.handleSubmit(
                            saveQuestionChanges
                          )}
                        >
                          Save Question
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-end mb-4">
                        <Button onClick={addQuestion}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Question
                        </Button>
                      </div>

                      {questions.length === 0 ? (
                        <div className="text-center py-8 border border-dashed rounded-lg">
                          <div className="text-gray-400 mb-2">
                            No questions added yet
                          </div>
                          <Button
                            onClick={addQuestion}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add your first question
                          </Button>
                        </div>
                      ) : (
                        <DragDropContext onDragEnd={handleDragEnd}>
                          <Droppable droppableId="questions">
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-3"
                              >
                                {questions
                                  .sort((a, b) => a.order - b.order)
                                  .map((question, index) => (
                                    <Draggable
                                      key={question.id}
                                      draggableId={question.id}
                                      index={index}
                                    >
                                      {(provided) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className="border p-3 rounded-lg bg-white"
                                        >
                                          <div className="flex items-start">
                                            <div
                                              {...provided.dragHandleProps}
                                              className="cursor-move text-gray-400 mr-2 mt-1"
                                            >
                                              <GripVertical className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                              <div className="flex items-start justify-between">
                                                <div>
                                                  <div className="font-medium">
                                                    {index + 1}.{' '}
                                                    {question.questionText ||
                                                      '<Untitled Question>'}
                                                    {question.isRequired && (
                                                      <span className="text-red-500 ml-1">
                                                        *
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-gray-500 mt-1">
                                                    {getQuestionTypeLabel(
                                                      question.questionType
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="flex space-x-1">
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                      editQuestion(question)
                                                    }
                                                    className="text-blue-600 hover:text-blue-800"
                                                  >
                                                    <Edit className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                      deleteQuestion(
                                                        question.id
                                                      )
                                                    }
                                                    className="text-red-600 hover:text-red-800"
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              </div>

                                              {/* Show a preview of options if available */}
                                              {question.options &&
                                                question.options.length > 0 &&
                                                (question.questionType ===
                                                  'single' ||
                                                  question.questionType ===
                                                    'multiple') && (
                                                  <div className="mt-2 text-sm text-gray-600">
                                                    <span className="text-xs text-gray-500">
                                                      Options:{' '}
                                                    </span>
                                                    {question.options
                                                      .filter((o) => o.trim())
                                                      .join(', ')}
                                                  </div>
                                                )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      )}
                    </>
                  )}
                </CardContent>
                {!currentQuestion && (
                  <CardFooter className="border-t pt-6 flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('details')}
                    >
                      Back to Details
                    </Button>
                    <Button
                      onClick={() => setActiveTab('settings')}
                      disabled={questions.length === 0}
                    >
                      Next: Settings
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Survey Settings</CardTitle>
                  <CardDescription>
                    Configure additional survey settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...surveyForm}>
                    <form className="space-y-6">
                      <FormField
                        control={surveyForm.control}
                        name="isAnonymous"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Anonymous Responses
                              </FormLabel>
                              <FormDescription>
                                Responses will not be linked to individual
                                employees
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
                        control={surveyForm.control}
                        name="pointsAwarded"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reward Points</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormDescription>
                              Points to award upon survey completion (0 for no
                              reward)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={surveyForm.control}
                        name="reminderDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reminder Days</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="30"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormDescription>
                              Days after which to send a reminder (0 for no
                              reminder)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="border-t pt-6 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('questions')}
                  >
                    Back to Questions
                  </Button>
                  <div className="flex space-x-2">
                    <Button onClick={surveyForm.handleSubmit(onSubmit)}>
                      <Save className="h-4 w-4 mr-2" />
                      {saveSurveyMutation.isPending
                        ? 'Saving...'
                        : 'Save Survey'}
                    </Button>
                    {isEditing && (
                      <Button
                        onClick={publishSurvey}
                        disabled={
                          publishSurveyMutation.isPending ||
                          questions.length === 0
                        }
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {publishSurveyMutation.isPending
                          ? 'Publishing...'
                          : 'Publish'}
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
