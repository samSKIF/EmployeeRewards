import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Users, Settings, Filter, MoreHorizontal, Edit, Trash, Eye, UserPlus, Calendar, MapPin, Briefcase, Mail, Phone, Loader2, Shield, Cog } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminEmployeesGroupsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("employees");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  // Fetch groups based on admin scope
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/admin/groups'],
    enabled: !!user
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: any) => {
      return apiRequest('/api/admin/groups', groupData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/groups'] });
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Group created successfully",
      });
    }
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return apiRequest(`/api/admin/groups/${id}`, data, 'PUT');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/groups'] });
      setShowGroupDialog(false);
      toast({
        title: "Success",
        description: "Group updated successfully",
      });
    }
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/groups/${id}`, {}, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/groups'] });
      toast({
        title: "Success",
        description: "Group deleted successfully",
      });
    }
  });

  const filteredGroups = groups?.filter((group: any) => {
    return true; // Add filtering logic as needed
  }) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employees & Groups</h1>
              <p className="text-gray-600 mt-2">Manage your organization's employees and groups</p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="employees">Employee Directory</TabsTrigger>
            <TabsTrigger value="groups">Groups Management</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employee Directory</CardTitle>
                <CardDescription>View and manage employee information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Employee directory coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Groups Management
                </CardTitle>
                <CardDescription>
                  Create and manage groups with advanced access controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredGroups.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
                        <p className="text-gray-500 mb-4">Get started by creating your first group</p>
                        <Button onClick={() => setShowCreateDialog(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Group
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {filteredGroups.map((group: any) => (
                          <Card key={group.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-semibold">{group.name}</h3>
                                    <Badge variant={group.isActive ? "default" : "secondary"}>
                                      {group.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                    {group.isAutoCreated && (
                                      <Badge variant="outline">Auto-created</Badge>
                                    )}
                                  </div>
                                  <p className="text-gray-600 mb-3">{group.description}</p>
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Users className="w-4 h-4" />
                                      {group.memberCount || 0} members
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Settings className="w-4 h-4" />
                                      {group.groupType}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Shield className="w-4 h-4" />
                                      {group.accessLevel}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedGroup(group);
                                      setShowGroupDialog(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteGroupMutation.mutate(group.id)}
                                  >
                                    <Trash className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a new group for your organization
            </DialogDescription>
          </DialogHeader>
          <CreateGroupForm 
            onSubmit={(data) => createGroupMutation.mutate(data)} 
            isLoading={createGroupMutation.isPending} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update group settings and configuration
            </DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <GroupEditForm 
              group={selectedGroup}
              onSubmit={(data) => updateGroupMutation.mutate({ id: selectedGroup.id, data })} 
              isLoading={updateGroupMutation.isPending} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Enhanced Create Group Form with HR Assistance
function CreateGroupForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    groupType: 'interest',
    accessLevel: 'open',
    allowedDepartments: [] as string[],
    allowedSites: [] as string[],
    isPrivate: false,
    requiresApproval: false,
    maxMembers: ''
  });

  // Fetch departments and locations for HR assistance
  const { data: departments } = useQuery({
    queryKey: ['/api/users/departments'],
  });

  const { data: locations } = useQuery({
    queryKey: ['/api/users/locations'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      maxMembers: formData.maxMembers ? parseInt(formData.maxMembers) : null
    };
    onSubmit(submitData);
  };

  const groupTypeTemplates = {
    department: {
      name: 'Department Group',
      description: 'A group for team collaboration and updates',
      accessLevel: 'department_only'
    },
    site: {
      name: 'Site Group', 
      description: 'Connect with colleagues at your location',
      accessLevel: 'site_only'
    },
    project: {
      name: 'Project Team',
      description: 'Collaborate on specific projects and initiatives',
      accessLevel: 'approval_required'
    },
    company: {
      name: 'Company-wide Group',
      description: 'Open to all employees across the organization',
      accessLevel: 'open'
    }
  };

  const handleTemplateSelect = (template: keyof typeof groupTypeTemplates) => {
    const templateData = groupTypeTemplates[template];
    setFormData(prev => ({
      ...prev,
      groupType: template,
      name: templateData.name,
      description: templateData.description,
      accessLevel: templateData.accessLevel
    }));
  };

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-6 p-1">
        {/* HR Assistance - Group Templates */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <Label className="font-semibold text-gray-900">Quick Setup Templates</Label>
              <p className="text-xs text-gray-600">Choose a template to get started quickly</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(groupTypeTemplates).map(([key, template]) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTemplateSelect(key as keyof typeof groupTypeTemplates)}
                className="h-auto p-3 text-left border hover:border-blue-300 hover:bg-blue-50"
              >
                <div>
                  <div className="font-medium text-xs">{template.name}</div>
                  <div className="text-xs text-gray-500">{template.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter group name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the group's purpose"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="groupType">Group Type</Label>
            <Select 
              value={formData.groupType} 
              onValueChange={(value) => setFormData({ ...formData, groupType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select group type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interest">Interest Group</SelectItem>
                <SelectItem value="department">Department Group</SelectItem>
                <SelectItem value="site">Site/Location Group</SelectItem>
                <SelectItem value="project">Project Team</SelectItem>
                <SelectItem value="company">Company-wide</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Access Control */}
        <div className="space-y-4">
          <Label className="font-semibold">Access Control</Label>
          
          <div>
            <Label htmlFor="accessLevel">Who can join?</Label>
            <Select 
              value={formData.accessLevel} 
              onValueChange={(value) => setFormData({ ...formData, accessLevel: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Anyone in the company</SelectItem>
                <SelectItem value="department_only">Department members only</SelectItem>
                <SelectItem value="site_only">Site/Location members only</SelectItem>
                <SelectItem value="approval_required">Requires approval to join</SelectItem>
                <SelectItem value="invite_only">Invite only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.accessLevel === 'department_only' && departments && (
            <div>
              <Label>Allowed Departments</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-24 overflow-y-auto border rounded p-2">
                {departments.map((dept: string) => (
                  <div key={dept} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dept-${dept}`}
                      checked={formData.allowedDepartments.includes(dept)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            allowedDepartments: [...prev.allowedDepartments, dept]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            allowedDepartments: prev.allowedDepartments.filter(d => d !== dept)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={`dept-${dept}`} className="text-sm">{dept}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formData.accessLevel === 'site_only' && locations && (
            <div>
              <Label>Allowed Sites/Locations</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 border rounded p-2">
                {locations.map((location: string) => (
                  <div key={location} className="flex items-center space-x-2">
                    <Checkbox
                      id={`site-${location}`}
                      checked={formData.allowedSites.includes(location)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            allowedSites: [...prev.allowedSites, location]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            allowedSites: prev.allowedSites.filter(s => s !== location)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={`site-${location}`} className="text-sm">{location}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <Label className="font-semibold">Advanced Settings</Label>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="private"
                checked={formData.isPrivate}
                onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: !!checked })}
              />
              <Label htmlFor="private">Private group (hidden from discovery)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="approval"
                checked={formData.requiresApproval}
                onCheckedChange={(checked) => setFormData({ ...formData, requiresApproval: !!checked })}
              />
              <Label htmlFor="approval">Require admin approval for new members</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="maxMembers">Maximum Members (optional)</Label>
            <Input
              id="maxMembers"
              type="number"
              value={formData.maxMembers}
              onChange={(e) => setFormData({ ...formData, maxMembers: e.target.value })}
              placeholder="Leave empty for unlimited"
              min="1"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Group
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}

// Group Edit Form Component
function GroupEditForm({ group, onSubmit, isLoading }: { group: any; onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    name: group.name || '',
    description: group.description || '',
    groupType: group.groupType || 'interest',
    accessLevel: group.accessLevel || 'open',
    isPrivate: group.isPrivate || false,
    requiresApproval: group.requiresApproval || false,
    maxMembers: group.maxMembers ? group.maxMembers.toString() : ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      maxMembers: formData.maxMembers ? parseInt(formData.maxMembers) : null
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Group Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter group name"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the group's purpose"
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="private"
          checked={formData.isPrivate}
          onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: !!checked })}
        />
        <Label htmlFor="private">Private group</Label>
      </div>
      
      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Group
        </Button>
      </DialogFooter>
    </form>
  );
}