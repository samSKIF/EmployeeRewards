import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { Users, Building, MapPin, Target, Briefcase, Heart, Globe, Lock, UserCheck, Settings, X, Plus, Search } from 'lucide-react';

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
}

const groupTemplates = {
  department: {
    name: 'Department Team',
    description: 'Collaborate with your department colleagues',
    icon: Building,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    type: 'department',
    defaultAccess: 'department_only'
  },
  location: {
    name: 'Location Group',
    description: 'Connect with colleagues at your office',
    icon: MapPin,
    color: 'bg-green-50 border-green-200 text-green-700',
    type: 'location',
    defaultAccess: 'location_only'
  },
  project: {
    name: 'Project Team',
    description: 'Temporary team for specific projects',
    icon: Target,
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    type: 'project',
    defaultAccess: 'invite_only'
  },
  interest: {
    name: 'Interest Group',
    description: 'Share hobbies and interests',
    icon: Heart,
    color: 'bg-pink-50 border-pink-200 text-pink-700',
    type: 'interest',
    defaultAccess: 'open'
  },
  company: {
    name: 'Company-wide',
    description: 'All employees organization-wide',
    icon: Globe,
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    type: 'company',
    defaultAccess: 'open'
  },
  role: {
    name: 'Role-based Group',
    description: 'Connect people with similar roles',
    icon: Briefcase,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    type: 'role',
    defaultAccess: 'role_based'
  }
};

export function CreateChannelDialog({ open, onOpenChange, onSubmit }: CreateChannelDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    accessLevel: '',
    isPrivate: false,
    requireApproval: false,
    maxMembers: '',
    allowedDepartments: [] as string[],
    allowedLocations: [] as string[],
    initialMembers: [] as number[]
  });

  // Fetch data for form options
  const { data: departments } = useQuery({
    queryKey: ['/api/users/departments'],
  });

  const { data: locations } = useQuery({
    queryKey: ['/api/users/locations'],
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });

  const handleTemplateSelect = (templateKey: string) => {
    const template = groupTemplates[templateKey as keyof typeof groupTemplates];
    setSelectedTemplate(templateKey);
    setFormData(prev => ({
      ...prev,
      type: template.type,
      accessLevel: template.defaultAccess
    }));
  };

  const handleDepartmentToggle = (department: string) => {
    const newDepartments = selectedDepartments.includes(department)
      ? selectedDepartments.filter(d => d !== department)
      : [...selectedDepartments, department];
    
    setSelectedDepartments(newDepartments);
    setFormData(prev => ({ ...prev, allowedDepartments: newDepartments }));
  };

  const handleLocationToggle = (location: string) => {
    const newLocations = selectedLocations.includes(location)
      ? selectedLocations.filter(l => l !== location)
      : [...selectedLocations, location];
    
    setSelectedLocations(newLocations);
    setFormData(prev => ({ ...prev, allowedLocations: newLocations }));
  };

  const handleMemberToggle = (user: any) => {
    const isSelected = selectedMembers.some(m => m.id === user.id);
    const newMembers = isSelected
      ? selectedMembers.filter(m => m.id !== user.id)
      : [...selectedMembers, user];
    
    setSelectedMembers(newMembers);
    setFormData(prev => ({ 
      ...prev, 
      initialMembers: newMembers.map(m => m.id) 
    }));
  };

  const filteredUsers = users?.filter((user: any) => {
    const searchMatch = user.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                       user.email.toLowerCase().includes(memberSearchTerm.toLowerCase());
    
    // If departments are selected, only show users from those departments
    if (selectedDepartments.length > 0) {
      return searchMatch && selectedDepartments.includes(user.department);
    }
    
    // If locations are selected, only show users from those locations
    if (selectedLocations.length > 0) {
      return searchMatch && selectedLocations.includes(user.location);
    }
    
    return searchMatch;
  }) || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      console.error('Channel name is required');
      return;
    }
    
    if (!selectedTemplate) {
      console.error('Template selection is required');
      return;
    }
    
    // Prepare final form data
    const submitData = {
      ...formData,
      type: formData.type,
      allowedDepartments: selectedDepartments,
      allowedLocations: selectedLocations,
      initialMembers: selectedMembers.map(m => m.id),
      maxMembers: formData.maxMembers ? parseInt(formData.maxMembers) : null
    };
    
    console.log('Submitting channel data:', submitData);
    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Create New Channel
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Build communities and foster collaboration across your organization
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Choose a Template</Label>
            <p className="text-sm text-gray-600">Select the type of channel that best fits your needs</p>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(groupTemplates).map(([key, template]) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={key}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate === key 
                        ? 'ring-2 ring-blue-500 border-blue-200' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTemplateSelect(key)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${template.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900">{template.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Basic Information */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Basic Information</Label>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Channel Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter a descriptive channel name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose and goals of this channel"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Access & Privacy Settings */}
          <div className="space-y-4">
            <Label className="text-base font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Access & Privacy
            </Label>

            <div className="space-y-2">
              <Label htmlFor="access" className="text-sm font-medium">Who can join?</Label>
              <Select value={formData.accessLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, accessLevel: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Anyone in the company</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="department_only">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span>Department members only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="location_only">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>Location-based access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="invite_only">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Invitation only</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Private Channel</Label>
                  <p className="text-xs text-gray-500">Hidden from channel discovery</p>
                </div>
                <Switch
                  checked={formData.isPrivate}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Require Approval</Label>
                  <p className="text-xs text-gray-500">Admin must approve new members</p>
                </div>
                <Switch
                  checked={formData.requireApproval}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireApproval: checked }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxMembers" className="text-sm font-medium">Maximum Members (Optional)</Label>
              <Input
                id="maxMembers"
                type="number"
                placeholder="Leave empty for unlimited"
                value={formData.maxMembers}
                onChange={(e) => setFormData(prev => ({ ...prev, maxMembers: e.target.value }))}
              />
            </div>
          </div>

          <Separator />

          {/* Department and Location Selection - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Select Departments (Optional)
              </Label>
              <p className="text-sm text-gray-600">Choose which departments can access this channel. Leave empty for all departments.</p>
              
              <ScrollArea className="h-32 border rounded-md p-3">
                <div className="space-y-2">
                  {departments?.map((department: string) => (
                    <div key={department} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dept-${department}`}
                        checked={selectedDepartments.includes(department)}
                        onCheckedChange={() => handleDepartmentToggle(department)}
                      />
                      <Label htmlFor={`dept-${department}`} className="text-sm flex-1">
                        {department}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {selectedDepartments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedDepartments.map(dept => (
                    <Badge key={dept} variant="secondary" className="flex items-center gap-1">
                      {dept}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleDepartmentToggle(dept)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Location Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Select Locations (Optional)
              </Label>
              <p className="text-sm text-gray-600">Choose which locations can access this channel. Leave empty for all locations.</p>
              
              <ScrollArea className="h-32 border rounded-md p-3">
                <div className="space-y-2">
                  {locations?.map((location: string) => (
                    <div key={location} className="flex items-center space-x-2">
                      <Checkbox
                        id={`loc-${location}`}
                        checked={selectedLocations.includes(location)}
                        onCheckedChange={() => handleLocationToggle(location)}
                      />
                      <Label htmlFor={`loc-${location}`} className="text-sm flex-1">
                        {location}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {selectedLocations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedLocations.map(loc => (
                    <Badge key={loc} variant="secondary" className="flex items-center gap-1">
                      {loc}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleLocationToggle(loc)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Manual Member Addition */}
          <div className="space-y-4">
            <Label className="text-base font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Add Initial Members (Optional)
            </Label>
            <p className="text-sm text-gray-600">Manually select employees to add to this channel</p>

            {/* Member Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search employees by name or email..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected Members Display */}
            {selectedMembers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selected Members ({selectedMembers.length})</Label>
                <ScrollArea className="h-20 border rounded-md p-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map(member => (
                      <Badge key={member.id} variant="default" className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={member.avatarUrl} />
                          <AvatarFallback className="text-xs">
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {member.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleMemberToggle(member)}
                        />
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Available Members List */}
            {memberSearchTerm && (
              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredUsers.slice(0, 50).map((user: any) => {
                    const isSelected = selectedMembers.some(m => m.id === user.id);
                    return (
                      <div
                        key={user.id}
                        className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-gray-50 ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                        onClick={() => handleMemberToggle(user)}
                      >
                        <Checkbox checked={isSelected} />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback className="text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.email} • {user.department} • {user.location}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {filteredUsers.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No employees found matching your search
                    </p>
                  )}
                  
                  {filteredUsers.length > 50 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      Showing first 50 results. Refine your search for more specific results.
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!formData.name || !selectedTemplate}
            >
              Create Channel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Export both names for compatibility
export { CreateChannelDialog as CreateGroupDialog };
export default CreateChannelDialog;
