import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layout/MainLayout";

type SurveyTemplate = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  questionCount: number;
};

const TEMPLATE_CATEGORIES = [
  { id: "all", name: "All Templates" },
  { id: "employee", name: "Employee Feedback" },
  { id: "customer", name: "Customer Experience" },
  { id: "registration", name: "Registration Forms" },
];

// Pre-defined templates
const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    id: "customer-registration",
    title: "New Customer Registration Form",
    description: "A comprehensive form for collecting customer details and preferences.",
    imageUrl: "/assets/template-customer-registration.png",
    questionCount: 12,
  },
  {
    id: "product-order",
    title: "Product Order Form",
    description: "Allow customers to select products and complete orders with this intuitive form.",
    imageUrl: "/assets/template-product-order.png",
    questionCount: 8,
  },
  {
    id: "course-registration",
    title: "Course Registration Form",
    description: "Perfect for educational institutions to register students for courses.",
    imageUrl: "/assets/template-course-registration.png",
    questionCount: 15,
  },
  {
    id: "appointment-request",
    title: "Appointment Request Form",
    description: "Let users schedule appointments with a simple, user-friendly form.",
    imageUrl: "/assets/template-appointment-request.png",
    questionCount: 7,
  },
  {
    id: "feedback-form",
    title: "Feedback Form",
    description: "Collect valuable feedback from customers or employees with this customizable form.",
    imageUrl: "/assets/template-feedback.png",
    questionCount: 10,
  },
  {
    id: "information-request",
    title: "Information Request Form",
    description: "A simple form for gathering information requests from users.",
    imageUrl: "/assets/template-information-request.png",
    questionCount: 6,
  },
  {
    id: "employee-satisfaction",
    title: "Employee Satisfaction Survey",
    description: "Measure employee engagement and satisfaction with this comprehensive survey.",
    imageUrl: "/assets/template-employee-satisfaction.png",
    questionCount: 20,
  },
  {
    id: "enps-survey",
    title: "Director eNPS Survey",
    description: "Employee Net Promoter Score survey for directors and leadership.",
    imageUrl: "/assets/template-enps.png",
    questionCount: 8,
  }
];

export default function AdminSurveyTemplates() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Filter templates based on selected category
  const filteredTemplates = selectedCategory === "all" 
    ? SURVEY_TEMPLATES 
    : SURVEY_TEMPLATES.filter(template => {
        // You can enhance this with more sophisticated filtering
        if (selectedCategory === "employee") {
          return template.id.includes("employee") || template.id.includes("enps");
        } else if (selectedCategory === "customer") {
          return template.id.includes("customer") || template.id.includes("feedback") || template.id.includes("product");
        } else if (selectedCategory === "registration") {
          return template.id.includes("registration") || template.id.includes("appointment");
        }
        return false;
    });

  const handleUseTemplate = (templateId: string) => {
    // In a real implementation, this would clone the template and redirect to edit
    toast({
      title: "Template selected",
      description: "Creating new survey from template..."
    });
    
    // Simulate loading
    setTimeout(() => {
      setLocation(`/admin/surveys/new?template=${templateId}`);
    }, 500);
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Survey Templates</h1>
          <Button variant="outline" onClick={() => setLocation("/admin/surveys")}>
            Back to Surveys
          </Button>
        </div>
        
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_CATEGORIES.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className="mb-2"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="overflow-hidden flex flex-col">
              <div className="aspect-[4/3] relative bg-gray-100 flex items-center justify-center">
                {template.imageUrl ? (
                  <div className="w-full h-full p-4 flex items-center justify-center">
                    <div className="bg-white rounded-md shadow-sm w-full max-w-[300px] h-4/5 overflow-hidden border">
                      <div className="p-3 border-b h-[40px] flex items-center justify-center">
                        <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                      </div>
                      <div className="p-4">
                        <div className="space-y-3">
                          <div className="w-full h-4 bg-gray-200 rounded"></div>
                          <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                          <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
                        </div>
                        <div className="mt-5 space-y-2">
                          <div className="w-full h-8 bg-gray-100 border rounded"></div>
                          <div className="w-full h-8 bg-gray-100 border rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400">No preview available</div>
                )}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{template.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">
                  {template.description}
                </p>
                <p className="text-xs text-gray-500">
                  {template.questionCount} questions
                </p>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button 
                  className="w-full" 
                  onClick={() => handleUseTemplate(template.id)}
                >
                  Use Template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}