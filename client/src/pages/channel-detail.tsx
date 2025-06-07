import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Users, MessageCircle, Heart, Share2, MoreHorizontal, 
  Building, MapPin, Briefcase, Coffee, Lock, Globe, UserCheck,
  Image, Video, FileText, Calendar, Settings, Bell, Search
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  createdAt: string;
}

interface ChannelPost {
  id: number;
  content: string;
  userId: number;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  imageUrl?: string;
  type: string;
}

interface ChannelMember {
  id: number;
  name: string;
  role: string;
  department?: string;
  avatarUrl?: string;
  joinedAt: string;
}

const getChannelIcon = (type: string) => {
  switch (type) {
    case 'department': return <Building className="h-5 w-5" />;
    case 'site': return <MapPin className="h-5 w-5" />;
    case 'interest': return <Heart className="h-5 w-5" />;
    case 'project': return <Briefcase className="h-5 w-5" />;
    case 'social': return <Coffee className="h-5 w-5" />;
    default: return <MessageCircle className="h-5 w-5" />;
  }
};

const getAccessLevelBadge = (accessLevel: string) => {
  switch (accessLevel) {
    case 'approval_required':
      return <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />Private</Badge>;
    case 'department_only':
      return <Badge variant="secondary"><UserCheck className="h-3 w-3 mr-1" />Department</Badge>;
    case 'site_only':
      return <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1" />Site Only</Badge>;
    default:
      return <Badge variant="secondary"><Globe className="h-3 w-3 mr-1" />Open</Badge>;
  }
};

const getSamplePosts = (channelType: string, channelName: string): ChannelPost[] => {
  const baseTime = new Date();
  
  const posts = {
    department: [
      {
        content: `Excited to announce our Q4 marketing campaign launch! 🚀 The new brand guidelines are now available in our shared folder. Please review them by end of week and let me know if you have any questions.`,
        userName: "Sarah Johnson",
        timeAgo: "2 hours ago"
      },
      {
        content: `Great job everyone on the social media engagement numbers this month - we're up 35%! Special shoutout to the content team for the creative campaigns.`,
        userName: "Mike Chen",
        timeAgo: "5 hours ago"
      },
      {
        content: `Reminder: Team lunch this Friday at 12 PM in the main conference room. Looking forward to celebrating our recent wins together!`,
        userName: "Emma Davis",
        timeAgo: "1 day ago"
      }
    ],
    site: [
      {
        content: `Welcome to all the new team members joining us at the NYC office this week! Don't forget to grab your welcome kit from reception.`,
        userName: "Alex Rodriguez",
        timeAgo: "1 hour ago"
      },
      {
        content: `Lunch & learn session tomorrow at 12 PM in the main conference room - "Remote Work Best Practices". Pizza will be provided!`,
        userName: "Jessica Liu",
        timeAgo: "6 hours ago"
      },
      {
        content: `Parking reminder: Construction starts Monday, please use the west entrance. Temporary parking passes available at security.`,
        userName: "David Wilson",
        timeAgo: "2 days ago"
      }
    ],
    interest: [
      {
        content: `Just discovered this amazing coffee roastery downtown - Blue Bottle has nothing on them! Their single-origin Ethiopian is incredible. ☕`,
        userName: "Chris Martinez",
        timeAgo: "3 hours ago"
      },
      {
        content: `Anyone tried the new pour-over technique with the V60? Game changer for morning brews. Happy to share the method if anyone's interested!`,
        userName: "Lisa Thompson",
        timeAgo: "8 hours ago"
      },
      {
        content: `Coffee cupping session this Saturday at 10 AM. We'll be tasting 5 different single origins. Who's in?`,
        userName: "Tom Anderson",
        timeAgo: "1 day ago"
      }
    ],
    project: [
      {
        content: `Phoenix project milestone 2 completed ahead of schedule! 🎉 Excellent teamwork from everyone involved. Moving to phase 3 next week.`,
        userName: "Jennifer Kim",
        timeAgo: "1 day ago"
      },
      {
        content: `Quick update: We're on track for the delivery deadline next week. Please review the latest requirements document and provide feedback by Wednesday.`,
        userName: "Robert Garcia",
        timeAgo: "2 days ago"
      },
      {
        content: `Sprint retrospective notes are now available. Key takeaway: improve cross-team communication. Action items assigned.`,
        userName: "Amanda Foster",
        timeAgo: "3 days ago"
      }
    ],
    social: [
      {
        content: `Friday after-work drinks at the rooftop bar - who's in? 🍻 RSVP below so I can make a reservation. Looking forward to unwinding with the team!`,
        userName: "Mark Johnson",
        timeAgo: "5 hours ago"
      },
      {
        content: `Planning our next team building event. Any suggestions for activities? Thinking escape room, bowling, or maybe a cooking class?`,
        userName: "Rachel Green",
        timeAgo: "1 day ago"
      },
      {
        content: `Thanks to everyone who joined the trivia night - what a blast! Team "The Debuggers" won by one point. Next event coming soon!`,
        userName: "Kevin O'Connor",
        timeAgo: "2 days ago"
      }
    ]
  };

  const channelPosts = posts[channelType as keyof typeof posts] || posts.interest;
  
  return channelPosts.map((post, index) => ({
    id: index + 1,
    content: post.content,
    userId: 1000 + index,
    userName: post.userName,
    userAvatar: undefined,
    createdAt: post.timeAgo,
    likeCount: Math.floor(Math.random() * 25) + 5,
    commentCount: Math.floor(Math.random() * 10) + 1,
    type: 'text'
  }));
};

const getSampleMembers = (): ChannelMember[] => {
  const names = [
    "Sarah Johnson", "Mike Chen", "Emma Davis", "Alex Rodriguez", 
    "Jessica Liu", "David Wilson", "Chris Martinez", "Lisa Thompson",
    "Jennifer Kim", "Robert Garcia", "Amanda Foster", "Mark Johnson",
    "Rachel Green", "Kevin O'Connor", "Sophie Wang", "James Miller"
  ];
  
  const departments = ["Marketing", "Engineering", "Design", "Sales", "HR", "Finance"];
  
  return names.map((name, index) => ({
    id: 2000 + index,
    name,
    role: index < 2 ? 'admin' : 'member',
    department: departments[index % departments.length],
    joinedAt: `${Math.floor(Math.random() * 365)} days ago`
  }));
};

export default function ChannelDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [newPost, setNewPost] = useState("");
  const [activeTab, setActiveTab] = useState("posts");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch channel data
  const { data: channel, isLoading } = useQuery<Channel>({
    queryKey: ['/api/channels', id],
    queryFn: async () => {
      const response = await fetch(`/api/channels/${id}`);
      if (!response.ok) throw new Error('Failed to fetch channel');
      return response.json();
    }
  });

  // Check if user is member
  const { data: myChannels = [] } = useQuery({
    queryKey: ['/api/channels/my-channels'],
  });

  const isUserMember = (channelId: number) => {
    return (myChannels as any[]).some((mc: any) => mc.channelId === channelId);
  };

  // Join/Leave mutations
  const joinChannelMutation = useMutation({
    mutationFn: async (channelId: number) => {
      return apiRequest('POST', `/api/channels/${channelId}/join`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels/my-channels'] });
      toast({ title: "Success", description: "Joined channel successfully" });
    }
  });

  const leaveChannelMutation = useMutation({
    mutationFn: async (channelId: number) => {
      return apiRequest('DELETE', `/api/channels/${channelId}/leave`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels/my-channels'] });
      toast({ title: "Success", description: "Left channel successfully" });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Channel not found</h3>
        <Button onClick={() => setLocation('/channels')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Channels
        </Button>
      </div>
    );
  }

  const samplePosts = getSamplePosts(channel.channelType, channel.name);
  const sampleMembers = getSampleMembers();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/channels')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Channels
            </Button>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Cover & Info */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                {getChannelIcon(channel.channelType)}
              </div>
              
              <div>
                <h1 className="text-3xl font-bold mb-2">{channel.name}</h1>
                <p className="text-white/90 mb-4 max-w-2xl">{channel.description}</p>
                
                <div className="flex items-center gap-4 mb-4">
                  {getAccessLevelBadge(channel.accessLevel)}
                  <Badge variant="outline" className="text-white border-white/30">
                    {channel.channelType}
                  </Badge>
                  <div className="flex items-center gap-1 text-white/90">
                    <Users className="h-4 w-4" />
                    <span>{channel.memberCount} members</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isUserMember(channel.id) ? (
                    <>
                      <Button variant="secondary" size="sm">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Member
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => leaveChannelMutation.mutate(channel.id)}
                        disabled={leaveChannelMutation.isPending}
                        className="text-white border-white/30 hover:bg-white/10"
                      >
                        Leave Channel
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => joinChannelMutation.mutate(channel.id)}
                      disabled={joinChannelMutation.isPending}
                    >
                      {channel.accessLevel === 'approval_required' ? 'Request to Join' : 'Join Channel'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Channel Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Channel Type</h4>
                  <p className="text-sm text-gray-600 capitalize">{channel.channelType}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Access Level</h4>
                  <p className="text-sm text-gray-600">{channel.accessLevel.replace('_', ' ')}</p>
                </div>

                {channel.allowedDepartments && channel.allowedDepartments.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Departments</h4>
                    <div className="flex flex-wrap gap-1">
                      {channel.allowedDepartments.map((dept, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {dept}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {channel.allowedSites && channel.allowedSites.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Locations</h4>
                    <div className="flex flex-wrap gap-1">
                      {channel.allowedSites.map((site, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {site}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Members */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Recent Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sampleMembers.slice(0, 6).map((member) => (
                    <div key={member.id} className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.department}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="space-y-6">
                {/* Create Post */}
                {isUserMember(channel.id) && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            You
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Input
                            placeholder={`What's on your mind about ${channel.name}?`}
                            value={newPost}
                            onChange={(e) => setNewPost(e.target.value)}
                            className="mb-3"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Image className="h-4 w-4 mr-1" />
                                Photo
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Video className="h-4 w-4 mr-1" />
                                Video
                              </Button>
                              <Button variant="ghost" size="sm">
                                <FileText className="h-4 w-4 mr-1" />
                                File
                              </Button>
                            </div>
                            <Button size="sm" disabled={!newPost.trim()}>
                              Post
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Posts Feed */}
                <div className="space-y-4">
                  {samplePosts.map((post) => (
                    <Card key={post.id}>
                      <CardContent className="pt-6">
                        <div className="flex space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {post.userName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium text-gray-900">{post.userName}</p>
                                <p className="text-sm text-gray-500">{post.createdAt}</p>
                              </div>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <p className="text-gray-800 mb-4">{post.content}</p>
                            
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div className="flex items-center space-x-4">
                                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-red-600">
                                  <Heart className="h-4 w-4 mr-1" />
                                  {post.likeCount}
                                </Button>
                                <Button variant="ghost" size="sm" className="text-gray-600">
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  {post.commentCount}
                                </Button>
                                <Button variant="ghost" size="sm" className="text-gray-600">
                                  <Share2 className="h-4 w-4 mr-1" />
                                  Share
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Channel Members ({sampleMembers.length})</CardTitle>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input placeholder="Search members..." className="pl-10" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {sampleMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-blue-100 text-blue-700">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">{member.name}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-500">{member.department}</p>
                                {member.role === 'admin' && (
                                  <Badge variant="secondary" className="text-xs">Admin</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Joined {member.joinedAt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="files">
                <Card>
                  <CardHeader>
                    <CardTitle>Shared Files</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No files yet</h3>
                      <p className="text-gray-600 mb-4">Files shared in this channel will appear here</p>
                      {isUserMember(channel.id) && (
                        <Button>
                          <FileText className="h-4 w-4 mr-2" />
                          Upload File
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}