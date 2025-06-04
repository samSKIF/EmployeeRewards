import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Users, Settings, MessageSquare, Calendar, MapPin, Globe, Lock, Shield, UserCheck, Crown, Star, MoreHorizontal, UserPlus, UserMinus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GroupDetailsProps {
  groupId: number;
  onBack?: () => void;
}

export function GroupDetails({ groupId, onBack }: GroupDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Fetch group details
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['/api/groups', groupId],
  });

  // Fetch group members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['/api/groups', groupId, 'members'],
  });

  // Fetch group posts/activity
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['/api/groups', groupId, 'posts'],
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/groups/${groupId}/join`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'members'] });
      toast({
        title: "Success",
        description: "Successfully joined the group",
      });
    }
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

  const getAccessIcon = () => {
    switch (group?.accessLevel) {
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
    switch (group?.accessLevel) {
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
    switch (group?.groupType) {
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

  if (groupLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        {group.coverImage && (
          <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg overflow-hidden">
            <img 
              src={group.coverImage} 
              alt={group.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <Card className={group.coverImage ? "-mt-16 mx-4 relative z-10" : ""}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl">{group.name}</CardTitle>
                  <Badge className={getGroupTypeColor()}>
                    {group.groupType}
                  </Badge>
                  {group.isPrivate && (
                    <Badge variant="outline">
                      <Lock className="w-3 h-3 mr-1" />
                      Private
                    </Badge>
                  )}
                  {group.isAutoCreated && (
                    <Badge variant="outline">
                      <Star className="w-3 h-3 mr-1" />
                      Auto-created
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
                    {getAccessIcon()}
                    <span>{getAccessLabel()}</span>
                  </div>
                  {group.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{group.location}</span>
                    </div>
                  )}
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
                
                {group.isMember ? (
                  <Button 
                    variant="outline" 
                    onClick={() => leaveGroupMutation.mutate()}
                    disabled={leaveGroupMutation.isPending}
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Leave Group
                  </Button>
                ) : (
                  <Button 
                    onClick={() => joinGroupMutation.mutate()}
                    disabled={joinGroupMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {group.accessLevel === 'approval_required' ? 'Request to Join' : 'Join Group'}
                  </Button>
                )}
                
                {group.isMember && (
                  <Button 
                    variant="outline"
                    onClick={() => setShowInviteDialog(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {postsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : posts && posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((post: any) => (
                    <div key={post.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={post.author?.avatar} />
                          <AvatarFallback>
                            {post.author?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{post.author?.name}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{post.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No activity yet</p>
                  <p className="text-sm text-gray-400">Be the first to start a conversation!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
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
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
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
                          {member.isModerator && (
                            <Shield className="w-4 h-4 text-blue-500" />
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

        <TabsContent value="about" className="space-y-4">
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
                  <Badge className={getGroupTypeColor()}>
                    {group.groupType}
                  </Badge>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Access Level</h4>
                  <div className="flex items-center gap-2">
                    {getAccessIcon()}
                    <span>{getAccessLabel()}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Privacy</h4>
                  <span>{group.isPrivate ? 'Private' : 'Public'}</span>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Created</h4>
                  <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              {group.maxMembers && (
                <div>
                  <h4 className="font-medium mb-2">Member Limit</h4>
                  <span>{group.memberCount || 0} / {group.maxMembers} members</span>
                </div>
              )}
              
              {group.tags && group.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Members</DialogTitle>
            <DialogDescription>
              Invite colleagues to join {group.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-gray-500">Invite functionality coming soon</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}