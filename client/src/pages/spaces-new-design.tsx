import { useState } from "react";
import { useLocation } from "wouter";
import { Heart, MessageCircle, Share2, Users, Plus, CheckSquare, FileText, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Space {
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

interface FeaturedPost {
  id: number;
  content: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  channelId: number;
  channelName: string;
  channelType: string;
  authorId: number;
  authorName: string;
  authorAvatarUrl?: string;
}

interface SpacePost {
  id: number;
  content: string;
  authorName: string;
  authorAvatar?: string;
  spaceName: string;
  spaceType: string;
  likes: number;
  comments: number;
  timestamp: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

export default function SpacesPageNewDesign() {
  const [, setLocation] = useLocation();

  // Fetch spaces data
  const { data: spaces = [] } = useQuery<Space[]>({
    queryKey: ['/api/channels'],
  });

  // Fetch featured posts
  const { data: featuredPosts = [] } = useQuery<FeaturedPost[]>({
    queryKey: ['/api/featured-posts'],
  });

  // Fetch user points
  const { data: userPoints = { total: 0, week: 0 } } = useQuery({
    queryKey: ['/api/points/balance'],
  });

  // Fetch priorities
  const { data: priorities = [] } = useQuery({
    queryKey: ['/api/priorities'],
  });

  // Generate trending spaces from actual spaces
  const trendingSpaces = (spaces || []).slice(0, 5).map(space => ({
    id: space.id,
    name: space.name,
    hashtag: space.name.toLowerCase().replace(/\s+/g, '-'),
    type: space.channelType,
    color: getSpaceColor(space.channelType)
  }));

  // Generate suggested spaces
  const suggestedSpaces = (spaces || []).slice(5, 8).map(space => ({
    id: space.id,
    name: space.name,
    description: space.description,
    memberCount: space.memberCount,
    image: getSpaceImage(space.channelType)
  }));

  // Mock recent posts from spaces
  const recentPosts = [
    {
      id: 1,
      authorName: "Elena Rodriguez",
      authorAvatar: "https://api.dicebear.com/7.x/personas/png?seed=Elena",
      spaceName: "#design-team",
      content: "The new branding guidelines are ready for review! ⭐ Please find the attached PDF and share your feedback by EOD Friday. Excited to hear your thoughts!",
      likes: 0,
      comments: 0,
      timestamp: "2h ago",
      attachmentUrl: "ThrivioHR_Branding_V2.pdf",
      attachmentType: "pdf"
    },
    {
      id: 2,
      authorName: "Mark Chen",
      authorAvatar: "https://api.dicebear.com/7.x/personas/png?seed=Mark",
      spaceName: "#engineering",
      content: "Quick update: We've successfully deployed the latest security patch to production servers. No downtime was recorded. Great job, team!",
      likes: 12,
      comments: 3,
      timestamp: "4h ago"
    }
  ];

  function getSpaceColor(type: string) {
    const colors = {
      'department': 'bg-blue-500',
      'interest': 'bg-green-500',
      'project': 'bg-purple-500',
      'social': 'bg-pink-500',
      'site': 'bg-orange-500',
      'company-wide': 'bg-gray-500'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  }

  function getSpaceImage(type: string) {
    const images = {
      'department': 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=300&fit=crop',
      'interest': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
      'project': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop',
      'social': 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop',
      'site': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop'
    };
    return images[type as keyof typeof images] || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop';
  }

  const handlePostClick = (post: FeaturedPost) => {
    setLocation(`/spaces/${post.channelId}?postId=${post.id}`);
  };

  const mainFeaturedPost = featuredPosts[0];
  const sideFeaturedPosts = featuredPosts.slice(1, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="col-span-3 space-y-6">
            {/* ThrivioHR Points */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">ThrivioHR Points</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <span className="text-teal-600 text-sm">🎁</span>
                    </div>
                    <div>
                      <div className="font-medium text-2xl">{userPoints.balance || userPoints.total || 0}</div>
                      <div className="text-xs text-gray-500">You Have Earned</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <span className="text-teal-600 text-sm">💎</span>
                    </div>
                    <div>
                      <div className="font-medium text-2xl">{userPoints.weeklyPoints || userPoints.week || 0}</div>
                      <div className="text-xs text-gray-500">This Week</div>
                    </div>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-teal-600 hover:bg-teal-700">
                  Show Details
                </Button>
              </CardContent>
            </Card>

            {/* Priorities */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Priorities</h3>
                <div className="space-y-3">
                  {priorities.map((priority) => (
                    <div key={priority.id} className="flex items-start space-x-3">
                      <CheckSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span className="text-sm text-gray-600">{priority.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-9 space-y-8">
            {/* Featured Posts */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">FEATURED POSTS</h2>
              
              {featuredPosts.length > 0 && (
                <div className="grid grid-cols-3 gap-6">
                  {/* Main Featured Post */}
                  {mainFeaturedPost && (
                    <div className="col-span-2">
                      <Card 
                        className="h-80 cursor-pointer hover:shadow-lg transition-shadow overflow-hidden group"
                        onClick={() => handlePostClick(mainFeaturedPost)}
                      >
                        <div className="relative h-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          <div className="absolute inset-0 bg-black/20"></div>
                          <div className="relative p-6 h-full flex flex-col justify-end">
                            <h3 className="text-xl font-bold mb-2">Project Phoenix Launch Success</h3>
                            <p className="text-white/90 text-sm">Celebrating our biggest milestone yet!</p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Side Featured Posts */}
                  <div className="space-y-4">
                    {sideFeaturedPosts.map((post) => (
                      <Card 
                        key={post.id}
                        className="h-36 cursor-pointer hover:shadow-lg transition-shadow overflow-hidden group"
                        onClick={() => handlePostClick(post)}
                      >
                        <div className="relative h-full bg-gradient-to-br from-orange-400 to-red-500 text-white">
                          <div className="absolute inset-0 bg-black/20"></div>
                          <div className="relative p-4 h-full flex flex-col justify-end">
                            <h4 className="font-semibold text-sm mb-1">
                              {post.channelName === 'Friday Social Club' && post.id === 21 ? 'Company Anniversary' : 'Community Day'}
                            </h4>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Trending in Your Spaces */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">TRENDING IN YOUR SPACES</h2>
              <div className="grid grid-cols-5 gap-4">
                {trendingSpaces.map((space) => (
                  <Card 
                    key={space.id}
                    className="aspect-square cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setLocation(`/spaces/${space.id}`)}
                  >
                    <CardContent className="p-0 h-full relative overflow-hidden">
                      <div className={`h-full ${space.color} flex items-center justify-center`}>
                        <div className="text-center text-white">
                          <div className="text-2xl mb-2">
                            {space.type === 'department' && '📈'}
                            {space.type === 'interest' && '☕'}
                            {space.type === 'project' && '🚀'}
                            {space.type === 'social' && '🎉'}
                            {space.type === 'site' && '🏢'}
                          </div>
                          <div className="text-xs font-medium">#{space.hashtag}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recent Posts Feed */}
            <div className="space-y-6">
              {recentPosts.map((post) => (
                <Card key={post.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.authorAvatar} />
                        <AvatarFallback>{post.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-gray-900">{post.authorName}</span>
                          <span className="text-blue-600 font-medium">in {post.spaceName}</span>
                        </div>
                        <p className="text-gray-800 mb-4">{post.content}</p>
                        
                        {post.attachmentUrl && (
                          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg mb-4">
                            <FileText className="h-5 w-5 text-red-500" />
                            <span className="text-sm font-medium">{post.attachmentUrl}</span>
                            <span className="text-xs text-gray-500">3.5 MB</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-6 text-gray-500">
                          <button className="flex items-center space-x-2 hover:text-blue-600">
                            <Heart className="h-4 w-4" />
                            <span className="text-sm">{post.likes}</span>
                          </button>
                          <button className="flex items-center space-x-2 hover:text-blue-600">
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-sm">{post.comments}</span>
                          </button>
                          <span className="text-sm">{post.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Suggested Spaces */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">SUGGESTED SPACES</h2>
              <div className="space-y-4">
                {suggestedSpaces.map((space) => (
                  <Card key={space.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                          <img 
                            src={space.image} 
                            alt={space.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{space.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{space.description}</p>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center -space-x-2">
                              <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                              <div className="w-6 h-6 rounded-full bg-gray-400"></div>
                            </div>
                            <span className="text-xs text-gray-500">{space.memberCount} members</span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-teal-600 hover:bg-teal-700"
                          onClick={() => setLocation(`/spaces/${space.id}`)}
                        >
                          Join
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}