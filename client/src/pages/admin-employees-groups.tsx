
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Users } from 'lucide-react';
import AdminEmployeesPage from './admin-employees';
import { GroupsManagement } from '@/components/admin/groups-management/GroupsManagement';
import { TrendingSpaces } from '@/components/admin/groups-management/TrendingSpaces';

export default function AdminEmployeesGroups() {
  const [activeTab, setActiveTab] = useState('employees');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Employees and Spaces
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your organization's employees and workplace spaces
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger
            value="employees"
            className="flex items-center space-x-2"
          >
            <User className="h-4 w-4" />
            <span>Employee Directory</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Spaces</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6">
          <AdminEmployeesPage />
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <GroupsManagement />
          <TrendingSpaces />
        </TabsContent>
      </Tabs>
    </div>
  );
}
