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

// Function to generate contextual sample posts based on channel type
const getSamplePost = (channelType: string, channelName: string, isSecondary = false) => {
  const posts = {
    department: [
      `Excited to share our Q4 achievements with the team! Great work everyone.`,
      `New project guidelines have been uploaded to the shared folder. Please review by EOW.`,
      `Team lunch this Friday at 12 PM - looking forward to seeing everyone there!`
    ],
    site: [
      `Welcome to all the new team members joining us this week!`,
      `Parking reminder: Construction starts Monday, please use the west entrance.`,
      `Coffee machine in the break room has been fixed - enjoy your brew!`
    ],
    interest: [
      `Just discovered an amazing new technique that's been a game changer!`,
      `Anyone else tried the latest trends? Would love to hear your thoughts.`,
      `Great article I found that everyone in this group would appreciate.`
    ],
    project: [
      `Milestone 2 completed ahead of schedule. Excellent teamwork!`,
      `Quick update: We're on track for the delivery deadline next week.`,
      `Please review the latest requirements document and provide feedback.`
    ],
    social: [
      `Friday after-work drinks at the rooftop bar - who's in? RSVP below!`,
      `Planning our next team building event. Any suggestions for activities?`,
      `Thanks to everyone who joined the trivia night - what a blast!`
    ]
  };

  const channelPosts = posts[channelType as keyof typeof posts] || posts.interest;
  return channelPosts[isSecondary ? 1 : 0] || `New update in ${channelName}!`;
};

interface ChannelPost {
  id: number;
  content: string;
  user: {
    id: number;
    name: string;
    avatarUrl?: string;
  };
  createdAt: string;
  likeCount: number;
  commentCount: number;
}

interface ChannelWithPosts extends Channel {
  recentPosts: ChannelPost[];
}

export default function ChannelsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch channels with their recent posts
  const { data: channels = [], isLoading } = useQuery<Channel[]>({
    queryKey: ['/api/channels'],
  });

  // Fetch user's channel memberships
  const { data: myChannels = [] } = useQuery<number[]>({
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

  const filteredChannels = (channels as Channel[]).filter((channel: Channel) => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      channel.description?.toLowerCase().includes(searchTerm.toLowerCase());

    switch (selectedTab) {
      case 'my-channels':
        return matchesSearch && (myChannels as any[]).some((mc: any) => mc.channelId === channel.id);
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
    return (myChannels as any[]).some((mc: any) => mc.channelId === channelId);
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

      {/* Visual Channel Feed - News Style */}
      <div className="space-y-8">
        {filteredChannels.map((channel: Channel) => (
          <div key={channel.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            {/* Channel Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    {getChannelIcon(channel.channelType)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{channel.name}</h2>
                    <p className="text-gray-600 mt-1">{channel.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {getAccessLevelBadge(channel.accessLevel)}
                      <Badge variant="outline" className="text-xs">
                        {channel.channelType}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Users className="h-4 w-4" />
                        <span>{channel.memberCount} members</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {isUserMember(channel.id) ? (
                    <>
                      <Button variant="default" size="sm" className="min-w-24">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        View Channel
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => leaveChannelMutation.mutate(channel.id)}
                        disabled={leaveChannelMutation.isPending}
                      >
                        Leave
                      </Button>
                    </>
                  ) : (
                    <Button 
                      size="sm" 
                      className="min-w-24"
                      onClick={() => joinChannelMutation.mutate(channel.id)}
                      disabled={joinChannelMutation.isPending}
                    >
                      {channel.accessLevel === 'approval_required' ? 'Request to Join' : 'Join Channel'}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Channel Activity Preview */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                <span className="text-sm text-gray-500">Last updated 2 hours ago</span>
              </div>
              
              {/* Sample Recent Posts */}
              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    content: getSamplePost(channel.channelType, channel.name),
                    user: { name: "Sarah Johnson", avatarUrl: null },
                    createdAt: "2 hours ago",
                    likeCount: Math.floor(Math.random() * 15) + 3,
                    commentCount: Math.floor(Math.random() * 8) + 1
                  },
                  {
                    id: 2,
                    content: getSamplePost(channel.channelType, channel.name, true),
                    user: { name: "Mike Chen", avatarUrl: null },
                    createdAt: "5 hours ago",
                    likeCount: Math.floor(Math.random() * 12) + 2,
                    commentCount: Math.floor(Math.random() * 6) + 0
                  }
                ].map((post, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {post.user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm">{post.user.name}</span>
                          <span className="text-xs text-gray-500">{post.createdAt}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{post.content}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <button className="flex items-center space-x-1 hover:text-blue-600">
                            <Heart className="h-4 w-4" />
                            <span>{post.likeCount}</span>
                          </button>
                          <button className="flex items-center space-x-1 hover:text-blue-600">
                            <MessageCircle className="h-4 w-4" />
                            <span>{post.commentCount}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {isUserMember(channel.id) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button variant="ghost" size="sm" className="w-full text-blue-600 hover:text-blue-700">
                    View all posts in {channel.name}
                  </Button>
                </div>
              )}
            </div>
          </div>
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