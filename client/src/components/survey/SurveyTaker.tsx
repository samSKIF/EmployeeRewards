import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Survey, SurveyQuestion } from "@shared/schema";
import { ClipboardList, FileText, AlertTriangle } from "lucide-react";

interface SurveyTakerProps {
  surveyId: number;
  onComplete?: () => void;
}

export function SurveyTaker({ surveyId, onComplete }: SurveyTakerProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch survey details
  const { data: survey, isLoading: loadingSurvey } = useQuery<Survey>({
    queryKey: [`/api/surveys/${surveyId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/surveys/${surveyId}`);
      return await res.json();
    },
  });

  // Fetch survey questions
  const { data: questions = [], isLoading: loadingQuestions } = useQuery<SurveyQuestion[]>({
    queryKey: [`/api/surveys/${surveyId}/questions`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/surveys/${surveyId}/questions`);
      return await res.json();
    },
    enabled: !!surveyId,
  });

  // Sort questions by order
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

  // Submit survey response
  const submitSurveyMutation = useMutation({
    mutationFn: async (data: { surveyId: number; answers: Record<number, any> }) => {
      const res = await apiRequest("POST", `/api/surveys/${data.surveyId}/respond`, {
        answers: data.answers,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setSubmitted(true);
      setIsSubmitting(false);
      toast({
        title: "Survey completed",
        description: data.pointsAwarded
          ? `Thank you for completing the survey! You've earned ${data.pointsAwarded} points.`
          : "Thank you for completing the survey!",
      });
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error: Error) => {
      setIsSubmitting(false);
      toast({
        title: "Error submitting survey",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle answer changes
  const handleAnswerChange = (questionId: number, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Submit the survey
  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Check if all required questions are answered
    const unansweredRequired = sortedQuestions.filter(
      (q) => q.isRequired && !answers[q.id]
    );

    if (unansweredRequired.length > 0) {
      toast({
        title: "Incomplete survey",
        description: `Please answer all required questions before submitting.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    submitSurveyMutation.mutate({ surveyId, answers });
  };

  // Navigate between questions
  const nextQuestion = () => {
    if (currentStep < sortedQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevQuestion = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Check if current question is answered (for required questions validation)
  const isCurrentQuestionAnswered = () => {
    const currentQuestion = sortedQuestions[currentStep];
    if (!currentQuestion) return true;
    if (!currentQuestion.isRequired) return true;
    return !!answers[currentQuestion.id];
  };

  // Render different input types based on question type
  const renderQuestionInput = (question: SurveyQuestion) => {
    switch (question.questionType) {
      case "single":
        return (
          <div className="space-y-3">
            {question.options?.map((option: string, index: number) => (
              <div key={index} className="flex items-center">
                <input
                  type="radio"
                  id={`${question.id}-option-${index}`}
                  name={`question-${question.id}`}
                  checked={answers[question.id] === option}
                  onChange={() => handleAnswerChange(question.id, option)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label
                  htmlFor={`${question.id}-option-${index}`}
                  className="ml-2 block text-sm text-gray-700"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        );

      case "multiple":
        return (
          <div className="space-y-3">
            {question.options?.map((option: string, index: number) => {
              const selectedOptions = answers[question.id] || [];
              const isChecked = selectedOptions.includes(option);

              return (
                <div key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`${question.id}-option-${index}`}
                    name={`question-${question.id}-option-${index}`}
                    checked={isChecked}
                    onChange={() => {
                      const currentSelections = answers[question.id] || [];
                      let newSelections;

                      if (isChecked) {
                        newSelections = currentSelections.filter(
                          (item: string) => item !== option
                        );
                      } else {
                        newSelections = [...currentSelections, option];
                      }

                      handleAnswerChange(question.id, newSelections);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                  />
                  <label
                    htmlFor={`${question.id}-option-${index}`}
                    className="ml-2 block text-sm text-gray-700"
                  >
                    {option}
                  </label>
                </div>
              );
            })}
          </div>
        );

      case "rating":
        return (
          <div className="flex flex-wrap gap-2 justify-center py-4">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleAnswerChange(question.id, rating)}
                className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-medium ${
                  answers[question.id] === rating
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        );

      case "likert":
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-2 py-1 w-40"></th>
                  <th className="px-2 py-1 text-center text-xs text-gray-500">
                    Strongly Disagree
                  </th>
                  <th className="px-2 py-1 text-center text-xs text-gray-500">
                    Disagree
                  </th>
                  <th className="px-2 py-1 text-center text-xs text-gray-500">
                    Neutral
                  </th>
                  <th className="px-2 py-1 text-center text-xs text-gray-500">
                    Agree
                  </th>
                  <th className="px-2 py-1 text-center text-xs text-gray-500">
                    Strongly Agree
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-2 text-sm text-gray-600">
                    {question.questionText}
                  </td>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <td key={value} className="px-2 py-2 text-center">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        checked={answers[question.id] === value}
                        onChange={() => handleAnswerChange(question.id, value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        );

      case "text":
        return (
          <textarea
            id={`question-${question.id}`}
            name={`question-${question.id}`}
            rows={4}
            value={answers[question.id] || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Type your answer here..."
          />
        );

      case "file":
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
            <input
              type="file"
              id={`question-${question.id}`}
              name={`question-${question.id}`}
              onChange={(e) =>
                handleAnswerChange(
                  question.id,
                  e.target.files ? e.target.files[0] : null
                )
              }
              className="hidden"
            />
            <label
              htmlFor={`question-${question.id}`}
              className="cursor-pointer flex flex-col items-center"
            >
              <FileText className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">
                Click to upload or drag and drop
              </span>
              <span className="text-xs text-gray-500 mt-1">
                {answers[question.id]?.name || "Supports images and documents"}
              </span>
            </label>
          </div>
        );

      default:
        return <div>Unsupported question type</div>;
    }
  };

  if (loadingSurvey || loadingQuestions) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
            <div className="h-20 bg-gray-200 rounded animate-pulse w-full"></div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="h-9 bg-gray-200 rounded animate-pulse w-24"></div>
        </CardFooter>
      </Card>
    );
  }

  if (!survey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Survey Not Found
          </CardTitle>
          <CardDescription>
            The requested survey could not be found or has been closed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Please check the survey link or contact your administrator if you
            believe this is an error.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">Thank You!</CardTitle>
          <CardDescription>
            Your response has been successfully submitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6">
          <div className="bg-green-100 rounded-full p-4 mb-4">
            <ClipboardList className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-center text-gray-600 mb-4">
            We appreciate you taking the time to complete this survey.
          </p>
          {survey.pointsAwarded > 0 && (
            <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-lg border border-amber-200 flex items-center">
              <span className="text-amber-500 mr-2">★</span>
              <span>
                You've earned <strong>{survey.pointsAwarded} points</strong> for
                completing this survey!
              </span>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={onComplete}>Done</Button>
        </CardFooter>
      </Card>
    );
  }

  if (sortedQuestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{survey.title}</CardTitle>
          <CardDescription>{survey.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p>This survey does not contain any questions.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = sortedQuestions[currentStep];
  const progress = Math.round(
    ((currentStep + 1) / sortedQuestions.length) * 100
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center mb-1">
          <CardTitle>{survey.title}</CardTitle>
          <span className="text-sm text-gray-500">
            Question {currentStep + 1} of {sortedQuestions.length}
          </span>
        </div>
        <CardDescription>{survey.description}</CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">
            {currentQuestion.questionText}
            {currentQuestion.isRequired && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </h3>
          <div className="mt-4">{renderQuestionInput(currentQuestion)}</div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={prevQuestion}
          disabled={currentStep === 0}
        >
          Previous
        </Button>
        <div>
          {currentStep === sortedQuestions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                (currentQuestion.isRequired && !answers[currentQuestion.id])
              }
            >
              {isSubmitting ? "Submitting..." : "Submit Survey"}
            </Button>
          ) : (
            <Button
              onClick={nextQuestion}
              disabled={
                currentQuestion.isRequired && !answers[currentQuestion.id]
              }
            >
              Next
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}