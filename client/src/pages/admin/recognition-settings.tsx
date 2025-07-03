import { useState, useEffect } from "react";
import SocialLayout from "@/layouts/SocialLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Award, UserCheck, DollarSign, Settings } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RecognitionSetting, User } from "@shared/schema";

export default function RecognitionSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current user data
  const { data: userData } = useQuery<User>({
    queryKey: ["/api/users/me"],
  });
  
  // Create states for the form
  const [costPerPoint, setCostPerPoint] = useState<number>(0.10);
  
  // Peer-to-peer recognition settings
  const [peerEnabled, setPeerEnabled] = useState<boolean>(true);
  const [peerRequiresApproval, setPeerRequiresApproval] = useState<boolean>(true);
  const [peerPointsPerRecognition, setPeerPointsPerRecognition] = useState<number>(10);
  const [peerMaxRecognitionsPerMonth, setPeerMaxRecognitionsPerMonth] = useState<number>(5);
  
  // Manager recognition settings
  const [managerEnabled, setManagerEnabled] = useState<boolean>(true);
  const [managerRequiresApproval, setManagerRequiresApproval] = useState<boolean>(false);
  const [managerApprovalEmail, setManagerApprovalEmail] = useState<string>("");
  
  // Fetch existing settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery<RecognitionSetting>({
    queryKey: ["/api/recognition/settings"],
    onSuccess: (data) => {
      // Update form values with fetched settings
      if (data) {
        setCostPerPoint(Number(data.costPerPoint));
        setPeerEnabled(data.peerEnabled);
        setPeerRequiresApproval(data.peerRequiresApproval);
        setPeerPointsPerRecognition(data.peerPointsPerRecognition);
        setPeerMaxRecognitionsPerMonth(data.peerMaxRecognitionsPerMonth);
        setManagerEnabled(data.managerEnabled);
        setManagerRequiresApproval(data.managerRequiresApproval);
        setManagerApprovalEmail(data.managerApprovalEmail || "");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to load recognition settings: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Manager budget states (for table display only)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Fetch manager budgets
  const { data: managers, isLoading: isLoadingManagers } = useQuery({
    queryKey: ["/api/recognition/manager-budgets", { month: selectedMonth, year: selectedYear }],
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to load manager budgets: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await apiRequest("PUT", "/api/recognition/settings", settings);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch the settings query to get fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/recognition/settings"] });
      toast({
        title: "Success",
        description: "Recognition settings saved successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save settings: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Add budget mutation
  const addBudgetMutation = useMutation({
    mutationFn: async (budgetData: any) => {
      const response = await apiRequest("POST", "/api/recognition/manager-budgets", budgetData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Manager budget updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recognition/manager-budgets"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update budget: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentUser = userData?.id || 1; // Default to 1 if user data not loaded yet
    
    const settingsData = {
      organizationId: 1, // Default to org 1 since we're already using that in most places
      costPerPoint: parseFloat(costPerPoint.toString()),
      peerEnabled,
      peerRequiresApproval,
      peerPointsPerRecognition: parseInt(peerPointsPerRecognition.toString()),
      peerMaxRecognitionsPerMonth: parseInt(peerMaxRecognitionsPerMonth.toString()),
      managerEnabled,
      managerRequiresApproval,
      managerApprovalEmail: managerApprovalEmail || null,
      createdBy: currentUser,
      updatedBy: currentUser
    };
    
    console.log("Submitting settings data:", settingsData);
    saveSettingsMutation.mutate(settingsData);
  };
  
  // Budget form submission handler
  const handleAddBudget = (managerId: number, points: number) => {
    const currentUser = userData?.id || 1; // Default to 1 if user data not loaded yet
    
    addBudgetMutation.mutate({
      organizationId: 1, // Default to org 1 since we're already using that in most places
      managerId,
      totalPoints: parseInt(points.toString()),
      remainingPoints: parseInt(points.toString()), // Initially, remaining points equals total points
      month: selectedMonth,
      year: selectedYear,
      createdBy: currentUser
    });
    
    console.log("Submitting budget data:", {
      organizationId: 1,
      managerId,
      totalPoints: points,
      remainingPoints: points,
      month: selectedMonth,
      year: selectedYear,
      createdBy: currentUser
    });
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Recognition Settings</h1>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings size={16} /> General
          </TabsTrigger>
          <TabsTrigger value="peer" className="flex items-center gap-2">
            <Users size={16} /> Peer Recognition
          </TabsTrigger>
          <TabsTrigger value="manager" className="flex items-center gap-2">
            <UserCheck size={16} /> Manager Budgets
          </TabsTrigger>
        </TabsList>
        
        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Recognition Settings</CardTitle>
              <CardDescription>
                Configure your organization's recognition settings, including cost per point (CPP).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="costPerPoint" className="flex items-center gap-2">
                      <DollarSign size={16} /> Cost Per Point (CPP)
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                      <Input
                        id="costPerPoint"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        placeholder="0.10"
                        className="pl-8"
                        value={costPerPoint}
                        onChange={(e) => setCostPerPoint(parseFloat(e.target.value))}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      The monetary value of each recognition point in your organization's currency.
                    </p>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={saveSettingsMutation.isPending}
                  className="mt-4"
                >
                  {saveSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save General Settings"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Peer Recognition Tab */}
        <TabsContent value="peer">
          <Card>
            <CardHeader>
              <CardTitle>Peer-to-Peer Recognition</CardTitle>
              <CardDescription>
                Configure settings for peer-to-peer recognition, including approval workflows and limits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="peerEnabled"
                      checked={peerEnabled}
                      onCheckedChange={setPeerEnabled}
                    />
                    <Label htmlFor="peerEnabled">Enable Peer-to-Peer Recognition</Label>
                  </div>
                  
                  {peerEnabled && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="peerRequiresApproval"
                          checked={peerRequiresApproval}
                          onCheckedChange={setPeerRequiresApproval}
                        />
                        <Label htmlFor="peerRequiresApproval">Require Approval for Peer Recognition</Label>
                      </div>
                      
                      <div>
                        <Label htmlFor="peerPointsPerRecognition">Points Per Recognition</Label>
                        <Input
                          id="peerPointsPerRecognition"
                          type="number"
                          min="1"
                          max="1000"
                          value={peerPointsPerRecognition}
                          onChange={(e) => setPeerPointsPerRecognition(parseInt(e.target.value))}
                          className="mt-1"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          The number of points awarded for each peer recognition.
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="peerMaxRecognitionsPerMonth">Maximum Recognitions Per Month</Label>
                        <Input
                          id="peerMaxRecognitionsPerMonth"
                          type="number"
                          min="1"
                          max="100"
                          value={peerMaxRecognitionsPerMonth}
                          onChange={(e) => setPeerMaxRecognitionsPerMonth(parseInt(e.target.value))}
                          className="mt-1"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          The maximum number of recognitions an employee can give per month.
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  disabled={saveSettingsMutation.isPending}
                  className="mt-4"
                >
                  {saveSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Peer Settings"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Manager Budgets Tab */}
        <TabsContent value="manager">
          <Card>
            <CardHeader>
              <CardTitle>Manager Recognition Settings</CardTitle>
              <CardDescription>
                Configure settings for manager recognitions, including approval workflow and budget allocations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="managerEnabled"
                      checked={managerEnabled}
                      onCheckedChange={setManagerEnabled}
                    />
                    <Label htmlFor="managerEnabled">Enable Manager Recognition</Label>
                  </div>
                  
                  {managerEnabled && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="managerRequiresApproval"
                          checked={managerRequiresApproval}
                          onCheckedChange={setManagerRequiresApproval}
                        />
                        <Label htmlFor="managerRequiresApproval">Require Approval for Manager Recognition</Label>
                      </div>
                      
                      {managerRequiresApproval && (
                        <div>
                          <Label htmlFor="managerApprovalEmail">Approval Email</Label>
                          <Input
                            id="managerApprovalEmail"
                            type="email"
                            placeholder="hr@example.com"
                            value={managerApprovalEmail}
                            onChange={(e) => setManagerApprovalEmail(e.target.value)}
                            className="mt-1"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Email address that will receive approval requests for manager recognitions.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  disabled={saveSettingsMutation.isPending}
                  className="mt-4"
                >
                  {saveSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Manager Settings"
                  )}
                </Button>
              </form>
              
              {/* Manager Budget Allocation */}
              {managerEnabled && (
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-medium">Manager Budget Allocation</h3>
                  <div className="flex items-end gap-4 mb-4">
                    <div>
                      <Label htmlFor="monthSelect">Month</Label>
                      <Select
                        value={selectedMonth.toString()}
                        onValueChange={(value) => setSelectedMonth(parseInt(value))}
                      >
                        <SelectTrigger className="w-[180px]" id="monthSelect">
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">January</SelectItem>
                          <SelectItem value="2">February</SelectItem>
                          <SelectItem value="3">March</SelectItem>
                          <SelectItem value="4">April</SelectItem>
                          <SelectItem value="5">May</SelectItem>
                          <SelectItem value="6">June</SelectItem>
                          <SelectItem value="7">July</SelectItem>
                          <SelectItem value="8">August</SelectItem>
                          <SelectItem value="9">September</SelectItem>
                          <SelectItem value="10">October</SelectItem>
                          <SelectItem value="11">November</SelectItem>
                          <SelectItem value="12">December</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="yearSelect">Year</Label>
                      <Select
                        value={selectedYear.toString()}
                        onValueChange={(value) => setSelectedYear(parseInt(value))}
                      >
                        <SelectTrigger className="w-[120px]" id="yearSelect">
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => {
                            const year = new Date().getFullYear() - 2 + i;
                            return (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {isLoadingManagers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Manager
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Department
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Points
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Remaining
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {managers && managers.length > 0 ? (
                            managers.map((manager: any) => (
                              <tr key={manager.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {manager.manager.name} {manager.manager.surname}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {manager.manager.department || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {manager.totalPoints}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {manager.remainingPoints}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const points = window.prompt("Enter new budget amount:", manager.totalPoints.toString());
                                      if (points && !isNaN(parseInt(points))) {
                                        handleAddBudget(manager.manager.id, parseInt(points));
                                      }
                                    }}
                                  >
                                    Update Budget
                                  </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                No manager budgets found for the selected period.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}