import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  UserRound, Users, PlusCircle, BarChart3, Award, MessageSquare, 
  Heart, ThumbsUp, MessageCircle, Share2, Smile 
} from "lucide-react";
import { PostWithDetails, SocialStats } from "@shared/types";
import { useToast } from "@/hooks/use-toast";

export default function SocialPage() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [postContent, setPostContent] = useState("");
  const [activeTab, setActiveTab] = useState("feed");
  
  // Get user profile
  const { data: user } = useQuery({
    queryKey: ["/api/users/me"],
    retry: false,
  });
  
  // Redirect if not logged in
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setLocation("/auth");
    }
  }, [setLocation]);
  
  // Get social stats
  const { data: socialStats } = useQuery({
    queryKey: ["/api/social/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/social/stats");
      return res.json();
    },
    enabled: !!user,
  });
  
  // Get posts for feed
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["/api/social/posts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/social/posts");
      return res.json();
    },
    enabled: !!user,
  });
  
  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/social/posts", {
        content,
        type: "standard"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      setPostContent("");
      toast({
        title: "Success",
        description: "Post created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive"
      });
    }
  });
  
  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number, content: string }) => {
      const res = await apiRequest("POST", "/api/social/comments", {
        postId,
        content
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive"
      });
    }
  });
  
  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ postId, type }: { postId: number, type: string }) => {
      const res = await apiRequest("POST", "/api/social/reactions", {
        postId,
        type
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add reaction",
        variant: "destructive"
      });
    }
  });
  
  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async (postId: number) => {
      await apiRequest("DELETE", `/api/social/reactions/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove reaction",
        variant: "destructive"
      });
    }
  });
  
  // Poll vote mutation
  const votePollMutation = useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: number, optionIndex: number }) => {
      const res = await apiRequest("POST", `/api/social/polls/${pollId}/vote`, {
        optionIndex
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to vote on poll",
        variant: "destructive"
      });
    }
  });
  
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) {
      toast({
        title: "Error",
        description: "Post content cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    createPostMutation.mutate(postContent);
  };
  
  const handleAddComment = (postId: number, content: string) => {
    addCommentMutation.mutate({ postId, content });
  };
  
  const handleReaction = (post: PostWithDetails, reactionType: string) => {
    if (post.userReaction === reactionType) {
      removeReactionMutation.mutate(post.id);
    } else {
      addReactionMutation.mutate({ postId: post.id, type: reactionType });
    }
  };
  
  const handlePollVote = (pollId: number, optionIndex: number) => {
    votePollMutation.mutate({ pollId, optionIndex });
  };
  
  const renderPostContent = (post: PostWithDetails) => {
    return (
      <div>
        <p className="mb-4">{post.content}</p>
        
        {post.imageUrl && (
          <img 
            src={post.imageUrl} 
            alt="Post image" 
            className="w-full h-auto rounded-lg mb-4"
          />
        )}
        
        {post.type === 'poll' && post.poll && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold mb-2">{post.poll.question}</h4>
            <div className="space-y-2">
              {post.poll.options.map((option, index) => {
                const isSelected = post.poll?.userVote === index;
                const percentage = post.poll?.votePercentages?.[index] || 0;
                
                return (
                  <div 
                    key={index}
                    className="relative cursor-pointer hover:bg-gray-100 rounded-lg p-3"
                    onClick={() => handlePollVote(post.poll!.id, index)}
                  >
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-lg ${
                        isSelected ? 'bg-blue-100' : 'bg-gray-200'
                      }`}
                      style={{ width: `${percentage}%`, zIndex: 0 }}
                    />
                    <div className="flex justify-between relative z-10">
                      <span>{option}</span>
                      <span className="font-semibold">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
              <div className="text-sm text-gray-500 mt-2">
                {post.poll.totalVotes} votes
              </div>
            </div>
          </div>
        )}
        
        {post.type === 'recognition' && post.recognition && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Award className="text-amber-500" />
              <span className="font-semibold">Recognition for {post.recognition.recipient.name}</span>
              <Badge className="bg-amber-500">
                {post.recognition.badgeType}
              </Badge>
              {post.recognition.points > 0 && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  +{post.recognition.points} points
                </Badge>
              )}
            </div>
            <p className="text-amber-900 italic">"{post.recognition.message}"</p>
          </div>
        )}
        
        <div className="flex items-center gap-6 mt-4">
          <button 
            className={`flex items-center gap-1 ${
              post.userReaction === 'like' ? 'text-blue-600 font-semibold' : 'text-gray-500'
            }`}
            onClick={() => handleReaction(post, 'like')}
          >
            <ThumbsUp size={18} />
            <span>{post.reactionCounts['like'] || 0}</span>
          </button>
          
          <button 
            className={`flex items-center gap-1 ${
              post.userReaction === 'celebrate' ? 'text-blue-600 font-semibold' : 'text-gray-500'
            }`}
            onClick={() => handleReaction(post, 'celebrate')}
          >
            <Award size={18} />
            <span>{post.reactionCounts['celebrate'] || 0}</span>
          </button>
          
          <button className="flex items-center gap-1 text-gray-500">
            <MessageCircle size={18} />
            <span>{post.commentCount}</span>
          </button>
          
          <button className="flex items-center gap-1 text-gray-500">
            <Share2 size={18} />
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left sidebar */}
      <div className="w-64 hidden md:block bg-white border-r px-6 py-8 space-y-8 fixed h-screen overflow-y-auto">
        <div className="flex items-center gap-2 text-2xl font-bold text-blue-600">
          <Heart size={28} className="fill-blue-600" />
          <span>Empulse</span>
        </div>
        
        <div className="space-y-2">
          <button 
            className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg ${
              activeTab === 'feed' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('feed')}
          >
            <UserRound size={20} />
            <span>Home</span>
          </button>
          
          <button 
            className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg ${
              activeTab === 'people' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('people')}
          >
            <Users size={20} />
            <span>People</span>
          </button>
          
          <button 
            className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg ${
              activeTab === 'recognitions' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('recognitions')}
          >
            <Award size={20} />
            <span>Recognitions</span>
          </button>
          
          <button 
            className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg ${
              activeTab === 'messages' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('messages')}
          >
            <MessageSquare size={20} />
            <span>Messages</span>
            {socialStats?.unreadMessages > 0 && (
              <Badge className="ml-auto">{socialStats.unreadMessages}</Badge>
            )}
          </button>
          
          <button 
            className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg ${
              activeTab === 'polls' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('polls')}
          >
            <BarChart3 size={20} />
            <span>Polls</span>
          </button>
        </div>
        
        <Separator />
        
        <div className="space-y-1 pt-4">
          <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">
            My Groups
          </h3>
          <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-gray-100 text-left">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              OT
            </span>
            <span>Outdoor Together</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-gray-100 text-left">
            <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
              TC
            </span>
            <span>Tech Champions</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-gray-100">
            <PlusCircle size={20} className="text-gray-400" />
            <span className="text-gray-600">Create Group</span>
          </button>
        </div>
        
        <div className="pt-4">
          <button 
            className="flex items-center gap-2 text-red-600"
            onClick={() => {
              localStorage.removeItem("token");
              setLocation("/auth");
            }}
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 md:ml-64 px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="mb-6 md:hidden"
          >
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="feed">Feed</TabsTrigger>
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="recognitions">Recognitions</TabsTrigger>
              <TabsTrigger value="messages">
                Messages
                {socialStats?.unreadMessages > 0 && (
                  <Badge className="ml-1" variant="secondary">{socialStats.unreadMessages}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="polls">Polls</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {activeTab === 'feed' && (
            <div className="space-y-6">
              {/* Create post card */}
              <Card>
                <CardHeader>
                  <CardTitle>Create Post</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreatePost}>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <Textarea 
                          placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex justify-between">
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setActiveTab('polls')}
                          >
                            <BarChart3 size={18} className="mr-1" />
                            Poll
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setActiveTab('recognitions')}
                          >
                            <Award size={18} className="mr-1" />
                            Recognition
                          </Button>
                        </div>
                        <Button 
                          type="submit"
                          disabled={createPostMutation.isPending}
                        >
                          {createPostMutation.isPending ? "Posting..." : "Post"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
              
              {/* Posts feed */}
              {postsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200" />
                          <div className="space-y-2">
                            <div className="h-4 w-40 bg-gray-200 rounded" />
                            <div className="h-3 w-24 bg-gray-200 rounded" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-4 w-full bg-gray-200 rounded" />
                          <div className="h-4 w-full bg-gray-200 rounded" />
                          <div className="h-4 w-2/3 bg-gray-200 rounded" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post: PostWithDetails) => (
                    <Card key={post.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {post.user.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold">{post.user.name}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(post.createdAt).toLocaleDateString()} · {post.user.department}
                              </div>
                            </div>
                          </div>
                          
                          {post.isPinned && (
                            <Badge variant="outline">Pinned</Badge>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pb-3">
                        {renderPostContent(post)}
                      </CardContent>
                      
                      {post.commentCount > 0 && (
                        <div className="px-6 py-2 bg-gray-50 text-sm text-blue-600 cursor-pointer hover:bg-gray-100">
                          View all {post.commentCount} comments
                        </div>
                      )}
                      
                      <CardFooter className="pt-3 pb-4">
                        <div className="flex items-center gap-3 w-full">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="relative w-full">
                            <Input 
                              placeholder="Write a comment..."
                              className="pr-10"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                  handleAddComment(post.id, e.currentTarget.value);
                                  e.currentTarget.value = '';
                                }
                              }}
                            />
                            <Smile 
                              size={18} 
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer" 
                            />
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                  
                  {posts.length === 0 && (
                    <Card className="p-8 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <MessageCircle size={48} strokeWidth={1} />
                        <h3 className="text-lg font-semibold">No posts yet</h3>
                        <p>Be the first to post something!</p>
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'people' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">People Directory</h2>
              <p className="text-gray-500 mb-4">This section is under development.</p>
            </div>
          )}
          
          {activeTab === 'recognitions' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Recognitions</h2>
              <p className="text-gray-500 mb-4">This section is under development.</p>
            </div>
          )}
          
          {activeTab === 'messages' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Messages</h2>
              <p className="text-gray-500 mb-4">This section is under development.</p>
            </div>
          )}
          
          {activeTab === 'polls' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Polls</h2>
              <p className="text-gray-500 mb-4">This section is under development.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Right sidebar */}
      <div className="w-80 hidden lg:block bg-white border-l px-6 py-8 fixed right-0 h-screen overflow-y-auto">
        {/* User profile summary */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg">
                {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-lg">{user?.name}</div>
              <div className="text-sm text-gray-500">{user?.department}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-xl font-semibold">{socialStats?.postsCount || 0}</div>
              <div className="text-sm text-gray-600">Posts</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-xl font-semibold">{socialStats?.recognitionsReceived || 0}</div>
              <div className="text-sm text-gray-600">Recognitions</div>
            </div>
          </div>
        </div>
        
        <Separator className="mb-6" />
        
        {/* Upcoming celebrations */}
        <div className="mb-8">
          <h3 className="font-semibold mb-4">Celebrations</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                <span>🎂</span>
              </div>
              <div>
                <div className="font-medium">Monica & 3 others</div>
                <div className="text-sm text-gray-500">birthday is today</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <span>🏆</span>
              </div>
              <div>
                <div className="font-medium">Ted & 1 other</div>
                <div className="text-sm text-gray-500">work anniversary is today</div>
              </div>
            </div>
          </div>
        </div>
        
        <Separator className="mb-6" />
        
        {/* Leaderboard */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Leaderboard</h3>
            <button className="text-sm text-blue-600">see all</button>
          </div>
          
          <div className="space-y-3">
            {[
              { name: "Theresa Webb", points: 5310, position: 1 },
              { name: "Bessie Cooper", points: 4791, position: 2 },
              { name: "Dianne Russell", points: 4315, position: 3 },
            ].map((leader, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-8 text-center font-medium text-gray-500">
                  {leader.position}
                </div>
                <Avatar>
                  <AvatarFallback>
                    {leader.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{leader.name}</div>
                </div>
                <div className="flex items-center">
                  <span className="text-amber-500 mr-1">★</span>
                  <span className="font-medium">{leader.points}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}