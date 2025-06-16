import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Pin, PinOff, Heart, MessageCircle, Calendar, User, Hash } from "lucide-react";

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
  pinnedOrder?: number;
  engagementScore?: number;
}

interface FeaturedPostsConfig {
  id: number;
  displayMode: string;
  specificSpaces?: number[];
  maxPosts: number;
}

interface Channel {
  id: number;
  name: string;
  channelType: string;
  memberCount: number;
}

export default function AdminFeaturedPosts() {
  const { toast } = useToast();
  const [selectedDisplayMode, setSelectedDisplayMode] = useState<string>("pinned");
  const [selectedSpaces, setSelectedSpaces] = useState<number[]>([]);
  const [maxPosts, setMaxPosts] = useState<number>(4);

  // Fetch current configuration
  const { data: config } = useQuery<FeaturedPostsConfig>({
    queryKey: ['/api/featured-posts/config'],
  });

  // Fetch current featured posts
  const { data: featuredPosts = [], refetch: refetchFeaturedPosts } = useQuery<FeaturedPost[]>({
    queryKey: ['/api/featured-posts'],
  });

  // Fetch all channels for selection
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['/api/channels'],
  });

  // Fetch recent posts for pinning
  const { data: recentPosts = [] } = useQuery<FeaturedPost[]>({
    queryKey: ['/api/channels/recent-posts'],
    enabled: selectedDisplayMode === "pinned"
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<FeaturedPostsConfig>) => {
      return apiRequest('/api/featured-posts/config', 'PUT', newConfig);
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "Featured posts settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/featured-posts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  // Pin post mutation
  const pinPostMutation = useMutation({
    mutationFn: async ({ postId, order }: { postId: number; order: number }) => {
      return apiRequest(`/api/featured-posts/pin/${postId}`, 'POST', { order });
    },
    onSuccess: () => {
      toast({
        title: "Post Pinned",
        description: "Post has been pinned to featured posts.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/featured-posts'] });
      refetchFeaturedPosts();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to pin post",
        variant: "destructive",
      });
    },
  });

  // Unpin post mutation
  const unpinPostMutation = useMutation({
    mutationFn: async (postId: number) => {
      return apiRequest(`/api/featured-posts/pin/${postId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Post Unpinned",
        description: "Post has been removed from featured posts.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/featured-posts'] });
      refetchFeaturedPosts();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unpin post",
        variant: "destructive",
      });
    },
  });

  const handleSaveConfiguration = () => {
    updateConfigMutation.mutate({
      displayMode: selectedDisplayMode,
      specificSpaces: selectedDisplayMode === "latest_from_spaces" ? selectedSpaces : undefined,
      maxPosts,
    });
  };

  const handlePinPost = (postId: number) => {
    const nextOrder = Math.max(...featuredPosts.map(p => p.pinnedOrder || 0), 0) + 1;
    pinPostMutation.mutate({ postId, order: nextOrder });
  };

  const handleUnpinPost = (postId: number) => {
    unpinPostMutation.mutate(postId);
  };

  // Initialize form values from config
  useState(() => {
    if (config) {
      setSelectedDisplayMode(config.displayMode);
      setSelectedSpaces(config.specificSpaces || []);
      setMaxPosts(config.maxPosts);
    }
  });

  const getChannelTypeIcon = (type: string) => {
    const icons = {
      department: '📈',
      site: '🏢',
      interest: '☕',
      project: '📋',
      social: '🎉',
      'company-wide': '🏢'
    };
    return icons[type as keyof typeof icons] || '📢';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Featured Posts Management</h1>
          <p className="text-muted-foreground">
            Configure what content appears in the top section of the Spaces discovery page
          </p>
        </div>
      </div>

      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle>Display Configuration</CardTitle>
          <CardDescription>
            Choose how featured posts are selected and displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="display-mode">Display Mode</Label>
              <Select value={selectedDisplayMode} onValueChange={setSelectedDisplayMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select display mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pinned">Pinned Posts by Admin</SelectItem>
                  <SelectItem value="engagement">Most Engaging (48 hours)</SelectItem>
                  <SelectItem value="latest_from_spaces">Latest from Specific Spaces</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-posts">Maximum Posts</Label>
              <Select value={maxPosts.toString()} onValueChange={(value) => setMaxPosts(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Post</SelectItem>
                  <SelectItem value="2">2 Posts</SelectItem>
                  <SelectItem value="3">3 Posts</SelectItem>
                  <SelectItem value="4">4 Posts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedDisplayMode === "latest_from_spaces" && (
            <div className="space-y-2">
              <Label>Select Specific Spaces</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {channels.map((channel) => (
                  <div key={channel.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`channel-${channel.id}`}
                      checked={selectedSpaces.includes(channel.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSpaces([...selectedSpaces, channel.id]);
                        } else {
                          setSelectedSpaces(selectedSpaces.filter(id => id !== channel.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor={`channel-${channel.id}`} className="text-sm">
                      {getChannelTypeIcon(channel.channelType)} {channel.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSaveConfiguration}
            disabled={updateConfigMutation.isPending}
          >
            {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </CardFooter>
      </Card>

      {/* Current Featured Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Current Featured Posts</CardTitle>
          <CardDescription>
            Posts currently displayed in the Spaces discovery page ({featuredPosts.length} of {maxPosts} slots used)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {featuredPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No featured posts configured. 
              {selectedDisplayMode === "pinned" && " Pin some posts below to get started."}
              {selectedDisplayMode === "engagement" && " Posts with high engagement will appear automatically."}
              {selectedDisplayMode === "latest_from_spaces" && " Select spaces above to show their latest posts."}
            </div>
          ) : (
            <div className="grid gap-4">
              {featuredPosts.map((post, index) => (
                <div key={post.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getChannelTypeIcon(post.channelType)}</span>
                        <span className="font-medium">{post.channelName}</span>
                      </div>
                    </div>
                    {selectedDisplayMode === "pinned" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnpinPost(post.id)}
                        disabled={unpinPostMutation.isPending}
                      >
                        <PinOff className="h-4 w-4 mr-1" />
                        Unpin
                      </Button>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <Textarea 
                      value={post.content} 
                      readOnly 
                      className="min-h-[60px] resize-none border-none p-0 focus-visible:ring-0"
                    />
                  </div>

                  {post.imageUrl && (
                    <img 
                      src={post.imageUrl} 
                      alt="Post image" 
                      className="rounded-md max-h-32 object-cover"
                    />
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{post.authorName}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4" />
                        <span>{post.likeCount}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.commentCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pin New Posts Section (only for pinned mode) */}
      {selectedDisplayMode === "pinned" && featuredPosts.length < maxPosts && (
        <Card>
          <CardHeader>
            <CardTitle>Pin New Posts</CardTitle>
            <CardDescription>
              Select posts to pin to the featured posts section
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentPosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent posts available to pin.
              </div>
            ) : (
              <div className="grid gap-4">
                {recentPosts
                  .filter(post => !featuredPosts.some(fp => fp.id === post.id))
                  .slice(0, 10)
                  .map((post) => (
                  <div key={post.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getChannelTypeIcon(post.channelType)}</span>
                          <span className="font-medium">{post.channelName}</span>
                        </div>
                        <Badge variant="outline">
                          <Hash className="h-3 w-3 mr-1" />
                          {(post.likeCount || 0) + (post.commentCount || 0)} engagement
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handlePinPost(post.id)}
                        disabled={pinPostMutation.isPending}
                      >
                        <Pin className="h-4 w-4 mr-1" />
                        Pin
                      </Button>
                    </div>

                    <div className="text-sm">
                      <Textarea 
                        value={post.content} 
                        readOnly 
                        className="min-h-[40px] resize-none border-none p-0 focus-visible:ring-0"
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{post.authorName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(post.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Heart className="h-4 w-4" />
                          <span>{post.likeCount}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-4 w-4" />
                          <span>{post.commentCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}