import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Users, Filter, Globe, Lock, Shield, UserCheck, MapPin, Calendar, Star, Loader2, Settings, Crown, MessageSquare, UserPlus, UserMinus, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function GroupsFacebookPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'details'>('list');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/groups'],
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: any) => {
      return apiRequest('/api/groups', groupData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Group created successfully",
      });
    }
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return apiRequest(`/api/groups/${groupId}/join`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      toast({
        title: "Success",
        description: "Successfully joined the group",
      });
    }
  });

  // Filter groups
  const filteredGroups = groups?.filter((group: any) => {
    const matchesSearch = group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || group.groupType === typeFilter;
    const matchesAccess = accessFilter === "all" || group.accessLevel === accessFilter;
    
    return matchesSearch && matchesType && matchesAccess;
  }) || [];

  const handleCreateGroup = () => {
    setShowCreateDialog(true);
  };

  const handleJoinGroup = (groupId: number) => {
    joinGroupMutation.mutate(groupId);
  };

  const handleViewGroup = (groupId: number) => {
    setSelectedGroupId(groupId);
    setView('details');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedGroupId(null);
  };

  if (view === 'details' && selectedGroupId) {
    return <GroupDetails groupId={selectedGroupId} onBack={handleBackToList} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
              <p className="text-gray-600 mt-2">Discover and join groups in your organization</p>
            </div>
            <Button onClick={handleCreateGroup} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Find Groups
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="interest">Interest</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="site">Site/Location</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="company">Company-wide</SelectItem>
                </SelectContent>
              </Select>
              <Select value={accessFilter} onValueChange={setAccessFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Access</SelectItem>
                  <SelectItem value="open">Open to all</SelectItem>
                  <SelectItem value="department_only">Department only</SelectItem>
                  <SelectItem value="site_only">Site only</SelectItem>
                  <SelectItem value="invite_only">Invite only</SelectItem>
                  <SelectItem value="approval_required">Approval required</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Groups Grid */}
        {groupsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {groups?.length === 0 ? "No groups yet" : "No groups match your filters"}
              </h3>
              <p className="text-gray-500 mb-4">
                {groups?.length === 0 
                  ? "Be the first to create a group in your organization"
                  : "Try adjusting your search criteria"
                }
              </p>
              {groups?.length === 0 && (
                <Button onClick={handleCreateGroup}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Group
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group: any) => (
              <GroupCard
                key={group.id}
                group={group}
                onJoin={handleJoinGroup}
                onView={handleViewGroup}
              />
            ))}
          </div>
        )}

        {/* Results count */}
        {filteredGroups.length > 0 && (
          <div className="text-center text-sm text-gray-500 mt-6">
            Showing {filteredGroups.length} of {groups?.length || 0} groups
          </div>
        )}
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
    </div>
  );
}

// Group Card Component
function GroupCard({ group, onJoin, onView }: { group: any; onJoin?: (groupId: number) => void; onView?: (groupId: number) => void }) {
  const getAccessIcon = () => {
    switch (group.accessLevel) {
      case 'open':
        return <Globe className="w-4 h-4" />;
      case 'department_only':
      case 'site_only':
        return <Shield className="w-4 h-4" />;
      case 'invite_only':
        return <Lock className="w-4 h-4" />;
      case 'approval_required':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getAccessLabel = () => {
    switch (group.accessLevel) {
      case 'open':
        return 'Open to all';
      case 'department_only':
        return 'Department only';
      case 'site_only':
        return 'Site only';
      case 'invite_only':
        return 'Invite only';
      case 'approval_required':
        return 'Approval required';
      default:
        return 'Unknown';
    }
  };

  const getGroupTypeColor = () => {
    switch (group.groupType) {
      case 'interest':
        return 'bg-purple-100 text-purple-800';
      case 'department':
        return 'bg-blue-100 text-blue-800';
      case 'site':
        return 'bg-green-100 text-green-800';
      case 'project':
        return 'bg-orange-100 text-orange-800';
      case 'company':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {group.coverImage && (
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
          <img 
            src={group.coverImage} 
            alt={group.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold mb-1">{group.name}</CardTitle>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className={getGroupTypeColor()}>
                {group.groupType}
              </Badge>
              {group.isPrivate && (
                <Badge variant="outline" className="text-xs">
                  <Lock className="w-3 h-3 mr-1" />
                  Private
                </Badge>
              )}
              {group.isAutoCreated && (
                <Badge variant="outline" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Auto-created
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <CardDescription className="text-sm text-gray-600 line-clamp-2">
          {group.description || "No description available."}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Member Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span>{group.memberCount || 0} member{group.memberCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              {getAccessIcon()}
              <span className="text-xs">{getAccessLabel()}</span>
            </div>
          </div>

          {/* Recent Members */}
          {group.recentMembers && group.recentMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Recent:</span>
              <div className="flex -space-x-1">
                {group.recentMembers.slice(0, 3).map((member: any) => (
                  <Avatar key={member.id} className="w-6 h-6 border-2 border-white">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="text-xs">
                      {member.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {group.recentMembers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                    <span className="text-xs text-gray-600">+{group.recentMembers.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onView?.(group.id)}
              className="flex-1"
            >
              View
            </Button>
            <Button 
              size="sm" 
              onClick={() => onJoin?.(group.id)}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {group.accessLevel === 'approval_required' ? 'Request' : 'Join'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Group Details Component
function GroupDetails({ groupId, onBack }: { groupId: number; onBack?: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch group details
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['/api/groups', groupId],
  });

  // Fetch group members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['/api/groups', groupId, 'members'],
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/groups/${groupId}/leave`, {}, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'members'] });
      toast({
        title: "Success",
        description: "Successfully left the group",
      });
    }
  });

  if (groupLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">Group not found</p>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="mt-4">
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-2xl">{group.name}</CardTitle>
                    <Badge className="bg-purple-100 text-purple-800">
                      {group.groupType}
                    </Badge>
                    {group.isPrivate && (
                      <Badge variant="outline">
                        <Lock className="w-3 h-3 mr-1" />
                        Private
                      </Badge>
                    )}
                  </div>
                  
                  <CardDescription className="text-base mb-4">
                    {group.description || "No description available."}
                  </CardDescription>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{group.memberCount || 0} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {onBack && (
                    <Button variant="outline" onClick={onBack}>
                      Back
                    </Button>
                  )}
                  
                  {group.isMember && (
                    <Button 
                      variant="outline" 
                      onClick={() => leaveGroupMutation.mutate()}
                      disabled={leaveGroupMutation.isPending}
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      Leave Group
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Content Tabs */}
          <Tabs defaultValue="activity" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No activity yet</p>
                    <p className="text-sm text-gray-400">Be the first to start a conversation!</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Members ({group.memberCount || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {membersLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </div>
                  ) : members && members.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {members.map((member: any) => (
                        <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Avatar>
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>
                              {member.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{member.name}</span>
                              {member.isAdmin && (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{member.department}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No members yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="about">
              <Card>
                <CardHeader>
                  <CardTitle>About This Group</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-gray-700">{group.description || "No description provided."}</p>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Group Type</h4>
                      <Badge className="bg-purple-100 text-purple-800">
                        {group.groupType}
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Privacy</h4>
                      <span>{group.isPrivate ? 'Private' : 'Public'}</span>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Created</h4>
                      <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Members</h4>
                      <span>{group.memberCount || 0} members</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Create Group Form Component
function CreateGroupForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    groupType: 'interest',
    accessLevel: 'open',
    isPrivate: false,
    requiresApproval: false,
    maxMembers: ''
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

      <div className="flex items-center space-x-2">
        <Checkbox
          id="private"
          checked={formData.isPrivate}
          onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: !!checked })}
        />
        <Label htmlFor="private">Private group (hidden from discovery)</Label>
      </div>
      
      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Group
        </Button>
      </DialogFooter>
    </form>
  );
}