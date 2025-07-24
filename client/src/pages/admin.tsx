import { useState } from 'react';
import { Link } from 'wouter';
import MainLayout from '@/components/layout/MainLayout';
import PointsForm from '@/components/admin/PointsForm';
import TransactionTable from '@/components/admin/TransactionTable';
import ScheduledRewards from '@/components/admin/ScheduledRewards';
import UserTable from '@/components/admin/UserTable';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Users,
  ClipboardList,
  ShoppingBag,
  RefreshCcw,
  BarChart3,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('transactions');
  const { user } = useAuth();

  // Mutation to refresh product catalog
  const refreshCatalogMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/products/refresh', {});
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Catalog Refreshed',
        description: `Successfully refreshed product catalog with ${data.count} products.`,
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to refresh catalog: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="mt-3 md:mt-0 flex items-center gap-4">
          <Link href="/admin/employees">
            <Button variant="outline" className="flex items-center gap-2">
              <Users size={16} />
              <span>Employee Management</span>
            </Button>
          </Link>
          <Link href="/admin/recognition-analytics">
            <Button variant="outline" className="flex items-center gap-2">
              <BarChart3 size={16} />
              <span>Recognition Analytics</span>
            </Button>
          </Link>
          <Link href="/admin/surveys">
            <Button variant="outline" className="flex items-center gap-2">
              <ClipboardList size={16} />
              <span>Surveys</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => refreshCatalogMutation.mutate()}
            disabled={refreshCatalogMutation.isPending}
          >
            <ShoppingBag size={16} />
            <span>
              {refreshCatalogMutation.isPending
                ? 'Refreshing...'
                : 'Refresh Shop Catalog'}
            </span>
            {refreshCatalogMutation.isPending && (
              <RefreshCcw size={16} className="animate-spin ml-1" />
            )}
          </Button>
          <span className="text-sm text-gray-500">
            Logged in as: {user?.email}
          </span>
        </div>
      </div>

      {/* Send Points Form */}
      <PointsForm />

      {/* Admin Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <Tabs
          defaultValue="transactions"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="border-b border-gray-200">
            <TabsList className="h-auto">
              <TabsTrigger
                value="transactions"
                className="data-[state=active]:border-primary data-[state=active]:border-b-2 py-4 px-6 rounded-none transition-none"
              >
                Recent Transactions
              </TabsTrigger>
              <TabsTrigger
                value="scheduled"
                className="data-[state=active]:border-primary data-[state=active]:border-b-2 py-4 px-6 rounded-none transition-none"
              >
                Scheduled Rewards
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:border-primary data-[state=active]:border-b-2 py-4 px-6 rounded-none transition-none"
              >
                User Management
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="transactions">
            <TransactionTable />
          </TabsContent>

          <TabsContent value="scheduled">
            <ScheduledRewards />
          </TabsContent>

          <TabsContent value="users">
            <UserTable />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Admin;
