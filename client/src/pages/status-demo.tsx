import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AdminStatusTypes from './admin-status-types';
import UserProfile from '@/components/common/UserProfile';
import { Link } from 'wouter';

const StatusDemo = () => {
  const { t } = useTranslation();

  // Fetch users to display with status icons
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  // Fetch current user
  const { data: currentUser, isLoading: currentUserLoading } = useQuery({
    queryKey: ['/api/users/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users/me');
      if (!response.ok) {
        throw new Error('Failed to fetch current user');
      }
      return response.json();
    },
  });

  const isLoading = usersLoading || currentUserLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">
        {t('statusDemo.title', 'Team Status System')}
      </h1>

      <Tabs defaultValue="profiles">
        <TabsList className="mb-4">
          <TabsTrigger value="profiles">
            {t('statusDemo.profilesTab', 'User Profiles')}
          </TabsTrigger>
          <TabsTrigger value="admin">
            {t('statusDemo.adminTab', 'Admin Settings')}
          </TabsTrigger>
        </TabsList>

        {/* User Profiles Tab */}
        <TabsContent value="profiles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {t('statusDemo.currentUser', 'Your Profile')}
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/status-types">
                    <Settings className="h-4 w-4 mr-2" />
                    {t('statusDemo.manageStatuses', 'Manage Status Types')}
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentUser && (
                <div className="max-w-md mx-auto">
                  <UserProfile user={currentUser} editable={true} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t('statusDemo.teamMembers', 'Team Members')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users &&
                  users
                    .slice(0, 6)
                    .map((user: any) => (
                      <UserProfile key={user.id} user={user} />
                    ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Settings Tab */}
        <TabsContent value="admin">
          <AdminStatusTypes />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatusDemo;
