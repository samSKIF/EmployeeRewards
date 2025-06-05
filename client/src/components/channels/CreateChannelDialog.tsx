import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface User {
  id: number;
  name: string;
  username: string;
  department: string;
  location: string;
}

export function CreateChannelDialog({ open, onOpenChange }: CreateChannelDialogProps) {
  const [formData, setFormData] = useState({
    channelType: "",
    name: "",
    description: "",
    isPrivate: false,
    requiresApproval: false,
    maxMembers: "",
    selectedDepartments: [] as string[],
    selectedLocations: [] as string[],
    autoAddMembers: false,
    initialMembers: [] as User[]
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch departments and locations
  const { data: departments } = useQuery({
    queryKey: ['/api/users/departments'],
    enabled: open
  });

  const { data: locations } = useQuery({
    queryKey: ['/api/users/locations'],
    enabled: open
  });

  // Fetch users for member selection
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    enabled: open
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (channelData: any) => {
      return apiRequest('/api/admin/groups', channelData, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/groups'] });
      toast({
        title: "Success",
        description: "Channel created successfully",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      channelType: "",
      name: "",
      description: "",
      isPrivate: false,
      requiresApproval: false,
      maxMembers: "",
      selectedDepartments: [],
      selectedLocations: [],
      autoAddMembers: false,
      initialMembers: []
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const channelData = {
      name: formData.name,
      description: formData.description,
      channelType: formData.channelType,
      isPrivate: formData.isPrivate,
      requiresApproval: formData.requiresApproval,
      maxMembers: formData.maxMembers ? parseInt(formData.maxMembers) : null,
      departmentRestricted: formData.selectedDepartments.length > 0,
      locationRestricted: formData.selectedLocations.length > 0,
      allowedDepartments: formData.selectedDepartments,
      allowedLocations: formData.selectedLocations,
      autoAddMembers: formData.autoAddMembers,
      initialMembers: formData.initialMembers.map(user => user.id)
    };

    console.log('Sending channel data:', channelData);

    createChannelMutation.mutate(channelData);
  };

  const addMember = (user: User) => {
    if (!formData.initialMembers.find(member => member.id === user.id)) {
      setFormData(prev => ({
        ...prev,
        initialMembers: [...prev.initialMembers, user]
      }));
    }
  };

  const removeMember = (userId: number) => {
    setFormData(prev => ({
      ...prev,
      initialMembers: prev.initialMembers.filter(member => member.id !== userId)
    }));
  };

  const handleDepartmentChange = (department: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedDepartments: checked 
        ? [...prev.selectedDepartments, department]
        : prev.selectedDepartments.filter(d => d !== department)
    }));
  };

  const handleLocationChange = (location: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedLocations: checked 
        ? [...prev.selectedLocations, location]
        : prev.selectedLocations.filter(l => l !== location)
    }));
  };

  // Filter users based on selected departments and locations
  const filteredUsers = Array.isArray(users) ? users.filter((user: User) => {
    const deptMatch = formData.selectedDepartments.length === 0 || 
                     formData.selectedDepartments.includes(user.department);
    const locMatch = formData.selectedLocations.length === 0 || 
                    formData.selectedLocations.includes(user.location);
    return deptMatch && locMatch;
  }) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Channel Type */}
          <div className="space-y-2">
            <Label>Type of Channel</Label>
            <Select 
              value={formData.channelType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, channelType: value }))}
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

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Channel Name *</Label>
              <Input
                id="name"
                placeholder="Enter channel name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxMembers">Maximum Members</Label>
              <Input
                id="maxMembers"
                type="number"
                placeholder="Leave empty for unlimited"
                value={formData.maxMembers}
                onChange={(e) => setFormData(prev => ({ ...prev, maxMembers: e.target.value }))}
                min="1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter channel description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Access and Privacy */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Access and Privacy</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPrivate"
                  checked={formData.isPrivate}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: !!checked }))}
                />
                <Label htmlFor="isPrivate">Private Channel (invite only)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requiresApproval"
                  checked={formData.requiresApproval}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiresApproval: !!checked }))}
                />
                <Label htmlFor="requiresApproval">Requires approval to join</Label>
              </div>
            </div>
          </div>

          {/* Department Selection */}
          {Array.isArray(departments) && departments.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Select Departments (Optional)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                {departments.map((dept: string) => (
                  <div key={dept} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dept-${dept}`}
                      checked={formData.selectedDepartments.includes(dept)}
                      onCheckedChange={(checked) => handleDepartmentChange(dept, !!checked)}
                    />
                    <Label htmlFor={`dept-${dept}`} className="text-sm">{dept}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Selection */}
          {Array.isArray(locations) && locations.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Select Locations (Optional)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                {locations.map((location: string) => (
                  <div key={location} className="flex items-center space-x-2">
                    <Checkbox
                      id={`loc-${location}`}
                      checked={formData.selectedLocations.includes(location)}
                      onCheckedChange={(checked) => handleLocationChange(location, !!checked)}
                    />
                    <Label htmlFor={`loc-${location}`} className="text-sm">{location}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto-add Members Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoAddMembers"
              checked={formData.autoAddMembers}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoAddMembers: !!checked }))}
            />
            <Label htmlFor="autoAddMembers">
              Automatically add all members from selected departments and locations
            </Label>
          </div>

          {/* Manual Member Selection */}
          {!formData.autoAddMembers && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Add Initial Members (Optional)</Label>
              
              {/* Selected Members */}
              {formData.initialMembers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Selected Members:</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.initialMembers.map(member => (
                      <Badge key={member.id} variant="secondary" className="flex items-center gap-1">
                        {member.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeMember(member.id)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Users */}
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {filteredUsers.map((user: User) => (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-sm cursor-pointer"
                      onClick={() => addMember(user)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {user.department} • {user.location}
                        </span>
                      </div>
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No users available for selection
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createChannelMutation.isPending || !formData.name || !formData.channelType}
            >
              {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}