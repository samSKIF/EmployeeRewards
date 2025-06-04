import { useState, useEffect } from "react";
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

  // Fetch groups based on admin scope
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/admin/groups'],
    enabled: !!user
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: any) => {
      return apiRequest('/api/groups', {
        method: 'POST',
        body: JSON.stringify(groupData)
      });
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
      return apiRequest(`/api/groups/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
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
      return apiRequest(`/api/groups/${id}`, {
        method: 'DELETE'
      });
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
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedCategory === 'all') return matchesSearch;
    return group.category === selectedCategory && matchesSearch;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Groups Management</h2>
          <p className="text-gray-600">Manage workplace groups within your administrative scope</p>
        </div>
        
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search groups..."
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
                <TableHead>Group</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Privacy</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No groups found
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

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
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

      {/* Group Details Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Group Details</DialogTitle>
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
              {departments?.map((dept: string) => (
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

        {formData.accessLevel === 'site_only' && (
          <div>
            <Label>Allowed Sites/Locations</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {locations?.map((location: string) => (
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
    category: group.category || '',
    isPrivate: group.isPrivate || false,
    isActive: group.isActive !== false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
          <Label htmlFor="edit-category">Category</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Technology">Technology</SelectItem>
              <SelectItem value="Sports">Sports</SelectItem>
              <SelectItem value="Arts">Arts</SelectItem>
              <SelectItem value="Business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-private"
              checked={formData.isPrivate}
              onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: !!checked })}
            />
            <Label htmlFor="edit-private">Private group</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-active"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
            />
            <Label htmlFor="edit-active">Active group</Label>
          </div>
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

// Employee Directory Component (imported from existing admin-employees.tsx)
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
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['/api/users/departments'],
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['/api/users/locations'],
  });

  const filteredEmployees = employees?.filter((employee: Employee) => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (employee.jobTitle && employee.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDepartment = selectedDepartment === "all" || employee.department === selectedDepartment;
    const matchesLocation = selectedLocation === "all" || employee.location === selectedLocation;
    
    return matchesSearch && matchesDepartment && matchesLocation;
  }) || [];

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
          />
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
    </div>
  );
}

// Main Component
export default function AdminEmployeesGroups() {
  const [activeTab, setActiveTab] = useState("employees");

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Employees and Groups</h1>
        <p className="text-gray-600 mt-1">Manage your organization's employees and workplace groups</p>
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
            <span>Groups</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6">
          <EmployeeDirectory />
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <GroupsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}