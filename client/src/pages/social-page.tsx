import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, Heart, Gift, BarChart3, Users, Settings, 
  ChevronRight, ThumbsUp, Award, FileText, Share2, Smile,
  Home, X, Search, Calendar, Star, Check, PlusCircle, Medal,
  Cake, Trophy, Target, Sparkles, Zap, UserCog, Building,
  Briefcase, UserPlus, FileSpreadsheet, Upload, Edit, Trash,
  LogOut, ShoppingBag, CreditCard
} from "lucide-react";
import { PostWithDetails, SocialStats, User } from "@shared/types";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranding } from "@/context/BrandingContext";
import { useFirebaseAuth } from "@/context/FirebaseAuthContext";

// Import our custom social components
import { 
  PostCreator, 
  Post, 
  Comments, 
  RecognitionModal,
  PollModal
} from "@/components/social";

export default function SocialPage() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { branding } = useBranding();
  const { signOut } = useFirebaseAuth();
  const [postContent, setPostContent] = useState("");
  const [currentSection, setCurrentSection] = useState("townhall");
  const [isRecognitionModalOpen, setIsRecognitionModalOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<string>("");
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [recognitionMessage, setRecognitionMessage] = useState("");
  const [recognitionPoints, setRecognitionPoints] = useState<number>(50);
  
  // Function to handle user logout
  const handleLogout = async () => {
    try {
      // Remove Firebase token
      localStorage.removeItem("firebaseToken");
      
      // Set sessionStorage to prevent auto-login on auth page
      sessionStorage.setItem("skipAutoLogin", "true");
      
      // Sign out from Firebase
      await signOut();
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      
      // Redirect to auth page
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "There was a problem logging out. Please try again.",
      });
    }
  };
  
  // Function to open reward shop in a new tab
  const openRewardShop = () => {
    window.open('/shop', '_blank');
  };
  
  // Get user profile
  const { data: user } = useQuery<User>({
    queryKey: ["/api/users/me"],
    retry: false,
  });
  
  // Redirect if not logged in
  useEffect(() => {
    // Check for either Firebase token or old JWT token
    const firebaseToken = localStorage.getItem("firebaseToken");
    const jwtToken = localStorage.getItem("token");
    
    if (!firebaseToken && !jwtToken) {
      console.log("No authentication token found, redirecting to auth page");
      setLocation("/auth");
      return;
    }
    
    // Admin users should now have access to social page
    if (user?.isAdmin) {
      console.log("Admin user accessing social page");
    } else {
      console.log("Regular user accessing social page");
    }
  }, [setLocation, user]);
  
  // Get social stats
  const { data: socialStats } = useQuery({
    queryKey: ["/api/social/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/social/stats");
      return res.json();
    },
    enabled: !!user,
  });
  
  // Get user balance
  const { data: balanceData } = useQuery<{ balance: number }>({
    queryKey: ["/api/points/balance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/points/balance");
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
  
  // Get users for recognition
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
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
  
  // Create recognition mutation
  const createRecognitionMutation = useMutation({
    mutationFn: async ({ recipientId, badgeType, message, points }: { 
      recipientId: number; 
      badgeType: string; 
      message: string;
      points: number;
    }) => {
      const content = `Congratulations @${users.find(u => u.id === recipientId)?.name?.split(' ')[0] || 'teammate'} for ${message}`;
      
      const res = await apiRequest("POST", "/api/social/posts", {
        content,
        type: "recognition",
        recognition: {
          recipientId,
          badgeType,
          message,
          points
        }
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      setIsRecognitionModalOpen(false);
      setSelectedBadge("");
      setRecipientId(null);
      setRecognitionMessage("");
      setRecognitionPoints(50);
      toast({
        title: "Recognition sent!",
        description: "Your recognition has been successfully sent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send recognition",
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
              <div className="rounded-full bg-amber-500 text-white p-1.5">
                <Award size={16} />
              </div>
              <span className="font-medium text-amber-900">{post.recognition.badgeType}</span>
              {post.recognition.points > 0 && (
                <div className="ml-auto px-3 py-1 bg-amber-500 text-white rounded-full font-bold text-sm">
                  {post.recognition.points} Points
                </div>
              )}
            </div>
            <p className="text-amber-900 text-sm">{post.recognition.message}</p>
            
            <div className="mt-3 flex items-center">
              <Avatar className="h-8 w-8 border-2 border-white">
                <AvatarFallback className="bg-amber-200 text-amber-700">
                  {post.recognition.recipient.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="ml-2">
                <div className="text-sm font-medium">{post.recognition.recipient.name}</div>
                <div className="text-xs text-gray-500">{post.recognition.recipient.jobTitle || 'Team Member'}</div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-6 mt-4">
          <button 
            className={`flex items-center gap-1 ${
              post.userReaction === 'like' ? 'text-blue-600 font-semibold' : 'text-gray-500'
            }`}
            onClick={() => handleReaction(post, 'like')}
          >
            <ThumbsUp size={16} />
            <span className="text-sm">{post.reactionCounts['like'] || 0}</span>
          </button>
          
          <button 
            className={`flex items-center gap-1 ${
              post.userReaction === 'celebrate' ? 'text-blue-600 font-semibold' : 'text-gray-500'
            }`}
            onClick={() => handleReaction(post, 'celebrate')}
          >
            <Award size={16} />
            <span className="text-sm">{post.reactionCounts['celebrate'] || 0}</span>
          </button>
          
          <button className="flex items-center gap-1 text-gray-500">
            <MessageCircle size={16} />
            <span className="text-sm">{post.commentCount}</span>
          </button>
        </div>
      </div>
    );
  };
  
  // Handler for submitting recognition
  const handleCreateRecognition = () => {
    if (!recipientId) {
      toast({
        title: "Error",
        description: "Please select a teammate to recognize",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedBadge) {
      toast({
        title: "Error",
        description: "Please select a badge type",
        variant: "destructive"
      });
      return;
    }
    
    if (!recognitionMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a recognition message",
        variant: "destructive"
      });
      return;
    }
    
    createRecognitionMutation.mutate({
      recipientId,
      badgeType: selectedBadge,
      message: recognitionMessage,
      points: recognitionPoints
    });
  };
  
  // Badge options for recognition
  const badges = [
    { type: "Outstanding Work", icon: <Star className="h-5 w-5" />, color: "bg-amber-500" },
    { type: "Team Player", icon: <Users className="h-5 w-5" />, color: "bg-blue-500" },
    { type: "Problem Solver", icon: <Zap className="h-5 w-5" />, color: "bg-purple-500" },
    { type: "Innovation Award", icon: <Sparkles className="h-5 w-5" />, color: "bg-emerald-500" },
    { type: "Leadership", icon: <Target className="h-5 w-5" />, color: "bg-red-500" },
    { type: "Work Anniversary", icon: <Cake className="h-5 w-5" />, color: "bg-pink-500" },
    { type: "Top Performer", icon: <Trophy className="h-5 w-5" />, color: "bg-indigo-500" }
  ];
  
  // Poll creation state
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  
  return (
    <div>
      {/* Recognition Modal */}
      <RecognitionModal
        isOpen={isRecognitionModalOpen}
        onClose={() => setIsRecognitionModalOpen(false)}
        currentUser={user}
      />
      
      {/* Poll Modal */}
      <PollModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        currentUser={user}
      />
      
      {/* Main content */}
      <div className="max-w-3xl mx-auto pt-4">
        {/* Section header */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Section title icon */}
              <div className="bg-teal-100 text-teal-600 p-2 rounded-lg">
                <Home size={24} />
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-gray-800">Social Feed</h1>
                <p className="text-sm text-gray-500">Connect with your colleagues</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Points balance */}
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
                <Star className="h-4 w-4 text-amber-200 fill-amber-200" />
                <span className="font-semibold">{balanceData?.balance || 0} Points</span>
              </div>
            </div>
          </div>
          
          {/* Stats - conditionally show on larger screens */}
          {socialStats && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-teal-50 rounded-lg p-3">
                <div className="text-xs text-teal-600 uppercase font-medium">Posts</div>
                <div className="text-2xl font-bold text-teal-700">{socialStats.postCount || 0}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600 uppercase font-medium">Comments</div>
                <div className="text-2xl font-bold text-blue-700">{socialStats.commentCount || 0}</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-xs text-amber-600 uppercase font-medium">Recognitions</div>
                <div className="text-2xl font-bold text-amber-700">{socialStats.recognitionCount || 0}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-xs text-purple-600 uppercase font-medium">Reactions</div>
                <div className="text-2xl font-bold text-purple-700">{socialStats.reactionCount || 0}</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Post composer */}
        <PostCreator
          user={user}
          onRecognizeClick={() => setIsRecognitionModalOpen(true)}
          onPollClick={() => setIsPollModalOpen(true)}
        />
        
        {/* Posts from API */}
        {postsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="ml-3 space-y-1">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post: PostWithDetails) => (
              <Post 
                key={post.id} 
                post={post}
                currentUser={user}
              />
            ))}
            
            {posts.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <MessageCircle size={48} strokeWidth={1} />
                  <h3 className="text-lg font-semibold">No posts yet</h3>
                  <p>Be the first to post something!</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Right sidebar */}
      <div className="w-72 hidden lg:block bg-white border-l px-4 py-6 fixed right-0 h-screen overflow-y-auto">
        {/* Celebrations section */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Celebrations</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 mr-2">
                🎂
              </div>
              <div>
                <div className="text-sm">
                  <span className="font-medium text-pink-600">Monica & 3 others</span>
                  <span className="text-gray-600"> birthday is today</span>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-2">
                🏆
              </div>
              <div>
                <div className="text-sm">
                  <span className="font-medium text-blue-600">Ted & 1 other</span>
                  <span className="text-gray-600"> work anniversary is today</span>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-500 mr-2">
                👋
              </div>
              <div>
                <div className="text-sm">
                  <span className="font-medium text-green-600">Tim & 2 other</span>
                  <span className="text-gray-600"> joined the team today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Leaderboard section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Leaderboard</h3>
            <button className="text-xs text-blue-500">see all</button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-6 text-center text-gray-500 text-sm mr-2">
                1
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mr-2">
                🥇
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Theresa Webb</div>
              </div>
              <div className="font-semibold text-sm flex items-center">
                <span className="text-amber-500 mr-1">★</span>
                5310
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-6 text-center text-gray-500 text-sm mr-2">
                2
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center mr-2">
                🥈
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Bessie Cooper</div>
              </div>
              <div className="font-semibold text-sm flex items-center">
                <span className="text-amber-500 mr-1">★</span>
                4791
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-6 text-center text-gray-500 text-sm mr-2">
                3
              </div>
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center mr-2">
                🥉
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Dianne Russell</div>
              </div>
              <div className="font-semibold text-sm flex items-center">
                <span className="text-amber-500 mr-1">★</span>
                4315
              </div>
            </div>
          </div>
        </div>
        
        {/* Redeem points section removed - now only available in sidebar */}
      </div>
    </div>
  );
}