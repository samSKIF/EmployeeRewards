import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PlusCircle,
  Trash2,
  Edit,
  Eye,
  BarChart4,
  Users,
  Calendar,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { Survey } from '@shared/schema';

// Type for survey with stats
interface SurveyWithStats extends Survey {
  responseRate: number;
  totalResponses: number;
  targetAudience?: string;
  publishedAt?: string;
  pointsAwarded?: number;
}

export default function AdminSurveysPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch surveys based on the active tab
  const { data: surveys = [], isLoading } = useQuery<SurveyWithStats[]>({
    queryKey: ['/api/surveys', activeTab],
    queryFn: async () => {
      const status = activeTab === 'all' ? '' : `?status=${activeTab}`;
      try {
        const res = await apiRequest('GET', `/api/surveys${status}`);
        return await res.json();
      } catch (error) {
        console.error('Error fetching surveys:', error);
        return [];
      }
    },
  });

  // Delete survey mutation
  const deleteSurveyMutation = useMutation({
    mutationFn: async (surveyId: number) => {
      await apiRequest('DELETE', `/api/surveys/${surveyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
      toast({
        title: 'Survey deleted',
        description: 'The survey has been successfully deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete survey',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getSurveyStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-200 text-gray-800';
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const handleDeleteSurvey = (surveyId: number) => {
    if (
      confirm(
        'Are you sure you want to delete this survey? This action cannot be undone.'
      )
    ) {
      deleteSurveyMutation.mutate(surveyId);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('surveys.title')}
        </h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('surveys.createSurvey')}
        </Button>
      </div>

      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="all">{t('surveys.allSurveys')}</TabsTrigger>
          <TabsTrigger value="draft">{t('surveys.drafts')}</TabsTrigger>
          <TabsTrigger value="published">{t('surveys.published')}</TabsTrigger>
          <TabsTrigger value="closed">{t('surveys.closed')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                {t('surveys.noSurveysFound')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {t('surveys.getStartedText')}
              </p>
              <div className="mt-6">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t('surveys.createSurvey')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {surveys.map((survey) => (
                <Card key={survey.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{survey.title}</CardTitle>
                      <Badge className={getSurveyStatusColor(survey.status)}>
                        {survey.status === 'draft'
                          ? t('surveys.drafts')
                          : survey.status === 'published'
                            ? t('surveys.published')
                            : survey.status === 'closed'
                              ? t('surveys.closed')
                              : survey.status.charAt(0).toUpperCase() +
                                survey.status.slice(1)}
                      </Badge>
                    </div>
                    <CardDescription>
                      {t('surveys.created')}{' '}
                      {survey.createdAt
                        ? formatDistanceToNow(new Date(survey.createdAt), {
                            addSuffix: true,
                          })
                        : t('surveys.recently')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {survey.description || t('surveys.noDescriptionProvided')}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-1 text-blue-500" />
                        <span>
                          {t('surveys.target')}:{' '}
                          {survey.targetAudience || t('surveys.allEmployees')}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <BarChart4 className="h-3 w-3 mr-1 text-green-500" />
                        <span>
                          {survey.responseRate || 0}%{' '}
                          {t('surveys.responseRate')}
                        </span>
                      </div>
                      {survey.publishedAt && (
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-purple-500" />
                          <span>
                            {t('surveys.published')}:{' '}
                            {new Date(survey.publishedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {(survey.pointsAwarded ?? 0) > 0 && (
                        <div className="flex items-center">
                          <span className="text-amber-500 mr-1">★</span>
                          <span>
                            {survey.pointsAwarded} {t('app.points')}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 border-t flex justify-between pt-3 pb-3">
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="mr-2"
                      >
                        <a href={`/admin/surveys/${survey.id}`}>
                          <Eye className="h-3 w-3 mr-1" />
                          {t('surveys.view')}
                        </a>
                      </Button>
                      {survey.status === 'published' && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/admin/surveys/${survey.id}/results`}>
                            <BarChart4 className="h-3 w-3 mr-1" />
                            Results
                          </a>
                        </Button>
                      )}
                    </div>
                    <div>
                      {survey.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          onClick={() => handleDeleteSurvey(survey.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {t('surveys.delete')}
                        </Button>
                      )}
                      {survey.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="ml-2"
                        >
                          <a href={`/admin/surveys/${survey.id}/edit`}>
                            <Edit className="h-3 w-3 mr-1" />
                            {t('surveys.edit')}
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Survey Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('surveys.createNewSurvey')}</DialogTitle>
            <DialogDescription>
              {t('surveys.startBuildingText')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-center mb-6 text-sm text-gray-600">
              {t('surveys.startBuildingText')}
            </p>

            <div className="grid grid-cols-1 gap-4">
              <Button asChild className="w-full h-auto py-6 flex flex-col">
                <a href="/admin/surveys/new">
                  <PlusCircle className="h-8 w-8 mb-2" />
                  <span className="font-bold">
                    {t('surveys.createFromScratch')}
                  </span>
                  <span className="text-xs mt-1">
                    {t('surveys.startBuildingText')}
                  </span>
                </a>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full h-auto py-6 flex flex-col"
              >
                <a href="/admin/surveys/templates">
                  <FileText className="h-8 w-8 mb-2" />
                  <span className="font-bold">
                    {t('surveys.surveyTemplates')}
                  </span>
                  <span className="text-xs mt-1">
                    {t('surveys.templateSearchAdjust')}
                  </span>
                </a>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              {t('surveys.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
