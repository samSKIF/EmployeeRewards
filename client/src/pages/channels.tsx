import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Users, Lock, Settings, MessageCircle, TrendingUp, Building, MapPin, Heart, Briefcase, Coffee, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreateChannelDialog } from "@/components/channels/CreateChannelDialog";

interface Channel {
  id: number;
  name: string;
  description: string;
  channelType: string;
  accessLevel: string;
  memberCount: number;
  isActive: boolean;
  allowedDepartments?: string[];
  allowedSites?: string[];
  createdBy: number;
  organizationId: number;
  unreadCount?: number;
  lastActivity?: string;
  recentMembers?: { id: number; name: string; avatarUrl?: string }[];
}

const getChannelIcon = (type: string) => {
  switch (type) {
    case 'department': return <Building className="h-4 w-4" />;
    case 'site': return <MapPin className="h-4 w-4" />;
    case 'interest': return <Heart className="h-4 w-4" />;
    case 'project': return <Briefcase className="h-4 w-4" />;
    case 'social': return <Coffee className="h-4 w-4" />;
    default: return <MessageCircle className="h-4 w-4" />;
  }
};

const getAccessLevelBadge = (level: string) => {
  switch (level) {
    case 'invite_only':
      return <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Private</Badge>;
    case 'approval_required':
      return <Badge variant="outline">Approval Required</Badge>;
    case 'department_only':
      return <Badge variant="default">Department Only</Badge>;
    case 'site_only':
      return <Badge variant="default">Site Only</Badge>;
    default:
      return <Badge variant="secondary">Open</Badge>;
  }
};

export default function ChannelsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch channels data
  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['/api/channels'],
  });

  // Fetch user's channel memberships
  const { data: myChannels = [] } = useQuery({
    queryKey: ['/api/channels/my-channels'],
  });

  // Join channel mutation
  const joinChannelMutation = useMutation({
    mutationFn: async (channelId: number) => {
      return apiRequest('POST', `/api/channels/${channelId}/join`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/channels/my-channels'] });
      toast({
        title: "Success",
        description: "Joined channel successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to join channel",
        variant: "destructive",
      });
    }
  });

  // Leave channel mutation
  const leaveChannelMutation = useMutation({
    mutationFn: async (channelId: number) => {
      return apiRequest('DELETE', `/api/channels/${channelId}/leave`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/channels/my-channels'] });
      toast({
        title: "Success",
        description: "Left channel successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to leave channel",
        variant: "destructive",
      });
    }
  });

  const filteredChannels = channels.filter((channel: Channel) => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      channel.description?.toLowerCase().includes(searchTerm.toLowerCase());

    switch (selectedTab) {
      case 'my-channels':
        return matchesSearch && myChannels.some((mc: any) => mc.channelId === channel.id);
      case 'department':
        return matchesSearch && channel.channelType === 'department';
      case 'interest':
        return matchesSearch && channel.channelType === 'interest';
      case 'project':
        return matchesSearch && channel.channelType === 'project';
      case 'social':
        return matchesSearch && channel.channelType === 'social';
      default:
        return matchesSearch;
    }
  });

  const isUserMember = (channelId: number) => {
    return myChannels.some((mc: any) => mc.channelId === channelId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Channels</h1>
          <p className="text-gray-600 mt-1">Discover and join channels to connect with your colleagues</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Channel
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search channels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All Channels</TabsTrigger>
            <TabsTrigger value="my-channels">My Channels</TabsTrigger>
            <TabsTrigger value="department">Department</TabsTrigger>
            <TabsTrigger value="interest">Interest</TabsTrigger>
            <TabsTrigger value="project">Project</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Channels Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredChannels.map((channel: Channel) => (
          <Card key={channel.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getChannelIcon(channel.channelType)}
                  <CardTitle className="text-lg">{channel.name}</CardTitle>
                  {channel.unreadCount && channel.unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {channel.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {getAccessLevelBadge(channel.accessLevel)}
                <Badge variant="outline" className="text-xs">
                  {channel.channelType}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pb-3">
              <CardDescription className="text-sm mb-3 line-clamp-2">
                {channel.description}
              </CardDescription>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{channel.memberCount} members</span>
                </div>
                {channel.lastActivity && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>Active</span>
                  </div>
                )}
              </div>

              {/* Recent Members */}
              {channel.recentMembers && channel.recentMembers.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex -space-x-2">
                    {channel.recentMembers.slice(0, 3).map((member, index) => (
                      <Avatar key={index} className="h-6 w-6 border-2 border-white">
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback className="text-xs">
                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">Recent members</span>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-3">
              {isUserMember(channel.id) ? (
                <div className="flex gap-2 w-full">
                  <Button variant="outline" size="sm" className="flex-1">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => leaveChannelMutation.mutate(channel.id)}
                    disabled={leaveChannelMutation.isPending}
                  >
                    Leave
                  </Button>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => joinChannelMutation.mutate(channel.id)}
                  disabled={joinChannelMutation.isPending}
                >
                  {channel.accessLevel === 'approval_required' ? 'Request to Join' : 'Join Channel'}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredChannels.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No channels found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Create the first channel to get started'}
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Channel
          </Button>
        </div>
      )}

      <CreateChannelDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </div>
  );
}