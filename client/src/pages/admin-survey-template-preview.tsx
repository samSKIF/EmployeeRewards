import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import SurveyTaker from '@/components/survey/SurveyTaker';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';

// Template data - in a real implementation, this would come from an API
const TEMPLATE_DATA: Record<string, any> = {
  'enps-survey': {
    id: 1,
    title: 'Director eNPS Survey',
    description:
      'This survey measures the employee Net Promoter Score among directors and leadership team members.',
    status: 'draft',
    isAnonymous: true,
    pointsAwarded: 50,
    questions: [
      {
        id: 'q1',
        questionText:
          'Considering your experience as Director and managing a crucial branch of the Dan Lok Group, how likely are you to recommend the Dan Lok Group as a working environment to a friend, family member or potential hire?',
        questionType: 'likert',
        isRequired: true,
        order: 0,
      },
      {
        id: 'q2',
        questionText: 'Why would you not recommend working with Sifu?',
        questionType: 'text',
        isRequired: false,
        order: 1,
      },
      {
        id: 'q3',
        questionText: 'What do you most enjoy about working with Sifu?',
        questionType: 'text',
        isRequired: false,
        order: 2,
      },
      {
        id: 'q4',
        questionText: 'What about working with Sifu can be improved?',
        questionType: 'text',
        isRequired: false,
        order: 3,
      },
      {
        id: 'q5',
        questionText: 'What about working with Sifu REALLY WOWs you?',
        questionType: 'text',
        isRequired: false,
        order: 4,
      },
      {
        id: 'q6',
        questionText:
          'What about working with Sifu could happen to be able to WOW you?',
        questionType: 'text',
        isRequired: false,
        order: 5,
      },
      {
        id: 'q7',
        questionText:
          'Would you be willing take on greater responsibilities if the opportunity presented itself?',
        questionType: 'single',
        isRequired: true,
        options: ['Yes', 'No'],
        order: 6,
      },
    ],
  },
  'customer-registration': {
    id: 2,
    title: 'New Customer Registration Form',
    description:
      'A comprehensive form for collecting customer details and preferences.',
    status: 'draft',
    isAnonymous: false,
    pointsAwarded: 0,
    questions: [
      {
        id: 'q1',
        questionText: 'Full Name',
        questionType: 'text',
        isRequired: true,
        order: 0,
      },
      {
        id: 'q2',
        questionText: 'Email Address',
        questionType: 'text',
        isRequired: true,
        order: 1,
      },
      {
        id: 'q3',
        questionText: 'Phone Number',
        questionType: 'text',
        isRequired: true,
        order: 2,
      },
      {
        id: 'q4',
        questionText: 'Address',
        questionType: 'text',
        isRequired: true,
        order: 3,
      },
      {
        id: 'q5',
        questionText: 'How did you hear about us?',
        questionType: 'single',
        isRequired: false,
        options: [
          'Social Media',
          'Friend/Family',
          'Search Engine',
          'Advertisement',
          'Other',
        ],
        order: 4,
      },
    ],
  },
  'feedback-form': {
    id: 3,
    title: 'Feedback Form',
    description:
      'Collect valuable feedback from customers or employees with this customizable form.',
    status: 'draft',
    isAnonymous: true,
    pointsAwarded: 25,
    questions: [
      {
        id: 'q1',
        questionText: 'Feedback Type',
        questionType: 'single',
        isRequired: true,
        options: ['Comments', 'Suggestions', 'Questions'],
        order: 0,
      },
      {
        id: 'q2',
        questionText: 'Describe Your Feedback',
        questionType: 'text',
        isRequired: true,
        order: 1,
      },
      {
        id: 'q3',
        questionText: 'How would you rate your overall experience?',
        questionType: 'rating',
        isRequired: true,
        order: 2,
      },
      {
        id: 'q4',
        questionText: 'Which aspects need improvement? (Select all that apply)',
        questionType: 'multiple',
        isRequired: false,
        options: [
          'Customer Service',
          'Product Quality',
          'Website Usability',
          'Communication',
          'Pricing',
          'Delivery Time',
        ],
        order: 3,
      },
    ],
  },
};

export default function AdminSurveyTemplatePreview() {
  const { templateId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [templateData, setTemplateData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading template data from an API
    setLoading(true);
    setTimeout(() => {
      if (templateId && TEMPLATE_DATA[templateId]) {
        setTemplateData(TEMPLATE_DATA[templateId]);
      } else {
        toast({
          title: 'Template not found',
          description: 'The requested template could not be found.',
          variant: 'destructive',
        });
        setLocation('/admin/surveys/templates');
      }
      setLoading(false);
    }, 500);
  }, [templateId, toast, setLocation]);

  const handleCreateFromTemplate = () => {
    toast({
      title: 'Creating survey',
      description: 'Creating a new survey from this template...',
    });

    // Redirect to the survey editor with the template ID
    setLocation(`/admin/surveys/editor/${templateId}`);
  };

  const handleGoBack = () => {
    setLocation('/admin/surveys/templates');
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

  if (!templateData) {
    return (
      <MainLayout>
        <div className="container mx-auto py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Template Not Found
            </h1>
            <p className="text-gray-600 mb-8">
              The requested survey template could not be found.
            </p>
            <Button onClick={handleGoBack}>Back to Templates</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="mr-2"
              onClick={handleGoBack}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Templates
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              Template Preview: {templateData.title}
            </h1>
          </div>
        </div>

        {surveyCompleted ? (
          <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg border text-center">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Preview Completed</h2>
              <p className="text-gray-600 mb-8 max-w-md">
                You've completed the preview of this template. Would you like to
                use it to create a new survey?
              </p>
              <div className="flex space-x-4">
                <Button variant="outline" onClick={handleGoBack}>
                  Back to Templates
                </Button>
                <Button onClick={handleCreateFromTemplate}>
                  Use This Template
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 max-w-3xl mx-auto">
              <div className="flex items-start">
                <div className="shrink-0 bg-amber-100 rounded-full p-1">
                  <CheckCircle2 className="h-5 w-5 text-amber-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Preview Mode
                  </h3>
                  <div className="mt-1 text-sm text-amber-700">
                    This is a preview of how the survey will look. No responses
                    will be saved.
                  </div>
                </div>
              </div>
            </div>

            <SurveyTaker
              survey={templateData}
              questions={templateData.questions}
              preview={true}
              onComplete={() => setSurveyCompleted(true)}
            />
          </>
        )}
      </div>
    </MainLayout>
  );
}
