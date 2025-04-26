import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/useAuth";
import MainLayout from "@/components/layout/MainLayout";
import { useToast } from "@/hooks/use-toast";

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
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow">
          <p className="text-lg">
            {isAdminLoading 
              ? "Loading surveys..." 
              : adminSurveys?.length 
                ? `You have ${adminSurveys.length} surveys available.` 
                : "No surveys found. Create a new survey to get started."}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}