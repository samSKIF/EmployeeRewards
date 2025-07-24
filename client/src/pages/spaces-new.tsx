import { useState } from 'react';
import { useLocation } from 'wouter';
import { Heart, MessageCircle, Share2, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { FeaturedPostsGrid } from '@/components/FeaturedPostsGrid';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Fetch spaces data
  const {
    data: spaces = [],
    isLoading,
    error,
  } = useQuery<Space[]>({
    queryKey: ['/api/channels'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Fetch featured posts data
  const { data: featuredPosts = [] } = useQuery<any[]>({
    queryKey: ['/api/featured-posts'],
  });

  // Debug logging
  console.log(
    'Spaces query - Loading:',
    isLoading,
    'Spaces count:',
    spaces?.length,
    'Error:',
    error
  );
  console.log('Featured posts:', featuredPosts?.length);

  // Generate feed highlights from spaces when no featured posts
  const feedHighlights = (spaces || [])
    .slice(0, 4)
    .map((space: any, index: number) => {
      const spaceIconMap: { [key: string]: string } = {
        department: '📈',
        site: '🏢',
        interest: '☕',
        project: '📋',
        social: '🎉',
        'company-wide': '🏢',
      };

      return {
        id: space.id,
        channelId: space.id,
        postId: space.id,
        channelName: space.name,
        channelIcon: spaceIconMap[space.channelType] || '📢',
        title: space.name,
        content: space.description || `Latest updates from ${space.name}`,
        imageUrl: undefined,
        likes: Math.floor(Math.random() * 20) + 5,
        comments: Math.floor(Math.random() * 10) + 2,
        shares: Math.floor(Math.random() * 5) + 1,
        timestamp: 'Recent',
        author: 'Team',
      };
    });

  // Generate suggested content from remaining spaces
  const suggestedContent =
    spaces && spaces.length > 0
      ? spaces.slice(4, 7).map((space, index) => {
          return {
            id: space.id,
            channelId: space.id,
            postId: space.id,
            channelName: space.name,
            title: space.name,
            content:
              space.description ||
              `A ${space.channelType} space for ${space.name}`,
            imageUrl: `https://picsum.photos/seed/${space.id}/150/100`,
            members: space.memberCount || Math.floor(Math.random() * 100) + 10,
          };
        })
      : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading spaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading spaces</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Spaces</h1>
              <p className="mt-2 text-gray-600">
                Discover and join spaces that match your interests
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search spaces..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'department', 'interest', 'project'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-4 py-2 rounded-lg font-medium capitalize ${
                    selectedFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trending Spaces */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Trending Spaces
            </h2>
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              See all
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {spaces?.slice(0, 8).map((space) => (
              <div
                key={space.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                onClick={() => setLocation(`/channels/${space.id}`)}
              >
                <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-4xl">
                    {space.channelType === 'department'
                      ? '📈'
                      : space.channelType === 'site'
                        ? '🏢'
                        : space.channelType === 'interest'
                          ? '☕'
                          : space.channelType === 'project'
                            ? '📋'
                            : '📢'}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {space.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {space.description ||
                      `A ${space.channelType} space for collaboration`}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{space.memberCount} members</span>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs capitalize">
                      {space.channelType}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Posts Section with Dynamic Layout */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Featured Posts</h2>
            <p className="text-sm text-muted-foreground">
              {featuredPosts && featuredPosts.length > 0
                ? `${featuredPosts.length} featured posts`
                : 'No featured posts yet'}
            </p>
          </div>

          <FeaturedPostsGrid posts={featuredPosts} />
        </div>

        {/* Suggested Content Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Suggested for You
            </h2>
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
                      <span className="text-sm font-medium text-blue-600">
                        {content.channelName}
                      </span>
                      <span className="text-xs text-gray-500">
                        • {content.members} members
                      </span>
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
    </div>
  );
}
