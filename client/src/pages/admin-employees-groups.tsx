import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  Plus,
  AlertCircle, 
  User, 
  UserPlus, 
  FileText, 
  Trash, 
  PenSquare, 
  Upload, 
  Download,
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Settings,
  Shield,
  Globe,
  Lock,
  Eye,
  Edit,
  Archive,
  UserCheck,
  MessageCircle
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { CreateSpaceDialog } from '@/components/spaces/CreateSpaceDialog';

// Define employee form data type
interface EmployeeFormData {
  password: string;
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  jobTitle: string;
  department: string;
  location: string;
  managerEmail: string;
  sex: string;
  nationality: string;
  birthDate: string;
  hireDate: string;
  isAdmin: boolean;
  status: string;
  avatarUrl: string;
  adminScope: string;
  allowedSites: string[];
  allowedDepartments: string[];
}

// Define our user type
interface Employee {
  id: number;
  name: string;
  surname: string | null;
  email: string;
  phoneNumber: string | null;
  jobTitle: string | null;
  department: string | null;
  location: string | null;
  managerEmail: string | null;
  sex: string | null;
  nationality: string | null;
  birthDate: string | null;
  hireDate: string | null;
  isAdmin: boolean;
  status: string | null;
  avatarUrl: string | null;
  adminScope: string | null;
  allowedSites: string[] | null;
  allowedDepartments: string[] | null;
  username: string;
}

// Groups Management Component
function GroupsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch channels data from the API
  const { data: channels = [], isLoading: channelsLoading, refetch: refetchChannels } = useQuery({
    queryKey: ['/api/admin/channels'],
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (channelData: any) => {
      return apiRequest('POST', '/api/channels', channelData);
    },
    onSuccess: () => {
      refetchChannels();
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Channel created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create channel",
        variant: "destructive",
      });
    }
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/groups/${id}`, data);
      return response.json();
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
      const response = await fetch(`/api/admin/groups/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete group');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/groups'] });
      toast({
        title: "Success",
        description: "Group deleted successfully",
      });
    }
  });

  const filteredGroups = Array.isArray(channels) ? channels.filter((group: any) => {
    const matchesSearch = group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.description?.toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedCategory === 'all') return matchesSearch;
    return group.category === selectedCategory && matchesSearch;
  }) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Spaces Management</h2>
          <p className="text-gray-600">Manage workplace spaces within your administrative scope</p>
        </div>

        <Button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowCreateDialog(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Space
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search spaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Technology">Technology</SelectItem>
            <SelectItem value="Sports">Sports</SelectItem>
            <SelectItem value="Arts">Arts</SelectItem>
            <SelectItem value="Business">Business</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Groups Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Privacy</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channelsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No channels found
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group: any) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {group.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{group.name}</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs">
                            {group.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{group.category || "General"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{group.memberCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {group.isPrivate ? (
                          <>
                            <Lock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">Private</span>
                          </>
                        ) : (
                          <>
                            <Globe className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">Public</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {group.createdAt ? format(new Date(group.createdAt), 'MMM dd, yyyy') : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={group.isActive ? "default" : "secondary"}
                        className={group.isActive ? "bg-green-100 text-green-800" : ""}
                      >
                        {group.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedGroup(group);
                            setShowGroupDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedGroup(group);
                            setShowGroupDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteGroupMutation.mutate(group.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Space Dialog */}
      <CreateSpaceDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />

      {/* Channel Details Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Channel Details</DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <GroupDetailsForm 
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
    allowedRoles: [] as string[],
    isPrivate: false,
    requiresApproval: false,
    maxMembers: '',
    tags: [] as string[]
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* HR Assistance - Group Templates */}
      <div>
        <Label className="text-base font-semibold">Quick Setup Templates</Label>
        <p className="text-sm text-gray-600 mb-3">Choose a template to get started quickly</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(groupTypeTemplates).map(([key, template]) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleTemplateSelect(key as keyof typeof groupTypeTemplates)}
              className="text-left h-auto p-3"
            >
              <div>
                <div className="font-medium text-sm">{template.name}</div>
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
        <Label className="text-base font-semibold">Access Control</Label>

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

        {formData.accessLevel === 'department_only' && (
          <div>
            <Label>Allowed Departments</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
              {Array.isArray(departments) && departments.map((dept: string) => (
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
                          allowedDepartments: prev.allowedDepartments.filter((d: string) => d !== dept)
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

        {formData.accessLevel === 'site_only' && (
          <div>
            <Label>Allowed Sites/Locations</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Array.isArray(locations) && locations.map((location: string) => (
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
                          allowedSites: prev.allowedSites.filter((s: string) => s !== location)
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
        <Label className="text-base font-semibold">Advanced Settings</Label>

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
  );
}

// Group Details Form Component
function GroupDetailsForm({ group, onSubmit, isLoading }: { group: any; onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    name: group.name || '',
    description: group.description || '',
    category: group.channelType || group.category || '',
    isPrivate: group.accessLevel === 'approval_required' || group.isPrivate || false,
    requiresApproval: group.accessLevel === 'approval_required' || false,
    maxMembers: group.maxMembers || '',
    selectedDepartments: group.allowedDepartments || [],
    selectedLocations: group.allowedSites || [],
    isActive: group.isActive !== false
  });

  // Fetch departments and locations for access controls
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
      accessLevel: formData.requiresApproval ? 'approval_required' : 
                  formData.selectedDepartments.length > 0 ? 'department_only' :
                  formData.selectedLocations.length > 0 ? 'site_only' : 'open',
      allowedDepartments: formData.selectedDepartments,
      allowedSites: formData.selectedLocations,
      channelType: formData.category
    };
    onSubmit(submitData);
  };

  return (
    <div className="space-y-6">
      {/* Group Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{group.memberCount || 0}</p>
                <p className="text-sm text-gray-600">Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{group.postsCount || 0}</p>
                <p className="text-sm text-gray-600">Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{group.activeMembers || 0}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="edit-name">Group Name</Label>
          <Input
            id="edit-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter group name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your group"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="edit-maxMembers">Maximum Members</Label>
            <Input
              id="edit-maxMembers"
              type="number"
              value={formData.maxMembers || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, maxMembers: e.target.value }))}
              placeholder="Leave empty for unlimited"
              min="1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="edit-category">Channel Type</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select channel type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company-wide">Company-wide</SelectItem>
              <SelectItem value="department">Department</SelectItem>
              <SelectItem value="site">Site/Location</SelectItem>
              <SelectItem value="interest">Interest-based</SelectItem>
              <SelectItem value="project">Project/Team</SelectItem>
              <SelectItem value="social">Social</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Access and Privacy Controls */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Access and Privacy</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-private"
                checked={formData.isPrivate}
                onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: !!checked })}
              />
              <Label htmlFor="edit-private">Private Channel (invite only)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-approval"
                checked={formData.requiresApproval || false}
                onCheckedChange={(checked) => setFormData({ ...formData, requiresApproval: !!checked })}
              />
              <Label htmlFor="edit-approval">Requires approval to join</Label>
            </div>
          </div>
        </div>

        {/* Department Access Controls */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Select Departments (Optional)</Label>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {Array.isArray(departments) && departments.map((dept: string) => (
              <div key={dept} className="flex items-center space-x-2">
                <Checkbox
                  id={`edit-dept-${dept}`}
                  checked={(formData.selectedDepartments || []).includes(dept)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData(prev => ({
                        ...prev,
                        selectedDepartments: [...(prev.selectedDepartments || []), dept]
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        selectedDepartments: (prev.selectedDepartments || []).filter((d: string) => d !== dept)
                      }));
                    }
                  }}
                />
                <Label htmlFor={`edit-dept-${dept}`} className="text-sm">{dept}</Label>
              </div>
            ))}
          </div>
        </div>

        {/* Location Access Controls */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Select Locations (Optional)</Label>
          <div className="grid grid-cols-2 gap-2">
            {Array.isArray(locations) && locations.map((location: string) => (
              <div key={location} className="flex items-center space-x-2">
                <Checkbox
                  id={`edit-loc-${location}`}
                  checked={(formData.selectedLocations || []).includes(location)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData(prev => ({
                        ...prev,
                        selectedLocations: [...(prev.selectedLocations || []), location]
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        selectedLocations: (prev.selectedLocations || []).filter((l: string) => l !== location)
                      }));
                    }
                  }}
                />
                <Label htmlFor={`edit-loc-${location}`} className="text-sm">{location}</Label>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="edit-active"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
          />
          <Label htmlFor="edit-active">Active group</Label>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Group
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}

// Employee Form Components
interface EditEmployeeFormProps {
  employee: Employee;
  onClose: () => void;
  onUpdate: () => void;
}

function EditEmployeeForm({ employee, onClose, onUpdate }: EditEmployeeFormProps) {
  const [formData, setFormData] = useState<EmployeeFormData>({
    password: "",
    name: employee.name || "",
    surname: employee.surname || "",
    email: employee.email || "",
    phoneNumber: employee.phoneNumber || "",
    jobTitle: employee.jobTitle || "",
    department: employee.department || "",
    location: employee.location || "",
    managerEmail: employee.managerEmail || "",
    sex: employee.sex || "",
    nationality: employee.nationality || "",
    birthDate: employee.birthDate || "",
    hireDate: employee.hireDate || "",
    isAdmin: employee.isAdmin || false,
    status: employee.status || "active",
    avatarUrl: employee.avatarUrl || "",
    adminScope: employee.adminScope || "none",
    allowedSites: employee.allowedSites || [],
    allowedDepartments: employee.allowedDepartments || []
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${employee.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update employee');
      }

      onUpdate();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">First Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="surname">Last Name</Label>
            <Input
              id="surname"
              value={formData.surname}
              onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="sex">Gender</Label>
            <Select value={formData.sex} onValueChange={(value) => setFormData({ ...formData, sex: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
                <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              value={formData.nationality}
              onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="birthDate">Birth Date</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Work Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Work Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="managerEmail">Manager Email</Label>
            <Input
              id="managerEmail"
              type="email"
              value={formData.managerEmail}
              onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hireDate">Hire Date</Label>
            <Input
              id="hireDate"
              type="date"
              value={formData.hireDate}
              onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Admin Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Admin Settings</h3>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isAdmin"
            checked={formData.isAdmin}
            onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: !!checked })}
          />
          <Label htmlFor="isAdmin">Admin User</Label>
        </div>

        {formData.isAdmin && (
          <div>
            <Label htmlFor="adminScope">Admin Scope</Label>
            <Select value={formData.adminScope} onValueChange={(value) => setFormData({ ...formData, adminScope: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select admin scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super">Super Admin</SelectItem>
                <SelectItem value="department">Department Admin</SelectItem>
                <SelectItem value="site">Site Admin</SelectItem>
                <SelectItem value="limited">Limited Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Profile Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Profile</h3>

        <div>
          <Label htmlFor="avatarUrl">Avatar URL</Label>
          <Input
            id="avatarUrl"
            value={formData.avatarUrl}
            onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>
      </div>

      <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Employee
        </Button>
      </DialogFooter>
    </form>
  );
}

interface CreateEmployeeFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateEmployeeForm({ onClose, onSuccess }: CreateEmployeeFormProps) {
  const [formData, setFormData] = useState<EmployeeFormData>({
    password: "changeme123",
    name: "",
    surname: "",
    email: "",
    phoneNumber: "",
    jobTitle: "",
    department: "",
    location: "",
    managerEmail: "",
    sex: "",
    nationality: "",
    birthDate: "",
    hireDate: "",
    isAdmin: false,
    status: "active",
    avatarUrl: "",
    adminScope: "none",
    allowedSites: [],
    allowedDepartments: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState({ emailExists: false, nameExists: false });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();

  // Check for duplicates
  const checkDuplicates = async (email: string, name?: string, surname?: string) => {
    if (!email.trim()) return;

    try {
      const response = await fetch('/api/users/check-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('firebaseToken')}`
        },
        body: JSON.stringify({ email, name, surname }),
      });

      if (response.ok) {
        const result = await response.json();
        setDuplicateCheck(result);

        const errors: string[] = [];
        if (result.emailExists) {
          errors.push(`Email ${email} is already in use`);
        }
        if (result.nameExists && name && surname) {
          errors.push(`Employee ${name} ${surname} already exists`);
        }
        setValidationErrors(errors);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for validation errors
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors.join('. '),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('firebaseToken')}`
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create employee');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Duplicate entries found
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="create-name">First Name *</Label>
            <Input
              id="create-name"
              value={formData.name}
              onChange={(e) => {
                const newName = e.target.value;
                setFormData({ ...formData, name: newName });
                // Check duplicates when both name and surname are present
                if (newName && formData.surname && formData.email) {
                  checkDuplicates(formData.email, newName, formData.surname);
                }
              }}
              className={duplicateCheck.nameExists ? 'border-red-500' : ''}
              required
            />
          </div>
          <div>
            <Label htmlFor="create-surname">Last Name</Label>
            <Input
              id="create-surname"
              value={formData.surname}
              onChange={(e) => {
                const newSurname = e.target.value;
                setFormData({ ...formData, surname: newSurname });
                // Check duplicates when both name and surname are present
                if (formData.name && newSurname && formData.email) {
                  checkDuplicates(formData.email, formData.name, newSurname);
                }
              }}
              className={duplicateCheck.nameExists ? 'border-red-500' : ''}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="create-email">Email *</Label>
          <Input
            id="create-email"
            type="email"
            value={formData.email}
            onChange={(e) => {
              const newEmail = e.target.value;
              setFormData({ ...formData, email: newEmail });
              // Check duplicates on email change
              if (newEmail) {
                checkDuplicates(newEmail, formData.name, formData.surname);
              } else {
                setValidationErrors([]);
                setDuplicateCheck({ emailExists: false, nameExists: false });
              }
            }}
            className={duplicateCheck.emailExists ? 'border-red-500' : ''}
            required
          />
          {duplicateCheck.emailExists && (
            <p className="text-sm text-red-600 mt-1">This email is already in use</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="create-phoneNumber">Phone Number</Label>
            <Input
              id="create-phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="create-sex">Gender</Label>
            <Select value={formData.sex} onValueChange={(value) => setFormData({ ...formData, sex: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
                <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="create-nationality">Nationality</Label>
            <Input
              id="create-nationality"
              value={formData.nationality}
              onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="create-birthDate">Birth Date</Label>
            <Input
              id="create-birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Work Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Work Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="create-jobTitle">Job Title</Label>
            <Input
              id="create-jobTitle"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="create-department">Department</Label>
            <Input
              id="create-department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="create-location">Location</Label>
            <Input
              id="create-location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="create-managerEmail">Manager Email</Label>
            <Input
              id="create-managerEmail"
              type="email"
              value={formData.managerEmail}
              onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="create-hireDate">Hire Date</Label>
            <Input
              id="create-hireDate"
              type="date"
              value={formData.hireDate}
              onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="create-status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Security</h3>

        <div>
          <Label htmlFor="create-password">Initial Password</Label>
          <Input
            id="create-password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Employee will be asked to change on first login"
          />
          <p className="text-sm text-gray-500 mt-1">
            Default: changeme123 (employee will be required to change on first login)
          </p>
        </div>
      </div>

      {/* Admin Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Admin Settings</h3>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="create-isAdmin"
            checked={formData.isAdmin}
            onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: !!checked })}
          />
          <Label htmlFor="create-isAdmin">Admin User</Label>
        </div>

        {formData.isAdmin && (
          <div>
            <Label htmlFor="create-adminScope">Admin Scope</Label>
            <Select value={formData.adminScope} onValueChange={(value) => setFormData({ ...formData, adminScope: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select admin scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super">Super Admin</SelectItem>
                <SelectItem value="department">Department Admin</SelectItem>
                <SelectItem value="site">Site Admin</SelectItem>
                <SelectItem value="limited">Limited Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Profile Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Profile</h3>

        <div>
          <Label htmlFor="create-avatarUrl">Avatar URL</Label>
          <Input
            id="create-avatarUrl"
            value={formData.avatarUrl}
            onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>
      </div>

      <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Employee
        </Button>
      </DialogFooter>
    </form>
  );
}

interface BulkUploadFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

function BulkUploadForm({ onClose, onSuccess }: BulkUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/users/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload employees",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="file">Choose File</Label>
        <Input
          id="file"
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Supported formats: CSV, Excel (.xlsx, .xls)
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !file}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Upload
        </Button>
      </DialogFooter>
    </form>
  );
}

// Employee Directory Component
function EmployeeDirectory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees
  const { data: employees = [], isLoading: employeesLoading, error: employeesError } = useQuery<Employee[]>({
    queryKey: ['/api/users'],
  });

  // Fetch departments
  const { data: departments = [] } = useQuery<string[]>({
    queryKey: ['/api/users/departments'],
  });

  // Fetch locations
  const { data: locations = [] } = useQuery<string[]>({
    queryKey: ['/api/users/locations'],
  });

const filteredEmployees = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];

    const filtered = employees.filter((employee: Employee) => {
      if (!employee) return false;
      
      // Apply department and location filters first
      const matchesDepartment = selectedDepartment === "all" || employee.department === selectedDepartment;
      const matchesLocation = selectedLocation === "all" || employee.location === selectedLocation;
      
      // If no search term, just apply department/location filters
      if (!searchTerm || !searchTerm.trim()) {
        return matchesDepartment && matchesLocation;
      }
      
      // Apply search filter - only show employees that match the search term
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = (
        (employee.name && employee.name.toLowerCase().includes(searchLower)) ||
        (employee.surname && employee.surname.toLowerCase().includes(searchLower)) ||
        (employee.email && employee.email.toLowerCase().includes(searchLower)) ||
        (employee.jobTitle && employee.jobTitle.toLowerCase().includes(searchLower)) ||
        (employee.department && employee.department.toLowerCase().includes(searchLower)) ||
        (employee.phoneNumber && employee.phoneNumber.toLowerCase().includes(searchLower)) ||
        (employee.username && employee.username.toLowerCase().includes(searchLower))
      );

      // When searching, ONLY return employees that match the search AND department/location filters
      return matchesSearch && matchesDepartment && matchesLocation;
    });

    // Debug logging to verify filtering works
    console.log('Search Debug:', {
      searchTerm,
      totalEmployees: employees.length,
      filteredCount: filtered.length,
      sampleResults: filtered.slice(0, 3).map(e => `${e.name} ${e.surname}`)
    });

    return filtered;
  }, [employees, searchTerm, selectedDepartment, selectedLocation]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Directory</h2>
          <p className="text-gray-600">Manage employees and their information</p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => setIsBulkUploadDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="employee-search-input"
          />
          {searchTerm && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <span className="text-xs text-gray-500">
                {filteredEmployees.length} result{filteredEmployees.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map((dept: string) => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations?.map((location: string) => (
              <SelectItem key={location} value={location}>{location}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>



      {/* Employee Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee: Employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={employee.avatarUrl || undefined} />
                          <AvatarFallback>
                            {employee.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">
                            {employee.name} {employee.surname}
                          </p>
                          <p className="text-sm text-gray-500">{employee.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.jobTitle || "N/A"}</TableCell>
                    <TableCell>{employee.department || "N/A"}</TableCell>
                    <TableCell>{employee.location || "N/A"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={employee.status === "Active" ? "default" : "secondary"}
                        className={employee.status === "Active" ? "bg-green-100 text-green-800" : ""}
                      >
                        {employee.status || "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information and settings
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <EditEmployeeForm 
              employee={selectedEmployee}
              onClose={() => {
                setIsDialogOpen(false);
                setSelectedEmployee(null);
              }}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/users'] });
                toast({
                  title: "Success",
                  description: "Employee updated successfully",
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Employee Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee account
            </DialogDescription>
          </DialogHeader>

          <CreateEmployeeForm 
            onClose={() => setIsCreateDialogOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/users'] });
              toast({
                title: "Success",
                description: "Employee created successfully",
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Upload Employees</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file with employee data
            </DialogDescription>
          </DialogHeader>

          <BulkUploadForm 
            onClose={() => setIsBulkUploadDialogOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/users'] });
              toast({
                title: "Success", 
                description: "Employees uploaded successfully",
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface Space {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  memberCount: number;
}

//Trending Spaces component
function TrendingSpaces() {
  const [trendingSpaces, setTrendingSpaces] = useState<Space[]>([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false);

  useEffect(() => {
    const fetchSpaces = async () => {
      setIsLoadingSpaces(true);
      try {
        const response = await fetch('/api/spaces/trending');
        if (!response.ok) {
          throw new Error('Failed to fetch trending spaces');
        }
        const data = await response.json();
        setTrendingSpaces(data);
      } catch (error) {
        console.error('Error fetching spaces:', error);
        setTrendingSpaces([]);
      } finally {
        setIsLoadingSpaces(false);
      }
    };

    fetchSpaces();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trending Spaces</CardTitle>
        <CardDescription>
          Explore popular workplace spaces
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {isLoadingSpaces ? (
          <div className="text-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : trendingSpaces.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No trending spaces found.
          </div>
        ) : (
          <div className="grid sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {(trendingSpaces || []).slice(0, 3).map((space: Space) => (
              <Link key={space.id} href={`/spaces/${space.id}`}>
                <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                  <img
                    src={space.imageUrl}
                    alt={space.name}
                    className="w-full h-32 object-cover object-center"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{space.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{space.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2 text-gray-500">
                        <Users className="h-4 w-4" />
                        <span>{space.memberCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Component
export default function AdminEmployeesGroups() {
  const [activeTab, setActiveTab] = useState("employees");

  return (<div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Employees and Spaces</h1>
        <p className="text-gray-600 mt-1">Manage your organization's employees and workplace spaces</p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="employees" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Employee Directory</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Spaces</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6">
          <EmployeeDirectory />
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <GroupsManagement />
          <TrendingSpaces/>
        </TabsContent>
      </Tabs>
    </div>
  );
}