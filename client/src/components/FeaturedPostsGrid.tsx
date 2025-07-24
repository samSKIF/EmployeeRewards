import { Heart, MessageCircle, Calendar, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';

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

interface FeaturedPostsGridProps {
  posts: FeaturedPost[];
}

export function FeaturedPostsGrid({ posts }: FeaturedPostsGridProps) {
  const [, setLocation] = useLocation();

  const handlePostClick = (post: FeaturedPost) => {
    // Navigate to the specific post within its space
    setLocation(`/spaces/${post.channelId}?postId=${post.id}`);
  };

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-lg font-medium mb-2">
          No featured posts available
        </div>
        <p>Posts will appear here based on your organization's configuration</p>
      </div>
    );
  }

  const getGridClasses = (postCount: number) => {
    switch (postCount) {
      case 1:
        return 'grid grid-cols-1 gap-6';
      case 2:
        return 'grid grid-cols-1 md:grid-cols-2 gap-6';
      case 3:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
      case 4:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
    }
  };

  const getCardClasses = (postCount: number, index: number) => {
    if (postCount === 1) {
      return 'h-[400px]'; // Large single post
    }
    if (postCount === 2) {
      return 'h-[350px]'; // Medium sized posts
    }
    if (postCount === 3) {
      return index === 0 ? 'h-[350px] md:col-span-2' : 'h-[300px]'; // First post larger
    }
    return 'h-[300px]'; // Regular grid
  };

  const getImageHeight = (postCount: number, index: number) => {
    if (postCount === 1) return 'h-48';
    if (postCount === 2) return 'h-40';
    if (postCount === 3) return index === 0 ? 'h-40' : 'h-32';
    return 'h-32';
  };

  const getChannelTypeIcon = (type: string) => {
    const icons = {
      department: '📈',
      site: '🏢',
      interest: '☕',
      project: '📋',
      social: '🎉',
      'company-wide': '🏢',
    };
    return icons[type as keyof typeof icons] || '📢';
  };

  const truncateContent = (
    content: string,
    postCount: number,
    index: number
  ) => {
    let maxLength = 150;
    if (postCount === 1) maxLength = 300;
    if (postCount === 2) maxLength = 200;
    if (postCount === 3 && index === 0) maxLength = 200;

    return content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={getGridClasses(posts.length)}>
      {posts.map((post, index) => (
        <Card
          key={post.id}
          className={`${getCardClasses(posts.length, index)} overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group`}
          onClick={() => handlePostClick(post)}
        >
          <CardContent className="p-0 h-full flex flex-col">
            {/* Channel Header */}
            <div className="p-4 pb-2">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">
                  {getChannelTypeIcon(post.channelType)}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {post.channelName}
                </Badge>
              </div>
            </div>

            {/* Post Image */}
            {post.imageUrl && (
              <div
                className={`${getImageHeight(posts.length, index)} bg-gray-100 overflow-hidden`}
              >
                <img
                  src={post.imageUrl}
                  alt="Post image"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}

            {/* Post Content */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <p className="text-sm text-gray-800 leading-relaxed">
                  {truncateContent(post.content, posts.length, index)}
                </p>

                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>{post.authorName}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Engagement Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span>{post.likeCount}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                    <span>{post.commentCount}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Featured
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
