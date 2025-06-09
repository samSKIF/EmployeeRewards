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
import { CreateSpaceDialog } from "@/components/spaces/CreateSpaceDialog";
import { useLocation } from "wouter";

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

interface FeedHighlight {
  id: number;
  channelId: number;
  channelName: string;
  channelIcon: string;
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  duration?: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  author: string;
}

export default function ChannelsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch channels data
  const { data: channels = [], isLoading, error } = useQuery<Channel[]>({
    queryKey: ['/api/channels'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Get featured channels (top 4)
  const featuredChannels = (channels as Channel[]).slice(0, 4);

  // Sample feed highlights with realistic corporate content
  const feedHighlights: FeedHighlight[] = [
    {
      id: 1,
      channelId: 1,
      channelName: "Marketing Team Updates",
      channelIcon: "📈",
      title: "Our new five year commitment to help bridge our Marketing divide",
      content: "Announcing our comprehensive strategy to enhance collaboration between digital and traditional marketing teams. This initiative will foster innovation and drive measurable results across all campaigns.",
      imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop",
      likes: 24,
      comments: 8,
      shares: 5,
      timestamp: "2h",
      author: "Marketing Team"
    },
    {
      id: 2,
      channelId: 3,
      channelName: "Coffee Enthusiasts",
      channelIcon: "☕",
      title: "Effectively manage your employee's preferences when returning to work",
      content: "New guidelines for hybrid work arrangements and office coffee station protocols. Balancing remote work flexibility with in-person collaboration opportunities.",
      videoUrl: "https://example.com/video",
      duration: "1:09:36",
      likes: 156,
      comments: 42,
      shares: 18,
      timestamp: "4h",
      author: "HR Department"
    },
    {
      id: 3,
      channelId: 2,
      channelName: "New York Office",
      channelIcon: "🏢",
      title: "Virtual reality: the industry advantage",
      content: "Exploring how VR technology is transforming our design processes and client presentations. Join us for an interactive demo session this Friday.",
      imageUrl: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=400&h=250&fit=crop",
      likes: 89,
      comments: 23,
      shares: 12,
      timestamp: "6h",
      author: "Innovation Lab"
    },
    {
      id: 4,
      channelId: 6,
      channelName: "Tech Innovation Hub",
      channelIcon: "💡",
      title: "Meet the team behind the partnership: build inclusive ideas and innovation at Sitecloud",
      content: "Get to know our diverse engineering team and learn about their latest projects in cloud infrastructure and AI-powered solutions.",
      imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=250&fit=crop",
      likes: 67,
      comments: 15,
      shares: 9,
      timestamp: "8h",
      author: "Engineering Team"
    }
  ];

  const suggestedContent = [
    {
      id: 1,
      channelId: 4,
      channelName: "Project Phoenix",
      title: "Q4 Project Updates and Milestone Celebrations",
      content: "Join us for a comprehensive review of our major project achievements and upcoming goals for the next quarter.",
      imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=300&h=200&fit=crop",
      members: 28
    },
    {
      id: 2,
      channelId: 5,
      channelName: "Friday Social Club",
      title: "Team Building Activities and Social Events",
      content: "Discover upcoming social events, team building activities, and casual networking opportunities.",
      imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=300&h=200&fit=crop",
      members: 45
    }
  ];

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
            placeholder="Search spaces..."
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
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="min-w-24"
                        onClick={() => setLocation(`/channels/${channel.id}`)}
                      >
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
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-blue-600 hover:text-blue-700"
                  onClick={() => setLocation(`/channels/${channel.id}`)}
                >
                  {isUserMember(channel.id) ? `View all posts in ${channel.name}` : `Preview ${channel.name}`}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredChannels.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No spaces found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Create the first space to get started'}
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Space
          </Button>
        </div>
      )}

      <CreateSpaceDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </div>
  );
}