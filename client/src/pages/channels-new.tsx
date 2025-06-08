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

export default function ChannelsPage() {
  const [, setLocation] = useLocation();

  // Fetch channels data
  const { data: channels = [], isLoading } = useQuery<Channel[]>({
    queryKey: ['/api/channels'],
  });

  // Get featured channels (top 4)
  const featuredChannels = (channels as Channel[]).slice(0, 4);

  // Fetch feed highlights from channels with recent posts
  const { data: feedHighlights = [] } = useQuery<FeedHighlight[]>({
    queryKey: ['/api/channels/feed-highlights'],
    queryFn: async () => {
      // Transform real channel data into feed highlights format
      const channelIconMap: { [key: string]: string } = {
        'department': '📈',
        'site': '🏢',
        'interest': '☕',
        'project': '📋',
        'social': '🎉',
        'company-wide': '🏢'
      };

      return (channels as Channel[]).slice(0, 4).map((channel, index) => {
        const headlines = [
          {
            title: "Our new five year commitment to help bridge our Marketing divide",
            content: "Announcing our comprehensive strategy to enhance collaboration between digital and traditional marketing teams. This initiative will foster innovation and drive measurable results across all campaigns.",
            imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop"
          },
          {
            title: "Effectively manage your employee's preferences when returning to work",
            content: "New guidelines for hybrid work arrangements and office coffee station protocols. Balancing remote work flexibility with in-person collaboration opportunities.",
            videoUrl: "https://example.com/video",
            duration: "1:09:36"
          },
          {
            title: "Virtual reality: the industry advantage",
            content: "Exploring how VR technology is transforming our design processes and client presentations. Join us for an interactive demo session this Friday.",
            imageUrl: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=400&h=250&fit=crop"
          },
          {
            title: "Meet the team behind the partnership: build inclusive ideas and innovation",
            content: "Get to know our diverse engineering team and learn about their latest projects in cloud infrastructure and AI-powered solutions.",
            imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=250&fit=crop"
          }
        ];

        const headline = headlines[index] || headlines[0];

        return {
          id: channel.id,
          channelId: channel.id,
          postId: 100 + index,
          channelName: channel.name,
          channelIcon: channelIconMap[channel.channelType] || '📢',
          title: headline.title,
          content: headline.content,
          imageUrl: headline.imageUrl,
          videoUrl: headline.videoUrl,
          duration: headline.duration,
          likes: Math.floor(Math.random() * 50) + 20,
          comments: Math.floor(Math.random() * 15) + 5,
          shares: Math.floor(Math.random() * 10) + 2,
          timestamp: `${index + 2}h`,
          author: channel.channelType === 'department' ? 'Department Team' : 'Team Lead'
        };
      });
    },
    enabled: !!channels.length
  });

  // Generate suggested content from remaining channels
  const suggestedContent = (channels as Channel[]).slice(4, 7).map((channel, index) => {
    const contentVariations = [
      {
        title: "Q4 Project Updates and Milestone Celebrations",
        content: "Join us for a comprehensive review of our major project achievements and upcoming goals for the next quarter.",
        imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=300&h=200&fit=crop"
      },
      {
        title: "Team Building Activities and Social Events",
        content: "Discover upcoming social events, team building activities, and casual networking opportunities.",
        imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=300&h=200&fit=crop"
      },
      {
        title: "Brand Strategy Workshop Series",
        content: "Interactive workshops to refine our brand messaging and visual identity across all marketing channels.",
        imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop"
      }
    ];

    const content = contentVariations[index] || contentVariations[0];

    return {
      id: channel.id,
      channelId: channel.id,
      postId: 105 + index,
      channelName: channel.name,
      title: content.title,
      content: content.content,
      imageUrl: content.imageUrl,
      members: channel.memberCount
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Big channel on the left */}
        {featuredChannels[0] && (
          <div 
            className="relative rounded-2xl overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-200 h-[400px]"
            onClick={() => setLocation(`/channels/${featuredChannels[0].id}`)}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop)` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="text-white font-bold text-2xl leading-tight mb-2">
                Launching new product innovation, developed in partnership with the disability community
              </h3>
            </div>
          </div>
        )}

        {/* Three channels stacked on the right */}
        <div className="flex flex-col gap-4">
          {/* First channel */}
          {featuredChannels[1] && (
            <div 
              className="relative rounded-2xl overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-200 h-[125px]"
              onClick={() => setLocation(`/channels/${featuredChannels[1].id}`)}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=250&fit=crop)` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-semibold text-sm leading-tight">
                  Meet the team behind the design. Our partnerships build inclusive ideas and innovation at Relecloud
                </h3>
              </div>
            </div>
          )}

          {/* Bottom two channels side by side as squares */}
          <div className="grid grid-cols-2 gap-4">
            {featuredChannels[2] && (
              <div 
                className="relative rounded-2xl overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-200 aspect-square"
                onClick={() => setLocation(`/channels/${featuredChannels[2].id}`)}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=400&fit=crop)` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-white font-semibold text-xs leading-tight">
                    Building a stronger, more sustainable world together
                  </h3>
                </div>
              </div>
            )}

            {featuredChannels[3] && (
              <div 
                className="relative rounded-2xl overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-200 aspect-square"
                onClick={() => setLocation(`/channels/${featuredChannels[3].id}`)}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop)` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-white font-semibold text-xs leading-tight">
                    Wellbeing: Carve out breaks in Outlook
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
                {highlight.videoUrl && (
                  <div className="w-full h-40 bg-gray-900 rounded-t-xl flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-l-4 border-l-gray-800 border-y-2 border-y-transparent ml-1"></div>
                      </div>
                    </div>
                    {highlight.duration && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        {highlight.duration}
                      </div>
                    )}
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