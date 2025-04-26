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
  // State for org settings removed as requested
  
  // Get user profile
  const { data: user } = useQuery<User>({
    queryKey: ["/api/users/me"],
    retry: false,
  });
  
  // Redirect if not logged in or if admin user
  useEffect(() => {
    // Check for either Firebase token or old JWT token
    const firebaseToken = localStorage.getItem("firebaseToken");
    const jwtToken = localStorage.getItem("token");
    
    if (!firebaseToken && !jwtToken) {
      console.log("No authentication token found, redirecting to auth page");
      setLocation("/auth");
      return;
    }
    
    // If we have a user object and it's an admin, redirect to dashboard
    if (user?.isAdmin) {
      console.log("Admin user detected, redirecting to dashboard");
      setLocation("/dashboard");
      return;
    }
    
    console.log("Regular user accessing social page");
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
    { type: "Top Performer", icon: <Trophy className="h-5 w-5" />, color: "bg-indigo-500" },
    { type: "Milestone", icon: <Medal className="h-5 w-5" />, color: "bg-cyan-500" }
  ];
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Recognition Modal */}
      {isRecognitionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Recognize a Teammate</h2>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setIsRecognitionModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Recipient Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Select Teammate</label>
                  <Select value={recipientId?.toString()} onValueChange={(value) => setRecipientId(Number(value))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a teammate" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.filter(u => u.id !== user?.id).map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Badge Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Select Badge</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {badges.map((badge) => (
                      <div 
                        key={badge.type}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedBadge === badge.type 
                            ? `border-${badge.color.split('-')[1]}-500 bg-${badge.color.split('-')[1]}-50` 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedBadge(badge.type)}
                      >
                        <div className={`${badge.color} text-white p-2 rounded-full mb-2`}>
                          {badge.icon}
                        </div>
                        <span className="text-xs text-center font-medium">{badge.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Message */}
                <div>
                  <label className="block text-sm font-medium mb-2">Recognition Message</label>
                  <Textarea 
                    value={recognitionMessage}
                    onChange={(e) => setRecognitionMessage(e.target.value)}
                    placeholder="What are you recognizing them for?"
                    className="w-full resize-none"
                    rows={3}
                  />
                </div>
                
                {/* Points */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Points <span className="text-xs text-gray-500">(Optional)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" size="sm"
                      onClick={() => setRecognitionPoints(Math.max(0, recognitionPoints - 50))}
                      disabled={recognitionPoints <= 0}
                    >
                      -
                    </Button>
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full px-4 py-2 font-bold text-sm min-w-[100px] text-center">
                      {recognitionPoints} Points
                    </div>
                    <Button 
                      variant="outline" size="sm"
                      onClick={() => setRecognitionPoints(recognitionPoints + 50)}
                    >
                      +
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">These points will be awarded to the recipient</p>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setIsRecognitionModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={handleCreateRecognition}
                    disabled={createRecognitionMutation.isPending}
                  >
                    {createRecognitionMutation.isPending ? "Sending..." : "Send Recognition"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Left sidebar */}
      <div className="w-64 hidden md:block bg-white border-r px-4 py-6 space-y-6 fixed h-screen overflow-y-auto">
        <div className="flex items-center gap-2 mb-6">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="4" fill="var(--primary-color, #00A389)" />
            <path d="M7 12H17M7 8H13M7 16H15" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-xl font-bold text-gray-800">{branding?.organizationName || 'ThrivioHR'}</span>
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <span className="font-medium text-green-700">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <div className="font-medium text-sm">{user?.name || 'User'}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span className="flex items-center text-amber-500"><span className="text-xs mr-0.5">★</span> 580</span>
              <span className="text-gray-300">|</span>
              <span className="text-green-600">Online</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className={`flex items-center px-3 py-2 rounded-md ${
            currentSection === 'home' ? 'bg-primary/10 text-primary-color' : 'text-gray-700 hover:bg-gray-100'
          }`}
            onClick={() => setCurrentSection('home')}
          >
            <Home size={18} className="mr-3" />
            <span className="text-sm font-medium">Home</span>
          </div>
          
          <div className={`flex items-center px-3 py-2 rounded-md ${
            currentSection === 'recognize' ? 'bg-primary/10 text-primary-color' : 'text-gray-700 hover:bg-gray-100'
          }`}
            onClick={() => {
              setCurrentSection('recognize');
              setIsRecognitionModalOpen(true);
            }}
          >
            <Award size={18} className="mr-3" />
            <span className="text-sm font-medium">Recognize & Reward</span>
          </div>
          
          <div className={`flex items-center px-3 py-2 rounded-md ${
            currentSection === 'budgets' ? 'bg-primary/10 text-primary-color' : 'text-gray-700 hover:bg-gray-100'
          }`}
            onClick={() => setCurrentSection('budgets')}  
          >
            <Gift size={18} className="mr-3" />
            <span className="text-sm font-medium">Reward Budgets</span>
          </div>
          
          <div className={`flex items-center px-3 py-2 rounded-md ${
            currentSection === 'leaderboard' ? 'bg-primary/10 text-primary-color' : 'text-gray-700 hover:bg-gray-100'
          }`}
            onClick={() => setCurrentSection('leaderboard')}
          >
            <BarChart3 size={18} className="mr-3" />
            <span className="text-sm font-medium">Leaderboard</span>
          </div>
          
          <div className={`flex items-center px-3 py-2 rounded-md ${
            currentSection === 'surveys' ? 'bg-primary/10 text-primary-color' : 'text-gray-700 hover:bg-gray-100'
          }`}
            onClick={() => setCurrentSection('surveys')}
          >
            <FileText size={18} className="mr-3" />
            <span className="text-sm font-medium">Surveys</span>
          </div>
          
          <div className={`flex items-center px-3 py-2 rounded-md ${
            currentSection === 'groups' ? 'bg-primary/10 text-primary-color' : 'text-gray-700 hover:bg-gray-100'
          }`}
            onClick={() => setCurrentSection('groups')}
          >
            <Users size={18} className="mr-3" />
            <span className="text-sm font-medium">Groups</span>
          </div>
        </div>
        
        <div className="pt-2">
          <div className="px-3 py-2 mt-1">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Groups
            </div>
            <div className="flex items-center mt-2 space-y-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 text-xs">
                OT
              </div>
              <span className="text-sm text-gray-700">Outdoor Together</span>
              <span className="ml-auto rounded-full bg-gray-200 text-xs px-1.5 py-0.5">8</span>
            </div>
          </div>
        </div>
        
        {/* Redeem Points Section */}
        <div className="mt-6 px-3">
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-indigo-700">Redeem Your Points</h3>
              <div className="bg-white text-indigo-700 font-bold px-2 py-1 rounded-md shadow-sm text-sm border border-indigo-200">
                {balanceData?.balance || 0}
              </div>
            </div>
            
            <p className="text-xs text-indigo-600 mb-3">
              Explore our reward shop and redeem your hard-earned points for exciting rewards!
            </p>
            
            <Button 
              onClick={openRewardShop}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 text-sm shadow-md"
            >
              <ShoppingBag size={14} className="mr-2" />
              Visit Reward Shop
            </Button>
          </div>
        </div>
        
        {/* Admin section removed as requested */}
      </div>
      
      {/* Main content */}
      <div className="flex-1 md:ml-64 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {/* Organization Settings Panel removed as requested */}
          
          {/* Top navigation bar with points balance and logout button */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-gray-800">Townhall</h1>
                <p className="text-sm text-gray-500">Happiness is a virtue, not its reward.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Points balance */}
              <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md">
                <CreditCard size={16} />
                <span className="font-semibold">{balanceData?.balance || 0} Points</span>
              </div>
              
              {/* Reward Shop Button */}
              <Button 
                onClick={openRewardShop}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
              >
                <ShoppingBag size={16} className="mr-2" /> 
                Reward Shop
              </Button>
              
              {/* Logout button */}
              <Button 
                onClick={handleLogout} 
                variant="ghost" 
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <LogOut size={16} className="mr-2" /> 
                Logout
              </Button>
            </div>
          </div>
          
          {/* Post composer */}
          <div className="bg-white rounded-xl shadow-sm mb-6 p-4">
            <div className="flex">
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
                <span className="text-xl">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="ml-4 flex-1">
                <div className="rounded-xl bg-gray-100 px-4 py-3 text-gray-600">
                  <p>Who are you rewarding today? Use @ to tag a teammate.</p>
                </div>
                <div className="mt-3 flex space-x-2 items-center">
                  <button 
                    className="flex items-center rounded-lg text-red-600 border border-red-100 bg-red-50 px-3 py-1 text-sm"
                    onClick={() => setIsRecognitionModalOpen(true)}
                  >
                    <div className="mr-1">🏆</div>
                    <span>Recognize</span>
                  </button>
                  <button 
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm"
                    onClick={handleCreatePost}
                    disabled={createPostMutation.isPending}
                  >
                    {createPostMutation.isPending ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Example post */}
          <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                    JP
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">James Park</div>
                    <div className="text-xs text-gray-500">Mar 5</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="text-gray-700">
                  Congratulations <span className="text-blue-500">@Thresa</span> on 2 years with the company and here's to many more. Here is <span className="text-green-600 font-medium">500 Points</span> to celebrate this joyous occasion!
                </p>
              </div>
              
              <div className="bg-amber-50 rounded-xl p-4 mb-3">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center mr-2">
                    <div className="text-amber-700">🎉</div>
                  </div>
                  <div className="text-amber-800 font-medium">Work Anniversary</div>
                </div>
                
                <div className="rounded-xl overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=800&h=400&auto=format&fit=crop"
                    alt="Celebration" 
                    className="w-full h-48 object-cover"
                  />
                </div>
                
                <div className="mt-3 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border shadow-sm">
                      <div className="text-xs">TW</div>
                    </div>
                    <div className="ml-2">
                      <div className="text-sm font-medium">Theresa Webb</div>
                      <div className="text-xs text-gray-500">Manager, Marketing</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full px-3 py-1.5 font-bold text-sm">
                    500 Points
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-gray-500 text-sm">
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-1">
                    <ThumbsUp size={16} />
                    <span>24</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle size={16} />
                    <span>15</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Award size={16} />
                    <span>8</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 border-t pt-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <div className="text-xs">MD</div>
                  </div>
                  <div>
                    <div className="flex items-center">
                      <div className="font-medium text-sm">Max Dixon</div>
                      <div className="ml-2 text-xs text-gray-500">15m</div>
                    </div>
                    <div className="text-sm text-gray-600">Happy Anniversary 🎉</div>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <div className="text-xs">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                  </div>
                  <div className="ml-3 flex-1 relative">
                    <input 
                      type="text" 
                      placeholder="Add a comment..." 
                      className="w-full py-2 px-3 border rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-2 text-gray-400">
                      <button>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M15.182 15.182C13.4246 16.9393 10.5754 16.9393 8.81802 15.182M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM9.75 9.75C9.75 10.1642 9.41421 10.5 9 10.5C8.58579 10.5 8.25 10.1642 8.25 9.75C8.25 9.33579 8.58579 9 9 9C9.41421 9 9.75 9.33579 9.75 9.75ZM15.75 9.75C15.75 10.1642 15.4142 10.5 15 10.5C14.5858 10.5 14.25 10.1642 14.25 9.75C14.25 9.33579 14.5858 9 15 9C15.4142 9 15.75 9.33579 15.75 9.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 20L2.75916 17.2351C3.57588 14.2499 4 12.7572 4.81716 11.8118C5.63433 10.8665 6.82943 10.4335 9.21964 9.56766L11 9L13.5 10L15.2107 9.57748C17.2148 8.95517 18.2169 8.64402 19.1085 9.03229C20 9.42057 20 10.5103 20 12.6896V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M4 14C4 14 5 14 6.5 17.5C6.5 17.5 9.33333 11.6667 14 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="17.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Posts from the API */}
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
                <div key={post.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Avatar className="w-10 h-10 mr-3">
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {post.user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">{post.user.name}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 10H5.01M10 10H10.01M15 10H15.01M5.2 5.2L5.2 5.2M5.2 14.8L5.2 14.8M14.8 5.2L14.8 5.2M14.8 14.8L14.8 14.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                    
                    {renderPostContent(post)}
                    
                    <div className="mt-4 border-t pt-3">
                      {post.commentCount > 0 ? (
                        <div className="text-sm text-blue-600 mb-3">
                          View all {post.commentCount} comments
                        </div>
                      ) : null}
                      
                      <div className="flex items-center">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">
                            {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-3 flex-1 relative">
                          <Input 
                            placeholder="Add a comment..." 
                            className="w-full py-2 px-3 text-sm focus:ring-0"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                handleAddComment(post.id, e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-2 text-gray-400">
                            <Smile 
                              size={16} 
                              className="cursor-pointer" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
        
        {/* Redeem points section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Redeem Your Points</h3>
            <button className="text-xs text-blue-500">see all</button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-center">
              <img src="https://logo.clearbit.com/airbnb.com" alt="Airbnb" className="h-8 w-auto" />
            </div>
            <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-center">
              <img src="https://logo.clearbit.com/americanredcross.org" alt="Red Cross" className="h-6 w-auto" />
            </div>
            <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-center">
              <img src="https://logo.clearbit.com/walmart.com" alt="Walmart" className="h-6 w-auto" />
            </div>
            <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-center">
              <img src="https://logo.clearbit.com/nike.com" alt="Nike" className="h-6 w-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}