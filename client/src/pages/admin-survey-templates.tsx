import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  ChevronLeft,
  Search,
  Filter,
  PlusCircle,
  FileText,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MainLayout from '@/components/layout/MainLayout';

// Templates data - in a real implementation, this would come from an API
const TEMPLATES = [
  {
    id: 'enps-survey',
    title: 'Director eNPS Survey',
    description:
      'This survey measures the employee Net Promoter Score among directors and leadership team members.',
    imageUrl:
      'https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1469&q=80',
    questionCount: 7,
    category: 'Engagement',
  },
  {
    id: 'customer-registration',
    title: 'New Customer Registration Form',
    description:
      'A comprehensive form for collecting customer details and preferences.',
    imageUrl:
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80',
    questionCount: 5,
    category: 'Forms',
  },
  {
    id: 'feedback-form',
    title: 'Feedback Form',
    description:
      'Collect valuable feedback from customers or employees with this customizable form.',
    imageUrl:
      'https://images.unsplash.com/photo-1560264280-88b68371db39?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    questionCount: 4,
    category: 'Feedback',
  },
  {
    id: 'employee-satisfaction',
    title: 'Employee Satisfaction Survey',
    description:
      'Gauge employee satisfaction and engagement across multiple dimensions.',
    imageUrl:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1476&q=80',
    questionCount: 12,
    category: 'Engagement',
  },
  {
    id: 'performance-review',
    title: 'Performance Review Template',
    description:
      'Comprehensive template for quarterly or annual performance reviews.',
    imageUrl:
      'https://images.unsplash.com/photo-1607703703674-df96af81dffa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    questionCount: 9,
    category: 'Performance',
  },
  {
    id: 'training-evaluation',
    title: 'Training Evaluation Survey',
    description:
      'Collect feedback on training programs to identify areas of improvement.',
    imageUrl:
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    questionCount: 8,
    category: 'Training',
  },
];

type SurveyTemplate = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  questionCount: number;
  category: string;
};

export default function AdminSurveyTemplates() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Filter templates based on search query and category
  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for the filter dropdown
  const categories = Array.from(
    new Set(TEMPLATES.map((template) => template.category))
  );

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
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Surveys
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              Survey Templates
            </h1>
          </div>

          <Button onClick={() => setLocation('/admin/surveys/new')}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Custom Survey
          </Button>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg border mb-8">
          <h2 className="text-lg font-medium mb-4">Browse Templates</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search templates..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2 text-gray-500" />
                    <SelectValue placeholder="Filter by category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No templates found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search or filter to find what you're looking
              for.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() =>
                  setLocation(`/admin/surveys/templates/${template.id}`)
                }
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: SurveyTemplate;
  onSelect: () => void;
}) {
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="h-48 overflow-hidden">
        <img
          src={template.imageUrl}
          alt={template.title}
          className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
        />
      </div>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{template.title}</CardTitle>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
            {template.category}
          </span>
        </div>
        <CardDescription className="line-clamp-2">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-sm text-gray-500">
          {template.questionCount} question
          {template.questionCount !== 1 ? 's' : ''}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button variant="outline" className="w-full" onClick={onSelect}>
          Preview Template
        </Button>
      </CardFooter>
    </Card>
  );
}
