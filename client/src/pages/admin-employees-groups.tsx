import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Users } from 'lucide-react';
import { AdminEmployeesPage } from '@/components/admin/employee-management';
import { GroupsManagement } from '@/components/admin/groups-management/GroupsManagement';
import { TrendingSpaces } from '@/components/admin/groups-management/TrendingSpaces';

export default function AdminEmployeesGroups() {
  const [activeTab, setActiveTab] = useState('employees');

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Employee Directory & Spaces Management
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Manage your team members and organize them into productive spaces and groups. 
          Create, edit, and oversee employee information and workspace collaboration areas.
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