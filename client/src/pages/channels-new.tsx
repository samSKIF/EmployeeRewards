import { useState } from "react";
import { useLocation } from "wouter";
import { Heart, MessageCircle, Share2 } from "lucide-react";
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

  // Sample feed highlights with realistic corporate content
  const feedHighlights: FeedHighlight[] = [
    {
      id: 1,
      channelId: 1,
      postId: 101,
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
      postId: 102,
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
      postId: 103,
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
      postId: 104,
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
      postId: 105,
      channelName: "Project Phoenix",
      title: "Q4 Project Updates and Milestone Celebrations",
      content: "Join us for a comprehensive review of our major project achievements and upcoming goals for the next quarter.",
      imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=300&h=200&fit=crop",
      members: 28
    },
    {
      id: 2,
      channelId: 5,
      postId: 106,
      channelName: "Friday Social Club",
      title: "Team Building Activities and Social Events",
      content: "Discover upcoming social events, team building activities, and casual networking opportunities.",
      imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=300&h=200&fit=crop",
      members: 45
    },
    {
      id: 3,
      channelId: 1,
      postId: 107,
      channelName: "Marketing Team Updates",
      title: "Brand Strategy Workshop Series",
      content: "Interactive workshops to refine our brand messaging and visual identity across all marketing channels.",
      imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop",
      members: 32
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top 4 Channel Headlines with Images */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {featuredChannels.map((channel, index) => {
          const headlines = [
            {
              title: "Launching new product innovation, developed in partnership with the disability community",
              image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&h=250&fit=crop",
              gradient: "from-gray-800 to-gray-900"
            },
            {
              title: "Meet the team behind the design. Our partnerships build inclusive ideas and innovation at Melcloud", 
              image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=250&fit=crop",
              gradient: "from-blue-600 to-blue-800"
            },
            {
              title: "Building a stronger world together",
              image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=250&fit=crop", 
              gradient: "from-green-600 to-green-800"
            },
            {
              title: "We look forward to our tasks in Ouirscape",
              image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=250&fit=crop",
              gradient: "from-purple-600 to-purple-800"
            }
          ];
          
          const headline = headlines[index] || headlines[0];
          
          return (
            <div 
              key={channel.id}
              className="relative rounded-2xl overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-200"
              onClick={() => setLocation(`/channels/${channel.id}`)}
              style={{ height: index === 0 ? '300px' : '145px' }}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${headline.image})` }}
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${headline.gradient} opacity-75`} />
              <div className="absolute inset-0 p-4 flex flex-col justify-end">
                <h3 className="text-white font-semibold text-sm leading-tight">
                  {headline.title}
                </h3>
              </div>
            </div>
          );
        })}
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