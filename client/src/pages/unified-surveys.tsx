import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/useAuth";
import MainLayout from "@/components/layout/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function UnifiedSurveys() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState(user?.isAdmin ? "manage" : "respond");
  const [activeTab, setActiveTab] = useState(user?.isAdmin ? "active" : "pending");
  
  // Fetch notifications count (for regular users)
  const { data: notificationsData } = useQuery({
    queryKey: ['/api/surveys/notifications/count'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/surveys/notifications/count');
        return await res.json();
      } catch (error) {
        console.error("Error fetching notifications:", error);
        return { count: 0 };
      }
    },
    enabled: !user?.isAdmin
  });

  // Fetch admin surveys
  const { data: adminSurveys, isLoading: isAdminLoading } = useQuery({
    queryKey: ['/api/surveys'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/surveys');
        return await res.json();
      } catch (error) {
        console.error("Error fetching admin surveys:", error);
        return [];
      }
    },
    enabled: user?.isAdmin && activeView === "manage"
  });

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Surveys</h1>
            <p className="text-gray-500 mt-1">
              {user?.isAdmin
                ? "Create, manage, and analyze employee surveys"
                : "View and respond to assigned surveys"}
            </p>
          </div>
          
          {user?.isAdmin && (
            <div className="flex mt-4 md:mt-0 space-x-2">
              {activeView === "manage" && (
                <button 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                  onClick={() => alert("Create Survey feature will be restored in the next update")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Create Survey
                </button>
              )}
              <button
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${activeView === "manage" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"}`}
                onClick={() => setActiveView("manage")}
              >
                Manage Surveys
              </button>
              <button
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${activeView === "respond" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"}`}
                onClick={() => setActiveView("respond")}
              >
                My Surveys
              </button>
            </div>
          )}
        </div>
        
        {/* Administrator View */}
        {activeView === "manage" && user?.isAdmin && (
          <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <div className="bg-white p-8 rounded-lg shadow">
                <p className="text-lg">
                  {isAdminLoading 
                    ? "Loading surveys..." 
                    : adminSurveys?.length 
                      ? `You have ${adminSurveys.length} active surveys.` 
                      : "No active surveys found."}
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="draft" className="space-y-4">
              <div className="bg-white p-8 rounded-lg shadow">
                <p className="text-lg">
                  {isAdminLoading 
                    ? "Loading surveys..." 
                    : "No draft surveys found. Create a new survey to get started."}
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              <div className="bg-white p-8 rounded-lg shadow">
                <p className="text-lg">
                  {isAdminLoading 
                    ? "Loading surveys..." 
                    : "No completed surveys found."}
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="archived" className="space-y-4">
              <div className="bg-white p-8 rounded-lg shadow">
                <p className="text-lg">
                  {isAdminLoading 
                    ? "Loading surveys..." 
                    : "No archived surveys found."}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Employee View */}
        {(!user?.isAdmin || activeView === "respond") && (
          <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="pending" className="relative">
                Pending
                {notificationsData?.count > 0 && (
                  <span className="absolute top-0 right-1 -mt-1 -mr-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notificationsData?.count}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              <div className="bg-white p-8 rounded-lg shadow">
                <p className="text-lg">
                  {isAdminLoading 
                    ? "Loading surveys..." 
                    : "No pending surveys found."}
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              <div className="bg-white p-8 rounded-lg shadow">
                <p className="text-lg">
                  {isAdminLoading 
                    ? "Loading surveys..." 
                    : "No completed surveys found."}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}