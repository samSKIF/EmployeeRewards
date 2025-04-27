import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { 
  ChevronLeft,
  Save,
  Settings,
  LayoutGrid,
  PlusCircle,
  Trash2,
  EyeIcon,
  ArrowUp,
  ArrowDown,
  MoveVertical
} from "lucide-react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import MainLayout from "@/components/layout/MainLayout";
import { useToast } from "@/hooks/use-toast";
import SurveyTaker from "@/components/survey/SurveyTaker";

// Template data - in a real implementation, this would come from an API
const TEMPLATE_DATA: Record<string, any> = {
  "enps-survey": {
    id: 1,
    title: "Director eNPS Survey",
    description: "This survey measures the employee Net Promoter Score among directors and leadership team members.",
    status: "draft",
    isAnonymous: true,
    pointsAwarded: 50,
    questions: [
      {
        id: "q1",
        questionText: "Considering your experience as Director and managing a crucial branch of the Dan Lok Group, how likely are you to recommend the Dan Lok Group as a working environment to a friend, family member or potential hire?",
        questionType: "likert",
        isRequired: true,
        order: 0
      },
      {
        id: "q2",
        questionText: "Why would you not recommend working with Sifu?",
        questionType: "text",
        isRequired: false,
        order: 1
      },
      {
        id: "q3",
        questionText: "What do you most enjoy about working with Sifu?",
        questionType: "text",
        isRequired: false,
        order: 2
      },
      {
        id: "q4",
        questionText: "What about working with Sifu can be improved?",
        questionType: "text",
        isRequired: false,
        order: 3
      },
      {
        id: "q5",
        questionText: "What about working with Sifu REALLY WOWs you?",
        questionType: "text",
        isRequired: false,
        order: 4
      },
      {
        id: "q6",
        questionText: "What about working with Sifu could happen to be able to WOW you?",
        questionType: "text",
        isRequired: false,
        order: 5
      },
      {
        id: "q7",
        questionText: "Would you be willing take on greater responsibilities if the opportunity presented itself?",
        questionType: "single",
        isRequired: true,
        options: ["Yes", "No"],
        order: 6
      }
    ]
  },
  "customer-registration": {
    id: 2,
    title: "New Customer Registration Form",
    description: "A comprehensive form for collecting customer details and preferences.",
    status: "draft",
    isAnonymous: false,
    pointsAwarded: 0,
    questions: [
      {
        id: "q1",
        questionText: "Full Name",
        questionType: "text",
        isRequired: true,
        order: 0
      },
      {
        id: "q2",
        questionText: "Email Address",
        questionType: "text",
        isRequired: true,
        order: 1
      },
      {
        id: "q3",
        questionText: "Phone Number",
        questionType: "text",
        isRequired: true,
        order: 2
      },
      {
        id: "q4",
        questionText: "Address",
        questionType: "text",
        isRequired: true,
        order: 3
      },
      {
        id: "q5",
        questionText: "How did you hear about us?",
        questionType: "single",
        isRequired: false,
        options: ["Social Media", "Friend/Family", "Search Engine", "Advertisement", "Other"],
        order: 4
      }
    ]
  },
  "feedback-form": {
    id: 3,
    title: "Feedback Form",
    description: "Collect valuable feedback from customers or employees with this customizable form.",
    status: "draft",
    isAnonymous: true,
    pointsAwarded: 25,
    questions: [
      {
        id: "q1",
        questionText: "Feedback Type",
        questionType: "single",
        isRequired: true,
        options: ["Comments", "Suggestions", "Questions"],
        order: 0
      },
      {
        id: "q2",
        questionText: "Describe Your Feedback",
        questionType: "text",
        isRequired: true,
        order: 1
      },
      {
        id: "q3",
        questionText: "How would you rate your overall experience?",
        questionType: "rating",
        isRequired: true,
        order: 2
      },
      {
        id: "q4",
        questionText: "Which aspects need improvement? (Select all that apply)",
        questionType: "multiple",
        isRequired: false,
        options: ["Customer Service", "Product Quality", "Website Usability", "Communication", "Pricing", "Delivery Time"],
        order: 3
      }
    ]
  }
};

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
  questions: SurveyQuestion[];
}

export default function AdminSurveyEditor() {
  const { templateId } = useParams();
  const [, setLocation] = useLocation();
  
  // Get query parameters if needed
  const getQueryParams = () => {
    const url = new URL(window.location.href);
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  };
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("build");
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [currentQuestionText, setCurrentQuestionText] = useState("");
  const [currentQuestionRequired, setCurrentQuestionRequired] = useState(false);
  const [currentQuestionOptions, setCurrentQuestionOptions] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState("");
  
  // Load template data
  useEffect(() => {
    setLoading(true);
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      if (templateId && TEMPLATE_DATA[templateId]) {
        // Create a deep copy to avoid modifying the original data
        const templateData = JSON.parse(JSON.stringify(TEMPLATE_DATA[templateId]));
        
        // Generate a new ID for the survey
        templateData.id = Date.now();
        templateData.title = `Copy of ${templateData.title}`;
        templateData.status = "draft";
        
        setSurvey(templateData);
      } else {
        toast({
          title: "Template not found",
          description: "The requested template could not be found.",
          variant: "destructive"
        });
        setLocation("/admin/surveys/templates");
      }
      setLoading(false);
    }, 500);
  }, [templateId, toast, setLocation]);
  
  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (survey) {
      setSurvey({ ...survey, title: e.target.value });
      setEdited(true);
    }
  };
  
  // Handle description change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (survey) {
      setSurvey({ ...survey, description: e.target.value });
      setEdited(true);
    }
  };
  
  // Handle anonymous setting change
  const handleAnonymousChange = (checked: boolean) => {
    if (survey) {
      setSurvey({ ...survey, isAnonymous: checked });
      setEdited(true);
    }
  };
  
  // Handle points awarded change
  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (survey) {
      const points = parseInt(e.target.value) || 0;
      setSurvey({ ...survey, pointsAwarded: points });
      setEdited(true);
    }
  };
  
  // Open edit dialog for a question
  const handleEditQuestion = (question: SurveyQuestion) => {
    setEditingQuestionId(question.id);
    setCurrentQuestionText(question.questionText);
    setCurrentQuestionRequired(question.isRequired);
    setCurrentQuestionOptions(question.options || []);
    setEditDialog(true);
  };
  
  // Handle inline double-click edit for question text
  const handleQuestionTextDoubleClick = (question: SurveyQuestion) => {
    setEditingQuestionId(question.id);
    setCurrentQuestionText(question.questionText);
    setCurrentQuestionRequired(question.isRequired);
    setCurrentQuestionOptions(question.options || []);
  };
  
  // Save question changes
  const saveQuestionChanges = () => {
    if (survey && editingQuestionId) {
      const updatedQuestions = survey.questions.map(q => 
        q.id === editingQuestionId 
          ? { 
              ...q, 
              questionText: currentQuestionText, 
              isRequired: currentQuestionRequired,
              options: q.questionType === 'single' || q.questionType === 'multiple' 
                ? currentQuestionOptions 
                : q.options
            } 
          : q
      );
      
      setSurvey({ ...survey, questions: updatedQuestions });
      setEditingQuestionId(null);
      setEditDialog(false);
      setEdited(true);
    }
  };
  
  // Cancel question editing
  const cancelQuestionEdit = () => {
    setEditingQuestionId(null);
    setEditDialog(false);
  };
  
  // Add option to multiple choice or single choice question
  const addOption = () => {
    if (newOptionText.trim()) {
      setCurrentQuestionOptions([...currentQuestionOptions, newOptionText.trim()]);
      setNewOptionText("");
      setEdited(true);
    }
  };
  
  // Remove option from multiple choice or single choice question
  const removeOption = (index: number) => {
    const newOptions = [...currentQuestionOptions];
    newOptions.splice(index, 1);
    setCurrentQuestionOptions(newOptions);
    setEdited(true);
  };
  
  // Move question up in order
  const moveQuestionUp = (index: number) => {
    if (index > 0 && survey) {
      const newQuestions = [...survey.questions];
      
      // Update order properties
      newQuestions[index].order--;
      newQuestions[index - 1].order++;
      
      // Sort by order
      newQuestions.sort((a, b) => a.order - b.order);
      
      setSurvey({ ...survey, questions: newQuestions });
      setEdited(true);
    }
  };
  
  // Move question down in order
  const moveQuestionDown = (index: number) => {
    if (survey && index < survey.questions.length - 1) {
      const newQuestions = [...survey.questions];
      
      // Update order properties
      newQuestions[index].order++;
      newQuestions[index + 1].order--;
      
      // Sort by order
      newQuestions.sort((a, b) => a.order - b.order);
      
      setSurvey({ ...survey, questions: newQuestions });
      setEdited(true);
    }
  };
  
  // Delete a question
  const deleteQuestion = (questionId: string) => {
    if (survey) {
      const updatedQuestions = survey.questions
        .filter(q => q.id !== questionId)
        .map((q, index) => ({ ...q, order: index }));
      
      setSurvey({ ...survey, questions: updatedQuestions });
      setEdited(true);
    }
  };
  
  // Save the survey
  const saveSurvey = async () => {
    if (!survey) return;
    
    setSaving(true);
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      toast({
        title: "Survey saved",
        description: "Your survey has been saved successfully."
      });
      setSaving(false);
      setEdited(false);
      setLocation("/admin/surveys");
    }, 1000);
  };
  
  // Handle publish
  const publishSurvey = async () => {
    if (!survey) return;
    
    setSaving(true);
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      toast({
        title: "Survey published",
        description: "Your survey has been published successfully."
      });
      setSaving(false);
      setEdited(false);
      setLocation("/admin/surveys");
    }, 1000);
  };
  
  // Go back to survey list
  const handleGoBack = () => {
    if (edited) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        setLocation("/admin/surveys");
      }
    } else {
      setLocation("/admin/surveys");
    }
  };
  
  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-12">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (!survey) {
    return (
      <MainLayout>
        <div className="container mx-auto py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Survey Not Found</h1>
            <p className="text-gray-600 mb-8">The requested survey template could not be found.</p>
            <Button onClick={handleGoBack}>Back to Surveys</Button>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (previewMode) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <Button 
              variant="outline" 
              onClick={() => setPreviewMode(false)}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Editor
            </Button>
            
            <div className="text-sm text-gray-500">
              Preview Mode
            </div>
          </div>
          
          <SurveyTaker 
            survey={survey} 
            questions={survey.questions}
            preview={true}
            onComplete={() => setPreviewMode(false)}
          />
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={handleGoBack}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div>
                <Input 
                  value={survey.title}
                  onChange={handleTitleChange}
                  className="text-xl font-bold border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                  placeholder="Survey Title"
                />
                <div className="text-xs text-gray-500">
                  All changes saved at {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setPreviewMode(true)}
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                Preview
              </Button>
              
              <Button
                variant="outline"
                onClick={saveSurvey}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              
              <Button
                onClick={publishSurvey}
                disabled={saving}
              >
                Publish
              </Button>
            </div>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="build">
              <LayoutGrid className="h-4 w-4 mr-2" />
              BUILD
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              SETTINGS
            </TabsTrigger>
            <TabsTrigger value="publish" disabled>
              PUBLISH
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="build" className="space-y-6">
            {survey.questions.map((question, index) => (
              <div 
                key={question.id} 
                className="bg-white p-6 rounded-lg border shadow-sm relative group"
              >
                {editingQuestionId === question.id ? (
                  <div className="mb-4">
                    <Textarea
                      value={currentQuestionText}
                      onChange={(e) => setCurrentQuestionText(e.target.value)}
                      className="text-lg font-medium mb-2"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={currentQuestionRequired}
                          onCheckedChange={setCurrentQuestionRequired}
                          id={`required-${question.id}`}
                        />
                        <Label htmlFor={`required-${question.id}`}>Required</Label>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelQuestionEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={saveQuestionChanges}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                    
                    {(question.questionType === 'single' || question.questionType === 'multiple') && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Options</h4>
                        <div className="space-y-2">
                          {currentQuestionOptions.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center space-x-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...currentQuestionOptions];
                                  newOptions[optIndex] = e.target.value;
                                  setCurrentQuestionOptions(newOptions);
                                }}
                                className="flex-grow"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(optIndex)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                          <div className="flex items-center space-x-2 mt-2">
                            <Input
                              value={newOptionText}
                              onChange={(e) => setNewOptionText(e.target.value)}
                              placeholder="Add new option"
                              className="flex-grow"
                            />
                            <Button
                              variant="outline"
                              onClick={addOption}
                            >
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className="mb-4"
                    onDoubleClick={() => handleQuestionTextDoubleClick(question)}
                  >
                    <h3 className="text-lg font-medium mb-2">
                      {question.questionText}
                      {question.isRequired && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </h3>
                    <div className="text-sm text-gray-500 capitalize">
                      {question.questionType} Question
                    </div>
                  </div>
                )}
                
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveQuestionUp(index)}
                    disabled={index === 0}
                    title="Move up"
                    className="h-8 w-8"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveQuestionDown(index)}
                    disabled={index === survey.questions.length - 1}
                    title="Move down"
                    className="h-8 w-8"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditQuestion(question)}
                    title="Edit question"
                    className="h-8 w-8"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteQuestion(question.id)}
                    title="Delete question"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="text-center py-8">
              <Button variant="outline">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h2 className="text-xl font-bold mb-6">Survey Settings</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Survey Title</Label>
                    <Input
                      id="title"
                      value={survey.title}
                      onChange={handleTitleChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="points">Points Awarded for Completion</Label>
                    <Input
                      id="points"
                      type="number"
                      min="0"
                      value={survey.pointsAwarded}
                      onChange={handlePointsChange}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={survey.description || ""}
                    onChange={handleDescriptionChange}
                    rows={4}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="anonymous"
                    checked={survey.isAnonymous}
                    onCheckedChange={handleAnonymousChange}
                  />
                  <Label htmlFor="anonymous">Anonymous Responses</Label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Question</DialogTitle>
              <DialogDescription>
                Make changes to the question content and settings.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="questionText">Question Text</Label>
                <Textarea
                  id="questionText"
                  value={currentQuestionText}
                  onChange={(e) => setCurrentQuestionText(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="required"
                  checked={currentQuestionRequired}
                  onCheckedChange={setCurrentQuestionRequired}
                />
                <Label htmlFor="required">Required</Label>
              </div>
              
              {editingQuestionId && survey?.questions.find(q => q.id === editingQuestionId)?.questionType === 'single' && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {currentQuestionOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...currentQuestionOptions];
                          newOptions[index] = e.target.value;
                          setCurrentQuestionOptions(newOptions);
                        }}
                        className="flex-grow"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2 mt-2">
                    <Input
                      value={newOptionText}
                      onChange={(e) => setNewOptionText(e.target.value)}
                      placeholder="Add new option"
                      className="flex-grow"
                    />
                    <Button
                      variant="outline"
                      onClick={addOption}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={cancelQuestionEdit}>
                Cancel
              </Button>
              <Button onClick={saveQuestionChanges}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}