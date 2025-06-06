import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
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
  ChevronRight, ChevronDown, ThumbsUp, Award, FileText, Share2, Smile,
  Home, X, Search, Calendar, Star, Check, PlusCircle, Medal, Plus,
  Cake, Trophy, Target, Sparkles, Zap, UserCog, Building,
  Briefcase, UserPlus, FileSpreadsheet, Upload, Edit, Trash,
  LogOut, ShoppingBag, CreditCard, Eye, Store
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
  PollModal,
  WalletWidget,
  PrioritiesWidget
} from "@/components/social";
import CelebrationCenter from "@/components/CelebrationCenter";
import { MyActiveChannelsWidget } from "@/components/channels/MyActiveChannelsWidget";

export default function SocialPage() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { branding } = useBranding();
  const { signOut } = useFirebaseAuth();
  const { t } = useTranslation();
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
  
  // Get posts for feed with optimized caching
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["/api/social/posts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/social/posts");
      return res.json();
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds - posts stay fresh for 30s
    refetchOnWindowFocus: false, // Don't refetch when user returns to window
  });
  
  // Get users for recognition with optimized caching
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
    enabled: !!user,
    staleTime: 300000, // 5 minutes - user list changes less frequently
    refetchOnWindowFocus: false,
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
            
            <p className="text-amber-900">{post.recognition.message}</p>
            
            {post.recognition.recipientId && (
              <div className="mt-3 flex">
                <div className="flex-1">
                  <div className="text-xs text-amber-700 uppercase font-medium">Recipient</div>
                  <div className="font-medium">
                    {users.find(u => u.id === post.recognition?.recipientId)?.name || 'Unknown recipient'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
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
      
      {/* Main layout with sidebar and content - responsive for large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 max-w-[2200px] mx-auto justify-center">
        {/* Left sidebar - exactly 42% of center width */}
        <div className="hidden lg:block lg:col-span-3 w-full" style={{ maxWidth: "750px" }}>
          {/* Import and use the new wallet and priorities widgets */}
          <WalletWidget balance={balanceData?.balance || 0} />
          <PrioritiesWidget />
        </div>
        
        {/* Main content - much wider for 3840px screen */}
        <div className="lg:col-span-6 w-full max-w-[1800px] 4xl:max-w-[1800px] 3xl:max-w-[1600px] 2xl:max-w-[1400px] xl:max-w-[1200px] lg:max-w-[1000px]">
          {/* Post creator component */}
          <PostCreator 
            user={user}
            onRecognizeClick={() => setIsRecognitionModalOpen(true)}
            onPollClick={() => setIsPollModalOpen(true)}
          />
          
          {/* Filters */}
          <div className="flex justify-end items-center mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <span>{t("social.filterBy")}</span>
              <button className="ml-2 border border-gray-300 rounded-md px-3 py-1 flex items-center">
                <span>{t("social.myCompany")}</span>
                <ChevronDown className="ml-1 h-4 w-4" />
              </button>
            </div>
          </div>
        
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
        
        {/* Right sidebar - exactly 42% of center width */}
        <div className="hidden lg:block lg:col-span-3 w-full" style={{ maxWidth: "750px" }}>
          {/* My Active Channels Widget */}
          <div className="mb-6">
            <MyActiveChannelsWidget />
          </div>
          
          {/* Celebrations section */}
          <CelebrationCenter />
          
          {/* Last Thanked section */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Last Thanked</h3>
              <div className="text-sm text-gray-500 mb-3">Your Direct Reports</div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarFallback className="bg-purple-100 text-purple-700">
                        DM
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">Donna Meagle</div>
                      <div className="text-xs text-gray-500">3 days ago</div>
                    </div>
                  </div>
                  <button className="text-teal-500 hover:text-teal-600">
                    <PlusCircle className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        AD
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">Andy Dwyer</div>
                      <div className="text-xs text-gray-500">16 hours ago</div>
                    </div>
                  </div>
                  <button className="text-teal-500 hover:text-teal-600">
                    <PlusCircle className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarFallback className="bg-green-100 text-green-700">
                        AP
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">Ann Perkins</div>
                      <div className="text-xs text-gray-500">4 hours ago</div>
                    </div>
                  </div>
                  <button className="text-teal-500 hover:text-teal-600">
                    <PlusCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-500 flex items-center justify-between">
                <div>You've recognized <span className="font-semibold text-teal-600">80%</span> of your team this month.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}