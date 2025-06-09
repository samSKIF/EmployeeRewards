import { useState } from "react";
import { useLocation } from "wouter";
import { Heart, MessageCircle, Share2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

interface FeedHighlight {
  id: number;
  channelId: number;
  postId: number;
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

export default function SpacesPage() {
  const [, setLocation] = useLocation();

  // Fetch spaces data
  const { data: spaces = [], isLoading } = useQuery<Channel[]>({
    queryKey: ['/api/channels'],
  });

  // Get featured spaces (top 4)
  const featuredSpaces = (spaces as Channel[]).slice(0, 4);

  // Fetch latest posts for each space to display real content
  const { data: spacePosts = {} } = useQuery<Record<number, any>>({
    queryKey: ['/api/channels/featured-posts'],
    enabled: featuredSpaces.length > 0,
  });

  // Generate feed highlights from real space posts
  const feedHighlights = featuredSpaces.map((space, index) => {
    const spaceIconMap: { [key: string]: string } = {
      'department': '📈',
      'site': '🏢', 
      'interest': '☕',
      'project': '📋',
      'social': '🎉',
      'company-wide': '🏢'
    };

    const post = spacePosts[space.id];
    
    return {
      id: space.id,
      channelId: space.id,
      postId: post?.id || 0,
      channelName: space.name,
      channelIcon: spaceIconMap[space.channelType] || '📢',
      title: post?.content || space.name,
      content: post?.content || `Latest updates from ${space.name}`,
      imageUrl: post?.imageUrl,
      likes: post?.likeCount || 0,
      comments: post?.commentCount || 0,
      shares: 0,
      timestamp: post?.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recent',
      author: post?.authorName || 'Team'
    };
  });

  // Generate suggested content from remaining spaces
  const suggestedContent = (spaces as Channel[]).slice(4, 7).map((space, index) => {
    const post = spacePosts[space.id];

    return {
      id: space.id,
      channelId: space.id,
      postId: post?.id || 0,
      channelName: space.name,
      title: post?.content || space.name,
      content: post?.content || `Latest discussions in ${space.name}`,
      imageUrl: post?.imageUrl,
      members: space.memberCount
    };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top 4 Channel Headlines with Images */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-8">
        {/* Big channel on the left */}
        {featuredSpaces[0] && (
          <div 
            className="relative rounded-2xl overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-200 h-[400px]"
            onClick={() => setLocation(`/spaces/${featuredSpaces[0].id}`)}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop)` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="text-white font-bold text-2xl leading-tight mb-2">
                {spacePosts[featuredSpaces[0].id]?.content || featuredSpaces[0].name}
              </h3>
            </div>
          </div>
        )}

        {/* Three channels stacked on the right */}
        <div className="flex flex-col gap-2 h-[400px]">
          {/* First channel */}
          {featuredChannels[1] && (
            <div 
              className="relative rounded-2xl overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-200"
              style={{ height: 'calc(50% - 4px)' }}
              onClick={() => setLocation(`/channels/${featuredChannels[1].id}`)}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=250&fit=crop)` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-semibold text-sm leading-tight">
                  {channelPosts[featuredChannels[1]?.id]?.content || featuredChannels[1]?.name}
                </h3>
              </div>
            </div>
          )}

          {/* Bottom two channels side by side as squares */}
          <div className="grid grid-cols-2 gap-2" style={{ height: 'calc(50% - 4px)' }}>
            {featuredChannels[2] && (
              <div 
                className="relative rounded-2xl overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-200 h-full"
                onClick={() => setLocation(`/channels/${featuredChannels[2].id}`)}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=400&fit=crop)` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-white font-semibold text-xs leading-tight">
                    {channelPosts[featuredChannels[2]?.id]?.content || featuredChannels[2]?.name}
                  </h3>
                </div>
              </div>
            )}

            {featuredChannels[3] && (
              <div 
                className="relative rounded-2xl overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-200 h-full"
                onClick={() => setLocation(`/channels/${featuredChannels[3].id}`)}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop)` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-white font-semibold text-xs leading-tight">
                    {channelPosts[featuredChannels[3]?.id]?.content || featuredChannels[3]?.name}
                  </h3>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feed Highlights Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Feed Highlights</h2>
          <button className="text-blue-600 hover:text-blue-700 font-medium">See all</button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {feedHighlights.map((highlight) => (
            <div 
              key={highlight.id}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLocation(`/channels/${highlight.channelId}`)}
            >
              <div className="relative">
                {highlight.imageUrl && (
                  <img 
                    src={highlight.imageUrl}
                    alt=""
                    className="w-full h-40 object-cover rounded-t-xl"
                  />
                )}
                {!highlight.imageUrl && (
                  <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-xl flex items-center justify-center">
                    <span className="text-4xl">{highlight.channelIcon}</span>
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{highlight.channelIcon}</span>
                  <span className="text-sm font-medium text-blue-600">{highlight.channelName}</span>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm leading-snug">
                  {highlight.title}
                </h3>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      <span>{highlight.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      <span>{highlight.comments}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      <span>{highlight.shares}</span>
                    </div>
                  </div>
                  <span>{highlight.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Content Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Suggested for You</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {suggestedContent.map((content) => (
            <div 
              key={content.id}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
              onClick={() => setLocation(`/channels/${content.channelId}`)}
            >
              <div className="flex">
                <img 
                  src={content.imageUrl}
                  alt=""
                  className="w-32 h-24 object-cover"
                />
                <div className="flex-1 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-blue-600">{content.channelName}</span>
                    <span className="text-xs text-gray-500">• {content.members} members</span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm leading-snug">
                    {content.title}
                  </h3>
                  
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {content.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}