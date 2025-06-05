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
import { Users, Building, MapPin, Target, Briefcase, Heart, Globe, Lock, UserCheck, Settings } from 'lucide-react';

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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    accessLevel: '',
    isPrivate: false,
    requireApproval: false,
    maxMembers: ''
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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

// Export alias for backward compatibility
export { CreateChannelDialog as CreateGroupDialog };
