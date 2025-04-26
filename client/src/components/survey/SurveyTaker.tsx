import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface SurveyQuestion {
  id: string;
  questionText: string;
  questionType: string;
  isRequired: boolean;
  options?: string[];
  order: number;
}

interface Survey {
  id: number;
  title: string;
  description?: string;
  pointsAwarded: number;
  isAnonymous: boolean;
  status: string;
}

interface SurveyTakerProps {
  survey: Survey;
  questions: SurveyQuestion[];
  onSubmit?: (answers: Record<string, any>) => void;
  onComplete?: () => void;
  preview?: boolean;
}

export default function SurveyTaker({ 
  survey, 
  questions, 
  onSubmit,
  onComplete,
  preview = false
}: SurveyTakerProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [progress, setProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Sort questions by order
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  const currentQuestion = sortedQuestions[currentStep];
  
  // Calculate progress percentage
  useEffect(() => {
    const percentage = Math.round((currentStep / sortedQuestions.length) * 100);
    setProgress(percentage);
  }, [currentStep, sortedQuestions.length]);
  
  // Create form schema based on question type
  const getQuestionSchema = (question: SurveyQuestion) => {
    let schema;
    
    switch (question?.questionType) {
      case 'text':
        schema = z.string();
        break;
      case 'single':
        schema = z.string();
        break;
      case 'multiple':
        schema = z.array(z.string()).min(1, 'Please select at least one option');
        break;
      case 'rating':
        schema = z.number().min(1).max(5);
        break;
      case 'likert':
        schema = z.number().min(0).max(10);
        break;
      case 'file':
        schema = z.any(); // Simplified for demo
        break;
      default:
        schema = z.string();
    }
    
    // Apply required validation if needed
    if (question?.isRequired) {
      // For text questions, require at least one character
      if (question.questionType === 'text') {
        // Using type assertion since we know it's a string schema
        schema = (schema as z.ZodString).min(1, 'This field is required');
      }
    } else {
      // Make the field optional for non-required questions
      schema = schema.optional();
    }
    
    return z.object({
      [`question_${question?.id}`]: schema
    });
  };
  
  // Initialize form
  const form = useForm({
    resolver: zodResolver(currentQuestion ? getQuestionSchema(currentQuestion) : z.object({})),
    defaultValues: {
      [`question_${currentQuestion?.id}`]: 
        answers[`question_${currentQuestion?.id}`] || 
        (currentQuestion?.questionType === 'multiple' ? [] : '')
    }
  });
  
  // Update form when question changes
  useEffect(() => {
    if (currentQuestion) {
      form.reset({
        [`question_${currentQuestion.id}`]: 
          answers[`question_${currentQuestion.id}`] || 
          (currentQuestion.questionType === 'multiple' ? [] : '')
      });
    }
  }, [currentQuestion, form, answers]);
  
  // Handle moving to next question
  const handleNext = async (data: Record<string, any>) => {
    // Update answers
    setAnswers(prev => ({
      ...prev,
      ...data
    }));
    
    // Save answer if not in preview mode
    if (!preview && onSubmit) {
      onSubmit({
        ...data
      });
    }
    
    // If this is the last question, submit all answers
    if (currentStep === sortedQuestions.length - 1) {
      if (preview) {
        toast({
          title: "Preview completed",
          description: "In a real survey, responses would be submitted now."
        });
        
        if (onComplete) {
          onComplete();
        }
        return;
      }
      
      setIsSubmitting(true);
      
      try {
        // In a real implementation, submit all answers to backend
        toast({
          title: "Survey completed",
          description: `Thank you for completing the survey. ${survey.pointsAwarded > 0 ? `You've earned ${survey.pointsAwarded} points!` : ''}`
        });
        
        if (onComplete) {
          onComplete();
        }
      } catch (error) {
        toast({
          title: "Error submitting survey",
          description: "There was a problem submitting your responses. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Move to next question
      setCurrentStep(prev => prev + 1);
    }
  };
  
  // Handle moving to previous question
  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };
  
  // If no questions, show empty state
  if (!sortedQuestions.length) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-500">This survey doesn't have any questions yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render the current question based on its type
  const renderQuestionContent = () => {
    if (!currentQuestion) return null;
    
    switch (currentQuestion.questionType) {
      case 'text':
        return (
          <FormField
            control={form.control}
            name={`question_${currentQuestion.id}`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Enter your answer here"
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'single':
        return (
          <FormField
            control={form.control}
            name={`question_${currentQuestion.id}`}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-2"
                  >
                    {currentQuestion.options?.map((option, index) => (
                      <FormItem
                        key={index}
                        className="flex items-center space-x-3 space-y-0"
                      >
                        <FormControl>
                          <RadioGroupItem value={option} />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          {option}
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'multiple':
        return (
          <FormField
            control={form.control}
            name={`question_${currentQuestion.id}`}
            render={() => (
              <FormItem>
                <div className="space-y-2">
                  {currentQuestion.options?.map((option, index) => (
                    <FormField
                      key={index}
                      control={form.control}
                      name={`question_${currentQuestion.id}`}
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={index}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(option)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, option])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value: string) => value !== option
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {option}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'rating':
        return (
          <FormField
            control={form.control}
            name={`question_${currentQuestion.id}`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="flex justify-between items-center space-x-2">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <Button
                        key={rating}
                        type="button"
                        variant={field.value === rating ? "default" : "outline"}
                        className="w-12 h-12 rounded-full"
                        onClick={() => field.onChange(rating)}
                      >
                        {rating}
                      </Button>
                    ))}
                  </div>
                </FormControl>
                <div className="flex justify-between mt-2 text-sm text-gray-500">
                  <span>Not at all</span>
                  <span>Very much</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'likert':
        return (
          <FormField
            control={form.control}
            name={`question_${currentQuestion.id}`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                        <Button
                          key={value}
                          type="button"
                          variant={field.value === value ? "default" : "outline"}
                          className="w-9 h-9 rounded-full"
                          onClick={() => field.onChange(value)}
                        >
                          {value}
                        </Button>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Very Unlikely</span>
                      <span>Very Likely</span>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'file':
        return (
          <FormField
            control={form.control}
            name={`question_${currentQuestion.id}`}
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        onChange(e.target.files[0]);
                      }
                    }}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl">{survey.title}</CardTitle>
            {survey.description && (
              <CardDescription className="mt-2">
                {survey.description}
              </CardDescription>
            )}
          </div>
          {survey.pointsAwarded > 0 && (
            <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <span className="mr-1">★</span>
              <span>{survey.pointsAwarded} points</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Question {currentStep + 1} of {sortedQuestions.length}</span>
            <span>{progress}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleNext)} className="space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">
                {currentQuestion.questionText}
                {currentQuestion.isRequired && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </h3>
              {renderQuestionContent()}
            </div>
            
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {currentStep === sortedQuestions.length - 1 ? 'Submit' : 'Next'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      
      {preview && (
        <CardFooter className="bg-amber-50 border-t">
          <div className="text-sm text-amber-700 flex items-center">
            <span className="font-medium mr-1">Preview Mode:</span>
            <span>Responses won't be saved</span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}