import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Users,
  MessageCircle,
  Heart,
  Share2,
  MoreHorizontal,
  Building,
  MapPin,
  Briefcase,
  Coffee,
  Lock,
  Globe,
  UserCheck,
  Image,
  Video,
  FileText,
  Calendar,
  Settings,
  Bell,
  Search,
  UserPlus,
  UserMinus,
  ThumbsUp,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@shared/logger';

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
  coverImage?: string;
}

interface SpacePost {
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

interface SpaceMember {
  id: number;
  userId?: number;
  name: string;
  role: string;
  department?: string;
  location?: string;
  avatar?: string;
  user?: {
    id: number;
  };
}

const getCoverImage = (channelType: string) => {
  const covers = {
    department:
      'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&h=300&fit=crop',
    site: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=300&fit=crop',
    interest:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=300&fit=crop',
    project:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=300&fit=crop',
    social:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=300&fit=crop',
    'company-wide':
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=300&fit=crop',
  };
  return covers[channelType as keyof typeof covers] || covers['department'];
};

const getChannelIcon = (type: string) => {
  switch (type) {
    case 'department':
      return <Building className="h-4 w-4" />;
    case 'site':
      return <MapPin className="h-4 w-4" />;
    case 'interest':
      return <Heart className="h-4 w-4" />;
    case 'project':
      return <Briefcase className="h-4 w-4" />;
    case 'social':
      return <Coffee className="h-4 w-4" />;
    default:
      return <MessageCircle className="h-4 w-4" />;
  }
};

const getAccessLevel = (accessLevel: string) => {
  switch (accessLevel) {
    case 'approval_required':
      return 'Private group';
    case 'department_only':
      return 'Visible';
    case 'site_only':
      return 'Visible';
    default:
      return 'Public';
  }
};

export default function ChannelDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [newPost, setNewPost] = useState('');
  const [expandedComments, setExpandedComments] = useState<
    Record<number, boolean>
  >({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const channelId = params.id;

  // Get postId from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const targetPostId = urlParams.get('postId');

  // Fetch space details
  const {
    data: space,
    isLoading: spaceLoading,
    error: spaceError,
  } = useQuery<Space>({
    queryKey: [`/api/spaces/${channelId}`],
    enabled: !!channelId,
  });

  // Debug space data
  logger.debug('=== SPACE DEBUG ===');
  logger.debug('Space ID:', channelId);
  logger.debug('Query Key:', `/api/spaces/${channelId}`);
  logger.debug('Space data:', space);
  logger.debug('Space loading:', spaceLoading);
  logger.debug('Space error:', spaceError);
  logger.debug('Space name from data:', space?.name);
  logger.debug('=== END DEBUG ===');

  // Fetch space posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<SpacePost[]>({
    queryKey: [`/api/spaces/${channelId}/posts`],
    enabled: !!channelId,
  });

  // Scroll to specific post when loaded
  useEffect(() => {
    if (targetPostId && posts && posts.length > 0) {
      const postElement = document.getElementById(`post-${targetPostId}`);
      if (postElement) {
        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a brief highlight effect
        postElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
        setTimeout(() => {
          postElement.classList.remove(
            'ring-2',
            'ring-blue-500',
            'ring-opacity-50'
          );
        }, 3000);
      }
    }
  }, [targetPostId, posts]);

  // Fetch space members
  const { data: members = [], isLoading: membersLoading } = useQuery<
    SpaceMember[]
  >({
    queryKey: [`/api/channels/${channelId}/members`],
    enabled: !!channelId,
  });

  // Fetch space admins
  const { data: admins = [], isLoading: adminsLoading } = useQuery<
    SpaceMember[]
  >({
    queryKey: [`/api/channels/${channelId}/admins`],
    enabled: !!channelId,
  });

  // Check if current user is a member
  const { data: user } = useQuery({ queryKey: ['/api/users/me'] });
  const isMember =
    Array.isArray(members) &&
    members.some((member: any) => member.id === user?.id);

  // Check if user is admin
  const isAdmin =
    user &&
    Array.isArray(admins) &&
    (admins.some((admin: any) => admin.id === user.id) ||
      space?.createdBy === user.id);

  // Fetch join requests (for admins only)
  const { data: joinRequests = [], isLoading: joinRequestsLoading } = useQuery<
    any[]
  >({
    queryKey: [`/api/channels/${channelId}/join-requests`],
    enabled: !!channelId && !!isAdmin,
  });

  // Debug membership
  logger.debug('=== MEMBERSHIP DEBUG ===');
  logger.debug('Current user:', user);
  logger.debug('Members array:', members);
  logger.debug('Is member:', isMember);
  logger.debug('User ID:', user?.id);
  logger.debug(
    'Member IDs:',
    Array.isArray(members) ? members.map((m) => m.id) : 'Not an array'
  );
  logger.debug('=== END MEMBERSHIP DEBUG ===');

  // Join channel mutation
  const joinChannelMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/channels/${channelId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/channels/${channelId}/members`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/channels/${channelId}`],
      });
      toast({ title: 'Successfully joined channel!' });
    },
    onError: () => {
      toast({ title: 'Failed to join channel', variant: 'destructive' });
    },
  });

  // Leave channel mutation
  const leaveChannelMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/channels/${channelId}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/channels/${channelId}/members`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/channels/${channelId}`],
      });
      toast({ title: 'Successfully left channel!' });
    },
    onError: () => {
      toast({ title: 'Failed to leave channel', variant: 'destructive' });
    },
  });

  // Approve join request mutation
  const approveRequestMutation = useMutation({
    mutationFn: (requestId: number) =>
      apiRequest(
        'PATCH',
        `/api/channels/${channelId}/join-requests/${requestId}`,
        {
          status: 'approved',
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/channels/${channelId}/join-requests`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/channels/${channelId}/members`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/channels/${channelId}`],
      });
      toast({ title: 'Join request approved!' });
    },
    onError: () => {
      toast({ title: 'Failed to approve request', variant: 'destructive' });
    },
  });

  // Reject join request mutation
  const rejectRequestMutation = useMutation({
    mutationFn: (requestId: number) =>
      apiRequest(
        'PATCH',
        `/api/channels/${channelId}/join-requests/${requestId}`,
        {
          status: 'rejected',
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/channels/${channelId}/join-requests`],
      });
      toast({ title: 'Join request rejected!' });
    },
    onError: () => {
      toast({ title: 'Failed to reject request', variant: 'destructive' });
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest('POST', `/api/channels/${channelId}/posts`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/spaces/${channelId}/posts`],
      });
      setNewPost('');
      toast({ title: 'Post created successfully!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create post',
        description:
          error.message || 'You must be a member of this space to create posts',
        variant: 'destructive',
      });
    },
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      return apiRequest('POST', `/api/posts/${postId}/like`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/spaces/${channelId}/posts`],
      });
    },
    onError: () => {
      toast({ title: 'Failed to like post', variant: 'destructive' });
    },
  });

  // Comment on post mutation
  const createCommentMutation = useMutation({
    mutationFn: async ({
      postId,
      content,
    }: {
      postId: number;
      content: string;
    }) => {
      return apiRequest('POST', `/api/posts/${postId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/spaces/${channelId}/posts`],
      });
      toast({ title: 'Comment added successfully!' });
    },
    onError: () => {
      toast({ title: 'Failed to add comment', variant: 'destructive' });
    },
  });

  if (spaceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (spaceError) {
    // Check if it's an authentication error
    const errorMessage = spaceError?.message || '';
    const isAuthError =
      errorMessage.includes('Unauthorized') || errorMessage.includes('401');

    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {isAuthError ? 'Authentication Required' : 'Space not found'}
        </h1>
        <p className="text-gray-600 mb-4">
          {isAuthError
            ? 'Please log in to access this space'
            : 'The space you are looking for does not exist or has been removed'}
        </p>
        <Button
          onClick={() => setLocation(isAuthError ? '/auth' : '/spaces')}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isAuthError ? 'Go to Login' : 'Back to Spaces'}
        </Button>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Space not found
        </h1>
        <Button
          onClick={() => setLocation('/spaces')}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Spaces
        </Button>
      </div>
    );
  }

  const handleCreatePost = () => {
    if (newPost.trim()) {
      createPostMutation.mutate(newPost.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center space-x-2 text-sm mb-3">
            <button
              onClick={() => setLocation('/spaces')}
              className="text-gray-500 hover:text-gray-700 flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Spaces
            </button>
            <span className="text-gray-400">/</span>
            <span className="font-medium text-gray-900 flex items-center">
              {space && getChannelIcon(space.channelType)}
              <span className="ml-2">{space?.name || 'Loading...'}</span>
            </span>
          </nav>

          {/* Space Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-50 rounded-lg p-3">
                {space && getChannelIcon(space.channelType)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {space?.name || 'Loading...'}
                </h1>
                <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                  <span className="capitalize">{space?.channelType}</span>
                  <span>•</span>
                  <span>{space && getAccessLevel(space.accessLevel)}</span>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{space?.memberCount} members</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isMember ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => leaveChannelMutation.mutate()}
                  disabled={leaveChannelMutation.isPending}
                >
                  {leaveChannelMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  ) : (
                    <UserMinus className="h-4 w-4 mr-2" />
                  )}
                  Leave Channel
                </Button>
              ) : (
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => joinChannelMutation.mutate()}
                  disabled={joinChannelMutation.isPending}
                >
                  {joinChannelMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Join Channel
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Photo */}
      <div className="relative">
        <div
          className="h-80 bg-cover bg-center"
          style={{
            backgroundImage: `url(${getCoverImage(space.channelType)})`,
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        </div>

        {/* Space Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center mb-3">
              <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4">
                {space && getChannelIcon(space.channelType)}
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-1 drop-shadow-lg">
                  {space?.name || 'Loading...'}
                </h1>
                <div className="flex items-center space-x-4 text-white text-opacity-90">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm capitalize">
                      {space?.channelType}
                    </span>
                    <span className="text-xs">•</span>
                    <span className="text-sm">
                      {space && getAccessLevel(space.accessLevel)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">
                      {space?.memberCount} members
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation and Actions */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between py-4">
            <Tabs defaultValue="discussion" className="flex-1">
              <TabsList className="bg-transparent border-none">
                <TabsTrigger
                  value="discussion"
                  className="text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                >
                  Discussion
                </TabsTrigger>
                <TabsTrigger value="featured">Featured</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center space-x-3">
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
              <Button variant="outline">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="outline">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post - Only for Members */}
            {isMember ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex space-x-3">
                    <Avatar>
                      <AvatarFallback>
                        {user?.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <Input
                        placeholder="Write something..."
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        className="border-gray-300"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-3">
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
                        <Button
                          onClick={handleCreatePost}
                          disabled={
                            !newPost.trim() || createPostMutation.isPending
                          }
                          size="sm"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Join to participate
                  </h3>
                  <p className="text-gray-600 mb-4">
                    You need to be a member of this space to create posts and
                    interact with content.
                  </p>
                  {space.accessLevel === 'approval_required' ? (
                    <Button
                      onClick={() =>
                        joinChannelMutation.mutate(parseInt(channelId))
                      }
                      disabled={joinChannelMutation.isPending}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {joinChannelMutation.isPending
                        ? 'Requesting...'
                        : 'Request to Join'}
                    </Button>
                  ) : space.accessLevel === 'invite_only' ? (
                    <p className="text-sm text-gray-500">
                      This space is invite-only. Contact an admin to request
                      access.
                    </p>
                  ) : (
                    <Button
                      onClick={() =>
                        joinChannelMutation.mutate(parseInt(channelId))
                      }
                      disabled={joinChannelMutation.isPending}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {joinChannelMutation.isPending
                        ? 'Joining...'
                        : 'Join Space'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Posts Feed */}
            <div className="space-y-4">
              {postsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="animate-pulse space-y-3">
                          <div className="flex space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/6"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : posts.length > 0 ? (
                posts.map((post) => (
                  <Card
                    key={post.id}
                    id={`post-${post.id}`}
                    className="transition-all duration-300"
                  >
                    <CardContent className="p-4">
                      <div className="flex space-x-3">
                        <Link href={`/user/${post.userId}`}>
                          <Avatar className="cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
                            <AvatarImage src={post.userAvatar} />
                            <AvatarFallback>
                              {post.userName?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Link href={`/user/${post.userId}`}>
                              <h4 className="font-semibold text-sm hover:text-blue-600 cursor-pointer transition-colors">
                                {post.userName}
                              </h4>
                            </Link>
                            <span className="text-xs text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-900 mb-3">{post.content}</p>

                          {post.imageUrl && (
                            <img
                              src={post.imageUrl}
                              alt="Post image"
                              className="rounded-lg mb-3 max-w-full h-auto"
                            />
                          )}

                          <div className="flex items-center space-x-4 text-gray-500">
                            <button
                              className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                              onClick={() => likePostMutation.mutate(post.id)}
                              disabled={likePostMutation.isPending}
                            >
                              <ThumbsUp className="h-4 w-4" />
                              <span className="text-sm">
                                {post.likeCount || 0}
                              </span>
                            </button>
                            <button
                              className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                              onClick={() => {
                                const content = prompt('Enter your comment:');
                                if (content && content.trim()) {
                                  createCommentMutation.mutate({
                                    postId: post.id,
                                    content: content.trim(),
                                  });
                                }
                              }}
                              disabled={createCommentMutation.isPending}
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span className="text-sm">
                                {post.commentCount || 0}
                              </span>
                            </button>
                            <button
                              className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  window.location.href
                                );
                                toast({ title: 'Link copied to clipboard!' });
                              }}
                            >
                              <Share2 className="h-4 w-4" />
                              <span className="text-sm">Share</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No posts yet
                    </h3>
                    <p className="text-gray-600">
                      Be the first to share something with this channel!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* About */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">About</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {space.description}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Lock className="h-4 w-4 text-gray-400" />
                    <span>{getAccessLevel(space.accessLevel)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>
                      Only members can see who's in the group and what they post
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span>Anyone can find this group</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Space Admins */}
            {(space.accessLevel === 'approval_required' ||
              space.accessLevel === 'invite_only') && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Space Admins</h3>
                    <span className="text-sm text-gray-500">
                      {admins.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {adminsLoading ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            className="flex items-center space-x-3 animate-pulse"
                          >
                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : admins.length > 0 ? (
                      admins.map((admin) => (
                        <div
                          key={admin.id}
                          className="flex items-center space-x-3"
                        >
                          <Link href={`/user/${admin.id}`}>
                            <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
                              <AvatarImage src={admin.avatar} />
                              <AvatarFallback>
                                {admin.name?.charAt(0) || 'A'}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <Link href={`/user/${admin.id}`}>
                                <p className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 cursor-pointer transition-colors">
                                  {admin.name}
                                </p>
                              </Link>
                              <Badge variant="secondary" className="text-xs">
                                Admin
                              </Badge>
                            </div>
                            {admin.department && (
                              <p className="text-xs text-gray-500 truncate">
                                {admin.department}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        No admins assigned
                      </p>
                    )}
                  </div>

                  {/* Join Requests for Admins */}
                  {user &&
                    Array.isArray(admins) &&
                    (admins.some((admin) => admin.id === user.id) ||
                      space?.createdBy === user.id) &&
                    Array.isArray(joinRequests) &&
                    (joinRequests || []).length > 0 && (
                      <div className="mt-4 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium">
                            Pending Join Requests
                          </h4>
                          <Badge variant="outline">
                            {(joinRequests || []).length}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {(joinRequests || []).slice(0, 3).map((request) => (
                            <div
                              key={request.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={request.userAvatarUrl} />
                                  <AvatarFallback>
                                    {request.userName?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">
                                  {request.userName}
                                </span>
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
                                  onClick={() =>
                                    approveRequestMutation.mutate(request.id)
                                  }
                                  disabled={approveRequestMutation.isPending}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs text-red-600"
                                  onClick={() =>
                                    rejectRequestMutation.mutate(request.id)
                                  }
                                  disabled={rejectRequestMutation.isPending}
                                >
                                  Decline
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {(joinRequests || []).length > 3 && (
                          <Button
                            variant="link"
                            className="w-full mt-2 text-blue-600 text-sm"
                          >
                            View all requests ({(joinRequests || []).length})
                          </Button>
                        )}
                      </div>
                    )}
                </CardContent>
              </Card>
            )}

            {/* Recent Media */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Recent media</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    'https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=150&h=150&fit=crop',
                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&h=150&fit=crop',
                    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=150&h=150&fit=crop',
                    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=150&h=150&fit=crop',
                    'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=150&h=150&fit=crop',
                    'https://images.unsplash.com/photo-1559054663-e5302b54cd3f?w=150&h=150&fit=crop',
                  ].map((src, index) => (
                    <img
                      key={index}
                      src={src}
                      alt={`Media ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                  ))}
                </div>
                <Button variant="link" className="w-full mt-3 text-blue-600">
                  See all
                </Button>
              </CardContent>
            </Card>

            {/* Members Preview */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Members</h3>
                  <span className="text-sm text-gray-500">
                    {space.memberCount}
                  </span>
                </div>

                <div className="space-y-3">
                  {membersLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex items-center space-x-3 animate-pulse"
                        >
                          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    (members || []).slice(0, 6).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center space-x-3"
                      >
                        <Link
                          href={`/user/${member.user?.id || member.userId}`}
                        >
                          <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>
                              {member.name?.charAt(0) || 'M'}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/user/${member.user?.id || member.userId}`}
                          >
                            <p className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 cursor-pointer transition-colors">
                              {member.name}
                            </p>
                          </Link>
                          {member.department && (
                            <p className="text-xs text-gray-500 truncate">
                              {member.department}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {(members || []).length > 6 && (
                  <Button variant="link" className="w-full mt-3 text-blue-600">
                    See all members
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
