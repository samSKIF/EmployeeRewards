import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PointsForm from "@/components/admin/PointsForm";
import TransactionTable from "@/components/admin/TransactionTable";
import ScheduledRewards from "@/components/admin/ScheduledRewards";
import UserTable from "@/components/admin/UserTable";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("transactions");
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="mt-3 md:mt-0">
          <span className="text-sm text-gray-500">Logged in as: {user?.email}</span>
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
